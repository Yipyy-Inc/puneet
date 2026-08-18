-- ============================================================================
-- Only a superadmin invites one, and a token opens a form rather than granting
-- a role.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/platform-invitation.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- `www.yipyy.com/sign-up` was closed on 2026-08-18 so that accounts are created
-- at a facility's address. That makes `/setup/<token>` the ONLY door onto the
-- Yipyy platform team, and it was a mock in three separate ways: the route that
-- sent the invitation had no auth guard, the token was unsigned base64url whose
-- `role` field the recipient could edit, and the page discarded the password and
-- wrote a localStorage flag.
--
-- P4 is the assertion that matters most. The token's job is to OPEN A FORM, not
-- to carry authority — so accepting one must be impossible against any account
-- but the invited address. Without that line a leaked link means "make my own
-- account a superadmin" instead of "open a form", and every other guard here is
-- decoration.
--
-- P6 is the quiet one: an invitation must never DOWNGRADE somebody. Inviting an
-- existing superadmin as `readonly` has to be refused rather than silently
-- demoting the person who can administer the platform.
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
  v_super    text;
  v_facowner text;
  v_hash     bytea := decode(repeat('ab', 32), 'hex');
  v_hash2    bytea := decode(repeat('cd', 32), 'hex');
  v_ok       boolean;
  v_msg      text;
  r          jsonb;
  v_invitee  constant text := 'user_platInvitee00000000000000000';
  v_other    constant text := 'user_platOther0000000000000000000';
begin
  select profile_id into v_super
    from public.platform_memberships where role = 'superadmin' limit 1;
  select m.profile_id into v_facowner
    from public.facility_memberships m
   where m.access_level = 'admin' and m.profile_id <> v_super limit 1;

  insert into public.profiles (id, email, full_name)
  values (v_other, 'plat.other@yipyy.invalid', 'Plat Other')
  on conflict (id) do nothing;

  -- ── P1: running a facility is not running the platform ──────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_facowner, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_ok := false;
  begin
    r := public.invite_platform_admin('plat.invitee@yipyy.invalid', 'Plat Invitee',
                                      'superadmin', v_hash, now() + interval '48 hours');
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(1, 'a facility admin cannot invite a platform admin', v_ok, v_msg);
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- ── P2/P3: the superadmin invites, and a re-invite replaces ─────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_super, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  r := public.invite_platform_admin('plat.invitee@yipyy.invalid', 'Plat Invitee',
                                    'support', v_hash, now() + interval '48 hours');
  perform pg_temp.t(2, 'a superadmin invites, and the role is recorded',
                    r->>'role' = 'support', r::text);

  r := public.invite_platform_admin('plat.invitee@yipyy.invalid', 'Plat Invitee',
                                    'billing', v_hash2, now() + interval '48 hours');
  perform pg_temp.t(3, 'a re-invite replaces the pending one, leaving one live token',
    (select count(*) from public.platform_invitations
      where lower(email) = 'plat.invitee@yipyy.invalid' and accepted_at is null) = 1);

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- ── P4: the token opens a form; it does not grant a role ────────────────
  v_ok := false;
  begin
    r := public.accept_platform_invitation(v_hash2, v_other);
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(4, 'an invitation cannot be accepted onto another address',
                    v_ok, v_msg);

  -- ── P5: the real path — a profile appears, the trigger claims it ────────
  insert into public.profiles (id, email, full_name)
  values (v_invitee, 'plat.invitee@yipyy.invalid', 'Plat Invitee');

  perform pg_temp.t(5, 'a new profile claims its own invitation',
    (select role::text from public.platform_memberships where profile_id = v_invitee) = 'billing',
    coalesce((select role::text from public.platform_memberships where profile_id = v_invitee),
             'no membership'));

  perform pg_temp.t(6, 'the invitation is marked accepted, so the token is spent',
    (select accepted_at is not null from public.platform_invitations where token_hash = v_hash2));

  perform pg_temp.t(7, 'profiles.is_platform_admin mirrors the new membership',
    (select is_platform_admin from public.profiles where id = v_invitee));

  -- ── P8: an invitation must never demote ─────────────────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_super, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_ok := false;
  begin
    r := public.invite_platform_admin('plat.invitee@yipyy.invalid', 'Plat Invitee',
                                      'readonly', decode(repeat('ef', 32), 'hex'),
                                      now() + interval '48 hours');
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(8, 'somebody already on the team cannot be re-invited (or demoted)',
                    v_ok, v_msg);

  -- ── P9: an expired invitation is not claimable ──────────────────────────
  insert into public.platform_invitations (email, full_name, role, token_hash, expires_at)
  values ('plat.expired@yipyy.invalid', 'Expired', 'superadmin',
          decode(repeat('01', 32), 'hex'), now() - interval '1 minute');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  insert into public.profiles (id, email, full_name)
  values ('user_platExpired00000000000000000', 'plat.expired@yipyy.invalid', 'Expired');

  perform pg_temp.t(9, 'an expired invitation is not claimed by the trigger',
    not exists (select 1 from public.platform_memberships
                 where profile_id = 'user_platExpired00000000000000000'));
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
