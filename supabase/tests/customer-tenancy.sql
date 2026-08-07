-- ============================================================================
-- A customer belongs to the facility they joined, and to no other.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/customer-tenancy.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Spec 002 D1 is the product's central promise: each facility has its OWN
-- customers, not shared ones. The credential is shared because Clerk gives no
-- alternative; the ACCOUNT is not. This file is that sentence, in SQL.
--
-- C7 is the one to keep. A signed-in person who is a customer at Alpha and
-- opens Beta's subdomain is ALREADY SIGNED IN there — the session cookie is set
-- on the apex and no configuration of a single Clerk instance changes that
-- (spec 002 D1/D2). What must follow from it is nothing at all: zero rows, no
-- implicit record, no facility in their switcher.
--
-- C2 is the subtlety worth reading twice. A CLOSED facility still links someone
-- whose record it already created, because entering a customer IS an
-- invitation. Refusing that would mean a facility could add a client who could
-- then never see their own bookings.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── Two facilities: one open to registration, one closed ───────────────────

insert into public.profiles (id, email, full_name, is_platform_admin) values
  ('user_ctAdmin0000000000000000000000', 'ctadmin@yipyy.invalid', 'CT Admin', true)
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ctAdmin0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000d-0000-4000-8000-000000000001'::uuid,
    'Alpha Pets', 'alpha-pets', 'America/Toronto', 'A Owner', 'aowner@alpha.invalid');
  perform public.provision_facility('0000000d-0000-4000-8000-000000000002'::uuid,
    'Beta Pets', 'beta-pets', 'America/Toronto', 'B Owner', 'bowner@beta.invalid');
  perform public.set_customer_signup(
    (select id from public.facilities where slug = 'alpha-pets'), true);
  perform public.set_customer_signup(
    (select id from public.facilities where slug = 'beta-pets'), false);
end $$;

-- Beta's staff enter this person as a client. Note the CASE — the claim below
-- has to match it case-insensitively or the customer gets a second record and
-- their history splits in two.
reset role;
insert into public.clients (facility_id, name, email, status, details)
select id, 'Sam Rivera', 'SAM@rivera.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'beta-pets';

insert into public.profiles (id, email, full_name) values
  ('user_ctSam000000000000000000000000', 'sam@rivera.invalid', 'Sam Rivera')
on conflict (id) do nothing;

-- ── Registering ────────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_ctSam000000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v uuid; state text;
begin
  begin
    v := public.register_client('alpha-pets', 'Sam Rivera', '+1 555 0000');
    state := case when v is null then 'NULL' else 'OK' end;
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(1, 'C1 registering at an OPEN facility creates a record there',
    state = 'OK', state);
end $$;

do $$
declare v uuid; state text;
begin
  begin
    v := public.register_client('beta-pets', 'Sam Rivera', null);
    state := case when v is null then 'NULL' else 'OK' end;
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(2, 'C2 a CLOSED facility that pre-entered them still links (an invitation)',
    state = 'OK', state);
end $$;

reset role;
select pg_temp.t(3, 'C2b one record at each, and SAM@ was claimed by sam@ — not duplicated',
  (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
    where c.profile_id = 'user_ctSam000000000000000000000000' and f.slug = 'alpha-pets') = 1
  and (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
    where c.profile_id = 'user_ctSam000000000000000000000000' and f.slug = 'beta-pets') = 1
  and (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
    where f.slug = 'beta-pets') = 1);

select pg_temp.t(4, 'C3 the same person holds TWO SEPARATE records, one per facility',
  (select count(*) from public.clients
    where profile_id = 'user_ctSam000000000000000000000000') = 2);

-- ── What each party can see ────────────────────────────────────────────────

insert into public.profiles (id, email, full_name) values
  ('user_ctStrange00000000000000000000', 'stranger@nowhere.invalid', 'A Stranger'),
  ('user_ctAlphaStaff0000000000000000',  'astaff@alpha.invalid',     'Alpha Staff')
on conflict (id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_ctAlphaStaff0000000000000000', id, 'manager', true
  from public.facilities where slug = 'alpha-pets'
on conflict (profile_id, facility_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ctSam000000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(5, 'C4 a customer sees exactly their own two records and no others',
  (select count(*) from public.clients) = 2
  and (select count(*) from public.clients
        where profile_id is distinct from 'user_ctSam000000000000000000000000') = 0);

select pg_temp.t(6, 'C5 client_facility_ids() returns exactly their two facilities',
  (select count(*) from private.client_facility_ids()) = 2);

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_ctAlphaStaff0000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(7, 'C6 Alpha staff see Sam''s ALPHA record and not the Beta one',
  (select count(*) from public.clients) = 1
  and (select count(*) from public.clients c join public.facilities f on f.id = c.facility_id
        where f.slug = 'alpha-pets') = 1);

-- ── THE STRANGER GATE ──────────────────────────────────────────────────────
--
-- Signed in — the cookie is shared across the apex and always will be — and a
-- customer of nowhere. Nothing may follow from the session alone.

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_ctStrange00000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(8, 'C7 THE STRANGER GATE: signed in, but zero rows anywhere',
  (select count(*) from public.clients) = 0
  and (select count(*) from private.client_facility_ids()) = 0);

do $$
declare state text; v uuid;
begin
  begin
    v := public.register_client('beta-pets', 'A Stranger', null);
    state := case when v is null then 'NULL' else 'CREATED' end;
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(9, 'C8 registering at a CLOSED facility they were never invited to is REFUSED',
    state = '42501', 'state=' || state);
end $$;

select pg_temp.t(10, 'C8b and no record was created for them',
  (select count(*) from public.clients
    where profile_id = 'user_ctStrange00000000000000000000') = 0);

-- No implicit record creation, at an open facility OR a closed one. Claiming is
-- for a row a facility already made; there is none for this person anywhere.
select pg_temp.t(11, 'C9 link_client_record claims nothing at a facility that never entered them',
  public.link_client_record('beta-pets') is null
  and public.link_client_record('alpha-pets') is null);

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
