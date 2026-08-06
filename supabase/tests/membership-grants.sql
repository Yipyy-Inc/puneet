-- ============================================================================
-- A membership is granted to a Clerk identity (20260807120000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/membership-grants.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Under Supabase Auth, an admin could CREATE the hire's account, so an id
-- existed at invite time and link_staff_invite could grant against it. Clerk
-- owns sign-up now and will not mint a subject for somebody who has not signed
-- up, so there is nothing to grant to.
--
-- The grant is therefore recorded against the ADDRESS on the staff row and
-- claimed when a profile appears carrying it. Everything below is about the two
-- ways that can go wrong:
--
--   1. IT DOES NOT HAPPEN (G1-G4). A grant that never becomes a membership is
--      an employee who signs in successfully and sees an empty application —
--      the failure viewer.ts and RLS produce together, silently, with no error
--      anywhere. That was the live state before this migration: 2 people signed
--      in through Clerk, 0 memberships, both routed to /customer/dashboard.
--
--   2. IT HAPPENS TO THE WRONG PERSON (D1-D5). An address is a claim anyone can
--      type into a sign-up form. What makes this safe is that Clerk VERIFIES
--      the address before the webhook writes the profile — so the trigger only
--      ever fires for somebody who proved it. The tests below fix the parts
--      that are ours: the grant must not be self-service, must not be aimable
--      at an arbitrary address, and must expire.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- No auth.users rows: Clerk owns identity, `profiles` is where a subject exists.

insert into public.profiles (id, email, full_name) values
  ('user_mgAdmin00000000000000000000', 'mg-admin@example.invalid',   'The Admin'),
  ('user_mgOutsider0000000000000000', 'mg-outsider@example.invalid', 'An Outsider')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004a0001', 'MG Org', 'mg-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004a0010', '00000000-0000-0000-0000-0000004a0001',
   'MG Facility', 'mg-facility', 'mg-a')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000004a0020', '00000000-0000-0000-0000-0000004a0010',
   'user_mgAdmin00000000000000000000', 'owner', true)
on conflict (id) do nothing;

-- Mixed case on purpose. Clerk sends the address as the person typed it, and an
-- admin types it into the staff form however they like; a grant that only
-- matched an exact string would fail for a reason nobody could see.
insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role, status)
values
  ('00000000-0000-0000-0000-0000004a0100', '00000000-0000-0000-0000-0000004a0010',
   null, 'mg-hire', 'New', 'Hire', 'New.Hire@Example.Invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-0000004a0101', '00000000-0000-0000-0000-0000004a0010',
   null, 'mg-owner', 'The', 'Owner', 'mg-owner@example.invalid', 'owner', 'active');

-- ── G1: the grant is recorded before the person exists ─────────────────────
do $$
declare r jsonb;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_mgAdmin00000000000000000000','role','authenticated')::text, true);
  set local role authenticated;
  r := public.record_membership_grant('mg-hire', now() + interval '7 days');
  reset role;
  perform pg_temp.t('G1 a grant is recorded for somebody with no identity yet',
    r->>'grantId' is not null and (r->>'claimed')::boolean is false,
    format('grant=%s claimed=%s', r->>'grantId', r->>'claimed'));
exception when others then
  reset role; perform pg_temp.t('G1 record grant', false, sqlerrm);
end $$;

-- ── G2: it is stored lowercased ────────────────────────────────────────────
-- The staff row says New.Hire@Example.Invalid. If the grant stored that
-- verbatim, a sign-up as new.hire@example.invalid would not match it.
do $$
declare e text;
begin
  perform set_config('request.jwt.claims', '', true);
  select email into e from public.facility_membership_grants
   where staff_id = '00000000-0000-0000-0000-0000004a0100';
  perform pg_temp.t('G2 the granted address is normalised',
    e = 'new.hire@example.invalid', format('stored=%s', e));
end $$;

