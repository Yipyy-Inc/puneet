-- ============================================================================
-- A customer is shown the mobile grooming on offer — and not the vans, nor
-- which groomer covers which area.
--
-- One transaction, rolled back.
--
-- `public.offered_mobile_grooming()` is a SECURITY DEFINER projection over
-- the `mobile_grooming` setting, which is deliberately NOT on the customer
-- allowlist. What must all hold:
--
--   1. A client of the facility is told van visits are offered, with the
--      ACTIVE area and zone only, and the facility's own postal code.
--   2. What they read carries no vans, no staff schedules, and no area key
--      outside the allowlist.
--   3. At a facility they are not a client of, they get the switched-off
--      answer: nothing offered, no postal code.
--   4. They cannot read the `mobile_grooming` row itself.
--   5. anon cannot call the function at all.
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
  ('user_omgAdmin000000000000000000000', 'omgadmin@yipyy.invalid', 'OMG Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_omgAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_omgAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('00000010-0000-4000-8000-000000000001'::uuid,
    'Eta Pets', 'eta-pets-omg', 'America/Toronto', 'E Owner', 'eowner@eta.invalid');
  perform public.provision_facility('00000010-0000-4000-8000-000000000002'::uuid,
    'Theta Pets', 'theta-pets-omg', 'America/Toronto', 'T Owner', 'towner@theta.invalid');
end $$;

reset role;

update public.facilities
   set address = jsonb_build_object('street', '1 Van Road', 'zipCode', 'H2X 1Z4')
 where slug in ('eta-pets-omg', 'theta-pets-omg');

insert into public.facility_settings (facility_id, domain, value)
select id, 'mobile_grooming', jsonb_build_object(
  'enabled', true,
  'arrivalWindowMinutes', 90,
  'certainAreaEnabled', true,
  'vans', jsonb_build_array(jsonb_build_object(
    'id', 'van-1', 'facilityId', 0, 'name', 'Van 1', 'licensePlate', 'SECRET-42',
    'homeBaseAddress', '1 Van Road', 'assignedStaffIds', jsonb_build_array('staff-1'),
    'primaryDriverId', 'staff-1', 'active', true)),
  'serviceAreas', jsonb_build_array(
    jsonb_build_object('id', 'area-on', 'facilityId', 0, 'name', 'North', 'type', 'postal',
      'postalCodes', jsonb_build_array('H2P'), 'daysOfWeek', jsonb_build_array(1, 3),
      'active', true, 'internalMemo', 'avoid the bridge at 5pm'),
    jsonb_build_object('id', 'area-off', 'facilityId', 0, 'name', 'South', 'type', 'postal',
      'postalCodes', jsonb_build_array('J4K'), 'daysOfWeek', jsonb_build_array(2),
      'active', false)),
  'travelZones', jsonb_build_array(
    jsonb_build_object('id', 'zone-on', 'label', 'Zone 1', 'maxMiles', 5,
      'surchargeMode', 'flat', 'surchargeAmount', 10, 'active', true),
    jsonb_build_object('id', 'zone-off', 'label', 'Zone 2', 'maxMiles', 15,
      'surchargeMode', 'flat', 'surchargeAmount', 20, 'active', false)),
  'staffSchedules', jsonb_build_array(jsonb_build_object(
    'staffId', 'staff-1', 'weeklyTemplate', jsonb_build_object('1', 'area-on'),
    'dateOverrides', '{}'::jsonb))
)
  from public.facilities where slug in ('eta-pets-omg', 'theta-pets-omg')
on conflict (facility_id, domain) do update set value = excluded.value;

-- A client of Eta, and of nowhere else.
insert into public.clients (facility_id, name, email, status, details)
select id, 'Sage Okonkwo', 'sage@okonkwo.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'eta-pets-omg';

insert into public.profiles (id, email, full_name) values
  ('user_omgSage0000000000000000000000', 'sage@okonkwo.invalid', 'Sage Okonkwo')
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_omgSage0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('eta-pets-omg');
end $$;

-- ── 1–2. Their own facility ──────────────────────────────────────────────

do $$
declare offered jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'eta-pets-omg';
  offered := public.offered_mobile_grooming(v_fac);
  perform pg_temp.t(1,
    'a client is told van visits are offered, with the active area and zone and the facility postal code',
    (offered->>'enabled')::boolean
      and (offered->>'hasActiveVans')::boolean
      and (offered->>'arrivalWindowMinutes')::int = 90
      and jsonb_array_length(offered->'serviceAreas') = 1
      and offered->'serviceAreas'->0->>'id' = 'area-on'
      and jsonb_array_length(offered->'travelZones') = 1
      and offered->'travelZones'->0->>'id' = 'zone-on'
      and offered->>'basePostalCode' = 'H2X 1Z4',
    offered::text);
  perform pg_temp.t(2,
    'what they read carries no vans, no staff schedules, and no area key outside the allowlist',
    not (offered ? 'vans')
      and not (offered ? 'staffSchedules')
      and not (offered->'serviceAreas'->0 ? 'internalMemo')
      and not (offered->'serviceAreas'->0 ? 'facilityId')
      and position('SECRET-42' in offered::text) = 0,
    offered::text);
end $$;

-- ── 3. Another facility ───────────────────────────────────────────────────

do $$
declare offered jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'theta-pets-omg';
  offered := public.offered_mobile_grooming(v_fac);
  perform pg_temp.t(3,
    'at a facility they are not a client of, nothing is offered and no postal code is given',
    not (offered->>'enabled')::boolean
      and not (offered->>'hasActiveVans')::boolean
      and offered->'serviceAreas' = '[]'::jsonb
      and offered->'travelZones' = '[]'::jsonb
      and offered->>'basePostalCode' is null,
    offered::text);
end $$;

-- ── 4. The row itself ─────────────────────────────────────────────────────

do $$
declare n int;
begin
  select count(*) into n from public.facility_settings fs
    join public.facilities f on f.id = fs.facility_id
   where f.slug = 'eta-pets-omg' and fs.domain = 'mobile_grooming';
  perform pg_temp.t(4,
    'a client CANNOT read the mobile_grooming row at their own facility',
    n = 0, n || ' rows');
end $$;

reset role;

-- ── 5. anon ───────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(5,
    'anon cannot call offered_mobile_grooming',
    not has_function_privilege('anon', 'public.offered_mobile_grooming(uuid)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
