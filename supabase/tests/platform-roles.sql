-- ============================================================================
-- The platform team has roles, and nobody can grant themselves one.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/platform-roles.sql
--
-- One transaction, rolled back — which is what lets R12 below exist at all.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Spec 002 phase 6. R1 is the one that matters and it is not a role test: it
-- is a PRIVILEGE ESCALATION that was live in production and was found while
-- grounding this migration.
--
--   profiles_update_self  USING (id = auth.jwt()->>'sub')
--
-- RLS is ROW-level. That policy admits the whole row, so any signed-in person
-- could `update profiles set is_platform_admin = true` on themselves and pass
-- all 69 policies that call private.is_platform_admin(). Proved against the
-- live database before the fix: the probe came back `became_admin: true`.
--
-- The fix is structural rather than a new policy — platform_memberships is the
-- source of truth, the boolean is a mirror a trigger overwrites — so R1 asserts
-- the ATTEMPT SUCCEEDS AND ACHIEVES NOTHING, which is the actual behaviour. An
-- assertion that the update raises would be testing a design we did not build.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- Three identities: an ordinary customer, platform support, a superadmin.
insert into public.profiles (id, email, full_name) values
  ('user_rmCustomer00000000000000000', 'cust@rm.invalid',  'RM Customer'),
  ('user_rmSupport000000000000000000', 'supp@rm.invalid',  'RM Support'),
  ('user_rmSuper0000000000000000000',  'super@rm.invalid', 'RM Super')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_rmSupport000000000000000000', 'support'),
  ('user_rmSuper0000000000000000000',  'superadmin')
on conflict (profile_id) do update set role = excluded.role;

-- ── R1–R3: the escalation, closed on every route into it ───────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_rmCustomer00000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    update public.profiles set is_platform_admin = true
     where id = 'user_rmCustomer00000000000000000';
    state := 'no error';
  exception when others then state := sqlstate;
  end;
  -- Deliberately NOT asserting that the update raises. It is allowed and
  -- reverted, because raising would break every ordinary profile PATCH that
  -- sends the column back unchanged.
  perform pg_temp.t(1, 'R1 a customer setting is_platform_admin gains NOTHING',
    (select is_platform_admin from public.profiles
      where id = 'user_rmCustomer00000000000000000') = false
    and private.is_platform_admin() = false,
    'update ' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.platform_memberships (profile_id, role)
    values ('user_rmCustomer00000000000000000', 'superadmin');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(2, 'R2 nor by inserting a platform_memberships row directly',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    perform public.grant_platform_role('user_rmCustomer00000000000000000', 'superadmin');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(3, 'R3 nor through grant_platform_role',
    state = '42501', 'state=' || state);
end $$;

-- ── R4–R8: support is on the team, and cannot destroy ──────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_rmSuper0000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Doomed Kennels', 'doomed-kennels', 'America/Toronto',
    'D Owner', 'downer@doomed.invalid');
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_rmSupport000000000000000000','role','authenticated')::text, true);
set local role authenticated;

-- The compatibility assertion. is_platform_admin() must keep its exact meaning,
-- because 69 policies call it — narrowing it would re-authorise all of them at
-- once, in a migration whose stated job was to narrow TWO.
select pg_temp.t(4, 'R4 support IS a platform admin — the 69 existing policies are unchanged',
  private.is_platform_admin() = true);

select pg_temp.t(5, 'R5 support can READ every facility',
  (select count(*) from public.facilities) >= 2);

select pg_temp.t(6, 'R6 support holds support, not superadmin',
  (select role::text from public.platform_memberships
    where profile_id = 'user_rmSupport000000000000000000') = 'support');

do $$
declare before_n int; after_n int;
begin
  select count(*) into before_n from public.facilities;
  -- An RLS-denied DELETE matches zero rows rather than raising, so the count is
  -- the assertion.
  delete from public.facilities where slug = 'doomed-kennels';
  select count(*) into after_n from public.facilities;
  perform pg_temp.t(7, 'R7 SUPPORT CANNOT DELETE A FACILITY — the point of phase 6',
    after_n = before_n, 'facilities ' || before_n || ' -> ' || after_n);
end $$;

do $$
declare state text;
begin
  begin
    perform public.grant_platform_role('user_rmCustomer00000000000000000', 'support');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(8, 'R8 support cannot add people to the platform team',
    state = '42501', 'state=' || state);
end $$;

-- ── R9–R11: a superadmin can ──────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_rmSuper0000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare before_n int; after_n int;
begin
  delete from public.facility_membership_grants g using public.facilities f
    where g.facility_id = f.id and f.slug = 'doomed-kennels';
  delete from public.staff s using public.facilities f
    where s.facility_id = f.id and f.slug = 'doomed-kennels';
  delete from public.locations l using public.facilities f
    where l.facility_id = f.id and f.slug = 'doomed-kennels';

  select count(*) into before_n from public.facilities;
  delete from public.facilities where slug = 'doomed-kennels';
  select count(*) into after_n from public.facilities;
  perform pg_temp.t(9, 'R9 a SUPERADMIN can delete a facility',
    after_n = before_n - 1, 'facilities ' || before_n || ' -> ' || after_n);
end $$;

do $$
declare state text;
begin
  begin
    perform public.grant_platform_role('user_rmCustomer00000000000000000', 'billing');
    state := 'OK';
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(10, 'R10 a superadmin can grant a platform role',
    state = 'OK', state);
end $$;

reset role;
select pg_temp.t(11, 'R11 the mirror follows — profiles.is_platform_admin turned true',
  (select is_platform_admin from public.profiles
    where id = 'user_rmCustomer00000000000000000') = true);

-- ── R12: the last superadmin ──────────────────────────────────────────────
--
-- THIS IS WHY THE FILE IS TRANSACTIONAL. Reaching "exactly one superadmin"
-- means demoting the real one, which is not something to do against a live
-- project — so this branch is only ever exercised here, inside a transaction
-- that rolls back. A live run of the other assertions cannot cover it.

delete from public.platform_memberships
 where role = 'superadmin'
   and profile_id <> 'user_rmSuper0000000000000000000';

select set_config('request.jwt.claims',
  json_build_object('sub','user_rmSuper0000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    perform public.revoke_platform_role('user_rmSuper0000000000000000000');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(12, 'R12 the LAST superadmin cannot be removed',
    state = '42501', 'state=' || state);
end $$;

select pg_temp.t(13, 'R12b and they are still there',
  (select count(*) from public.platform_memberships where role = 'superadmin') = 1);

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