-- ── G3: signing up claims it ───────────────────────────────────────────────
-- The write the Clerk sync webhook makes. Nothing else runs.
do $$
declare n integer; r text; linked boolean;
begin
  insert into public.profiles (id, email, full_name)
  values ('user_mgHire000000000000000000000', 'new.hire@example.invalid', 'New Hire');

  select count(*) into n from public.facility_memberships
   where profile_id = 'user_mgHire000000000000000000000';
  select role::text into r from public.facility_memberships
   where profile_id = 'user_mgHire000000000000000000000';
  select membership_id is not null into linked from public.staff
   where id = '00000000-0000-0000-0000-0000004a0100';

  perform pg_temp.t('G3 a sign-up claims the grant and the staff row is linked',
    n = 1 and r = 'groomer' and linked,
    format('memberships=%s role=%s staff_linked=%s', n, r, linked));
end $$;

-- ── G4: and the hire now resolves as a real member ─────────────────────────
-- The end of the chain, and the one that matters: has_permission has to answer
-- for them. G3 could pass with a row that RLS still refuses to act on.
-- `perform_grooming` and `check_in_out`, NOT `grooming_check_in_out` — which
-- does not exist. The permission that names the screen and the one held by the
-- people standing at it are rarely the same key; read role_preset_permissions
-- rather than guessing from the feature's name.
--
-- And `own` counts only THIS person's row: memberships_read deliberately admits
-- colleagues at the same facility (`facility_id in member_facility_ids()`), so
-- an unfiltered count is 2 here and says nothing about whose membership it is.
do $$
declare admin_flag boolean; own integer; p_groom boolean; p_checkin boolean; p_manage boolean;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_mgHire000000000000000000000','role','authenticated')::text, true);
  set local role authenticated;
  select private.is_platform_admin() into admin_flag;
  select count(*) into own from public.facility_memberships
   where profile_id = 'user_mgHire000000000000000000000';
  select private.has_permission('00000000-0000-0000-0000-0000004a0010','perform_grooming') into p_groom;
  select private.has_permission('00000000-0000-0000-0000-0000004a0010','check_in_out')     into p_checkin;
  select private.has_permission('00000000-0000-0000-0000-0000004a0010','manage_staff')     into p_manage;
  reset role;

  -- Not a platform admin, so this is RLS filtering rather than a bypass; and
  -- NOT manage_staff, so the grant gave them the groomer preset and not the
  -- run of the building.
  perform pg_temp.t('G4 the hire resolves as a groomer, not an admin',
    admin_flag is false and own = 1 and p_groom and p_checkin and not p_manage,
    format('admin=%s own=%s groom=%s checkin=%s manage=%s',
           admin_flag, own, p_groom, p_checkin, p_manage));
exception when others then
  reset role; perform pg_temp.t('G4 hire resolves', false, sqlerrm);
end $$;

-- ── D1: a sign-up with no grant gets nothing ───────────────────────────────
-- The whole safety claim in one assertion. If this fails, signing up is a way
-- to join a facility.
do $$
declare n integer;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.profiles (id, email, full_name)
  values ('user_mgStranger00000000000000000', 'mg-stranger@example.invalid', 'Stranger');
  select count(*) into n from public.facility_memberships
   where profile_id = 'user_mgStranger00000000000000000';
  perform pg_temp.t('D1 an ungranted sign-up joins nothing',
    n = 0, format('memberships=%s', n));
end $$;

-- ── D2: a grant is not claimable by a different address ────────────────────
do $$
declare claimed timestamptz;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_mgAdmin00000000000000000000','role','authenticated')::text, true);
  set local role authenticated;
  perform public.record_membership_grant('mg-owner', now() + interval '7 days');
  reset role;

  insert into public.profiles (id, email, full_name)
  values ('user_mgWrongAddr0000000000000000', 'not-the-owner@example.invalid', 'Wrong');

  select claimed_at into claimed from public.facility_membership_grants
   where staff_id = '00000000-0000-0000-0000-0000004a0101';
  perform pg_temp.t('D2 another address does not claim the grant',
    claimed is null, format('claimed_at=%s', claimed));
