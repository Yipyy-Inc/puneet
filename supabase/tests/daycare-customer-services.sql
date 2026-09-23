-- ============================================================================
-- A customer is offered the daycare services on offer — and nothing the
-- facility keeps for itself. See
-- 20260924140000_a_customer_picks_the_daycare_service_they_are_offered.sql
--
--   bun run test:sql daycare-customer-services
--
-- One transaction, rolled back. It provisions its own two facilities, so it
-- never depends on what any suite has left behind.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- P0  A client is offered the ACTIVE service and not the draft.
-- P1  What they are offered carries NO colour, NO pet tags, NO sections and
--     NO rollover — the allowlist, asserted as absence rather than as a list
--     of keys somebody remembered to strip.
-- P2  The BRANCH price wins where the branch set one, and the facility-wide
--     price is carried beside it. A customer quoted a different number from
--     the till is the class of bug the whole phase exists to close.
-- P3  A service restricted to one branch is not offered at another.
-- P4  A pet BLOCKED by tag is not offered the service. The rule the customer
--     can no longer read is the rule the server now enforces.
-- P5  An ELIGIBLE-tag rule admits the tagged pet and refuses the untagged one.
-- P6  A client is offered NOTHING at a facility they are not a client of —
--     the same answer as a facility with an empty menu, so the function does
--     not confirm which facilities exist.
-- P7  THE EVALUATION GATE. A customer is refused a service marked
--     `requires_evaluation_online` when the pet has no passing evaluation,
--     with hint 'daycare_evaluation_required' — and allowed once it has one.
-- P8  STAFF ARE NOT GATED. The field governs the ONLINE channel; somebody at
--     the desk with the dog in front of them is not booking online.
-- P9  anon cannot call either function.
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
  ('user_odsAdmin000000000000000000000', 'odsadmin@yipyy.invalid', 'ODS Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_odsAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_odsAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000d-0000-4000-8000-000000000001'::uuid,
    'Eta Pets', 'eta-pets-ods', 'America/Toronto', 'H Owner', 'howner@eta.invalid');
  perform public.provision_facility('0000000d-0000-4000-8000-000000000002'::uuid,
    'Theta Pets', 'theta-pets-ods', 'America/Toronto', 'T Owner', 'towner@theta.invalid');
end $$;

reset role;

-- ── The menu, the branches, the tags and the pets ──────────────────────────

do $$
declare
  v_eta     uuid;
  v_theta   uuid;
  v_north   uuid;
  v_south   uuid;
  v_full    uuid;
  v_tag_bad uuid;
  v_tag_vip uuid;
  v_client  uuid;
  v_pet     uuid;
