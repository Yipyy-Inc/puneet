-- ============================================================================
-- Grooming stations — RLS, the status clock, and the assignment (20260805180000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-stations-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE STATUS CLOCK ONLY MOVES WHEN THE STATUS DOES (T2/T3). A groomer reads
--    `status_changed_at` as "needs cleaning for 8 minutes". A plain
--    set-on-update would restart that counter every time somebody renamed the
--    tub, and the board would quietly under-report how long a station has been
--    dirty.
--
--    NOTE ON THE CLOCK ITSELF: the trigger uses clock_timestamp(), not now().
--    That is not a style choice — `now()` is transaction-START time, so within
--    one transaction it cannot move at all, and this behaviour was literally
--    untestable until the column stopped using it. It is also more correct: a
--    batch marking six tubs clean should stamp each when it was touched, not
--    all with the instant the batch opened.
--
-- 2. THE CLOCK IS THE SERVER'S (T3b). The trigger overwrites whatever the
--    caller sends, so a status change cannot be back-dated to make a station
--    look freshly cleaned.
--
-- 3. OCCUPANCY IS DERIVED (T8). The mock stored currentPetName /
--    currentStylistName / estimatedCompletionAt ON the station. Those are facts
--    about the APPOINTMENT, and two copies of one fact is two things that can
--    disagree — with the stale one being the board a groomer is reading. The
--    table stores none of them; T8 proves the join answers the question.
--
-- 4. A STATION CANNOT CROSS FACILITIES (T4), and removing one does not delete
--    the history that happened on it (T7).
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture: two facilities that both name a station "gs-t-01" ─────────────
-- The realistic case: legacy ids come from a shared mock, so a missing facility
-- predicate does not merely leak a row — it shows a manager someone else's
-- equipment under their own station's id.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000c0001', 'gs-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000000c0003', 'gs-client@example.invalid'),
  ('00000000-0000-0000-0000-0000000c0004', 'gs-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000c0001', 'gs-owner@example.invalid',  'Owner'),
  ('00000000-0000-0000-0000-0000000c0003', 'gs-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000000c0004', 'gs-rival@example.invalid',  'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000c0010', 'GS Org',   'gs-org'),
  ('00000000-0000-0000-0000-0000000c0011', 'GS Rival', 'gs-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000c0020', '00000000-0000-0000-0000-0000000c0010',
   'Salon A', 'gs-a', 'gs-a'),
  ('00000000-0000-0000-0000-0000000c0021', '00000000-0000-0000-0000-0000000c0011',
   'Salon B', 'gs-b', 'gs-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000c0030', '00000000-0000-0000-0000-0000000c0020',
   '00000000-0000-0000-0000-0000000c0001', 'owner', true),
  ('00000000-0000-0000-0000-0000000c0031', '00000000-0000-0000-0000-0000000c0021',
   '00000000-0000-0000-0000-0000000c0004', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000000c0040', '00000000-0000-0000-0000-0000000c0020',
   'Client', 'gs-client@example.invalid', '00000000-0000-0000-0000-0000000c0003');

insert into public.grooming_stations
  (id, facility_id, legacy_id, name, type, allowed_pet_sizes, max_weight_lbs)
values
  ('00000000-0000-0000-0000-0000000c0050', '00000000-0000-0000-0000-0000000c0020',
   'gs-t-01', 'Table 1', 'table', array['small','medium','large'], 70),
  ('00000000-0000-0000-0000-0000000c0051', '00000000-0000-0000-0000-0000000c0021',
   'gs-t-01', 'Rival Table 1', 'table', array['small'], 20),
  ('00000000-0000-0000-0000-0000000c0052', '00000000-0000-0000-0000-0000000c0020',
   'gs-t-02', 'Table 2', 'table', '{}', null);

insert into public.grooming_services (id, facility_id, legacy_id, name, base_price, duration_min) values
  ('00000000-0000-0000-0000-0000000c0060', '00000000-0000-0000-0000-0000000c0020',
   'p1', 'Full Groom', 80, 90);

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
values
  ('00000000-0000-0000-0000-0000000c0070', '00000000-0000-0000-0000-0000000c0020',
   '00000000-0000-0000-0000-0000000c0040', 'Full Groom', 'grooming', 'confirmed',
   '2026-08-07T10:00:00Z', '2026-08-07T11:30:00Z', 80, 80);

-- ── T1: stamped on insert ───────────────────────────────────────────────────
do $$
declare sc timestamptz;
begin
  perform set_config('request.jwt.claims', '', true);
  select status_changed_at into sc from public.grooming_stations
   where id = '00000000-0000-0000-0000-0000000c0050';
  perform pg_temp.t('T1  status_changed_at is stamped on insert', sc is not null);
end $$;

-- ── T2: an unrelated edit does NOT restart the clock ────────────────────────
do $$
declare b timestamptz; a timestamptz;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0001', 'role', 'authenticated')::text, true);
  select status_changed_at into b from public.grooming_stations
   where id = '00000000-0000-0000-0000-0000000c0050';
  set local role authenticated;
  update public.grooming_stations
     set name = 'Table One', staff_notes = 'moved left'
   where id = '00000000-0000-0000-0000-0000000c0050';
  reset role;
  select status_changed_at into a from public.grooming_stations
   where id = '00000000-0000-0000-0000-0000000c0050';
  perform pg_temp.t('T2  renaming a station does NOT restart its status clock',
    b = a, format('unchanged=%s', b = a));
