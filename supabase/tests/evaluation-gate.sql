-- ============================================================================
-- "Services that need an evaluation first", where the booking is written, and
-- who the evaluators are (the client's evaluation mocks, 2026-10-02). See
-- 20261002194444_an_evaluator_is_a_permission.sql and
-- 20261002194536_a_service_needs_its_evaluation_for_a_customer.sql
--
--   bun run test:sql evaluation-gate
--
-- One transaction, rolled back. It provisions its own facility.
--
-- E0  The evaluators are the active staff holding "Run evaluations": the
--     owner and a daycare attendant (no login yet), never a groomer.
-- E1  A CUSTOMER is refused a service on the facility's list when their pet
--     has no passing evaluation — hint 'evaluation_required'.
-- E2  A pass that leaves the service out still refuses it.
-- E3  A pass that approves it lets the booking go ahead.
-- E4  STAFF are not refused: the desk decides, and the wizard keeps why.
-- E5  A service OFF the list needs nothing.
-- E6  anon can call none of the new functions.
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
  ('user_evgAdmin000000000000000000000', 'evgadmin@yipyy.invalid', 'EVG Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_evgAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_evgAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Evg Pets', 'evg-pets-gate', 'America/Toronto', 'E Owner', 'eowner@evg.invalid');
end $$;

reset role;

do $$
declare
  v_fac    uuid;
  v_client uuid;
begin
  select id into v_fac from public.facilities where slug = 'evg-pets-gate';

  -- Daycare is on the list; nothing else is.
  insert into public.facility_settings (facility_id, domain, value)
  values (v_fac, 'booking_flow', jsonb_build_object(
    'evaluationRequired', false,
    'hideServicesUntilEvaluationCompleted', false,
    'servicesRequiringEvaluation', jsonb_build_array('daycare'),
    'hiddenServices', '[]'::jsonb))
  on conflict (facility_id, domain) do update set value = excluded.value;

  -- A daycare service with NO online flag, so only the new rule can refuse.
  insert into public.daycare_services (facility_id, name, price, display_order)
  values (v_fac, 'Gate day', 40, 1);

  insert into public.clients (facility_id, name, email, status, details)
  values (v_fac, 'Rana Aziz', 'rana@aziz.invalid', 'active', '{}'::jsonb)
  returning id into v_client;

  insert into public.pets (facility_id, client_id, name, species, breed, status)
  values (v_fac, v_client, 'Kiwi', 'Dog', 'Beagle', 'active');

  -- Staff with no login: an attendant (runs evaluations) and a groomer.
  insert into public.staff (facility_id, first_name, last_name, email, primary_role)
  values
    (v_fac, 'Ada', 'Attendant', 'ada@evg.invalid', 'daycare_attendant'),
    (v_fac, 'Gus', 'Groomer', 'gus@evg.invalid', 'groomer');
end $$;

insert into public.profiles (id, email, full_name) values
  ('user_evgRana00000000000000000000000', 'rana@aziz.invalid', 'Rana Aziz'),
  ('user_evgOwner0000000000000000000000', 'eowner@evg.invalid', 'E Owner')
on conflict (id) do nothing;

insert into public.facility_memberships (facility_id, profile_id, role)
select id, 'user_evgOwner0000000000000000000000', 'owner'
  from public.facilities where slug = 'evg-pets-gate'
on conflict do nothing;

-- The owner's staff row (provision_facility made it), linked to their login.
update public.staff s
   set membership_id = m.id
  from public.facility_memberships m
  join public.facilities f on f.id = m.facility_id
 where f.slug = 'evg-pets-gate'
   and m.profile_id = 'user_evgOwner0000000000000000000000'
   and s.facility_id = m.facility_id
   and s.email = 'eowner@evg.invalid';

-- ── E0 the evaluators ──────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_evgOwner0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_fac uuid; v_emails text[];
begin
  select id into v_fac from public.facilities where slug = 'evg-pets-gate';
  select array_agg(s.email order by s.email) into v_emails
    from public.facility_evaluators(v_fac) e
    join public.staff s on s.id = e.staff_id;
  perform pg_temp.t(0,
    'the evaluators are the owner and the attendant, never the groomer',
    v_emails = array['ada@evg.invalid', 'eowner@evg.invalid'],
    coalesce(v_emails::text, 'none'));
end $$;

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub','user_evgRana00000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('evg-pets-gate');
end $$;

-- ── E1 refused without a pass ──────────────────────────────────────────────

create or replace function pg_temp.book_daycare() returns text
language plpgsql as $$
declare
  v_fac    uuid;
  v_client uuid;
  v_pet    uuid;
  v_hint   text;
begin
  select id into v_fac from public.facilities where slug = 'evg-pets-gate';
  select c.id into v_client from public.clients c
   where c.facility_id = v_fac and c.email = 'rana@aziz.invalid';
  select p.id into v_pet from public.pets p where p.client_id = v_client;
  begin
    perform public.create_booking(
      jsonb_build_object(
        'facility_id', v_fac, 'client_id', v_client,
        'service', 'daycare', 'service_type', 'Gate day',
        'start_at', now() + interval '2 days',
        'end_at', now() + interval '2 days 4 hours',
        'base_price', 40, 'total_cost', 40,
        'details', '{}'::jsonb),
      array[v_pet]);
    return 'created';
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
    return coalesce(nullif(v_hint, ''), sqlerrm);
  end;
end $$;

do $$
declare v_out text;
begin
  v_out := pg_temp.book_daycare();
  perform pg_temp.t(1,
    'a customer is refused a listed service without a passing evaluation',
    v_out = 'evaluation_required', v_out);
end $$;

reset role;

-- ── E2, E3 the pass, as the facility records it ────────────────────────────

create or replace function pg_temp.set_pass(p_daycare boolean) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_evgAdmin000000000000000000000','role','authenticated')::text, true);
  update public.pets p
     set details = jsonb_set(coalesce(p.details, '{}'::jsonb), '{evaluations}',
       jsonb_build_array(jsonb_build_object(
         'id', 'evg-eval-1', 'status', 'passed', 'isExpired', false,
         'evaluatedAt', '2026-10-01T15:00:00Z',
         'approvedServices', jsonb_build_object('daycare', p_daycare))))
    from public.facilities f
   where f.id = p.facility_id and f.slug = 'evg-pets-gate' and p.name = 'Kiwi';
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_evgRana00000000000000000000000','role','authenticated')::text, true);
end $$;

set local role authenticated;

do $$
declare v_out text;
begin
  perform pg_temp.set_pass(false);
  v_out := pg_temp.book_daycare();
  perform pg_temp.t(2,
    'a pass that leaves the service out still refuses it',
    v_out = 'evaluation_required', v_out);

  perform pg_temp.set_pass(true);
  v_out := pg_temp.book_daycare();
  perform pg_temp.t(3,
    'a pass that approves it lets the booking go ahead',
    v_out = 'created', v_out);
end $$;

reset role;

-- ── E4 staff are not refused ───────────────────────────────────────────────

do $$
declare v_out text;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_evgAdmin000000000000000000000','role','authenticated')::text, true);
  update public.pets p set details = p.details - 'evaluations'
    from public.facilities f
   where f.id = p.facility_id and f.slug = 'evg-pets-gate';
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_evgOwner0000000000000000000000','role','authenticated')::text, true);
end $$;

set local role authenticated;

do $$
declare v_out text;
begin
  v_out := pg_temp.book_daycare();
  perform pg_temp.t(4,
    'staff book a listed service without a pass: the desk decides',
    v_out = 'created', v_out);
end $$;

reset role;

-- ── E5 a service off the list needs nothing ────────────────────────────────

do $$
begin
  update public.facility_settings s
     set value = jsonb_set(s.value, '{servicesRequiringEvaluation}', '[]'::jsonb)
    from public.facilities f
   where f.id = s.facility_id and f.slug = 'evg-pets-gate'
     and s.domain = 'booking_flow';
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub','user_evgRana00000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_out text;
begin
  v_out := pg_temp.book_daycare();
  perform pg_temp.t(5,
    'a service off the list needs no evaluation',
    v_out = 'created', v_out);
end $$;

reset role;

-- ── E6 grants ──────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(6,
    'anon can call none of the new functions',
    not has_function_privilege('anon',
          'public.facility_evaluators(uuid)', 'execute')
      and not has_function_privilege('anon',
          'private.staff_holds(uuid,text)', 'execute')
      and not has_function_privilege('anon',
          'private.service_needs_evaluation(uuid,text)', 'execute')
      and not has_function_privilege('anon',
          'private.pet_passed_evaluation_for(uuid,text)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
