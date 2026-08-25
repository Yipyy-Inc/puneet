-- ============================================================================
-- Moving a booking to another branch records itself, and nothing else does.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/audit-booking-location.sql
--
-- One transaction, rolled back — audit_log is append-only by trigger, so a
-- test that committed could never clean up after itself.
--
-- T3 is the point of the file as much as T1 is: `is not distinct from` has to
-- ignore every OTHER column change, or "Booking transferred" would fire on
-- every ordinary edit and the trail would be noise nobody reads, the same
-- failure mode `audit-scheduling-and-facility-read.sql` T4 already guards
-- against for shifts.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_fac       uuid;
  v_from_loc  uuid;
  v_to_loc    uuid;
  v_booking   uuid;
  v_ref       bigint;
  n           int;
begin
  select id into v_fac from public.facilities where legacy_id = '11';

  select id into v_from_loc from public.locations where facility_id = v_fac and is_primary;
  insert into public.locations (facility_id, name, is_primary)
    values (v_fac, 'Audit Probe Branch', false)
    returning id into v_to_loc;

  select id, ref into v_booking, v_ref
    from public.bookings where facility_id = v_fac limit 1;

  if v_booking is null then
    raise exception 'no booking on facility 11 — this test needs one';
  end if;

  -- Baseline: this booking already sits at its primary location (the seed
  -- guarantees every booking got one), so the first UPDATE below is a real
  -- change, not a no-op the trigger would correctly ignore.
  update public.bookings set location_id = v_from_loc where id = v_booking;

  -- ── the move ─────────────────────────────────────────────────────────────

  update public.bookings set location_id = v_to_loc where id = v_booking;

  select count(*) into n from public.audit_log
   where entity_type = 'booking' and entity_id = v_booking::text
     and action = 'Booking transferred';
  perform pg_temp.t(1, 'moving a booking records it', n = 1, n::text);

  select count(*) into n from public.audit_log
   where entity_type = 'booking' and entity_id = v_booking::text
     and action = 'Booking transferred'
     and entity_name = v_ref::text;
  perform pg_temp.t(2, 'the entry names the booking by its ref', n = 1, n::text);

  select count(*) into n from public.audit_log
   where entity_type = 'booking' and entity_id = v_booking::text
     and action = 'Booking transferred'
     and changes = jsonb_build_array(jsonb_build_object(
         'field', 'location_id', 'from', v_from_loc, 'to', v_to_loc));
  perform pg_temp.t(3, 'the changes array names the from/to branch', n = 1, n::text);

  -- ── what must NOT fire it ────────────────────────────────────────────────

  update public.bookings set special_requests = 'no nuts please' where id = v_booking;
  select count(*) into n from public.audit_log
   where entity_type = 'booking' and entity_id = v_booking::text
     and action = 'Booking transferred';
  perform pg_temp.t(4, 'an unrelated edit does not record a second transfer', n = 1, n::text);

  update public.bookings set location_id = v_to_loc where id = v_booking;
  select count(*) into n from public.audit_log
   where entity_type = 'booking' and entity_id = v_booking::text
     and action = 'Booking transferred';
  perform pg_temp.t(5, 'setting the SAME location again records nothing new', n = 1, n::text);

  -- A location with a booking against it cannot be deleted at all (the
  -- guard from 20260825095825) -- move the booking off it first, same as a
  -- real "close this branch" flow would have to.
  update public.bookings set location_id = v_from_loc where id = v_booking;
  delete from public.locations where id = v_to_loc;

  -- `changes` is jsonb, not a live reference to `locations` -- deleting the
  -- branch must not corrupt or blank the history that already named it.
  select count(*) into n from public.audit_log
   where entity_type = 'booking' and entity_id = v_booking::text
     and action = 'Booking transferred'
     and changes @> jsonb_build_array(jsonb_build_object('to', v_to_loc));
  perform pg_temp.t(6, 'the audit trail keeps the id after the branch is later deleted',
    n = 1, n::text);
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
