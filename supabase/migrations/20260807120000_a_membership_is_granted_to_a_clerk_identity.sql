-- ============================================================================
-- A membership is granted to a Clerk identity.
--
-- ── WHAT WAS BROKEN ───────────────────────────────────────────────────────
--
-- 20260805223000 turned profiles.id and facility_memberships.profile_id into
-- text holding a Clerk sub, and rewrote the 13 identity helpers. It did not
-- change link_staff_invite, which still declared `p_user_id uuid`.
--
-- specs/001-clerk-third-party-auth/plan.md:44 called this out —
--
--   "link_staff_invite's p_user_id uuid parameter must become text — a
--    signature change, so the old overload must be dropped, not just replaced."
--
-- — and the step did not land. Postgres casts uuid to text without complaint,
-- so the function kept working and kept being WRONG: measured on the live
-- project, inviting a hire wrote profile id 11111111-2222-3333-4444-555555555555
-- and granted it a real membership. No Clerk session can ever present that
-- subject, and 20260805233000's `id !~ '^user_'` rule classifies it as a
-- pre-Clerk identity to be deleted.
--
-- So the ONLY code path that creates a facility_membership was minting ghosts
-- and reporting success. facility_memberships is empty on the live project and
-- could not refill: the two people who have signed in through Clerk hold no
-- membership, so viewer.ts sends them to /customer/dashboard and RLS shows them
-- nothing anywhere else.
--
-- ── THE CHICKEN AND THE EGG ───────────────────────────────────────────────
--
-- Under Supabase Auth an admin could CREATE the hire's account, so the id
-- existed at invite time. Clerk owns sign-up now, and it will not mint a
-- subject for somebody who has not signed up. There is no id to grant to.
--
-- So a grant made before the person exists is recorded against the one thing
-- that is known at invite time — the address on their staff row — and claimed
-- when a profile turns up carrying it.
--
-- ── WHY A TRIGGER AND NOT AN RPC ──────────────────────────────────────────
--
-- The claim needs the service role's reach (it writes a membership for somebody
-- who is not the caller). Exposing that as a SECURITY DEFINER function in
-- `public` would put a tenancy-granting front door on PostgREST, and
-- supabase/tests/rpc-session-required.sql exists because we shipped exactly
-- that bug twice: `revoke ... from public` does not revoke from `anon`, so such
-- a function is reachable with the publishable key that ships in every browser
-- bundle. `claim_grants('user_me', 'victim@facility')` would be the third.
--
-- A trigger has no URL. It fires on the profile write the webhook already does,
-- in the same transaction, and cannot be invoked on its own.
-- ============================================================================

-- ── 1. Grants that are waiting for a person ─────────────────────────────────

create table if not exists public.facility_membership_grants (
  id                 uuid primary key default gen_random_uuid(),
  facility_id        uuid not null references public.facilities(id) on delete cascade,
  -- The hire this grant is for. One pending grant per staff row: re-inviting
  -- replaces rather than accumulating, which is what "resend" means.
  staff_id           uuid not null references public.staff(id) on delete cascade,
  -- Lowercased at write time by record_membership_grant. Stored rather than
  -- read from the staff row at claim time because changing somebody's staff
  -- email must not silently redirect a grant an admin already made.
  email              text not null check (email = lower(email)),
  role               public.facility_staff_role not null,
  -- Who made the grant. Text, because it is a Clerk sub. Deliberately no FK:
  -- the granting admin's profile could be deleted later, and losing the audit
  -- of who granted access is worse than a dangling id.
  granted_by         text,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz,
  claimed_at         timestamptz,
  claimed_profile_id text,
  unique (staff_id),
  -- A claimed grant records both halves or neither.
  constraint grant_claim_is_complete check (
    (claimed_at is null and claimed_profile_id is null) or
    (claimed_at is not null and claimed_profile_id is not null)
  )
);

comment on table public.facility_membership_grants is
  'A facility membership an admin granted before the person had a Clerk '
  'identity. Claimed by claim_membership_grants() when a profile appears '
  'carrying the address. A row here is not access — it becomes access only '
  'once a verified sign-up matches it.';

-- Claims look up unclaimed grants by address, and that is the only lookup.
create index if not exists facility_membership_grants_open_email_idx
  on public.facility_membership_grants (email)
  where claimed_at is null;

alter table public.facility_membership_grants enable row level security;

-- Reading a grant tells you who is being hired and into what role. Same
-- permission that makes the grant.
drop policy if exists membership_grants_read on public.facility_membership_grants;
create policy membership_grants_read
  on public.facility_membership_grants for select
  using (private.has_permission(facility_id, 'manage_staff')
         or private.is_platform_admin());