exception when others then
  reset role; perform pg_temp.t('T2  status clock', false, sqlerrm);
end $$;

-- ── T3: a status change DOES ────────────────────────────────────────────────
-- Arms T2: without this, T2 would pass against a trigger that never stamps.
do $$
declare b timestamptz; a timestamptz;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0001', 'role', 'authenticated')::text, true);
  select status_changed_at into b from public.grooming_stations
   where id = '00000000-0000-0000-0000-0000000c0050';
  set local role authenticated;
  update public.grooming_stations set status = 'needs-cleaning'
   where id = '00000000-0000-0000-0000-0000000c0050';
  reset role;
  select status_changed_at into a from public.grooming_stations
   where id = '00000000-0000-0000-0000-0000000c0050';
  perform pg_temp.t('T3  a status change DOES move it (T2 not vacuous)',
    a > b, format('moved=%s', a > b));
exception when others then
  reset role; perform pg_temp.t('T3  status clock', false, sqlerrm);
end $$;

-- ── T3b: the clock cannot be back-dated ─────────────────────────────────────
-- A caller sending 2020 alongside a real status change would otherwise make a
-- filthy tub look like it was cleaned years ago and never flag on the board.
do $$
declare a timestamptz;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.grooming_stations
     set status = 'out-of-service', status_changed_at = '2020-01-01T00:00:00Z'
   where id = '00000000-0000-0000-0000-0000000c0050';
  reset role;
  select status_changed_at into a from public.grooming_stations
   where id = '00000000-0000-0000-0000-0000000c0050';
  perform pg_temp.t('T3b a caller cannot back-date the status clock',
    a > '2021-01-01'::timestamptz, format('stored_year=%s', extract(year from a)));
exception when others then
  reset role; perform pg_temp.t('T3b back-dating', false, sqlerrm);
end $$;

-- ── T4: a station cannot cross facilities ───────────────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_appointments
      (booking_id, facility_id, service_id, service_name, service_price,
       service_duration_min, station_id)
    values ('00000000-0000-0000-0000-0000000c0070', '00000000-0000-0000-0000-0000000c0020',
            '00000000-0000-0000-0000-0000000c0060', 'Full Groom', 80, 90,
            '00000000-0000-0000-0000-0000000c0051');   -- Salon B's table
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T4  cannot park a booking on another facility''s station', ok);
exception when others then
  reset role; perform pg_temp.t('T4  cross-facility station', false, sqlerrm);
end $$;

-- ── T4b: …and the facility's own works ──────────────────────────────────────
do $$
declare sid uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_appointments
    (booking_id, facility_id, service_id, service_name, service_price,
     service_duration_min, station_id)
  values ('00000000-0000-0000-0000-0000000c0070', '00000000-0000-0000-0000-0000000c0020',
          '00000000-0000-0000-0000-0000000c0060', 'Full Groom', 80, 90,
          '00000000-0000-0000-0000-0000000c0052');
  reset role;
  select station_id into sid from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-0000000c0070';
  perform pg_temp.t('T4b the facility''s OWN station assigns fine (T4 not vacuous)',
    sid = '00000000-0000-0000-0000-0000000c0052');
exception when others then
  reset role; perform pg_temp.t('T4b same-facility station', false, sqlerrm);
end $$;

-- ── T5: a client sees no stations ───────────────────────────────────────────
-- A customer picks a time, not a bathtub.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into c from public.grooming_stations;
  reset role;
  perform pg_temp.t('T5  a client sees no stations', c = 0, format('visible=%s', c));
exception when others then
  reset role; perform pg_temp.t('T5  client read', false, sqlerrm);
end $$;

-- ── T6: facility isolation ──────────────────────────────────────────────────
do $$
declare c integer; nm text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*), min(name) into c, nm from public.grooming_stations;
  reset role;
  perform pg_temp.t('T6  a rival sees only its own stations',
    c = 1 and nm = 'Rival Table 1', format('count=%s name=%s', c, nm));
exception when others then
  reset role; perform pg_temp.t('T6  isolation', false, sqlerrm);
end $$;

-- ── T8: occupancy is DERIVED ────────────────────────────────────────────────
-- The join the API performs. Asserted before T7 deletes the station.
do $$
declare occupied integer;
begin
  perform set_config('request.jwt.claims', '', true);
  update public.bookings set status = 'checked_in'
   where id = '00000000-0000-0000-0000-0000000c0070';

  select count(*) into occupied
    from public.grooming_stations s
    join public.grooming_appointments a on a.station_id = s.id
    join public.bookings b on b.id = a.booking_id
   where s.id = '00000000-0000-0000-0000-0000000c0052'
     and b.status in ('checked_in', 'in_progress');
  perform pg_temp.t('T8  occupancy is derivable from the appointment, not stored',
    occupied = 1, format('occupied_stations=%s', occupied));
end $$;

-- ── T7: removing a station keeps the history ────────────────────────────────
do $$
declare cnt integer; sid uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  delete from public.grooming_stations where id = '00000000-0000-0000-0000-0000000c0052';
  reset role;
  select count(*) into cnt from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-0000000c0070';
  select station_id into sid from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-0000000c0070';
  perform pg_temp.t('T7  removing a station keeps the appointment, nulls the table',
    cnt = 1 and sid is null,
    format('appointments=%s station=%s', cnt, coalesce(sid::text, '<null>')));
exception when others then
  reset role; perform pg_temp.t('T7  station removal', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
