-- ============================================================================
-- The grooming waitlist — RLS, the derived anchor, and the offer clock
-- (20260806100000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-waitlist-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE UNION CANNOT BE MALFORMED (T1). `expectedDate` is a 4-way
--    discriminated union and `expectedTime` a 3-way. Stored as jsonb they
--    would accept `{"kind":"range"}` with no dates — and the symptom would not
--    be an error, it would be the matcher silently skipping that entry: a
--    client sitting on the waitlist who is never offered anything. T1 proves
--    each broken combination is refused by the database.
--
-- 2. THE ANCHOR IS THE DATABASE'S (T2/T3). The calendar counts waitlist
--    entries per day off one date. Deriving it from the preference is the only
--    way that count cannot point at a day the matcher will never offer — so
--    a caller-supplied anchor is discarded, and an unrelated edit does not
--    move it.
--
-- 3. THE OFFER DEADLINE IS THE SERVER'S (T4/T4b). `offered_until` decides
--    whether a client still holds a slot. If the caller sets it, the caller
--    decides how long they hold it — so the caller sends a WINDOW and the
--    trigger stamps the clock. T4b proves a supplied deadline is thrown away.
--
-- 4. READING THE QUEUE IS NOT EDITING IT (T7). A groomer has `view_bookings`
--    but not `edit_bookings`: they can see who is waiting and cannot promise
--    anybody a slot.
--
-- 5. AN ENTRY CANNOT REACH ACROSS FACILITIES (T5/T6) — not for a client, and
--    not for a preferred groomer. Every FK here only says the row exists.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture: two facilities, plus a groomer who may look but not touch ──────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000d0001', 'wl-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000000d0002', 'wl-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000000d0003', 'wl-client@example.invalid'),
  ('00000000-0000-0000-0000-0000000d0004', 'wl-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000d0001', 'wl-owner@example.invalid',   'Owner'),
  ('00000000-0000-0000-0000-0000000d0002', 'wl-groomer@example.invalid', 'Groomer'),
  ('00000000-0000-0000-0000-0000000d0003', 'wl-client@example.invalid',  'Client'),
  ('00000000-0000-0000-0000-0000000d0004', 'wl-rival@example.invalid',   'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000d0010', 'WL Org',   'wl-org'),
  ('00000000-0000-0000-0000-0000000d0011', 'WL Rival', 'wl-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000000d0020', '00000000-0000-0000-0000-0000000d0010',
   'Salon A', 'wl-a', 'wl-a', 'America/Toronto'),
  ('00000000-0000-0000-0000-0000000d0021', '00000000-0000-0000-0000-0000000d0011',
   'Salon B', 'wl-b', 'wl-b', 'America/Toronto')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000d0030', '00000000-0000-0000-0000-0000000d0020',
   '00000000-0000-0000-0000-0000000d0001', 'owner', true),
  -- `groomer` holds view_bookings (assigned_shifts) and NO edit_bookings.
  ('00000000-0000-0000-0000-0000000d0031', '00000000-0000-0000-0000-0000000d0020',
   '00000000-0000-0000-0000-0000000d0002', 'groomer', true),
  ('00000000-0000-0000-0000-0000000d0032', '00000000-0000-0000-0000-0000000d0021',
   '00000000-0000-0000-0000-0000000d0004', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000000d0040', '00000000-0000-0000-0000-0000000d0020',
   'Client A', 'wl-client@example.invalid', '00000000-0000-0000-0000-0000000d0003'),
  ('00000000-0000-0000-0000-0000000d0041', '00000000-0000-0000-0000-0000000d0021',
   'Rival Client', 'wl-rival-client@example.invalid', null);

insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role)
values
  ('00000000-0000-0000-0000-0000000d0050', '00000000-0000-0000-0000-0000000d0020',
   '00000000-0000-0000-0000-0000000d0031', 'wl-groom-a',
   'Groomer', 'A', 'wl-groomer@example.invalid', 'groomer'),
  ('00000000-0000-0000-0000-0000000d0051', '00000000-0000-0000-0000-0000000d0021',
   null, 'wl-groom-b',
   'Groomer', 'B', 'wl-groom-b@example.invalid', 'groomer');

insert into public.grooming_services (id, facility_id, legacy_id, name, base_price, duration_min) values
  ('00000000-0000-0000-0000-0000000d0060', '00000000-0000-0000-0000-0000000d0020',
   'p1', 'Full Groom', 80, 90);

