-- ============================================================================
-- A customer reads the settings addressed AT them, and no others.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/customer-visible-settings.sql
--
-- One transaction, rolled back.
--
-- ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
--
-- `private.customer_visible_setting_domains()` is an ALLOWLIST, and until this
-- file nothing read it back. Two domains had already been added to it —
-- `tax_config` (20260819180000) and `loyalty_config` (20260822100000) — and
-- both were verified by having been written, which AGENTS.md is explicit is not
-- verification at all. An allowlist that grows by one line per migration and is
-- asserted by nothing is one typo away from handing a customer a facility's
-- payroll.
--
-- `yipyy_go_config` joined it on 2026-09-06 and is the reason this got written.
--
-- ── THE FOUR THINGS THAT MUST ALL HOLD ────────────────────────────────────
--
-- A grant is only correct if all four do. Testing the first alone is how an
-- allowlist quietly becomes a table grant:
--
--   1. A client CAN read an allowlisted domain at their OWN facility.
--   2. A client CANNOT read a domain that is NOT on the list, at that same
--      facility. This is the one that catches a policy which stopped
--      consulting the function.
--   3. A client CANNOT read the allowlisted domain at a facility they are not
--      a client of. This is the one that catches a policy which consults the
--      function but forgot the tenancy join.
--   4. A client CANNOT WRITE the domain they can read. Reading the form you
--      are asked for is not permission to change what is asked.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── Two facilities, and a customer of exactly one of them ─────────────────

insert into public.profiles (id, email, full_name) values
  ('user_cvsAdmin000000000000000000000', 'cvsadmin@yipyy.invalid', 'CVS Admin')
on conflict (id) do nothing;

-- Through `platform_memberships`, not `profiles.is_platform_admin` — see the
-- note in customer-tenancy.sql about the four assertions that failed for it.
insert into public.platform_memberships (profile_id, role) values
  ('user_cvsAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_cvsAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Gamma Pets', 'gamma-pets-cvs', 'America/Toronto', 'G Owner', 'gowner@gamma.invalid');
  perform public.provision_facility('0000000e-0000-4000-8000-000000000002'::uuid,
    'Delta Pets', 'delta-pets-cvs', 'America/Toronto', 'D Owner', 'downer@delta.invalid');
end $$;

reset role;

-- Both facilities configure Yipyy Go, and both set a payroll rule. The payroll
-- row is the control: it is NOT on the allowlist and must stay invisible at the
-- customer's own facility, where every other condition is satisfied.
insert into public.facility_settings (facility_id, domain, value)
select id, 'yipyy_go_config',
       jsonb_build_object('enabled', true, 'serviceConfigs', '[]'::jsonb)
  from public.facilities where slug in ('gamma-pets-cvs', 'delta-pets-cvs')
on conflict (facility_id, domain) do update set value = excluded.value;

insert into public.facility_settings (facility_id, domain, value)
select id, 'payroll_config', jsonb_build_object('overtimeAfterHours', 44)
  from public.facilities where slug in ('gamma-pets-cvs', 'delta-pets-cvs')
on conflict (facility_id, domain) do update set value = excluded.value;

-- Gamma's staff enter this person as a client. They are a client of Gamma and
-- of nowhere else.
insert into public.clients (facility_id, name, email, status, details)
select id, 'Wren Okafor', 'wren@okafor.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'gamma-pets-cvs';

insert into public.profiles (id, email, full_name) values
  ('user_cvsWren0000000000000000000000', 'wren@okafor.invalid', 'Wren Okafor')
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_cvsWren0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('gamma-pets-cvs');
end $$;

-- ── 1. The allowlisted domain, at their own facility ──────────────────────

do $$
declare n int;
begin
  select count(*) into n from public.facility_settings fs
    join public.facilities f on f.id = fs.facility_id
   where f.slug = 'gamma-pets-cvs' and fs.domain = 'yipyy_go_config';
  perform pg_temp.t(1,
    'a client reads yipyy_go_config at the facility they are a client of',
    n = 1, n || ' rows');
