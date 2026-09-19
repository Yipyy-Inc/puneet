-- ============================================================================
-- A booking's changes record themselves.
--
-- Every booking page showed six invented "Change History" entries from a
-- fixture (removed 2026-09-18), and nothing recorded a real one: who confirmed
-- a request, who moved a stay, who changed a price was known to nobody. This
-- records them where they happen, in the database, so every writer is covered
-- — the booking page, the calendar, the requests page, the attendance mirror,
-- the customer's own cancel — and none can forget.
--
--   INSERT   "Booking created", with the status it was made in
--   UPDATE   one Data entry for what staff would call the booking — status,
--            start, end, the assigned staff member, the service type, the
--            notes — and one Financial entry for the price, the discount, the
--            total and the tip, so money is read only by who may read money
--
-- Derived columns (amount_paid, payment_status, extras_total, amount_due,
-- updated_at) are the payment ledger's echo and are not recorded again, and
-- `details` is not diffed: it is a bag of long-tail fields, and its changes are
-- not a booking's history. An update that changes none of the watched columns
-- records nothing.
--
-- It NEVER fails the write it is recording: the body is guarded, and a failure
-- is a warning in the log, not a refused booking.
--
-- Who reads it: a booking's entries (entity_type 'booking') are readable by a
-- member holding view_bookings for that facility — today only facility admins
-- read the audit log — and its Financial entries only by one who also holds
-- view_booking_financials, the permission the booking's own money is behind.
-- ============================================================================

create or replace function private.audit_booking_change()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_name   text;
  v_data   jsonb := '[]'::jsonb;
  v_money  jsonb := '[]'::jsonb;
  v_action text;
begin
  -- As audit_booking_location records it: the row id, and the ref as its name.
  v_name := new.ref::text;

  if tg_op = 'INSERT' then
    perform private.record_audit(
      'Booking created', 'Data', 'Low', 'booking', new.id::text, v_name,
      new.facility_id, null, null,
      jsonb_build_array(jsonb_build_object(
        'field', 'status', 'from', null, 'to', new.status::text)));
    return null;
  end if;

  if new.status is distinct from old.status then
    v_data := v_data || jsonb_build_object(
      'field', 'status', 'from', old.status::text, 'to', new.status::text);
  end if;
  if new.start_at is distinct from old.start_at then
    v_data := v_data || jsonb_build_object(
      'field', 'start', 'from', old.start_at, 'to', new.start_at);
  end if;
  if new.end_at is distinct from old.end_at then
    v_data := v_data || jsonb_build_object(
      'field', 'end', 'from', old.end_at, 'to', new.end_at);
  end if;
  if new.assigned_staff_id is distinct from old.assigned_staff_id then
    v_data := v_data || jsonb_build_object(
      'field', 'staff',
      'from', old.assigned_staff_name, 'to', new.assigned_staff_name);
  end if;
  if new.service_type is distinct from old.service_type then
    v_data := v_data || jsonb_build_object(
      'field', 'serviceType', 'from', old.service_type, 'to', new.service_type);
  end if;
  if new.special_requests is distinct from old.special_requests then
    v_data := v_data || jsonb_build_object(
      'field', 'notes', 'from', old.special_requests, 'to', new.special_requests);
  end if;

  if new.base_price is distinct from old.base_price then
    v_money := v_money || jsonb_build_object(
      'field', 'basePrice', 'from', old.base_price, 'to', new.base_price);
  end if;
  if new.discount is distinct from old.discount then
    v_money := v_money || jsonb_build_object(
      'field', 'discount', 'from', old.discount, 'to', new.discount);
  end if;
  if new.total_cost is distinct from old.total_cost then
    v_money := v_money || jsonb_build_object(
      'field', 'total', 'from', old.total_cost, 'to', new.total_cost);
  end if;
  if new.tip_amount is distinct from old.tip_amount then
    v_money := v_money || jsonb_build_object(
      'field', 'tip', 'from', old.tip_amount, 'to', new.tip_amount);
  end if;

  if jsonb_array_length(v_data) > 0 then
    v_action := case
      when new.status is distinct from old.status then 'Booking status changed'
      when new.start_at is distinct from old.start_at
        or new.end_at is distinct from old.end_at then 'Booking rescheduled'
      else 'Booking updated'
    end;
    perform private.record_audit(
      v_action, 'Data', 'Low', 'booking', new.id::text, v_name,
      new.facility_id, null, null, v_data);
  end if;

  if jsonb_array_length(v_money) > 0 then
    perform private.record_audit(
      'Booking price changed', 'Financial', 'Medium', 'booking',
      new.id::text, v_name, new.facility_id, null, null, v_money);
  end if;

  return null;
exception when others then
  -- The history is not worth a refused booking.
  raise warning 'booking % history not recorded: %', new.ref, sqlerrm;
  return null;
end;
$fn$;

revoke all on function private.audit_booking_change() from public;
revoke all on function private.audit_booking_change() from anon;
revoke all on function private.audit_booking_change() from authenticated;

drop trigger if exists bookings_record_history on public.bookings;
create trigger bookings_record_history
  after insert or update on public.bookings
  for each row execute function private.audit_booking_change();

-- A booking's history, for the people who may see the booking.
drop policy if exists audit_log_booking_read on public.audit_log;
create policy audit_log_booking_read on public.audit_log
  for select to authenticated
  using (
    entity_type = 'booking'
    and facility_id is not null
    and private.has_permission(facility_id, 'view_bookings')
    -- The booking itself must be one the reader can see: bookings' own RLS
    -- runs in this subquery, so a member scoped to their assigned bookings
    -- reads the history of those and no others.
    and exists (select 1 from public.bookings b where b.id::text = entity_id)
    and (
      category <> 'Financial'
      or private.has_permission(facility_id, 'view_booking_financials')
    )
  );

-- The booking page asks for one booking's entries, newest first.
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id, occurred_at desc);