-- ── T1: the union cannot be malformed ───────────────────────────────────────
-- Six shapes that a jsonb column would have swallowed. Each must be refused by
-- a CHECK, not by an error further downstream.
do $$
declare
  bad integer := 0;
  attempts integer := 0;
  detail text := '';
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;

  -- 1a range with no dates
  begin
    attempts := attempts + 1;
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name, expected_date_kind)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom', 'range');
    bad := bad + 1; detail := detail || 'range-no-dates ';
  exception when check_violation then null; end;

  -- 1b specific-date carrying a weekday array
  begin
    attempts := attempts + 1;
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name,
       expected_date_kind, expected_date, expected_days_of_week)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom',
            'specific-date', current_date, array[2,4]::smallint[]);
    bad := bad + 1; detail := detail || 'specific+dow ';
  exception when check_violation then null; end;

  -- 1c a weekday outside 0..6
  begin
    attempts := attempts + 1;
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name,
       expected_date_kind, expected_days_of_week)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom',
            'day-of-week', array[7]::smallint[]);
    bad := bad + 1; detail := detail || 'dow-7 ';
  exception when check_violation then null; end;

  -- 1d a range that ends before it starts
  begin
    attempts := attempts + 1;
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name,
       expected_date_kind, expected_start_date, expected_end_date)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom',
            'range', current_date + 5, current_date + 1);
    bad := bad + 1; detail := detail || 'backwards-range ';
  exception when check_violation then null; end;

  -- 1e period with no period
  begin
    attempts := attempts + 1;
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name,
       expected_date_kind, expected_time_kind)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom',
            'asap', 'period');
    bad := bad + 1; detail := detail || 'period-empty ';
  exception when check_violation then null; end;

  -- 1f anytime carrying an exact time
  begin
    attempts := attempts + 1;
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name,
       expected_date_kind, expected_time_kind, expected_time)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom',
            'asap', 'anytime', '11:00');
    bad := bad + 1; detail := detail || 'anytime+time ';
  exception when check_violation then null; end;

  reset role;
  perform pg_temp.t('T1  every malformed preference shape is refused',
    bad = 0 and attempts = 6,
    format('attempted=%s accepted=%s %s', attempts, bad, detail));
exception when others then
  reset role; perform pg_temp.t('T1  preference shapes', false, sqlerrm);
end $$;

-- ── T2: the anchor is derived, per kind ─────────────────────────────────────
-- Arms T1: without this the CHECK could be refusing everything.
do $$
declare
  today date := (now() at time zone 'America/Toronto')::date;
  a_asap date; a_spec date; a_range date; a_dow date;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;

  insert into public.grooming_waitlist_entries
    (id, facility_id, pet_name, owner_name, service_name, expected_date_kind)
  values ('00000000-0000-0000-0000-0000000d0070', '00000000-0000-0000-0000-0000000d0020',
          'Mochi', 'Aman', 'Full Groom', 'asap')
  returning anchor_date into a_asap;

  insert into public.grooming_waitlist_entries
    (id, facility_id, pet_name, owner_name, service_name,
     expected_date_kind, expected_date, anchor_date)
  values ('00000000-0000-0000-0000-0000000d0071', '00000000-0000-0000-0000-0000000d0020',
          'Biscuit', 'Marie', 'Full Groom', 'specific-date', today + 10, today + 999)
  returning anchor_date into a_spec;

  insert into public.grooming_waitlist_entries
    (id, facility_id, pet_name, owner_name, service_name,
     expected_date_kind, expected_start_date, expected_end_date)
  values ('00000000-0000-0000-0000-0000000d0072', '00000000-0000-0000-0000-0000000d0020',
          'Pixel', 'Jordan', 'Full Groom', 'range', today + 3, today + 9)
  returning anchor_date into a_range;

  -- The only weekday named is four days out, so that is the only answer.
  insert into public.grooming_waitlist_entries
    (id, facility_id, pet_name, owner_name, service_name,
     expected_date_kind, expected_days_of_week)
  values ('00000000-0000-0000-0000-0000000d0073', '00000000-0000-0000-0000-0000000d0020',
          'Tofu', 'Sasha', 'Full Groom', 'day-of-week',
          array[extract(dow from today + 4)::smallint])
  returning anchor_date into a_dow;

  reset role;
  perform pg_temp.t('T2  the anchor date is derived from the preference, per kind',
    a_asap = today and a_spec = today + 10 and a_range = today + 3 and a_dow = today + 4,
    format('asap=%s specific=%s range=%s dow=%s', a_asap, a_spec, a_range, a_dow));
