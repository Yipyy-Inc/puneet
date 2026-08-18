-- ============================================================================
-- Admin access is granted by an admin, and a facility never runs out of them.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/facility-access-level.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- ADR 0005 splits a membership's JOB TITLE (13 values, selects a permission
-- template) from its ACCESS LEVEL (2 values, decides which portal). The whole
-- split is worth nothing if the level can be raised by the people it is meant
-- to hold back, so the interesting assertions here are the refusals.
--
-- P3 is the one that matters most, and it names a hole that PRE-DATES the
-- split: memberships_insert/update are gated on `manage_staff`, which is a
-- PERMISSION — and a facility can grant a permission to any job title through
-- its own role editor. So a receptionist given manage_staff (a plausible thing
-- for a front desk that books and hires) could set their own primary_role to
-- 'owner' and mint themselves 168 permissions. That is why
-- private.is_facility_admin is deliberately NOT routed through
-- private.has_permission: if admin-ness were a permission key, a facility could
-- grant itself admin from its own settings screen.
--
-- P6 exists because the guard could otherwise be too strict to be usable: at
-- the moment a founding owner accepts their invitation the facility has NO
-- admin, so there is nobody who could approve them. The carve-out is an admin
-- GRANT recorded for their address — which only an admin (or a platform admin
-- provisioning the facility) could have created.
--
-- P8 is the invariant that makes the rest safe to enforce: nothing in the
-- schema can restore an admin once the last one is gone.
--
-- ── A NOTE ON A REFUSAL THAT IS NOT THIS FILE'S ────────────────────────────
--
-- Deleting a facility outright currently fails with "audit_log is append-only:
-- UPDATE is not permitted", because audit_log.facility_id is ON DELETE SET
-- NULL and that SET NULL is an UPDATE the append-only trigger refuses. That is
-- unrelated to access levels and pre-dates them; it is why the cascade carve-out
-- in private.protect_last_facility_admin cannot be exercised here.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── The cast ───────────────────────────────────────────────────────────────
--
-- An owner (admin), and a receptionist (staff) whose facility has handed the
-- front desk `manage_staff`.

insert into public.profiles (id, email, full_name) values
  ('user_aclOwner00000000000000000000', 'acl.owner@yipyy.invalid', 'ACL Owner'),
  ('user_aclRecep00000000000000000000', 'acl.recep@yipyy.invalid', 'ACL Reception'),
  ('user_aclInvite0000000000000000000', 'acl.invited@yipyy.invalid', 'ACL Invited')
