-- ============================================================================
-- A platform invitation is a real token, and accepting one creates a real
-- super admin.
--
-- ADR 0005 §Consequences. `/setup/<token>` is now the ONLY door onto the Yipyy
-- platform team — `www.yipyy.com/sign-up` was closed on 2026-08-18 so that
-- accounts are created at a facility's address — and it was a mock:
--
--   * `/api/admin/invite` had NO auth guard at all. An unauthenticated relay
--     that sent Yipyy-branded mail to any address a caller named, from the same
--     domain that carries password resets.
--   * the token was plain base64url JSON with NO signature, so its `role` field
--     was editable by anyone holding a link.
--   * `/setup/[token]` collected a password, DISCARDED it, wrote a localStorage
--     flag, and said "Your admin account is ready." Nothing existed afterwards.
--
-- ── WHY A TOKEN AT ALL, WHEN FACILITIES MANAGE WITHOUT ONE ────────────────
--
-- A facility invitation carries no token: a grant is recorded against an email
-- ADDRESS and the person is sent to an open sign-up page. Forwarding that mail
-- grants nothing, so a leaked send is not an incident.
--
-- The apex has no open sign-up page — deliberately — so there is nowhere to
-- send somebody. The token's job is therefore to OPEN A FORM, not to carry
-- authority. What it does not do is name a role: the role is read from this
-- table, so the tampering the old base64 blob invited is not expressible.
--
-- ── OPAQUE, NOT SIGNED ────────────────────────────────────────────────────
--
-- 32 bytes from the CSPRNG, and only its sha256 is stored — the same scheme as
-- the staff onboarding link (src/lib/api/onboarding-token.ts). Strictly better
-- than signing the old payload: there is no payload to tamper with, a database
-- dump yields hashes rather than live links, and expiry, revocation and
-- single-use become rows rather than claims.
--
-- ── AND THE MEMBERSHIP IS STILL CLAIMED BY ADDRESS ────────────────────────
--
-- The token opens the form; `private.claim_platform_invitations_for` grants the
-- role, keyed on the email, from the same profiles trigger that claims facility
-- grants. So the invited person may equally sign in with an account they
-- already have — which is the common case for a colleague who is already a
-- customer somewhere — and it works without a second mechanism.
--
-- `on conflict do nothing` when inserting the membership: an invitation must
-- never DOWNGRADE somebody who is already on the team. Inviting an existing
-- superadmin as 'readonly' is a mistake that should be a no-op, not a demotion.
-- ============================================================================