begin
  select id into v_eta   from public.facilities where slug = 'eta-pets-ods';
  select id into v_theta from public.facilities where slug = 'theta-pets-ods';

  insert into public.locations (facility_id, name, legacy_id, timezone)
  values (v_eta, 'ODS North', 'eta-north-ods', 'America/Toronto') returning id into v_north;
  insert into public.locations (facility_id, name, legacy_id, timezone)
  values (v_eta, 'ODS South', 'eta-south-ods', 'America/Toronto') returning id into v_south;

  -- On offer everywhere, and priced differently at North.
  insert into public.daycare_services
    (facility_id, name, description, color, price, max_duration_hours,
     rollover_after_minutes, allowed_section_ids, display_order)
  values (v_eta, 'Full day', 'All day play', '#123456', 40, 10,
          30, array['section-a'], 1)
  returning id into v_full;

  insert into public.daycare_service_location_prices (service_id, location_id, price)
  values (v_full, null, 40), (v_full, v_north, 55);

  -- A draft, which nobody may be offered.
  insert into public.daycare_services (facility_id, name, price, is_active, display_order)
  values (v_eta, 'Draft day', 30, false, 2);

  -- North only.
  insert into public.daycare_services (facility_id, name, price, location_ids, display_order)
  values (v_eta, 'North only', 35, array[v_north], 3);

  -- Tags, and the services that key on them.
  insert into public.facility_tags (facility_id, entity_type, name, color)
  values (v_eta, 'pet', 'ODS bites', '#B23B3B') returning id into v_tag_bad;
  insert into public.facility_tags (facility_id, entity_type, name, color)
  values (v_eta, 'pet', 'ODS vip', '#0F7A52') returning id into v_tag_vip;

  insert into public.daycare_services
    (facility_id, name, price, blocked_pet_tags, display_order)
  values (v_eta, 'Open play', 45, array[v_tag_bad::text], 4);

  insert into public.daycare_services
    (facility_id, name, price, eligible_pet_tags, display_order)
  values (v_eta, 'VIP suite', 80, array[v_tag_vip::text], 5);

  -- The one that needs an evaluation before it can be booked online.
  insert into public.daycare_services
    (facility_id, name, price, requires_evaluation_online, display_order)
  values (v_eta, 'Assessed play', 50, true, 6);

  -- A client of Eta, and of nowhere else, with one tagged pet.
  insert into public.clients (facility_id, name, email, status, details)
  values (v_eta, 'Noor Haddad', 'noor@haddad.invalid', 'active', '{}'::jsonb)
  returning id into v_client;

  insert into public.pets (facility_id, client_id, name, species, breed, status)
  values (v_eta, v_client, 'Zaza', 'Dog', 'Poodle', 'active')
  returning id into v_pet;

  insert into public.facility_tag_assignments
    (facility_id, tag_id, entity_type, entity_id)
  values (v_eta, v_tag_bad, 'pet', v_pet);

  -- Theta offers something too, so P6 is measuring the CLIENT check and not
  -- an empty menu.
  insert into public.daycare_services (facility_id, name, price)
  values (v_theta, 'Theta day', 30);
end $$;

insert into public.profiles (id, email, full_name) values
  ('user_odsNoor00000000000000000000000', 'noor@haddad.invalid', 'Noor Haddad'),
  ('user_odsOwner0000000000000000000000', 'howner@eta.invalid', 'H Owner')
on conflict (id) do nothing;

-- A real staff membership at Eta. `provision_facility` does not create one:
-- the owner's membership is written when they first sign in, and P9 needs
-- somebody who actually holds `create_bookings` today.
insert into public.facility_memberships (facility_id, profile_id, role)
select id, 'user_odsOwner0000000000000000000000', 'owner'
  from public.facilities where slug = 'eta-pets-ods'
on conflict do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_odsNoor00000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('eta-pets-ods');
end $$;

-- ── P0–P2 their own facility, facility-wide ────────────────────────────────

do $$
declare offered jsonb; full_day jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'eta-pets-ods';
  offered := public.offered_daycare_services(v_fac);

  select e into full_day from jsonb_array_elements(offered) e
   where e->>'name' = 'Full day';

  perform pg_temp.t(0,
    'a client is offered the active services and never the draft',
    not exists (select 1 from jsonb_array_elements(offered) e
                 where e->>'name' = 'Draft day')
      and full_day is not null,
    offered::text);

  perform pg_temp.t(1,
    'the projection carries no colour, no pet tags, no sections and no rollover',
    not (full_day ? 'color')
      and not (full_day ? 'blockedPetTags')
      and not (full_day ? 'eligiblePetTags')
      and not (full_day ? 'allowedSectionIds')
      and not (full_day ? 'rolloverToServiceId')
      and not (full_day ? 'rolloverAfterMinutes')
      and not (full_day ? 'requiresEvaluation')
      and not (full_day ? 'legacyId')
      and not (full_day ? 'sizePricing'),
    coalesce(full_day::text, 'no Full day row'));
end $$;

