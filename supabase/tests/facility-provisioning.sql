-- ============================================================================
-- A facility is provisioned in one transaction, or not at all.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/facility-provisioning.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Spec 002 phase 1. The add-facility wizard's handleComplete was a console.log
-- and a redirect: a superadmin could complete six steps and create nothing.
-- `provision_facility` is what those six steps now call.
--
-- The happy path is the LEAST interesting assertion here. P2 (a facility owner
-- cannot mint facilities) and P5 (a failure leaves nothing behind) are the ones
-- worth keeping, because a function that only ever gets tested on its happy
-- path would pass while granting anyone the power to create a tenant.
--
-- P5 exists because this is SECURITY DEFINER and runs AROUND RLS. The guard on
-- line one of the body is the only thing between a facility owner and a
-- facility of their own; if a later edit moves a read above it, P2 fails.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── Two identities: one who may create facilities, one who may not ─────────

insert into public.profiles (id, email, full_name) values
  ('user_provAdmin000000000000000000', 'admin@yipyy.invalid',  'Platform Admin'),
  ('user_provOwner000000000000000000', 'owner@tenant.invalid', 'Tenant Owner')
on conflict (id) do nothing;

-- ── THE SLUGS ARE NAMESPACED, AND HAVE TO BE ───────────────────────────────
--
-- `fp-probe`, not `pawradise`. This file provisions a facility and then counts
-- rows matching its slug — and there is a REAL Pawradise in production, so the
-- insert collided on `orgs_slug_key` and the count assertions would have read 2
-- where they expect 1.
--
-- Written when this database was nearly empty. A test that asserts over a whole
-- table has to own the rows it counts, and the cheapest way to own them is a
-- prefix nothing real will ever use.

