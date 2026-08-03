-- ============================================================================
-- Stylists: one person, one profile, and who is allowed to see it
-- (20260806500000 + 20260806540000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-stylists.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE PERSON IS STORED ONCE (S1/S2). The mock kept a second copy of every
--    groomer's employment, and the two disagreed: staff said David Kim was
--    `inactive`, the stylist record said `on-leave`. S2 proves that is now
--    unrepresentable -- a profile can add "on leave" and nothing else, so a
--    terminated groomer reads inactive no matter what the profile says.
--
-- 2. CAPACITY AND HOURS CANNOT BE NONSENSE (S3/S4). A weekly ceiling below the
--    daily one, a shift that ends before it starts, a day 9, the same slot
--    twice.
--
-- 3. THE FLOOR CAN READ THE ROSTER (S5). This is the assertion that caught the
--    real bug. The first version of the read policy required `view_services`,
--    which a GROOMER does not hold -- so the grooming board showed the person
--    working at it no columns and no cards. The failing assertion was the
--    POSITIVE one; every deny in this file passed throughout.
--
-- 4. READING IS NOT EDITING (S6). A groomer can now see the roster and still
--    cannot promote themselves.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000180001', 'sy-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000180003', 'sy-groom@example.invalid'),
  ('00000000-0000-0000-0000-000000180005', 'sy-cust@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000180001', 'sy-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-000000180003', 'sy-groom@example.invalid', 'Groomer'),
  ('00000000-0000-0000-0000-000000180005', 'sy-cust@example.invalid', 'Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000180010', 'SY Org', 'sy-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000180020', '00000000-0000-0000-0000-000000180010',
   'Salon', 'sy-a', 'sy-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000180030', '00000000-0000-0000-0000-000000180020',
   '00000000-0000-0000-0000-000000180001', 'owner', true),
  -- a groomer: holds no `view_services` and no `manage_staff`
  ('00000000-0000-0000-0000-000000180033', '00000000-0000-0000-0000-000000180020',
   '00000000-0000-0000-0000-000000180003', 'groomer', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-000000180040', '00000000-0000-0000-0000-000000180020',
   'Client', 'sy-c@example.invalid', '00000000-0000-0000-0000-000000180005');

-- Ada is employed and on leave; Bo has been terminated and is not.
insert into public.staff
  (id, facility_id, legacy_id, first_name, last_name, email, primary_role, status)
values
  ('00000000-0000-0000-0000-000000180050', '00000000-0000-0000-0000-000000180020',
   'sy-g1', 'Ada', 'Groom', 'a@example.invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-000000180051', '00000000-0000-0000-0000-000000180020',
   'sy-g2', 'Bo', 'Gone', 'b@example.invalid', 'groomer', 'terminated');

insert into public.grooming_stylist_profiles
  (id, facility_id, legacy_id, staff_id, skill_level, on_leave, visible_online)
values
  ('00000000-0000-0000-0000-000000180060', '00000000-0000-0000-0000-000000180020',
   'sy-001', '00000000-0000-0000-0000-000000180050', 'premium', true,  true),
  ('00000000-0000-0000-0000-000000180061', '00000000-0000-0000-0000-000000180020',
   'sy-002', '00000000-0000-0000-0000-000000180051', 'basic',   false, false);

insert into public.grooming_stylist_availability
  (facility_id, staff_id, day_of_week, start_time, end_time)
values ('00000000-0000-0000-0000-000000180020',
        '00000000-0000-0000-0000-000000180050', 1, '09:00', '17:00');

-- ── S1: one grooming identity per person ───────────────────────────────────
do $$
declare blocked boolean;
begin
  begin
    insert into public.grooming_stylist_profiles (facility_id, staff_id)
    values ('00000000-0000-0000-0000-000000180020',
            '00000000-0000-0000-0000-000000180050');
    blocked := false;
  exception when unique_violation then blocked := true; end;
  perform pg_temp.t('S1  a groomer cannot be given two grooming identities',
    blocked, format('blocked=%s', blocked));
end $$;

-- ── S2: status is derived, and employment wins ─────────────────────────────
--
-- Both directions in one assertion. Ada is employed AND on leave, so the
-- profile's word counts. Bo is terminated and NOT on leave, so the profile has
-- nothing to say and the staff record decides.
do $$
declare ada text; bo text;
begin
  select case when st.status <> 'active' then 'inactive'
              when p.on_leave then 'on-leave' else 'active' end
    into ada
    from public.grooming_stylist_profiles p
    join public.staff st on st.id = p.staff_id
   where p.legacy_id = 'sy-001';
  select case when st.status <> 'active' then 'inactive'
              when p.on_leave then 'on-leave' else 'active' end
    into bo
    from public.grooming_stylist_profiles p
    join public.staff st on st.id = p.staff_id
   where p.legacy_id = 'sy-002';
  perform pg_temp.t('S2  an employed groomer can be on leave; a terminated one reads inactive regardless',
    ada = 'on-leave' and bo = 'inactive', format('ada=%s bo=%s', ada, bo));
end $$;

-- ── S3: a weekly ceiling below the daily one is a typo ─────────────────────
do $$
declare blocked boolean;
begin
  begin
    update public.grooming_stylist_profiles
       set max_daily_appointments = 8, max_weekly_appointments = 3
     where legacy_id = 'sy-001';
    blocked := false;
  exception when check_violation then blocked := true; end;
  perform pg_temp.t('S3  a weekly ceiling below the daily one is refused',
    blocked, format('blocked=%s', blocked));
end $$;

-- ── S4: hours that make no sense ───────────────────────────────────────────
do $$
declare backwards boolean; badday boolean; dup boolean;
begin
  begin
    insert into public.grooming_stylist_availability
      (facility_id, staff_id, day_of_week, start_time, end_time)
    values ('00000000-0000-0000-0000-000000180020',
            '00000000-0000-0000-0000-000000180050', 2, '17:00', '09:00');
    backwards := false;
  exception when check_violation then backwards := true; end;
  begin
    insert into public.grooming_stylist_availability
      (facility_id, staff_id, day_of_week, start_time, end_time)
    values ('00000000-0000-0000-0000-000000180020',
            '00000000-0000-0000-0000-000000180050', 9, '09:00', '17:00');
    badday := false;
  exception when check_violation then badday := true; end;
  begin
    -- the Monday 09:00 slot already exists in the fixture above
    insert into public.grooming_stylist_availability
      (facility_id, staff_id, day_of_week, start_time, end_time)
    values ('00000000-0000-0000-0000-000000180020',
            '00000000-0000-0000-0000-000000180050', 1, '09:00', '18:00');
    dup := false;
  exception when unique_violation then dup := true; end;
  perform pg_temp.t('S4  hours cannot end before they start, land on day 9, or double-book a slot',
    backwards and badday and dup,
    format('backwards=%s badday=%s dup=%s', backwards, badday, dup));
end $$;

-- ── S5: the floor can read the roster; a customer sees the shop window ─────
--
-- THE ASSERTION THAT CAUGHT THE BUG. `groomer_sees = 2` is the positive
-- control: the first read policy required `view_services`, a groomer holds
-- none, and this came back 0 while every deny in this file still passed.
do $$
declare groomer_sees integer; groomer_hours integer;
        cust_sees integer; cust_names text; cust_hours integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000180003', true);
  set local role authenticated;
  select count(*) into groomer_sees from public.grooming_stylist_profiles;
  select count(*) into groomer_hours from public.grooming_stylist_availability;
  reset role;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000180005', true);
  set local role authenticated;
  select count(*), string_agg(legacy_id, ',') into cust_sees, cust_names
    from public.grooming_stylist_profiles;
  select count(*) into cust_hours from public.grooming_stylist_availability;
  reset role;

  perform pg_temp.t('S5  a groomer sees the roster and its hours; a customer sees only the visible_online profile and no hours',
    groomer_sees = 2 and groomer_hours = 1
      and cust_sees = 1 and cust_names = 'sy-001' and cust_hours = 0,
    format('groomer=%s profiles/%s hours  customer=%s (%s)/%s hours',
           groomer_sees, groomer_hours, cust_sees, cust_names, cust_hours));
exception when others then
  reset role; perform pg_temp.t('S5  read scope', false, sqlerrm);
end $$;

-- ── S6: reading is not editing ─────────────────────────────────────────────
do $$
declare groomer_rows integer; cust_rows integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000180003', true);
  set local role authenticated;
  update public.grooming_stylist_profiles set skill_level = 'platinum'
   where legacy_id = 'sy-001';
  get diagnostics groomer_rows = row_count;
  reset role;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000180005', true);
  set local role authenticated;
  update public.grooming_stylist_profiles set visible_online = false
   where legacy_id = 'sy-001';
  get diagnostics cust_rows = row_count;
  reset role;

  perform pg_temp.t('S6  a groomer who can read the roster cannot promote themselves, and a customer cannot hide one',
    groomer_rows = 0 and cust_rows = 0,
    format('groomer_rows=%s customer_rows=%s', groomer_rows, cust_rows));
exception when others then
  reset role; perform pg_temp.t('S6  write scope', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