exception when others then
  reset role; perform pg_temp.t('D2 wrong address', false, sqlerrm);
end $$;

-- ── D3: an expired grant is dead ───────────────────────────────────────────
-- An invitation that was never taken up must not remain a live route into the
-- facility. The route sets expires_at from the template's invite window.
do $$
declare n integer;
begin
  perform set_config('request.jwt.claims', '', true);
  update public.facility_membership_grants set expires_at = now() - interval '1 day'
   where staff_id = '00000000-0000-0000-0000-0000004a0101';

  insert into public.profiles (id, email, full_name)
  values ('user_mgLateOwner0000000000000000', 'mg-owner@example.invalid', 'Late');

  select count(*) into n from public.facility_memberships
   where profile_id = 'user_mgLateOwner0000000000000000';
  perform pg_temp.t('D3 an expired grant is not claimable',
    n = 0, format('memberships=%s', n));
end $$;

-- ── D4: an outsider cannot grant themselves anything ───────────────────────
-- A signed-in identity with no membership at this facility. The permission
-- check is against the STAFF ROW's facility, not an argument, so there is no
-- facility they could name instead.
do $$
declare refused boolean;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_mgOutsider0000000000000000','role','authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.record_membership_grant('mg-owner', null);
    refused := false;
  exception when others then
    refused := true;
  end;
  reset role;
  perform pg_temp.t('D4 an outsider cannot record a grant',
    refused, format('refused=%s', refused));
exception when others then
  reset role; perform pg_temp.t('D4 outsider', false, sqlerrm);
end $$;

-- ── D5: nobody can write a grant row directly ──────────────────────────────
-- The table has a read policy and NO write policy, so the only way in is the
-- RPC that checks manage_staff. Without this, `insert into
-- facility_membership_grants (email) values ('my@address')` would be
-- self-service tenancy — and an RLS-denied INSERT does raise, so this is
-- assertable directly.
do $$
declare refused boolean; n integer;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_mgOutsider0000000000000000','role','authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.facility_membership_grants (facility_id, staff_id, email, role)
    values ('00000000-0000-0000-0000-0000004a0010', '00000000-0000-0000-0000-0000004a0101',
            'mg-outsider@example.invalid', 'owner');
    refused := false;
  exception when others then
    refused := true;
  end;
  reset role;

  perform set_config('request.jwt.claims', '', true);
  select count(*) into n from public.facility_membership_grants
   where email = 'mg-outsider@example.invalid';
  perform pg_temp.t('D5 a direct insert into grants is refused',
    refused and n = 0, format('refused=%s rows=%s', refused, n));
exception when others then
  reset role; perform pg_temp.t('D5 direct insert', false, sqlerrm);
end $$;

-- ── D6: re-inviting reopens a claimed grant rather than duplicating ────────
-- `unique (staff_id)` means the second invite is an update. Without the
-- claimed_at reset, a hire whose account was deleted could never be re-invited.
do $$
declare n integer; claimed timestamptz;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub','user_mgAdmin00000000000000000000','role','authenticated')::text, true);
  set local role authenticated;
  perform public.record_membership_grant('mg-hire', now() + interval '7 days');
  reset role;

  select count(*) into n from public.facility_membership_grants
   where staff_id = '00000000-0000-0000-0000-0000004a0100';
  select claimed_at into claimed from public.facility_membership_grants
   where staff_id = '00000000-0000-0000-0000-0000004a0100';

  -- One row, and claimed again immediately: the hire from G3 already exists,
  -- so record_membership_grant settles it inline instead of leaving it open.
  perform pg_temp.t('D6 re-inviting updates the one grant and re-claims it',
    n = 1 and claimed is not null, format('rows=%s claimed_at=%s', n, claimed));
exception when others then
  reset role; perform pg_temp.t('D6 re-invite', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
