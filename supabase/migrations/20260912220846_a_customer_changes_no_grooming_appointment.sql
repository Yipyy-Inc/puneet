-- ============================================================================
-- A customer changes no grooming appointment, and the one their own request
-- creates carries no price and no clock.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- grooming_appointments_update and _insert (20260805140000) both admitted
-- private.can_write_booking(), whose customer branch is the pet's owner while
-- the booking is pending, request_submitted, estimate_sent or waitlisted. With
-- UPDATE granted on every column, that owner could set service_price,
-- check_in_at or groomer_notes on their own request through the API, and
-- insert a priced appointment onto a booking of theirs that had none.
-- Decided 2026-09-12: the appointment is the facility's.
--
-- ── NOTHING DEPENDED ON IT (checked on redesign and on main) ──────────────
--
--   - The grooming board's writes (station, checklist, ready time) are staff's.
--   - private.sync_grooming_lifecycle() stamps check-in and check-out as
--     SECURITY DEFINER, so an owner cancelling their own booking still works.
--   - Intake, notes, photos and history write their own tables.
--   - create_booking() inserts the owner's row as the owner (SECURITY
--     INVOKER) with service_price 0 and nothing else set, which the insert
--     rule below still admits.
--
-- ── STILL OPEN ────────────────────────────────────────────────────────────
--
-- A customer's request may name a station: create_booking() takes
-- p_grooming->>'stationId' from anyone, and the booking modal sends one in
-- customer mode too. A station is not money; it is recorded, not fixed here.
-- ============================================================================

create or replace function private.staff_can_write_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
      from public.bookings b
     where b.id = p_booking_id
       and (
         private.has_permission(b.facility_id, 'edit_bookings')
         or private.has_permission(b.facility_id, 'create_bookings')
       )
  );
$fn$;

comment on function private.staff_can_write_booking(uuid) is
  'private.can_write_booking() without its customer branch: staff with edit_bookings or create_bookings at the booking''s facility.';

revoke all on function private.staff_can_write_booking(uuid) from public;
revoke all on function private.staff_can_write_booking(uuid) from anon;
grant execute on function private.staff_can_write_booking(uuid) to authenticated;

drop policy if exists grooming_appointments_update on public.grooming_appointments;
create policy grooming_appointments_update on public.grooming_appointments
  for update to authenticated
  using (private.staff_can_write_booking(booking_id))
  with check (private.staff_can_write_booking(booking_id));

-- The owner keeps INSERT, because create_booking() writes their row as them,
-- but only a row shaped like the one it writes: no price, no clock, no
-- groomer's notes, an empty checklist.
drop policy if exists grooming_appointments_insert on public.grooming_appointments;
create policy grooming_appointments_insert on public.grooming_appointments
  for insert to authenticated
  with check (
    private.staff_can_write_booking(booking_id)
    or (
      private.can_write_booking(booking_id)
      and service_price = 0
      and check_in_at is null
      and check_out_at is null
      and estimated_ready_at is null
      and owner_eta_notified_at is null
      and groomer_notes = ''
      and session_progress = '[]'::jsonb
    )
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_function_privilege('anon', 'private.staff_can_write_booking(uuid)', 'execute') then
    raise exception 'anon can execute private.staff_can_write_booking()';
  end if;
  if not has_function_privilege('authenticated', 'private.staff_can_write_booking(uuid)', 'execute') then
    raise exception 'authenticated cannot execute private.staff_can_write_booking()';
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'grooming_appointments'
       and policyname = 'grooming_appointments_update'
       and qual ~ 'staff_can_write_booking'
       and qual !~ '[^_]can_write_booking'
  ) then
    raise exception 'grooming_appointments_update still admits the customer';
  end if;
end;
$check$;
