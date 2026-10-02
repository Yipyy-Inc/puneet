-- ============================================================================
-- A customer sees a facility's training classes with the places left. See
-- 20261002122924_a_class_knows_its_program_and_a_customer_sees_the_spots_left.sql
--
--   bun run test:sql training-offered-classes
--
-- One transaction, rolled back. It provisions its own two facilities. NO
-- SAVEPOINTS: a `rollback to savepoint` discards the `tap` rows written since
-- it, which turned an assertion into a reported PASS once (2026-09-24).
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- C0  A client is offered the active CLASS with a session to come — never a
--     draft, never a private one-on-one session, never a class whose last
--     session has passed.
-- C1  The places left are capacity minus EVERY enrolled dog, not the
--     client's own: a customer may read only their own enrolments, which is
--     why the old count made every class look emptier than it was.
-- C2  The trainer is "First L." where their profile is shown online, and
--     nothing where it is not; no staff id or email crosses.
-- C3  The program a class runs travels with it.
-- C4  A client of another facility is offered nothing here.
-- C5  anon cannot call it.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.profiles (id, email, full_name) values
  ('user_otcAdmin000000000000000000000', 'otcadmin@yipyy.invalid', 'OTC Admin')
on conflict (id) do nothing;
insert into public.platform_memberships (profile_id, role) values
  ('user_otcAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_otcAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Omicron Dogs', 'omicron-dogs-otc', 'America/Toronto', 'O Owner', 'oowner@omicron.invalid');
  perform public.provision_facility('0000000e-0000-4000-8000-000000000002'::uuid,
    'Pi Kennels', 'pi-kennels-otc', 'America/Toronto', 'P Owner', 'powner@pi.invalid');
end $$;

reset role;

-- ── The trainers, the classes, the enrolments ──────────────────────────────

do $$
declare
  v_fac     uuid;
  v_pi      uuid;
  v_alex    uuid;
  v_hidden  uuid;
  v_class   public.training_series;
  v_shy     public.training_series;
  v_private public.training_series;
  v_draft   public.training_series;
  v_past    public.training_series;
  v_client  uuid;
  v_other   uuid;
  v_pet1    uuid;
  v_pet2    uuid;
begin
  select id into v_fac from public.facilities where slug = 'omicron-dogs-otc';
  select id into v_pi  from public.facilities where slug = 'pi-kennels-otc';

  insert into public.staff
    (facility_id, first_name, last_name, email, primary_role, access_level)
  values (v_fac, 'Alex', 'Martin', 'alex@omicron.invalid', 'trainer', 'staff')
  returning id into v_alex;
  insert into public.training_trainer_profiles (facility_id, staff_id, visible_online)
  values (v_fac, v_alex, true);

  insert into public.staff
    (facility_id, first_name, last_name, email, primary_role, access_level)
  values (v_fac, 'Hidden', 'Trainer', 'hidden@omicron.invalid', 'trainer', 'staff')
  returning id into v_hidden;
  insert into public.training_trainer_profiles (facility_id, staff_id, visible_online)
  values (v_fac, v_hidden, false);

  -- C0-C3: a class of six with Alex, for a program.
  v_class := public.create_training_series(v_fac, 'OTC Puppy Foundations',
    6::smallint, '10:00'::time, 60, current_date + 7, 6, 6, 280, null, v_alex);
  update public.training_series set program_id = 'prog-group'
   where id = v_class.id;

  -- C2: a class whose trainer is not shown online.
  v_shy := public.create_training_series(v_fac, 'OTC Adult Obedience',
    2::smallint, '18:30'::time, 60, current_date + 9, 6, 6, 280, null, v_hidden);

  -- C0: a one-on-one session, a draft, and a class that is over.
  v_private := public.create_training_series(v_fac, 'OTC Private lesson',
    4::smallint, '15:00'::time, 60, current_date + 3, 1, 1, 95, null, v_alex);
  v_draft := public.create_training_series(v_fac, 'OTC Draft class',
    5::smallint, '09:00'::time, 60, current_date + 5, 4, 6, 200, null, v_alex);
  update public.training_series set status = 'draft' where id = v_draft.id;
  v_past := public.create_training_series(v_fac, 'OTC Past class',
    1::smallint, '09:00'::time, 60, current_date - 30, 2, 6, 150, null, v_alex);

  -- C4: Pi's own class.
  perform public.create_training_series(v_pi, 'OTC Pi class',
    3::smallint, '11:00'::time, 60, current_date + 4, 4, 6, 120);

  -- Two OTHER households' dogs in the class: the client must see 6 - 2.
  insert into public.clients (facility_id, name, email, status, details)
  values (v_fac, 'Other One', 'other1@omicron.invalid', 'active', '{}'::jsonb)
  returning id into v_other;
  insert into public.pets (facility_id, client_id, name, species, status)
  values (v_fac, v_other, 'Rex', 'Dog', 'active') returning id into v_pet1;
  insert into public.pets (facility_id, client_id, name, species, status)
  values (v_fac, v_other, 'Bo', 'Dog', 'active') returning id into v_pet2;
  insert into public.training_series_enrollments
    (facility_id, series_id, client_id, pet_id, status)
  values (v_fac, v_class.id, v_other, v_pet1, 'enrolled'),
         (v_fac, v_class.id, v_other, v_pet2, 'enrolled');

  insert into public.clients (facility_id, name, email, status, details)
  values (v_fac, 'Rhea Okafor', 'rhea@okafor.invalid', 'active', '{}'::jsonb)
  returning id into v_client;
