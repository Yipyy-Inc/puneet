-- ============================================================================
-- An invited owner ends up with a live membership at their own facility.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/owner-invitation.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Spec 002 phase 2. The loop that lets somebody into a business they own has
-- five moving parts and no single place to read it:
--
--   invite_facility_owner  ->  facility_membership_grants row
--   they sign up in Clerk  ->  webhook writes `profiles`
--   trigger on profiles    ->  private.claim_grants_for
--                          ->  facility_memberships + staff.membership_id
--
-- Nothing in the application can assert that end to end, so this does. It is
-- the difference between "we send an email" and "they can get in".
--
-- O3, O4 and O5 are the ones to keep. A grant that claims for the WRONG email,
-- an EXPIRED grant that still works, or an owner who can invite themselves into
-- someone else's facility are each worth more than the happy path.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── A platform admin, and a facility they provisioned ──────────────────────

insert into public.profiles (id, email, full_name, is_platform_admin) values
  ('user_inviteAdmin00000000000000000', 'admin@yipyy.invalid', 'Platform Admin', true)
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_inviteAdmin00000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility(
    '0000000b-0000-4000-8000-000000000001'::uuid,
    'Harbour Hounds', 'harbour-hounds', 'America/Toronto',
    'Nour Haddad', 'nour@harbour.invalid');
end $$;

-- ── O1: inviting records an UNCLAIMED grant for the owner's address ────────

do $$
declare r jsonb;
begin
  r := public.invite_facility_owner(
    (select id from public.facilities where slug = 'harbour-hounds'),
    now() + interval '14 days');

  perform pg_temp.t(1, 'O1 inviting records an unclaimed owner grant',
    (r->>'email') = 'nour@harbour.invalid'
    and (r->>'role') = 'owner'
    and (r->>'claimed')::boolean = false
    and (r->>'facilityName') = 'Harbour Hounds',
    coalesce(r::text, 'null'));
exception when others then
  perform pg_temp.t(1, 'O1 inviting records an unclaimed owner grant', false,
    sqlstate || ' ' || sqlerrm);
end $$;

-- ── O2: the profile arriving CLAIMS it — the whole point of the mechanism ──
--
-- This is what the Clerk webhook does. Inserting the row is the trigger's
-- entire input, so this is the real path and not a simulation of one.

reset role;
insert into public.profiles (id, email, full_name) values
  ('user_inviteOwner00000000000000000', 'nour@harbour.invalid', 'Nour Haddad')
on conflict (id) do nothing;
set local role authenticated;

select pg_temp.t(2, 'O2 the owner signing up makes the membership LIVE',
  (select count(*) from public.facility_memberships m
     join public.facilities f on f.id = m.facility_id
    where f.slug = 'harbour-hounds'
      and m.profile_id = 'user_inviteOwner00000000000000000'
      and m.role = 'owner'
      and m.is_active) = 1);

select pg_temp.t(3, 'O2b the grant is marked claimed, and staff is linked to it',
  (select count(*) from public.facility_membership_grants g
     join public.facilities f on f.id = g.facility_id
    where f.slug = 'harbour-hounds'
      and g.claimed_at is not null
      and g.claimed_profile_id = 'user_inviteOwner00000000000000000') = 1
  and (select count(*) from public.staff s
        join public.facilities f on f.id = s.facility_id
       where f.slug = 'harbour-hounds' and s.membership_id is not null) = 1);

-- ── O3: a DIFFERENT address does not claim it ──────────────────────────────
--
-- The grant is matched on email. If that match were loose — or absent — any
-- new signup would inherit a stranger's facility.

do $$
declare before_count int; after_count int;
begin
  select count(*) into before_count from public.facility_memberships;

  reset role;
  insert into public.profiles (id, email, full_name) values
    ('user_inviteOther00000000000000000', 'someone.else@harbour.invalid', 'Someone Else')
  on conflict (id) do nothing;

  select count(*) into after_count from public.facility_memberships;
  perform pg_temp.t(4, 'O3 a different email claims NOTHING',
    after_count = before_count,
    'memberships ' || before_count || ' -> ' || after_count);
end $$;

-- ── O4: an EXPIRED grant does not claim ────────────────────────────────────
--
-- claim_grants_for filters on `expires_at > now()`. An invitation that outlived
-- its expiry would be a permanent, forgotten route into a business.

insert into public.profiles (id, email, full_name, is_platform_admin) values
  ('user_inviteAdmin20000000000000000', 'admin2@yipyy.invalid', 'Platform Admin 2', true)
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_inviteAdmin20000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_facility uuid; before_count int; after_count int;
begin
  perform public.provision_facility(
    '0000000b-0000-4000-8000-000000000002'::uuid,
    'Stale Kennels', 'stale-kennels', 'America/Toronto',
    'Old Invite', 'stale@kennels.invalid');

  select id into v_facility from public.facilities where slug = 'stale-kennels';
  perform public.invite_facility_owner(v_facility, now() - interval '1 day');

  select count(*) into before_count from public.facility_memberships;

  reset role;
  insert into public.profiles (id, email, full_name) values
    ('user_inviteStale00000000000000000', 'stale@kennels.invalid', 'Old Invite')
  on conflict (id) do nothing;

  select count(*) into after_count from public.facility_memberships;
  perform pg_temp.t(5, 'O4 an EXPIRED invitation claims nothing',
    after_count = before_count,
    'memberships ' || before_count || ' -> ' || after_count);
end $$;

-- ── O5: a facility OWNER cannot invite an owner into another facility ──────

select set_config('request.jwt.claims',
  json_build_object('sub','user_inviteOwner00000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    perform public.invite_facility_owner(
      (select id from public.facilities where slug = 'stale-kennels'));
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(6, 'O5 a facility owner may NOT invite into another facility',
    state = '42501', 'state=' || state);
end $$;

-- ── O6: withdrawing an unclaimed invitation ────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_inviteAdmin00000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare r jsonb; v_facility uuid;
begin
  select id into v_facility from public.facilities where slug = 'stale-kennels';
  r := public.revoke_facility_owner_invite(v_facility);
  perform pg_temp.t(7, 'O6 an unclaimed invitation can be withdrawn',
    (r->>'revoked')::boolean = true
    and (select count(*) from public.facility_membership_grants
          where facility_id = v_facility) = 0,
    coalesce(r::text, 'null'));
exception when others then
  perform pg_temp.t(7, 'O6 an unclaimed invitation can be withdrawn', false,
    sqlstate || ' ' || sqlerrm);
end $$;

-- ── O7: a CLAIMED invitation is NOT withdrawable ───────────────────────────
--
-- Deleting it would change nothing about the access it already produced. It
-- would only make the audit trail lie about how that access was granted.

do $$
declare state text;
begin
  begin
    perform public.revoke_facility_owner_invite(
      (select id from public.facilities where slug = 'harbour-hounds'));
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(8, 'O7 a CLAIMED invitation is refused, not silently deleted',
    state = '42501', 'state=' || state);
end $$;

select pg_temp.t(9, 'O7b and the membership it produced is untouched',
  (select count(*) from public.facility_memberships m
     join public.facilities f on f.id = m.facility_id
    where f.slug = 'harbour-hounds' and m.is_active) = 1);

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
