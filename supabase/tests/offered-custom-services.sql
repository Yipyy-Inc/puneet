-- ============================================================================
-- A customer is shown the custom services on offer — and nothing the
-- facility keeps for itself.
--
-- One transaction, rolled back.
--
-- `public.offered_custom_services()` (20260912172123) is a SECURITY DEFINER
-- projection over the `custom_services` setting, which is deliberately NOT on
-- the customer allowlist: a module carries internal notes, staff rules and a
-- disable reason. What must all hold:
--
--   1. A client is offered the ACTIVE, ONLINE-bookable module at their own
--      facility — and not the draft, nor the phone-only one.
--   2. What they are offered carries no `internalNotes` and no
--      `disableReason`, and of the staff assignment only `autoAssign`.
--   3. They are offered nothing at a facility they are not a client of.
--   4. They cannot read the `custom_services` row itself.
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
  ('user_ocsAdmin000000000000000000000', 'ocsadmin@yipyy.invalid', 'OCS Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_ocsAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ocsAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000f-0000-4000-8000-000000000001'::uuid,
    'Epsilon Pets', 'epsilon-pets-ocs', 'America/Toronto', 'E Owner', 'eowner@epsilon.invalid');
  perform public.provision_facility('0000000f-0000-4000-8000-000000000002'::uuid,
    'Zeta Pets', 'zeta-pets-ocs', 'America/Toronto', 'Z Owner', 'zowner@zeta.invalid');
end $$;

reset role;

-- Both facilities configure the same three modules: one on offer, one
-- phone-only, one a draft. The one on offer carries the facility's own notes.
insert into public.facility_settings (facility_id, domain, value)
select id, 'custom_services', jsonb_build_object('modules', jsonb_build_array(
  jsonb_build_object(
    'id', 'm-offered', 'slug', 'swim', 'name', 'Swim', 'status', 'active',
    'internalNotes', 'check the pool chlorine first',
    'disableReason', 'was off for a week',
    'staffAssignment', jsonb_build_object('autoAssign', true, 'requiredRole', 'lifeguard'),
    'onlineBooking', jsonb_build_object('enabled', true),
    'pricing', jsonb_build_object('basePrice', 40)),
  jsonb_build_object(
    'id', 'm-phone', 'slug', 'phone-only', 'name', 'Phone only', 'status', 'active',
    'onlineBooking', jsonb_build_object('enabled', false)),
  jsonb_build_object(
    'id', 'm-draft', 'slug', 'draft', 'name', 'Draft', 'status', 'draft',
    'onlineBooking', jsonb_build_object('enabled', true))
))
  from public.facilities where slug in ('epsilon-pets-ocs', 'zeta-pets-ocs')
on conflict (facility_id, domain) do update set value = excluded.value;

-- A client of Epsilon, and of nowhere else.
insert into public.clients (facility_id, name, email, status, details)
select id, 'Rowan Adeyemi', 'rowan@adeyemi.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'epsilon-pets-ocs';

insert into public.profiles (id, email, full_name) values
  ('user_ocsRowan000000000000000000000', 'rowan@adeyemi.invalid', 'Rowan Adeyemi')
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ocsRowan000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('epsilon-pets-ocs');
end $$;

-- ── 1–2. Their own facility ──────────────────────────────────────────────

do $$
declare offered jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'epsilon-pets-ocs';
  offered := public.offered_custom_services(v_fac);
  perform pg_temp.t(1,
    'a client is offered the active, online module and not the draft or phone-only one',
    jsonb_array_length(offered) = 1 and offered->0->>'id' = 'm-offered',
    offered::text);
  perform pg_temp.t(2,
    'what they are offered carries no internal notes, no disable reason, and only autoAssign of the staff rules',
    not (offered->0 ? 'internalNotes')
      and not (offered->0 ? 'disableReason')
      and offered->0->'staffAssignment' = jsonb_build_object('autoAssign', true)
      and (offered->0->'pricing'->>'basePrice')::numeric = 40,
    (offered->0)::text);
end $$;

-- ── 3. Another facility ───────────────────────────────────────────────────

do $$
declare offered jsonb; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'zeta-pets-ocs';
  offered := public.offered_custom_services(v_fac);
  perform pg_temp.t(3,
    'a client is offered nothing at a facility they are not a client of',
    offered = '[]'::jsonb, offered::text);
end $$;

-- ── 4. The row itself ─────────────────────────────────────────────────────

do $$
declare n int;
begin
  select count(*) into n from public.facility_settings fs
    join public.facilities f on f.id = fs.facility_id
   where f.slug = 'epsilon-pets-ocs' and fs.domain = 'custom_services';
  perform pg_temp.t(4,
    'a client CANNOT read the custom_services row at their own facility',
    n = 0, n || ' rows');
end $$;

reset role;

-- ── 5. anon ───────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(5,
    'anon cannot call offered_custom_services',
    not has_function_privilege('anon', 'public.offered_custom_services(uuid)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