end $$;

insert into public.profiles (id, email, full_name) values
  ('user_otcRhea00000000000000000000000', 'rhea@okafor.invalid', 'Rhea Okafor')
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_otcRhea00000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('omicron-dogs-otc');
end $$;

-- ── C0-C3 the projection ───────────────────────────────────────────────────

do $$
declare offered jsonb; puppy jsonb; shy jsonb; v_fac uuid; v_pi uuid;
begin
  select id into v_fac from public.facilities where slug = 'omicron-dogs-otc';
  select id into v_pi  from public.facilities where slug = 'pi-kennels-otc';
  offered := public.offered_training_classes(v_fac);
  select e into puppy from jsonb_array_elements(offered) e
   where e->>'name' = 'OTC Puppy Foundations';
  select e into shy from jsonb_array_elements(offered) e
   where e->>'name' = 'OTC Adult Obedience';

  perform pg_temp.t(0,
    'a client is offered the active classes to come, never a private, draft or past one',
    puppy is not null and shy is not null
      and not exists (select 1 from jsonb_array_elements(offered) e
                       where e->>'name' in ('OTC Private lesson',
                                            'OTC Draft class', 'OTC Past class')),
    offered::text);

  perform pg_temp.t(1,
    'the places left count every enrolled dog, not the client''s own',
    (puppy->>'capacity')::int = 6 and (puppy->>'spotsLeft')::int = 4,
    coalesce(puppy::text, 'no row'));

  perform pg_temp.t(2,
    'the trainer is "First L." where shown online, nothing where not — and no ids',
    puppy->>'trainerName' = 'Alex M.'
      and shy->'trainerName' = 'null'::jsonb
      and not (puppy ? 'staffId') and not (puppy ? 'staff_id')
      and not (puppy ? 'trainerEmail'),
    format('puppy=%s shy=%s', puppy->>'trainerName', shy->>'trainerName'));

  perform pg_temp.t(3,
    'the program a class runs travels with it',
    puppy->>'programId' = 'prog-group' and shy->'programId' = 'null'::jsonb,
    coalesce(puppy->>'programId', 'null'));

  perform pg_temp.t(4,
    'a client of another facility is offered nothing there',
    public.offered_training_classes(v_pi) = '[]'::jsonb,
    public.offered_training_classes(v_pi)::text);
end $$;

reset role;

-- ── C5 anon ────────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(5,
    'anon cannot call it, and authenticated can',
    not has_function_privilege('anon',
          'public.offered_training_classes(uuid)', 'execute')
      and has_function_privilege('authenticated',
          'public.offered_training_classes(uuid)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
