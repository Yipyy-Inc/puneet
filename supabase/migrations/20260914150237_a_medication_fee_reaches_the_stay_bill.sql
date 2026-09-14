-- ============================================================================
-- A medication's fee on an incident is charged on the stay's bill.
--
-- The in-stay care tab records "Charge a fee — $12.50 per admin" on a
-- medication (incident_care_items.detail: chargeFee, feeType, feeAmount), and
-- nothing charged it. Now each logged dose keeps one fee line on the incident's
-- booking in step:
--
--   per_admin   quantity = doses logged
--   one_time    quantity = 1, from the first dose logged
--
-- A dose is what is charged, not the plan: a medication added and stopped
-- before anyone gave it costs nothing.
--
-- The line is written by the database (DEFINER), because the caretaker who logs
-- the dose holds view_pet_records, not retail_process_sale. Its id is kept on
-- the item. If staff remove the line from the bill, it is not added back: the
-- facility waived it. An incident with no booking charges nothing.
--
-- Tested by supabase/tests/incidents.sql, I12–I15.
-- ============================================================================

alter table public.incident_care_items
  add column if not exists fee_line_item_id uuid;

create or replace function private.incident_care_item_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_pets uuid[];
  v_locked timestamptz;
begin
  select facility_id, pet_ids, in_stay_care_locked_at
    into v_facility, v_pets, v_locked
    from public.incidents where id = new.incident_id;
  if v_facility is null then
    raise exception 'No such incident.' using errcode = '23503';
  end if;
  if v_locked is not null then
    raise exception 'In-stay care was locked at checkout.' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.facility_id := v_facility;
    new.pet_ids := coalesce(v_pets, '{}');
    new.created_at := now();
    new.fee_line_item_id := null;
  else
    new.facility_id := old.facility_id;
    new.incident_id := old.incident_id;
    new.pet_ids := old.pet_ids;
    new.kind := old.kind;
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
    -- The bill link is the fee sync's alone.
    if coalesce(current_setting('yipyy.incident_fee_sync', true), '') <> 'on' then
      new.fee_line_item_id := old.fee_line_item_id;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

create or replace function private.incident_medication_fee_sync(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_item record;
  v_booking uuid;
  v_fee numeric(10,2);
  v_doses integer;
  v_quantity integer;
  v_line uuid;
begin
  select id, incident_id, facility_id, kind, name, detail, fee_line_item_id
    into v_item
    from public.incident_care_items where id = p_item_id;
  if v_item.id is null or v_item.kind <> 'medication'
     or coalesce((v_item.detail ->> 'chargeFee')::boolean, false) is not true then
    return;
  end if;

  v_fee := round(coalesce((v_item.detail ->> 'feeAmount')::numeric, 0), 2);
  if v_fee <= 0 then
    return;
  end if;

  select booking_id into v_booking from public.incidents where id = v_item.incident_id;
  if v_booking is null then
    return;
  end if;

  select count(*) into v_doses
    from public.incident_care_logs where care_item_id = v_item.id;
  if v_doses = 0 then
    return;
  end if;
  v_quantity := case when v_item.detail ->> 'feeType' = 'one_time' then 1 else v_doses end;

  if v_item.fee_line_item_id is not null then
    -- Removed from the bill by staff: waived, and stays waived.
    update public.booking_line_items
       set quantity = v_quantity
     where id = v_item.fee_line_item_id and quantity <> v_quantity;
    return;
  end if;

  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, source_id, author_name)
  values
    (v_booking, v_item.facility_id, 'fee', 'Medication: ' || v_item.name, v_fee,
     v_quantity, 'incident-medication:' || v_item.id::text, 'In-stay care')
  returning id into v_line;

  perform set_config('yipyy.incident_fee_sync', 'on', true);
  update public.incident_care_items set fee_line_item_id = v_line where id = v_item.id;
  perform set_config('yipyy.incident_fee_sync', '', true);
end;
$fn$;

create or replace function private.incident_care_log_charges_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform private.incident_medication_fee_sync(new.care_item_id);
  return null;
end;
$fn$;

drop trigger if exists incident_care_logs_charge_fee on public.incident_care_logs;
create trigger incident_care_logs_charge_fee
  after insert on public.incident_care_logs
  for each row execute function private.incident_care_log_charges_fee();

revoke all on function private.incident_care_item_guard() from public;
revoke all on function private.incident_care_item_guard() from anon;
revoke all on function private.incident_medication_fee_sync(uuid) from public;
revoke all on function private.incident_medication_fee_sync(uuid) from anon;
revoke all on function private.incident_medication_fee_sync(uuid) from authenticated;
revoke all on function private.incident_care_log_charges_fee() from public;
revoke all on function private.incident_care_log_charges_fee() from anon;

do $check$
begin
  if has_function_privilege('anon', 'private.incident_medication_fee_sync(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.incident_medication_fee_sync(uuid)', 'execute')
     or has_function_privilege('anon', 'private.incident_care_log_charges_fee()', 'execute')
     or has_function_privilege('anon', 'private.incident_care_item_guard()', 'execute') then
    raise exception 'an in-stay care fee function is callable by a session';
  end if;
end $check$;