do $$
declare offered jsonb; full_day jsonb; v_fac uuid; v_north uuid;
begin
  select id into v_fac from public.facilities where slug = 'eta-pets-ods';
  select id into v_north from public.locations where legacy_id = 'eta-north-ods';
  offered := public.offered_daycare_services(v_fac, v_north);

  select e into full_day from jsonb_array_elements(offered) e
   where e->>'name' = 'Full day';

  perform pg_temp.t(2,
    'the branch price wins at that branch, with the facility-wide price beside it',
    (full_day->>'price')::numeric = 55
      and (full_day->>'facilityPrice')::numeric = 40,
    coalesce(full_day::text, 'no Full day row'));

  perform pg_temp.t(3,
    'a service restricted to one branch is offered there and nowhere else',
    exists (select 1 from jsonb_array_elements(offered) e
             where e->>'name' = 'North only')
      and not exists (
        select 1 from jsonb_array_elements(
          public.offered_daycare_services(
            v_fac, (select id from public.locations where legacy_id = 'eta-south-ods'))) e
         where e->>'name' = 'North only'),
    offered::text);
end $$;

-- ── P4–P5 the pet-tag rules, applied server-side ───────────────────────────

do $$
declare with_pet jsonb; no_pet jsonb; v_fac uuid; v_pet uuid;
begin
  select id into v_fac from public.facilities where slug = 'eta-pets-ods';
  select id into v_pet from public.pets where name = 'Zaza'
     and facility_id = v_fac;

  with_pet := public.offered_daycare_services(v_fac, null, array[v_pet]);
  no_pet   := public.offered_daycare_services(v_fac);

  perform pg_temp.t(4,
    'a pet blocked by tag is not offered that service, though it is on the menu',
    not exists (select 1 from jsonb_array_elements(with_pet) e
                 where e->>'name' = 'Open play')
      and exists (select 1 from jsonb_array_elements(no_pet) e
                   where e->>'name' = 'Open play'),
    with_pet::text);

  perform pg_temp.t(5,
    'an eligible-tag rule refuses the pet that does not carry it',
    not exists (select 1 from jsonb_array_elements(with_pet) e
                 where e->>'name' = 'VIP suite'),
    with_pet::text);
end $$;

-- ── P6 another facility ────────────────────────────────────────────────────

do $$
declare offered jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'theta-pets-ods';
  offered := public.offered_daycare_services(v_fac);
  perform pg_temp.t(6,
    'a client is offered nothing at a facility they are not a client of',
    offered = '[]'::jsonb, offered::text);
end $$;

-- ── P7 the evaluation gate, as the customer ────────────────────────────────

do $$
declare
  v_fac    uuid;
  v_client uuid;
  v_pet    uuid;
  v_svc    uuid;
  v_hint   text;
  v_made   boolean := false;
begin
  select id into v_fac from public.facilities where slug = 'eta-pets-ods';
  select c.id into v_client from public.clients c
   where c.facility_id = v_fac and c.email = 'noor@haddad.invalid';
  select p.id into v_pet from public.pets p where p.client_id = v_client;
  select s.id into v_svc from public.daycare_services s
   where s.facility_id = v_fac and s.name = 'Assessed play';

  begin
    perform public.create_booking(
      jsonb_build_object(
        'facility_id', v_fac, 'client_id', v_client,
        'service', 'daycare', 'service_type', 'Assessed play',
        'start_at', now(), 'end_at', now() + interval '4 hours',
        'base_price', 50, 'total_cost', 50,
        'details', jsonb_build_object('daycareServiceId', v_svc::text)),
      array[v_pet]);
    v_made := true;
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;

  perform pg_temp.t(7,
    'a customer is refused a service that needs an evaluation, by name',
    not v_made and v_hint = 'daycare_evaluation_required',
    coalesce(v_hint, 'booking was created') );
end $$;

reset role;