on conflict (id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_aclOwner00000000000000000000', f.id, 'owner', true
  from public.facilities f where f.legacy_id = '11'
on conflict (profile_id, facility_id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_aclRecep00000000000000000000', f.id, 'reception', true
  from public.facilities f where f.legacy_id = '11'
on conflict (profile_id, facility_id) do nothing;

insert into public.facility_role_permissions (facility_id, role, permission_key, scope)
select f.id, 'reception', 'manage_staff', 'anytime'
  from public.facilities f where f.legacy_id = '11'
on conflict (facility_id, role, permission_key) do update set scope = 'anytime';

-- ── P0: the backfill describes what was already true ───────────────────────

select pg_temp.t(0, 'an owner membership is admin, a reception one is staff',
  (select access_level = 'admin' from public.facility_memberships
    where profile_id = 'user_aclOwner00000000000000000000')
  and
  (select access_level = 'staff' from public.facility_memberships
    where profile_id = 'user_aclRecep00000000000000000000'));

-- ── As the receptionist, who holds manage_staff ────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_aclRecep00000000000000000000','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t(1, 'is_facility_admin is false for staff',
  not private.is_facility_admin((select id from public.facilities where legacy_id='11')));

do $$
declare v_ok boolean := false; v_msg text := '';
begin
  begin
    update public.facility_memberships set access_level = 'admin'
     where profile_id = 'user_aclRecep00000000000000000000';
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(2, 'manage_staff cannot raise its own access level', v_ok, v_msg);
end $$;

do $$
declare v_ok boolean := false; v_msg text := '';
begin
  begin
    update public.facility_memberships set role = 'owner'
     where profile_id = 'user_aclRecep00000000000000000000';
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(3, 'manage_staff cannot make itself an owner', v_ok, v_msg);
end $$;

do $$
declare v_ok boolean := false; v_msg text := '';
begin
  begin
    insert into public.staff (facility_id, first_name, last_name, email, primary_role)
    select f.id, 'Minted', 'Admin', 'acl.minted@yipyy.invalid', 'manager'
      from public.facilities f where f.legacy_id = '11';
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(4, 'manage_staff cannot HIRE an admin', v_ok, v_msg);
end $$;

-- The guard must not become a wall. An ordinary hire still works, and lands as
-- staff without anybody naming a level.
do $$
declare v_lvl text;
begin
  insert into public.staff (facility_id, first_name, last_name, email, primary_role)
  select f.id, 'Ordinary', 'Groomer', 'acl.groomer@yipyy.invalid', 'groomer'
    from public.facilities f where f.legacy_id = '11';
  select access_level into v_lvl from public.staff where email = 'acl.groomer@yipyy.invalid';
  perform pg_temp.t(5, 'an ordinary hire still works, and defaults to staff',
                    v_lvl = 'staff', coalesce(v_lvl, 'no row'));
exception when others then
  perform pg_temp.t(5, 'an ordinary hire still works, and defaults to staff', false, sqlerrm);
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- ── P6: a founding owner accepts an invitation to an empty facility ────────

do $$
declare v_org uuid; v_fac uuid; v_staff uuid; v_lvl text;
begin
  select org_id into v_org from public.facilities where legacy_id = '11';

  insert into public.facilities (org_id, name, slug, timezone)
  values (v_org, 'ACL Probe', 'acl-probe-facility', 'America/Toronto')
  returning id into v_fac;

  insert into public.staff (facility_id, first_name, last_name, email, primary_role)
  values (v_fac, 'Founding', 'Owner', 'acl.invited@yipyy.invalid', 'owner')
  returning id into v_staff;

  insert into public.facility_membership_grants (facility_id, staff_id, email, role)
  values (v_fac, v_staff, 'acl.invited@yipyy.invalid', 'owner');

  perform pg_temp.t(6, 'an owner grant carries admin without being asked',
    (select access_level = 'admin' from public.facility_membership_grants
      where staff_id = v_staff));

  -- The real claim path: the webhook writes profiles, the trigger claims. The
  -- profile already exists here, so re-record the grant to force a claim.
  perform private.claim_grants_for('user_aclInvite0000000000000000000', 'acl.invited@yipyy.invalid');

  select access_level into v_lvl from public.facility_memberships
   where profile_id = 'user_aclInvite0000000000000000000' and facility_id = v_fac;

  perform pg_temp.t(7, 'the founding owner claims their own admin grant',
                    v_lvl = 'admin', coalesce(v_lvl, 'no membership'));

  -- ── P8: they are now the only admin of that facility ────────────────────
  declare v_ok boolean := false; v_msg text := '';
  begin
    begin
      update public.facility_memberships set is_active = false
       where profile_id = 'user_aclInvite0000000000000000000' and facility_id = v_fac;
    exception when others then v_ok := true; v_msg := sqlerrm;
    end;
    perform pg_temp.t(8, 'the last admin cannot be deactivated', v_ok, v_msg);

    v_ok := false;
    begin
      delete from public.facility_memberships
       where profile_id = 'user_aclInvite0000000000000000000' and facility_id = v_fac;
    exception when others then v_ok := true; v_msg := sqlerrm;
    end;
    perform pg_temp.t(9, 'the last admin cannot be deleted', v_ok, v_msg);
  end;

  -- ── P10: with a second admin, demotion is legitimate again ──────────────
  insert into public.profiles (id, email, full_name)
  values ('user_aclSecond0000000000000000000', 'acl.second@yipyy.invalid', 'ACL Second')
  on conflict (id) do nothing;

  insert into public.facility_memberships (profile_id, facility_id, role, is_active)
  values ('user_aclSecond0000000000000000000', v_fac, 'manager', true);

  perform pg_temp.t(10, 'a manager inserted with no level is normalised to admin',
    (select access_level = 'admin' from public.facility_memberships
      where profile_id = 'user_aclSecond0000000000000000000' and facility_id = v_fac));

  update public.facility_memberships set is_active = false
   where profile_id = 'user_aclInvite0000000000000000000' and facility_id = v_fac;
  perform pg_temp.t(11, 'an admin CAN be demoted once a second one exists', true);
exception when others then
  perform pg_temp.t(11, 'an admin CAN be demoted once a second one exists', false, sqlerrm);
end $$;

-- ── P12: an admin-tier job title cannot be stripped of admin access ────────
--
-- The state this forbids is role='owner' with access_level='staff': 168
-- permissions, and no admin portal to exercise them in. RLS reads permissions
-- and the gates read access, so that row is somebody who can drain the data
-- through the API while the UI calls them staff.

do $$
declare v_ok boolean := false; v_msg text := '';
begin
  begin
    update public.facility_memberships set access_level = 'staff'
     where profile_id = 'user_aclOwner00000000000000000000';
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(12, 'an owner cannot be demoted to staff access', v_ok, v_msg);
end $$;

-- ── P13: the permission cascade is untouched ───────────────────────────────
--
-- The whole point of keeping `role`: a receptionist still resolves to exactly
-- the receptionist preset. If this fails, the split ate the RBAC.

select pg_temp.t(13, 'a reception membership still resolves 66 permissions',
  (select count(*) from public.permissions p
    where coalesce(private.resolve_permission(
      (select id from public.facility_memberships
        where profile_id = 'user_aclRecep00000000000000000000'), p.key),
      'none') <> 'none') = 66,
  'manage_staff was added to the preset above, so 65 + 1');

-- ── Results ────────────────────────────────────────────────────────────────

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
