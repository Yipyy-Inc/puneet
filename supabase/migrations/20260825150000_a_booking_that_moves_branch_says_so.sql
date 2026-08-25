-- ============================================================================
-- Moving a booking to another branch is a sensitive act, and now it records
-- itself.
--
-- `bookings.location_id` has existed since 20260801120000 and could only ever
-- be set once, at creation, resolved from the session -- there was no way to
-- move an EXISTING booking to another branch, and nothing would have audited
-- it if there had been. The application-level write path (the PATCH route,
-- 20260825150000-adjacent app change) is what makes the column reachable;
-- this trigger is what makes the reach worth having.
--
-- Mirrors `private.audit_subscription_status`
-- (20260807480000_the_sensitive_acts_record_themselves.sql:76-102) exactly:
-- SECURITY DEFINER so it can insert into `audit_log` regardless of the
-- caller's own grants, `is not distinct from` to ignore every other column
-- change, and a `changes` array shaped for `toAuditLogEntry` to render
-- without a new client-side transform.
-- ============================================================================

create or replace function private.audit_booking_location()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_facility_name text;
  v_from_name text;
  v_to_name text;
begin
  if new.location_id is not distinct from old.location_id then
    return null;
  end if;

  select name into v_facility_name from public.facilities where id = new.facility_id;
  select name into v_from_name from public.locations where id = old.location_id;
  select name into v_to_name from public.locations where id = new.location_id;

  -- 'Data' is the closest fit of the six categories audit_log's own CHECK
  -- constraint allows ('Financial','User Access','Configuration','Security',
  -- 'Data','System') -- a booking is business data, not a permission or a
  -- money event on its own.
  perform private.record_audit(
    'Booking transferred',
    'Data',
    'Medium',
    'booking',
    new.id::text,
    new.ref::text,
    new.facility_id,
    v_facility_name,
    format('Booking %s moved: %s -> %s',
      new.ref, coalesce(v_from_name, 'no branch'), coalesce(v_to_name, 'no branch')),
    jsonb_build_array(jsonb_build_object(
      'field', 'location_id', 'from', old.location_id, 'to', new.location_id)));

  return null;
end;
$fn$;

drop trigger if exists bookings_audit_location on public.bookings;
create trigger bookings_audit_location
  after update of location_id on public.bookings
  for each row execute function private.audit_booking_location();