end $$;

-- ── 2. A domain that is NOT on the list, same facility ────────────────────

do $$
declare n int;
begin
  select count(*) into n from public.facility_settings fs
    join public.facilities f on f.id = fs.facility_id
   where f.slug = 'gamma-pets-cvs' and fs.domain = 'payroll_config';
  perform pg_temp.t(2,
    'a client CANNOT read payroll_config at their own facility',
    n = 0, n || ' rows — the policy has stopped consulting the allowlist');
end $$;

-- ── 3. The allowlisted domain, at a facility that is not theirs ───────────

do $$
declare n int;
begin
  select count(*) into n from public.facility_settings fs
    join public.facilities f on f.id = fs.facility_id
   where f.slug = 'delta-pets-cvs' and fs.domain = 'yipyy_go_config';
  perform pg_temp.t(3,
    'a client CANNOT read yipyy_go_config at a facility they are not a client of',
    n = 0, n || ' rows — the allowlist is consulted but the tenancy join is not');
end $$;

-- ── 4. Reading is not writing ─────────────────────────────────────────────

do $$
declare state text; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'gamma-pets-cvs';
  begin
    update public.facility_settings
       set value = jsonb_build_object('enabled', false)
     where facility_id = v_fac and domain = 'yipyy_go_config';
    -- RLS refuses an UPDATE by matching no rows rather than raising, so a
    -- silent zero-row update is the PASS here. `check:rls-writes` exists
    -- because that distinction is invisible from the client.
    state := case when found then 'WROTE' else 'no rows' end;
  exception when others then state := 'refused: ' || sqlstate;
  end;
  perform pg_temp.t(4,
    'a client CANNOT write the domain they may read',
    state <> 'WROTE', state);
end $$;

reset role;

-- ── 5. The SECOND domain added the same day ──────────────────────────────
--
-- mobile_app_config joined the allowlist in 20260906213414. It is asserted
-- separately from yipyy_go_config rather than assumed to follow from it: the
-- function is one array literal and a migration that rewrites it can drop an
-- entry as easily as add one. That is the failure this file exists to catch.

reset role;

insert into public.facility_settings (facility_id, domain, value)
select id, 'mobile_app_config',
       jsonb_build_object('appName', 'Gamma App', 'enableLiveCamera', true)
  from public.facilities where slug in ('gamma-pets-cvs', 'delta-pets-cvs')
on conflict (facility_id, domain) do update set value = excluded.value;

select set_config('request.jwt.claims',
  json_build_object('sub','user_cvsWren0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare own int; other int;
begin
  select count(*) into own from public.facility_settings fs
    join public.facilities f on f.id = fs.facility_id
   where f.slug = 'gamma-pets-cvs' and fs.domain = 'mobile_app_config';
  select count(*) into other from public.facility_settings fs
    join public.facilities f on f.id = fs.facility_id
   where f.slug = 'delta-pets-cvs' and fs.domain = 'mobile_app_config';
  perform pg_temp.t(7,
    'a client reads mobile_app_config at their own facility and not at another',
    own = 1 and other = 0, 'own ' || own || ', other ' || other);
end $$;

reset role;

-- ── The list itself ───────────────────────────────────────────────────────
--
-- Asserted separately from the policy so a failure says WHICH of the two moved:
-- a domain missing from the function, or a policy that no longer calls it.

do $$
declare domains text[];
begin
  domains := private.customer_visible_setting_domains();
  perform pg_temp.t(5,
    'yipyy_go_config is on the customer allowlist',
    'yipyy_go_config' = any(domains), array_length(domains, 1) || ' domains');
  perform pg_temp.t(6,
    'payroll_config is NOT on the customer allowlist',
    not ('payroll_config' = any(domains)), array_to_string(domains, ', '));
  perform pg_temp.t(8,
    'mobile_app_config is on the customer allowlist',
    'mobile_app_config' = any(domains), array_length(domains, 1) || ' domains');
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
