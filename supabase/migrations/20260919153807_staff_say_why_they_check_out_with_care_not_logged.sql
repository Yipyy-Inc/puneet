-- ============================================================================
-- Staff say why they check a pet out with today's care not logged.
--
-- Checkout asks when a meal or a dose planned for today is not marked done,
-- and "Check out anyway" went ahead with a toast — nothing kept who decided it,
-- or why. Now the reason is required and kept, append-only, in
-- care_gate_overrides, with the items that were not logged, and the booking's
-- history shows it (an audit_log entry on the booking, like its other changes).
--
-- Who may: whoever may check the pet out — edit_bookings, check_in_out or
-- daycare_check_in_out at the booking's facility. A booking that does not
-- exist and one that is not the caller's get the same answer. Nobody updates
-- or deletes a row: the table grants no write to anyone but through the
-- function. SQL in care-gate-overrides.sql.
-- ============================================================================

create table public.care_gate_overrides (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  has_critical boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

create index care_gate_overrides_booking_idx
  on public.care_gate_overrides (booking_id);

alter table public.care_gate_overrides enable row level security;

create policy care_gate_overrides_read on public.care_gate_overrides
  for select to authenticated
  using (
    private.is_platform_admin()
    or facility_id in (select private.permitted_facility_ids('view_bookings'))
  );

revoke all on public.care_gate_overrides from public, anon, authenticated, service_role;
grant select on public.care_gate_overrides to authenticated;
grant select, insert on public.care_gate_overrides to service_role;

create or replace function public.record_care_gate_override(
  p_booking_id uuid,
  p_reason text,
  p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking  public.bookings;
  v_reason   text := nullif(btrim(coalesce(p_reason, '')), '');
  v_items    jsonb;
  v_critical boolean;
  v_id       uuid;
begin
  select * into v_booking from public.bookings b where b.id = p_booking_id;

  if not found
     or not (
       private.has_permission(v_booking.facility_id, 'edit_bookings')
       or private.has_permission(v_booking.facility_id, 'check_in_out')
       or private.has_permission(v_booking.facility_id, 'daycare_check_in_out')
     )
  then
    raise exception 'Not allowed to check this booking out.'
      using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'A reason is required to check out with care not logged.'
      using errcode = '22023';
  end if;

  -- Only what the screen shows: the kind, the label and whether it was
  -- critical, at most fifty of them.
  select coalesce(jsonb_agg(jsonb_build_object(
           'kind', left(coalesce(e->>'kind', ''), 40),
           'label', left(coalesce(e->>'label', ''), 200),
           'critical', coalesce((e->>'critical')::boolean, false))), '[]'::jsonb)
    into v_items
    from (select e from jsonb_array_elements(
            case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) e
          limit 50) x;

  v_critical := exists (select 1 from jsonb_array_elements(v_items) e
                         where (e->>'critical')::boolean);

  insert into public.care_gate_overrides
    (facility_id, booking_id, reason, items, has_critical, created_by)
  values
    (v_booking.facility_id, v_booking.id, left(v_reason, 500), v_items,
     v_critical, auth.jwt()->>'sub')
  returning id into v_id;

  perform private.record_audit(
    'Checked out with care not logged', 'Data',
    case when v_critical then 'Medium' else 'Low' end,
    'booking', v_booking.id::text, v_booking.ref::text,
    v_booking.facility_id, null, left(v_reason, 500),
    jsonb_build_array(jsonb_build_object(
      'field', 'careGate', 'from', v_items, 'to', left(v_reason, 500))));

  return v_id;
end;
$$;

revoke all on function public.record_care_gate_override(uuid, text, jsonb) from public;
revoke all on function public.record_care_gate_override(uuid, text, jsonb) from anon;
grant execute on function public.record_care_gate_override(uuid, text, jsonb)
  to authenticated, service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.record_care_gate_override(uuid,text,jsonb)', 'execute') then
    raise exception 'anon can execute record_care_gate_override';
  end if;
  if not has_function_privilege('authenticated', 'public.record_care_gate_override(uuid,text,jsonb)', 'execute') then
    raise exception 'authenticated cannot execute record_care_gate_override';
  end if;
  if has_table_privilege('authenticated', 'public.care_gate_overrides', 'insert')
     or has_table_privilege('authenticated', 'public.care_gate_overrides', 'update')
     or has_table_privilege('authenticated', 'public.care_gate_overrides', 'delete') then
    raise exception 'authenticated can write care_gate_overrides directly';
  end if;
  if has_table_privilege('anon', 'public.care_gate_overrides', 'select') then
    raise exception 'anon can read care_gate_overrides';
  end if;
end
$check$;