create table if not exists public.platform_invitations (
  id                  uuid primary key default gen_random_uuid(),
  email               text not null,
  full_name           text,
  role                public.platform_role not null default 'readonly',
  -- sha256 of a 32-byte token. The plaintext is returned to the inviter once,
  -- to be put in an email, and never written down.
  token_hash          bytea not null unique,
  invited_by          text references public.profiles(id) on delete set null,
  expires_at          timestamptz not null,
  accepted_at         timestamptz,
  accepted_profile_id text references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- One live invitation per address. A re-invite replaces the pending one rather
-- than leaving two tokens that both work — the partial index is what makes the
-- upsert in invite_platform_admin below expressible.
create unique index if not exists platform_invitations_pending_email
  on public.platform_invitations (lower(email))
  where accepted_at is null;

create index if not exists platform_invitations_email_idx
  on public.platform_invitations (lower(email));

alter table public.platform_invitations enable row level security;

-- The team can see who has been invited. Reading it leaks no token: only the
-- hash is here.
drop policy if exists platform_invitations_read on public.platform_invitations;
create policy platform_invitations_read on public.platform_invitations
  for select to authenticated
  using (private.is_platform_admin());

-- NO insert, update or delete policy, for the same reason platform_memberships
-- has none: an invitation is created only through the guarded function below,
-- so there is no shape of request that invites anybody.

-- ── Inviting ───────────────────────────────────────────────────────────────

create or replace function public.invite_platform_admin(
  p_email      text,
  p_full_name  text,
  p_role       public.platform_role,
  p_token_hash bytea,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_caller text := (select auth.jwt()->>'sub');
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_id     uuid;
begin
  -- superadmin, not merely "on the platform team". Adding somebody to the team
  -- is the act that grants the power to add somebody to the team.
  if not private.has_platform_role('superadmin') then
    raise exception 'Only a superadmin may invite a platform administrator.'
      using errcode = '42501';
  end if;

  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That is not a valid email address.' using errcode = '22023';
  end if;

  if p_token_hash is null or octet_length(p_token_hash) <> 32 then
    raise exception 'A platform invitation needs a 32-byte token hash.'
      using errcode = '22023';
  end if;

  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'A platform invitation must expire in the future.'
      using errcode = '22023';
  end if;

  -- Already on the team is not a failure, but it is not an invitation either.
  if exists (
    select 1 from public.platform_memberships m
      join public.profiles p on p.id = m.profile_id
     where lower(p.email) = v_email
  ) then
    raise exception 'That address is already on the platform team.'
      using errcode = '23505';
  end if;

  insert into public.platform_invitations
    (email, full_name, role, token_hash, invited_by, expires_at)
  values (v_email, nullif(trim(coalesce(p_full_name,'')),''), p_role,
          p_token_hash, v_caller, p_expires_at)
  on conflict (lower(email)) where accepted_at is null do update
    set full_name  = excluded.full_name,
        role       = excluded.role,
        token_hash = excluded.token_hash,
        invited_by = excluded.invited_by,
        expires_at = excluded.expires_at,
        created_at = now()
  returning id into v_id;

  return jsonb_build_object(
    'invitationId', v_id,
    'email',        v_email,
    'role',         p_role,
    'expiresAt',    p_expires_at);
end;
$fn$;

revoke execute on function
  public.invite_platform_admin(text, text, public.platform_role, bytea, timestamptz)
  from public, anon;
grant execute on function
  public.invite_platform_admin(text, text, public.platform_role, bytea, timestamptz)
  to authenticated;

create or replace function public.revoke_platform_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  if not private.has_platform_role('superadmin') then
    raise exception 'Only a superadmin may revoke a platform invitation.'
      using errcode = '42501';
  end if;

  delete from public.platform_invitations
   where id = p_invitation_id and accepted_at is null;

  if not found then
    raise exception 'No pending invitation with that id.'
      using errcode = 'no_data_found';
  end if;

  return jsonb_build_object('invitationId', p_invitation_id, 'revoked', true);
end;
$fn$;

revoke execute on function public.revoke_platform_invitation(uuid) from public, anon;
grant  execute on function public.revoke_platform_invitation(uuid) to authenticated;

-- ── Claiming ───────────────────────────────────────────────────────────────

create or replace function private.claim_platform_invitations_for(
  p_profile_id text,
  p_email      text
)
returns integer
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_inv     record;
  v_claimed integer := 0;
begin
  if p_profile_id is null or p_email is null then
    return 0;
  end if;

  for v_inv in
    select * from public.platform_invitations
     where accepted_at is null
       and lower(email) = lower(p_email)
       and expires_at > now()
  loop
    -- do nothing, NOT do update: an invitation must never demote somebody who
    -- is already on the team.
    insert into public.platform_memberships (profile_id, role, granted_by)
    values (p_profile_id, v_inv.role, v_inv.invited_by)
    on conflict (profile_id) do nothing;

    update public.platform_invitations
       set accepted_at         = now(),
           accepted_profile_id = p_profile_id
     where id = v_inv.id;

    v_claimed := v_claimed + 1;
  end loop;

  return v_claimed;
end;
$fn$;

-- Hooked into the SAME profiles trigger that claims facility grants, rather
-- than a second trigger: two AFTER INSERT triggers on one table fire in name
-- order, and a future rename would silently reorder them.
create or replace function private.claim_membership_grants()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  perform private.claim_grants_for(new.id, new.email);
  perform private.claim_platform_invitations_for(new.id, new.email);
  return new;
end;
$fn$;

/**
 * Accept explicitly, for the path where the profile already existed.
 *
 * The trigger above covers a NEW account. Somebody who already has a Yipyy
 * login — a colleague who is a customer of a facility, which is the common case
 * — has had their profiles row for months, so nothing fires. This is what
 * /api/admin/setup calls for them.
 *
 * The address check is the load-bearing line: without it a token could be
 * accepted onto ANY account, so a leaked link would become "make my own account
 * a superadmin" rather than "open a form".
 */
create or replace function public.accept_platform_invitation(
  p_token_hash bytea,
  p_profile_id text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_inv   public.platform_invitations;
  v_email text;
begin
  select * into v_inv from public.platform_invitations
   where token_hash = p_token_hash;

  if v_inv.id is null then
    raise exception 'That invitation link is not valid.' using errcode = 'no_data_found';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'That invitation has already been used.' using errcode = '42501';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'That invitation has expired.' using errcode = '42501';
  end if;

  select lower(email) into v_email from public.profiles where id = p_profile_id;
  if v_email is null then
    raise exception 'No such profile.' using errcode = 'no_data_found';
  end if;
  if v_email <> lower(v_inv.email) then
    raise exception 'That invitation was sent to a different address.'
      using errcode = '42501';
  end if;

  insert into public.platform_memberships (profile_id, role, granted_by)
  values (p_profile_id, v_inv.role, v_inv.invited_by)
  on conflict (profile_id) do nothing;

  update public.platform_invitations
     set accepted_at = now(), accepted_profile_id = p_profile_id
   where id = v_inv.id;

  return jsonb_build_object(
    'invitationId', v_inv.id,
    'profileId',    p_profile_id,
    'role',         v_inv.role);
end;
$fn$;

-- Server-side only. This one is called by the setup route with the service-role
-- key AFTER it has created the identity; a signed-in caller has no business
-- invoking it, and an anonymous one certainly does not.
revoke execute on function public.accept_platform_invitation(bytea, text)
  from public, anon, authenticated;
grant execute on function public.accept_platform_invitation(bytea, text)
  to service_role;