-- The facility records the pass. Only the facility may, and that is asserted
-- rather than assumed: `enforce_pet_integrity` (20260803090000) strips
-- `details.evaluations` from the write of anybody without `edit_pet_records`,
-- and it reads the JWT CLAIM rather than the Postgres role — so `reset role`
-- alone leaves the caller as the customer and the write silently does nothing.
select set_config('request.jwt.claims',
  json_build_object('sub','user_odsAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_pet uuid;
begin
  select p.id into v_pet from public.pets p
    join public.facilities f on f.id = p.facility_id
   where f.slug = 'eta-pets-ods' and p.name = 'Zaza';

  update public.pets
     set details = jsonb_set(coalesce(details, '{}'::jsonb), '{evaluations}',
       jsonb_build_array(jsonb_build_object(
         'id', 'ods-eval-1', 'status', 'passed', 'isExpired', false,
         'approvedServices', jsonb_build_object('daycare', true))))
   where id = v_pet;

  if not private.pet_passed_daycare_evaluation(v_pet) then
    raise exception 'the evaluation did not stick — the trigger stripped it';
  end if;
end $$;

reset role;

select set_config('request.jwt.claims',
  json_build_object('sub','user_odsNoor00000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_fac    uuid;
  v_client uuid;
  v_pet    uuid;
  v_svc    uuid;
  v_made   boolean := false;
  v_err    text;
begin
  select id into v_fac from public.facilities where slug = 'eta-pets-ods';
  select c.id into v_client from public.clients c
   where c.facility_id = v_fac and c.email = 'noor@haddad.invalid';
  select p.id into v_pet from public.pets p where p.client_id = v_client;
  select s.id into v_svc from public.daycare_services s
   where s.facility_id = v_fac and s.name = 'Assessed play';

  begin
    perform public.create_booking(
      jsonb_build_object(
        'facility_id', v_fac, 'client_id', v_client,
        'service', 'daycare', 'service_type', 'Assessed play',
        'start_at', now(), 'end_at', now() + interval '4 hours',
        'base_price', 50, 'total_cost', 50,
        'details', jsonb_build_object('daycareServiceId', v_svc::text)),
      array[v_pet]);
    v_made := true;
  exception when others then
    v_err := sqlerrm;
  end;

  perform pg_temp.t(8,
    'the same booking goes ahead once the pet has a passing evaluation',
    v_made, coalesce(v_err, 'created'));
end $$;

reset role;

-- ── P8 staff are not gated by the ONLINE field ─────────────────────────────

do $$
declare
  v_fac    uuid;
  v_client uuid;
  v_pet    uuid;
  v_svc    uuid;
  v_owner  text;
  v_made   boolean := false;
  v_err    text;
begin
  select id into v_fac from public.facilities where slug = 'eta-pets-ods';
  select c.id into v_client from public.clients c
   where c.facility_id = v_fac and c.email = 'noor@haddad.invalid';
  select p.id into v_pet from public.pets p where p.client_id = v_client;
  select s.id into v_svc from public.daycare_services s
   where s.facility_id = v_fac and s.name = 'Assessed play';

  -- Back to a pet with NO passing evaluation, so the only thing that can
  -- admit this booking is the permission check. Written as the platform admin,
  -- for the reason above.
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_odsAdmin000000000000000000000','role','authenticated')::text, true);
  update public.pets set details = details - 'evaluations' where id = v_pet;

  if private.pet_passed_daycare_evaluation(v_pet) then
    raise exception 'the evaluation was not cleared, so this proves nothing';
  end if;

  -- The facility OWNER, who holds create_bookings.
  v_owner := 'user_odsOwner0000000000000000000000';
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);

  if not private.has_permission(v_fac, 'create_bookings') then
    raise exception 'the staff identity holds no create_bookings, so P9 proves nothing';
  end if;

  begin
    perform public.create_booking(
      jsonb_build_object(
        'facility_id', v_fac, 'client_id', v_client,
        'service', 'daycare', 'service_type', 'Assessed play',
        'start_at', now(), 'end_at', now() + interval '4 hours',
        'base_price', 50, 'total_cost', 50,
        'details', jsonb_build_object('daycareServiceId', v_svc::text)),
      array[v_pet]);
    v_made := true;
  exception when others then
    v_err := sqlerrm;
  end;

  perform pg_temp.t(9,
    'staff may book it with no evaluation: the field governs the online channel',
    v_made, coalesce(v_err, 'created'));
end $$;

-- ── P9 anon ────────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(10,
    'anon cannot call offered_daycare_services or the evaluation predicate',
    not has_function_privilege('anon',
          'public.offered_daycare_services(uuid,uuid,uuid[])', 'execute')
      and not has_function_privilege('anon',
          'private.pet_passed_daycare_evaluation(uuid)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