exception when others then
  reset role; perform pg_temp.t('T2  anchor derivation', false, sqlerrm);
end $$;

-- ── T3: a caller cannot set the anchor, and an unrelated edit does not move it
-- T2's specific-date row was inserted with anchor_date = today + 999 and came
-- back as today + 10, so the insert path is already proven. This is the update
-- path: correcting a phone number must not relocate somebody on the calendar.
do $$
declare
  today date := (now() at time zone 'America/Toronto')::date;
  a date;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  update public.grooming_waitlist_entries
     set owner_phone = '(514) 555-0000', anchor_date = today + 999
   where id = '00000000-0000-0000-0000-0000000d0071'
  returning anchor_date into a;
  reset role;
  perform pg_temp.t('T3  an unrelated edit cannot move the anchor',
    a = today + 10, format('anchor=%s expected=%s', a, today + 10));
exception when others then
  reset role; perform pg_temp.t('T3  anchor immutability', false, sqlerrm);
end $$;

-- ── T3b: changing the preference DOES move it (T3 not vacuous) ──────────────
do $$
declare
  today date := (now() at time zone 'America/Toronto')::date;
  a date;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  update public.grooming_waitlist_entries
     set expected_date = today + 20
   where id = '00000000-0000-0000-0000-0000000d0071'
  returning anchor_date into a;
  reset role;
  perform pg_temp.t('T3b changing the preference DOES move the anchor',
    a = today + 20, format('anchor=%s', a));
exception when others then
  reset role; perform pg_temp.t('T3b anchor recompute', false, sqlerrm);
end $$;

-- ── T4: the offer window is honoured ────────────────────────────────────────
do $$
declare at_ timestamptz; until_ timestamptz; mins numeric;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  update public.grooming_waitlist_entries
     set status = 'offered', offered_slot = '10:00-11:30', offer_window_minutes = 120
   where id = '00000000-0000-0000-0000-0000000d0070'
  returning offered_at, offered_until into at_, until_;
  reset role;
  mins := round(extract(epoch from (until_ - at_)) / 60);
  perform pg_temp.t('T4  offering a slot stamps a deadline one window out',
    at_ is not null and mins = 120, format('window=%s min', mins));
exception when others then
  reset role; perform pg_temp.t('T4  offer window', false, sqlerrm);
end $$;

-- ── T4b: a caller cannot extend their own deadline ──────────────────────────
-- The whole point of Table 96 is that an unanswered offer passes to the next
-- client. A caller-set `offered_until` is a caller-set entitlement.
do $$
declare until_ timestamptz;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  update public.grooming_waitlist_entries
     set offered_until = now() + interval '100 days'
   where id = '00000000-0000-0000-0000-0000000d0070'
  returning offered_until into until_;
  reset role;
  perform pg_temp.t('T4b a caller cannot extend an offer deadline',
    until_ < now() + interval '1 day',
    format('until=%s', until_));
exception when others then
  reset role; perform pg_temp.t('T4b deadline immutability', false, sqlerrm);
end $$;

-- ── T4c: re-queueing clears the stale offer ─────────────────────────────────
do $$
declare at_ timestamptz; until_ timestamptz; slot text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  update public.grooming_waitlist_entries set status = 'waiting'
   where id = '00000000-0000-0000-0000-0000000d0070'
  returning offered_at, offered_until, offered_slot into at_, until_, slot;
  reset role;
  perform pg_temp.t('T4c putting somebody back in the queue clears the old offer',
    at_ is null and until_ is null and slot is null,
    format('at=%s slot=%s', coalesce(at_::text,'<null>'), coalesce(slot,'<null>')));
exception when others then
  reset role; perform pg_temp.t('T4c re-queue', false, sqlerrm);
end $$;

-- ── T5: an entry cannot name another facility's client ──────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  begin
    insert into public.grooming_waitlist_entries
      (facility_id, client_id, pet_name, owner_name, service_name, expected_date_kind)
    values ('00000000-0000-0000-0000-0000000d0020',
            '00000000-0000-0000-0000-0000000d0041',   -- Salon B's client
            'P', 'O', 'Full Groom', 'asap');
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T5  cannot waitlist another facility''s client', ok);
exception when others then
  reset role; perform pg_temp.t('T5  cross-facility client', false, sqlerrm);
end $$;