-- ── BECOMING A PLATFORM ADMIN ──────────────────────────────────────────────
--
-- Through `platform_memberships`, NOT `profiles.is_platform_admin`.
--
-- That column is a MIRROR, maintained by `private.sync_platform_admin_flag`
-- from this table, and `private.is_platform_admin()` — which every platform
-- gate actually calls — reads the table. Setting the column by hand produces a
-- profile that claims to be an admin and is refused by everything, which is
-- what this file did until 2026-08-22 and why four of its assertions failed
-- with "Only a platform administrator may create a facility".
insert into public.platform_memberships (profile_id, role) values
  ('user_provAdmin000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

-- The owner is a real owner SOMEWHERE — the point of P2 is that owning a
-- facility does not let you create another one.
insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_provOwner000000000000000000', f.id, 'owner', true
  from public.facilities f where f.legacy_id = '11'
on conflict (profile_id, facility_id) do nothing;

-- ── P1: the happy path, as a platform admin ────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_provAdmin000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare r jsonb;
begin
  r := public.provision_facility(
    '0000000a-0000-4000-8000-000000000001'::uuid,
    'FP Probe Resort', 'fp-probe', 'America/Toronto',
    'Dana Okonkwo', 'dana@fp-probe.invalid', '+1 555 0100',
    'hello@fp-probe.invalid', '+1 555 0101', 'https://fp-probe.invalid',
    '[{"name":"Downtown"},{"name":"Riverside"}]'::jsonb);

  perform pg_temp.t(1, 'P1 a platform admin provisions a facility',
    (r->>'facilityId') is not null and (r->>'replayed')::boolean = false,
    coalesce(r->>'facilityId', 'no facilityId'));

  -- Every row the wizard promises, asserted individually rather than trusting
  -- the return value — the function could report success and write nothing.
  perform pg_temp.t(2, 'P1b org, facility, 2 locations, owner staff and grant all exist',
    (select count(*) from public.orgs       where slug = 'fp-probe') = 1
    and (select count(*) from public.facilities where slug = 'fp-probe') = 1
    and (select count(*) from public.locations  l
          join public.facilities f on f.id = l.facility_id
         where f.slug = 'fp-probe') = 2
    and (select count(*) from public.locations l
          join public.facilities f on f.id = l.facility_id
         where f.slug = 'fp-probe' and l.is_primary) = 1
    and (select count(*) from public.staff s
          join public.facilities f on f.id = s.facility_id
         where f.slug = 'fp-probe' and s.primary_role = 'owner') = 1
    and (select count(*) from public.facility_membership_grants g
          join public.facilities f on f.id = g.facility_id
         where f.slug = 'fp-probe'
           and g.email = 'dana@fp-probe.invalid') = 1);
exception when others then
  perform pg_temp.t(1, 'P1 a platform admin provisions a facility', false,
    sqlstate || ' ' || sqlerrm);
end $$;

-- ── P2: THE ASSERTION THAT MATTERS. An owner cannot mint a facility. ───────

select set_config('request.jwt.claims',
  json_build_object('sub','user_provOwner000000000000000000','role','authenticated')::text, true);

do $$
declare state text;
begin
  begin
    perform public.provision_facility(
      '0000000a-0000-4000-8000-000000000002'::uuid,
      'Owner Land', 'owner-land', 'America/Toronto',
      'Tenant Owner', 'owner@tenant.invalid');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(3, 'P2 a facility OWNER calling provision_facility is REFUSED',
    state = '42501', 'state=' || state);
end $$;

select pg_temp.t(4, 'P2b and nothing was created by that attempt',
  (select count(*) from public.orgs where slug = 'owner-land') = 0);

-- ── P3: a reserved slug is refused ─────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_provAdmin000000000000000000','role','authenticated')::text, true);

do $$
declare state text;
begin
  begin
    perform public.provision_facility(
      '0000000a-0000-4000-8000-000000000003'::uuid,
      'Sneaky', 'admin', 'America/Toronto',
      'Someone', 'someone@sneaky.invalid');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- 23514 is check_violation: facilities_slug_not_reserved.
  perform pg_temp.t(5, 'P3 the reserved slug "admin" is REFUSED',
    state = '23514', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    perform public.provision_facility(
      '0000000a-0000-4000-8000-000000000004'::uuid,
      'Bad Host', 'Not A Hostname!', 'America/Toronto',
      'Someone', 'someone@bad.invalid');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(6, 'P3b a slug that is not a DNS label is REFUSED',
    state = '23514', 'state=' || state);
end $$;

-- ── P4: the same request id twice creates ONE facility ─────────────────────

do $$
declare r jsonb;
begin
  r := public.provision_facility(
    '0000000a-0000-4000-8000-000000000001'::uuid,
    'FP Probe Resort', 'fp-probe-again', 'America/Toronto',
    'Dana Okonkwo', 'dana@fp-probe.invalid');

  perform pg_temp.t(7, 'P4 replaying a request id returns the FIRST answer',
    (r->>'replayed')::boolean = true and (r->>'slug') = 'fp-probe',
    'slug=' || coalesce(r->>'slug','null') || ' replayed=' || coalesce(r->>'replayed','null'));
exception when others then
  perform pg_temp.t(7, 'P4 replaying a request id returns the FIRST answer', false,
    sqlstate || ' ' || sqlerrm);
end $$;

select pg_temp.t(8, 'P4b the replay created no second facility',
  (select count(*) from public.facilities where slug = 'fp-probe-again') = 0);

-- ── P5: a failure leaves NOTHING — not even the org it got as far as ───────
--
-- The org is inserted before the facility, so an invalid slug fails at the
-- facilities insert with the org already written. If provisioning were a
-- sequence of calls rather than one function, that org would survive.

do $$
declare
  before_orgs int;
  after_orgs  int;
  state       text;
begin
  select count(*) into before_orgs from public.orgs;
  begin
    perform public.provision_facility(
      '0000000a-0000-4000-8000-000000000005'::uuid,
      'Halfway House', 'HALFWAY!!', 'America/Toronto',
      'Someone', 'someone@halfway.invalid');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select count(*) into after_orgs from public.orgs;

  perform pg_temp.t(9, 'P5 a provisioning that fails midway leaves NO orphan org',
    state <> 'ALLOWED' and after_orgs = before_orgs,
    'state=' || state || ' orgs ' || before_orgs || ' -> ' || after_orgs);
end $$;

select pg_temp.t(10, 'P5b and no provisioning receipt was written for it',
  (select count(*) from public.provisioning_requests
    where id = '0000000a-0000-4000-8000-000000000005'::uuid) = 0);

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