-- No insert/update/delete policy on purpose. Every write goes through
-- record_membership_grant or the claim trigger, both of which check
-- manage_staff themselves. A direct write would be a way to grant yourself a
-- membership by naming your own address.
revoke all on public.facility_membership_grants from public, anon;
grant select on public.facility_membership_grants to authenticated;

-- ── 2. The claim ────────────────────────────────────────────────────────────

-- The claim itself, in `private` so it has no PostgREST route at all. Called
-- from two places that both already know the caller is entitled: the profiles
-- trigger (the person just proved the address to Clerk) and
-- record_membership_grant (which checked manage_staff first).
create or replace function private.claim_grants_for(
  p_profile_id text,
  p_email      text
)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_grant      record;
  v_membership uuid;
  v_claimed    integer := 0;
begin
  -- Only a Clerk subject may claim. A uuid-shaped id is a pre-Clerk identity
  -- (20260805233000) and must never pick up a live grant on its way out.
  if p_profile_id is null or p_profile_id !~ '^user_' or p_email is null then
    return 0;
  end if;

  for v_grant in
    select * from public.facility_membership_grants
     where claimed_at is null
       and email = lower(p_email)
       and (expires_at is null or expires_at > now())
  loop
    insert into public.facility_memberships
      (facility_id, profile_id, role, is_active)
    values (v_grant.facility_id, p_profile_id, v_grant.role, true)
    on conflict (profile_id, facility_id) do update
      set role      = excluded.role,
          is_active = true
    returning id into v_membership;

    update public.facility_membership_grants
       set claimed_at         = now(),
           claimed_profile_id = p_profile_id
     where id = v_grant.id;

    -- The staff row now points at a membership that a real session resolves to.
    -- `status` is left alone: it says `invited` until onboarding is submitted,
    -- and signing up is not the same as having been onboarded.
    update public.staff
       set membership_id = v_membership
     where id = v_grant.staff_id;

    v_claimed := v_claimed + 1;
  end loop;

  return v_claimed;
end;
$$;

-- Belt and braces on top of living in `private`: PostgREST only exposes
-- `public`, and this is not callable by a client even if that ever changes.
revoke all on function private.claim_grants_for(text, text)
  from public, anon, authenticated;

create or replace function private.claim_membership_grants()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform private.claim_grants_for(new.id, new.email);
  return new;
end;
$$;

comment on function private.claim_membership_grants() is
  'Turns pending grants into memberships when a profile appears carrying the '
  'granted address. A trigger and not an RPC so it has no PostgREST route.';

-- AFTER, so the profile row exists for the membership FK. On UPDATE OF email
-- too: somebody can sign up with one address and add the work one afterwards,
-- and the grant should find them then rather than requiring a re-invite.
drop trigger if exists profiles_claim_membership_grants on public.profiles;
create trigger profiles_claim_membership_grants
  after insert or update of email on public.profiles
  for each row execute function private.claim_membership_grants();

-- ── 3. Recording a grant for somebody who has not signed up ────────────────