-- ── T6: …nor request another facility's groomer ─────────────────────────────
do $$
declare ok boolean; ok_own boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  begin
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name, expected_date_kind,
       preferred_staff_ids)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom', 'asap',
            array['00000000-0000-0000-0000-0000000d0051'::uuid]);  -- Salon B's groomer
    ok := false;
  exception when insufficient_privilege then ok := true; end;

  -- Not vacuous: the facility's own groomer is accepted.
  insert into public.grooming_waitlist_entries
    (facility_id, pet_name, owner_name, service_name, expected_date_kind,
     preferred_staff_ids)
  values ('00000000-0000-0000-0000-0000000d0020', 'Cleo', 'Pierre', 'Full Groom', 'asap',
          array['00000000-0000-0000-0000-0000000d0050'::uuid]);
  ok_own := true;
  reset role;
  perform pg_temp.t('T6  cannot request a groomer from another facility',
    ok and ok_own, format('rejected_other=%s accepted_own=%s', ok, ok_own));
exception when others then
  reset role; perform pg_temp.t('T6  cross-facility groomer', false, sqlerrm);
end $$;

-- ── T7: a groomer reads the queue but cannot promise a slot ─────────────────
do $$
declare visible integer; ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0002', true);
  set local role authenticated;
  select count(*) into visible from public.grooming_waitlist_entries;
  begin
    update public.grooming_waitlist_entries set status = 'offered', offered_slot = '09:00-10:00'
     where id = '00000000-0000-0000-0000-0000000d0070';
    ok := not found;   -- RLS filters the row out rather than raising
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T7  a groomer can read the waitlist but not offer a slot',
    visible > 0 and ok, format('visible=%s write_blocked=%s', visible, ok));
exception when others then
  reset role; perform pg_temp.t('T7  groomer read/write split', false, sqlerrm);
end $$;

-- ── T8: a client sees no waitlist at all ────────────────────────────────────
do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0003', true);
  set local role authenticated;
  select count(*) into c from public.grooming_waitlist_entries;
  reset role;
  perform pg_temp.t('T8  a client sees no waitlist rows', c = 0, format('visible=%s', c));
exception when others then
  reset role; perform pg_temp.t('T8  client read', false, sqlerrm);
end $$;

-- ── T9: facility isolation ──────────────────────────────────────────────────
do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0004', true);
  set local role authenticated;
  select count(*) into c from public.grooming_waitlist_entries;
  reset role;
  perform pg_temp.t('T9  a rival facility sees none of Salon A''s queue',
    c = 0, format('visible=%s', c));
exception when others then
  reset role; perform pg_temp.t('T9  isolation', false, sqlerrm);
end $$;

-- ── T10: removal is a status, not a delete ──────────────────────────────────
-- Somebody who asked to be called should still be in the record when they ask
-- why nobody called.
do $$
declare deleted integer; still_there integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000d0001', true);
  set local role authenticated;
  delete from public.grooming_waitlist_entries
   where id = '00000000-0000-0000-0000-0000000d0070';
  get diagnostics deleted = row_count;
  update public.grooming_waitlist_entries set status = 'removed'
   where id = '00000000-0000-0000-0000-0000000d0070';
  reset role;
  select count(*) into still_there from public.grooming_waitlist_entries
   where id = '00000000-0000-0000-0000-0000000d0070' and status = 'removed';
  perform pg_temp.t('T10 an entry cannot be deleted, only marked removed',
    deleted = 0 and still_there = 1,
    format('deleted=%s remaining=%s', deleted, still_there));
exception when others then
  reset role; perform pg_temp.t('T10 no-delete', false, sqlerrm);
end $$;

-- ── T11: a live offer must carry a deadline ────────────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    -- service_role path, so the trigger is the only thing between this and the
    -- table. Forcing both columns null alongside status='offered' is the state
    -- the constraint exists to forbid.
    insert into public.grooming_waitlist_entries
      (facility_id, pet_name, owner_name, service_name, expected_date_kind,
       status, offered_at, offered_until)
    values ('00000000-0000-0000-0000-0000000d0020', 'P', 'O', 'Full Groom', 'asap',
            'offered', null, null);
    -- The trigger stamps them on insert, so this SUCCEEDING is correct — what
    -- matters is that the row did not land without a deadline.
    select count(*) = 0 into ok from public.grooming_waitlist_entries
     where status = 'offered' and offered_until is null;
  exception when check_violation then ok := true; end;
  perform pg_temp.t('T11 no offered row can exist without a deadline', ok);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
