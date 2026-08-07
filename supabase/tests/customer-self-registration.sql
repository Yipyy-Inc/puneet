-- ============================================================================
-- A customer registers at ONE facility, and is a stranger at every other.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/customer-self-registration.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Spec 002 phase 5's WRITES were tested when they were built. What was never
-- tested is the pair of READS the screens need, because the screens did not
-- exist: /join asks "am I a customer here?" and the signed-out sign-up page
-- asks "does this facility take registrations?".
--
-- Both are asked BY SOMEBODY WHO IS NOT A CUSTOMER YET, which is exactly the
-- caller `facilities_read` refuses. That is the trap the phase-5 migration
-- documented and it is easy to reintroduce: the obvious implementation looks
-- the facility up by slug and silently gets nothing.
--
-- R4 is the assertion that carries the design: registering at one facility
-- must not make you a customer at another, and my_client_at must say so.
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
  ('user_csrAdmin000000000000000000000', 'csradmin@yipyy.invalid', 'CSR Admin'),
  ('user_csrPetOwner00000000000000000',  'owner@pets.invalid',     'Pat Owner'),
  ('user_csrInvited000000000000000000',  'invited@pets.invalid',   'In Vited')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role)
values ('user_csrAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do update set role = excluded.role;

select set_config('request.jwt.claims',
  json_build_object('sub','user_csrAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000c-0000-4000-8000-000000000001'::uuid,
    'Open Kennels', 'open-kennels', 'America/Toronto', 'O Owner', 'o@open.invalid');
  perform public.provision_facility('0000000c-0000-4000-8000-000000000002'::uuid,
    'Shut Kennels', 'shut-kennels', 'America/Toronto', 'S Owner', 's@shut.invalid');
end $$;

reset role;

-- Open Kennels takes registrations; Shut Kennels does not. Set directly rather
-- than through set_customer_signup, which is exercised at S1 below.
update public.facilities set allow_customer_signup = true where slug = 'open-kennels';

-- Shut Kennels' front desk has already entered somebody. That record is an
-- invitation, and R6 asserts it can still be claimed through a closed door.
insert into public.clients (facility_id, name, email, status, details)
select id, 'In Vited', 'invited@pets.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'shut-kennels';

-- ── The signed-out question: does this facility take registrations? ────────

set local role anon;

select pg_temp.t(1, 'A1 anon can read branding AND the signup flag, by slug',
  (select allow_customer_signup from public.facility_branding_by_slug('open-kennels')) = true
  and (select allow_customer_signup from public.facility_branding_by_slug('shut-kennels')) = false);

select pg_temp.t(2, 'A2 and STILL cannot read the facilities table — a lookup, not a directory',
  (select count(*) from public.facilities) = 0);

do $$
declare state text;
begin
  begin
    perform public.my_client_at('open-kennels');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(3, 'A3 anon cannot ask my_client_at at all', state = '42501', 'state=' || state);
end $$;

reset role;

-- ── The pet owner: a stranger everywhere, then a customer at ONE ───────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_csrPetOwner00000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(4, 'R1 a signed-in stranger is a customer nowhere',
  public.my_client_at('open-kennels') is null
  and public.my_client_at('shut-kennels') is null);

-- This is the case that made the phase-5 functions take a SLUG rather than a
-- uuid: a non-customer's own subquery against `facilities` returns zero rows,
-- so any design that resolves the id caller-side gets NULL and fails silently.
select pg_temp.t(5, 'R2 and cannot resolve a slug to an id themselves — hence the slug API',
  (select count(*) from public.facilities where slug = 'open-kennels') = 0);

do $$
declare v_client uuid;
begin
  v_client := public.register_client('open-kennels', 'Pat Owner', '555-0100');
  perform pg_temp.t(6, 'R3 they can register where signup is OPEN', v_client is not null);
end $$;

select pg_temp.t(7, 'R4 REGISTERING AT ONE FACILITY MAKES THEM NOBODY AT THE OTHER',
  public.my_client_at('open-kennels') is not null
  and public.my_client_at('shut-kennels') is null);

do $$
declare state text;
begin
  begin
    perform public.register_client('shut-kennels', 'Pat Owner', null);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(8, 'R5 and a CLOSED facility refuses them',
    state = '42501', 'state=' || state);
end $$;

do $$
declare a uuid; b uuid;
begin
  a := public.register_client('open-kennels', 'Pat Owner', null);
  b := public.register_client('open-kennels', 'Someone Else', null);
  -- The /join form can be submitted twice, and a double-click must not create
  -- a second client record for the same person.
  perform pg_temp.t(9, 'R6 registering twice is idempotent — no second record',
    a = b and (select count(*) from public.clients c
                 join public.facilities f on f.id = c.facility_id
                where f.slug = 'open-kennels'
                  and c.profile_id = 'user_csrPetOwner00000000000000000') = 1);
end $$;

-- ── The invited customer: a closed door still opens for them ───────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_csrInvited000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(10, 'I1 before claiming, my_client_at says no — so /join shows the form',
  public.my_client_at('shut-kennels') is null);

do $$
declare v_client uuid;
begin
  v_client := public.register_client('shut-kennels', 'In Vited', null);
  -- The whole reason the closed state still has a button. Being entered by the
  -- front desk IS an invitation, and signup being off must not strand the
  -- people a facility has already agreed to serve.
  perform pg_temp.t(11, 'I2 SIGNUP IS OFF, but a record waiting for them is still claimed',
    v_client is not null);
end $$;

select pg_temp.t(12, 'I3 and now the portal admits them',
  public.my_client_at('shut-kennels') is not null);

-- ── The switch itself ──────────────────────────────────────────────────────

do $$
declare state text;
begin
  begin
    perform public.set_customer_signup(
      (select id from public.facilities where slug = 'shut-kennels'), true);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(13, 'S1 a CUSTOMER cannot open a facility to public registration',
    state = '42501', 'state=' || state);
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_csrAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    perform public.set_customer_signup(
      (select id from public.facilities where slug = 'shut-kennels'), true);
    state := 'OK';
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(14, 'S2 somebody with settings_general can', state = 'OK', state);
end $$;

select pg_temp.t(15, 'S3 and the signed-out page sees the change',
  (select allow_customer_signup from public.facility_branding_by_slug('shut-kennels')) = true);

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
