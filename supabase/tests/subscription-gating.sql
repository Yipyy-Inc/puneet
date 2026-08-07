-- ============================================================================
-- A lapsed subscription closes the doors, and touches nothing behind them.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/subscription-gating.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Spec 002 phase 7. Suspension has to be enforced on the DATABASE, not in a
-- portal layout: a layout gate is a redirect, and every API route, script and
-- ungated screen goes round it.
--
-- Three assertions carry the whole design, and each one was written because the
-- first attempt got it wrong:
--
--   S3  suspended really does close the doors. The first version put the gate
--       only in member_facility_ids(); most staff-facing tables scope through
--       has_permission() instead, so a suspended facility's staff could still
--       read every client. Asserting the CLIENT COUNT rather than trusting
--       "the gate is in the function" is what caught it.
--
--   S4  the owner can still see the facility and its status. Putting suspension
--       inside member_facility_ids() also hid the facility ROW from its own
--       owner, so the billing screen could not name the business it was asking
--       them to pay for. A suspension the customer cannot undo is an outage we
--       caused.
--
--   S6  reactivating brings everything back. Suspension is a locked door, not a
--       bonfire — nothing is deleted and nothing is anonymised.
--
-- S1 exists so S3 means something: a gate that is always closed would pass S3
-- and be useless.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.profiles (id, email, full_name) values
  ('user_subAdmin0000000000000000000', 'subadmin@yipyy.invalid', 'Sub Admin'),
  ('user_subOwner00000000000000000000', 'lowner@lapsed.invalid', 'L Owner')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role)
values ('user_subAdmin0000000000000000000', 'superadmin')
on conflict (profile_id) do update set role = excluded.role;

select set_config('request.jwt.claims',
  json_build_object('sub','user_subAdmin0000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000f-0000-4000-8000-000000000002'::uuid,
    'Lapsed Kennels', 'lapsed-kennels', 'America/Toronto',
    'L Owner', 'lowner@lapsed.invalid',
    null, null, null, null, '[]'::jsonb, array['boarding','daycare']);
end $$;

select pg_temp.t(0, 'S0 provisioning creates the subscription — every facility has one',
  (select count(*) from public.facilities f
    left join public.facility_subscriptions s on s.facility_id = f.id
   where s.facility_id is null) = 0);

reset role;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_subOwner00000000000000000000', id, 'owner', true
  from public.facilities where slug = 'lapsed-kennels'
on conflict (profile_id, facility_id) do nothing;

insert into public.clients (facility_id, name, email, status, details)
select id, 'A Client', 'client@lapsed.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'lapsed-kennels';

update public.facility_subscriptions set status = 'active'
 where facility_id = (select id from public.facilities where slug = 'lapsed-kennels');

-- ── ACTIVE ─────────────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_subOwner00000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(1, 'S1 ACTIVE: the owner sees their client and the facility is operable',
  (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
    where f.slug = 'lapsed-kennels') = 1
  and (select count(*) from private.member_facility_ids()) = 1);

-- ── SUSPEND ────────────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_subAdmin0000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    perform public.set_subscription_status(
      (select id from public.facilities where slug = 'lapsed-kennels'), 'suspended');
    state := 'OK';
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(2, 'S2 a superadmin can suspend', state = 'OK', state);
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_subOwner00000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(3, 'S3 SUSPENDED: no clients readable, nothing operable',
  (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
    where f.slug = 'lapsed-kennels') = 0
  and (select count(*) from private.member_facility_ids()) = 0);

select pg_temp.t(4, 'S4 the owner CAN still see the facility and its status, to pay it',
  (select count(*) from public.facilities where slug = 'lapsed-kennels') = 1
  and (select s.status::text from public.facility_subscriptions s
         join public.facilities f on f.id = s.facility_id
        where f.slug = 'lapsed-kennels') = 'suspended');

do $$
declare state text;
begin
  begin
    update public.facility_subscriptions set status = 'active'
     where facility_id = (select id from public.facilities where slug = 'lapsed-kennels');
    state := 'no error';
  exception when others then state := sqlstate;
  end;
  -- An RLS-denied UPDATE matches zero rows rather than raising, so the stored
  -- value is the assertion, not the absence of an error.
  perform pg_temp.t(5, 'S5 and cannot un-suspend themselves',
    (select s.status::text from public.facility_subscriptions s
       join public.facilities f on f.id = s.facility_id
      where f.slug = 'lapsed-kennels') = 'suspended', 'update ' || state);
end $$;

-- ── Support still needs to see it ──────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_subAdmin0000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(6, 'S6 a PLATFORM ADMIN still sees a suspended facility''s clients',
  (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
    where f.slug = 'lapsed-kennels') = 1);

-- ── REACTIVATE ─────────────────────────────────────────────────────────────

do $$
begin
  perform public.set_subscription_status(
    (select id from public.facilities where slug = 'lapsed-kennels'), 'active');
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_subOwner00000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(7, 'S7 REACTIVATED: it all comes back — a locked door, not a bonfire',
  (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
    where f.slug = 'lapsed-kennels') = 1);

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
