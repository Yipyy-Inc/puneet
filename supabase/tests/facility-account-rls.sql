-- ============================================================================
-- A facility's commercial account is readable by its admins, and nobody else.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/facility-account-rls.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- ADR 0005 gave a membership an access level, and 20260818100000 made the app
-- gates read it. But `canAccessFacilityPortal` sending a groomer away from
-- /facility is ROUTING. The boundary is here, and until 20260818140000 it still
-- said "any active member":
--
--   groomer reads employer's facility_subscriptions rows = 1
--
-- That row is the facility's commercial relationship with Yipyy — plan, price,
-- status, dunning state — and it was reachable through PostgREST from a browser
-- with nothing but a session. `payment_connections` names the facility's Clover
-- merchant and had the same policy.
--
-- P3 and P4 are the ones that stop this becoming a different bug: staff must
-- STILL read facility_settings and facility_modules, because a schedule needs
-- the opening hours and a nav needs the enabled modules. The line is between
-- what a business RUNS ON and what it IS COMMERCIALLY.
--
-- P5/P6 measure the write refusal with GET DIAGNOSTICS row_count, not by
-- checking the row afterwards. An RLS-refused UPDATE affects zero rows SILENTLY
-- — it does not raise — so "the row still exists" proves nothing at all. The
-- first draft of this test asserted exactly that and passed while proving
-- nothing.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_fac uuid; v_admin_profile text; v_staff constant text := 'user_acctStaff000000000000000000';
  n int; v_rows int; v_name text;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  select profile_id into v_admin_profile
    from public.facility_memberships
   where facility_id = v_fac and access_level = 'admin' limit 1;
  select name into v_name from public.facilities where id = v_fac;

  insert into public.profiles (id, email, full_name)
  values (v_staff, 'acct.staff@yipyy.invalid', 'Account Probe Staff')
  on conflict (id) do nothing;
  insert into public.facility_memberships (profile_id, facility_id, role, is_active)
  values (v_staff, v_fac, 'groomer', true)
  on conflict (profile_id, facility_id) do nothing;

  -- ── as a member of staff ────────────────────────────────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_staff, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.facility_subscriptions where facility_id = v_fac;
  perform pg_temp.t(1, 'staff cannot read their employer''s subscription', n = 0, n::text);

  select count(*) into n from public.payment_connections where facility_id = v_fac;
  perform pg_temp.t(2, 'staff cannot read the facility''s payment connection', n = 0, n::text);

  select count(*) into n from public.facility_settings where facility_id = v_fac;
  perform pg_temp.t(3, 'staff CAN still read facility_settings', n > 0, n || ' rows');

  select count(*) into n from public.facility_modules where facility_id = v_fac;
  perform pg_temp.t(4, 'staff CAN still read facility_modules (no error)', true, n || ' rows');

  update public.facilities set name = 'HIJACKED' where id = v_fac;
  get diagnostics v_rows = row_count;
  perform pg_temp.t(5, 'staff cannot rename the facility', v_rows = 0, v_rows || ' rows affected');

  update public.facility_settings set updated_at = now() where facility_id = v_fac;
  get diagnostics v_rows = row_count;
  perform pg_temp.t(6, 'staff cannot write facility settings', v_rows = 0, v_rows || ' rows affected');

  execute 'reset role';

  -- ── as an admin of the same facility ────────────────────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin_profile, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.facility_subscriptions where facility_id = v_fac;
  perform pg_temp.t(7, 'an admin still reads their own subscription', n = 1, n::text);

  update public.facilities set name = v_name where id = v_fac;
  get diagnostics v_rows = row_count;
  perform pg_temp.t(8, 'an admin still renames the facility', v_rows = 1, v_rows || ' rows affected');

  update public.facility_settings set updated_at = now() where facility_id = v_fac;
  get diagnostics v_rows = row_count;
  perform pg_temp.t(9, 'an admin still writes facility settings', v_rows > 0, v_rows || ' rows affected');

  execute 'reset role';

  -- ── as a platform admin, who supports every facility ────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select profile_id from public.platform_memberships limit 1),
                      'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.facility_subscriptions;
  perform pg_temp.t(10, 'a platform admin reads every subscription',
                    n = (select count(*) from public.facility_subscriptions), n::text);

  execute 'reset role';
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