create or replace function public.record_membership_grant(
  p_staff_legacy_id text,
  p_expires_at      timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_staff      public.staff;
  v_id         uuid;
  v_profile_id text;
  v_claimed    integer := 0;
begin
  -- A session is required, checked BEFORE the lookup so an error cannot answer
  -- "does this staff id exist" for an anonymous caller. Same shape as
  -- link_staff_invite; supabase/tests/rpc-session-required.sql is the gate.
  if (select auth.jwt()->>'sub') is null then
    raise exception 'You must be signed in to invite staff.'
      using errcode = '42501';
  end if;

  select * into v_staff from public.staff where legacy_id = p_staff_legacy_id;
  if v_staff.id is null then
    raise exception 'No staff record for %.', p_staff_legacy_id
      using errcode = 'no_data_found';
  end if;

  if not private.has_permission(v_staff.facility_id, 'manage_staff')
     and not private.is_platform_admin() then
    raise exception 'You may not invite staff at this facility.'
      using errcode = '42501';
  end if;

  -- NO EMAIL ARGUMENT. The address comes off the staff row, exactly as the
  -- facility and the role do. Taking one would let a caller with manage_staff
  -- at their own facility grant that facility's owner role to any address they
  -- control — the same reason the facility is not an argument either.
  if coalesce(trim(v_staff.email), '') = '' then
    raise exception 'That staff member has no email address to invite.'
      using errcode = '22023';
  end if;

  insert into public.facility_membership_grants
    (facility_id, staff_id, email, role, granted_by, expires_at)
  values (v_staff.facility_id, v_staff.id, lower(trim(v_staff.email)),
          v_staff.primary_role, (select auth.jwt()->>'sub'), p_expires_at)
  on conflict (staff_id) do update
    set email       = excluded.email,
        role        = excluded.role,
        granted_by  = excluded.granted_by,
        expires_at  = excluded.expires_at,
        created_at  = now(),
        -- Re-inviting reopens the grant. Without this a hire who was invited,
        -- claimed, then had their account deleted could never be re-invited.
        claimed_at         = null,
        claimed_profile_id = null
  returning id into v_id;

  update public.staff
     set status            = 'invited',
         status_changed_at = now()
   where id = v_staff.id;

  -- If they have ALREADY signed up — a returning employee, or somebody who is
  -- a customer here — claim it now. The trigger fires on the profile write, and
  -- for an existing profile there is no write to fire on, so without this the
  -- grant would sit unclaimed until they happened to change their email.
  --
  -- Looked up here rather than in the route because profiles_read only admits
  -- your own row: the route would need the service-role key merely to ask
  -- "has this person signed up yet", and that key should not be a prerequisite
  -- for inviting somebody.
  select p.id into v_profile_id
    from public.profiles p
   where lower(p.email) = lower(trim(v_staff.email))
   limit 1;

  if v_profile_id is not null then
    v_claimed := private.claim_grants_for(v_profile_id, v_staff.email);
  end if;

  return jsonb_build_object(
    'grantId',    v_id,
    'staffId',    v_staff.legacy_id,
    'facilityId', v_staff.facility_id,
    'email',      lower(trim(v_staff.email)),
    'role',       v_staff.primary_role,
    -- The route says a different thing to the manager depending on this: a
    -- claimed grant means the hire can sign in now, an unclaimed one means the
    -- invitation is waiting for them to sign up.
    'claimed',    v_claimed > 0);
end;
$$;

revoke all on function public.record_membership_grant(text, timestamptz) from public, anon;
grant execute on function public.record_membership_grant(text, timestamptz) to authenticated;

-- ── 4. link_staff_invite takes a Clerk sub ─────────────────────────────────
--
-- The plan's step. Dropped and recreated rather than replaced: `create or
-- replace` with a different argument type makes an OVERLOAD, so the uuid
-- version would survive and PostgREST would still resolve a uuid argument to
-- it. That is the bug, still reachable.

drop function if exists public.link_staff_invite(text, uuid, text);

create or replace function public.link_staff_invite(
  p_staff_legacy_id text,
  p_profile_id      text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_staff      public.staff;
  v_email      text;
  v_membership uuid;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'You must be signed in to invite staff.'
      using errcode = '42501';
  end if;

  -- THE GUARD THAT WOULD HAVE CAUGHT THIS. Anything that is not a Clerk
  -- subject cannot hold a membership, because no session can present it. A
  -- uuid arrives here as text now, silently, so the shape must be checked
  -- rather than left to the type system.
  if p_profile_id !~ '^user_' then
    raise exception 'Not a Clerk identity: %. A membership granted to it could never be used.', p_profile_id
      using errcode = '22023';
  end if;

  select * into v_staff from public.staff where legacy_id = p_staff_legacy_id;
  if v_staff.id is null then
    raise exception 'No staff record for %.', p_staff_legacy_id
      using errcode = 'no_data_found';
  end if;

  if not private.has_permission(v_staff.facility_id, 'manage_staff')
     and not private.is_platform_admin() then
    raise exception 'You may not invite staff at this facility.'
      using errcode = '42501';
  end if;

  -- The profile must already exist. It used to be created here, from an email
  -- the caller passed in — which is how a caller could mint an identity. Clerk
  -- owns identities now and the sync webhook creates the row; this function
  -- only grants tenancy to one that is already there.
  select email into v_email from public.profiles where id = p_profile_id;
  if v_email is null then
    raise exception 'No profile for %. They must sign in once before they can be linked.', p_profile_id
      using errcode = 'no_data_found';
  end if;

  insert into public.facility_memberships
    (facility_id, profile_id, role, is_active)
  values (v_staff.facility_id, p_profile_id, v_staff.primary_role, true)
  on conflict (profile_id, facility_id) do update
    set role      = excluded.role,
        is_active = true
  returning id into v_membership;

  update public.staff
     set membership_id     = v_membership,
         status            = 'invited',
         status_changed_at = now()
   where id = v_staff.id;

  -- Any pending grant for this hire is now redundant — settled here rather
  -- than left open, so it cannot attach a second membership later.
  update public.facility_membership_grants
     set claimed_at         = now(),
         claimed_profile_id = p_profile_id
   where staff_id = v_staff.id and claimed_at is null;

  return jsonb_build_object(
    'staffId',      v_staff.legacy_id,
    'facilityId',   v_staff.facility_id,
    'membershipId', v_membership,
    'profileId',    p_profile_id);
end;
$$;

revoke all on function public.link_staff_invite(text, text) from public, anon;
grant execute on function public.link_staff_invite(text, text) to authenticated;
