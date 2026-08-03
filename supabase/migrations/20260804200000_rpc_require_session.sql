-- ============================================================================
-- SECURITY FIX: public.link_staff_invite was callable by `anon`, and its
-- permission check let `anon` straight through. Full privilege escalation to
-- facility owner from the publishable key.
--
-- ── WHAT WAS WRONG ─────────────────────────────────────────────────────────
--
-- The function guarded itself like this (20260803210000):
--
--     if (select auth.uid()) is not null
--        and not private.has_permission(...) then
--       raise exception ...
--     end if;
--
-- That is the SERVICE-ROLE CARVE-OUT from the write-integrity triggers, and it
-- is correct THERE and wrong HERE. The two situations are not the same:
--
--   * A trigger only fires on a write that already cleared RLS. Reaching one
--     with no JWT subject really does mean service_role, so returning early is
--     how a seed script inserts a catalogue without tripping its own rules.
--
--   * An RPC is a FRONT DOOR. `anon` arrives at /rest/v1/rpc/<name> directly,
--     holding the publishable key that ships in every browser bundle, with no
--     subject at all. The carve-out written to admit the seed script admitted
--     the internet.
--
-- PROVEN against the live project before this migration was written, from
-- `set local role anon` with no JWT subject:
--
--     link_staff_invite('<a staff legacy id>', '<my own user id>', '<my email>')
--
-- A signed-up customer holding zero memberships became role=owner,
-- is_active=true at that facility — because the function grants the role
-- recorded on the TARGET STAFF ROW, so aiming it at an owner's row grants
-- ownership. legacy_ids are readable slugs, so the argument is guessable.
--
-- The same mistake was in public.offboard_staff (anon could terminate any
-- employee at any facility and revoke their access). That one is fixed at
-- source in 20260804180000, which had not shipped yet.
--
-- ── WHY THE `revoke` LINE DID NOT HELP ─────────────────────────────────────
--
-- 20260803210000 already said:
--
--     revoke all on function public.link_staff_invite(text, uuid, text) from public;
--     grant execute on function public.link_staff_invite(text, uuid, text) to authenticated;
--
-- which LOOKS like it shuts the door and does not. Supabase ships
-- `alter default privileges in schema public grant execute on functions to
-- anon, authenticated, service_role`, so every function is born with an
-- explicit `anon=X` entry in its ACL. `revoke ... from public` revokes the
-- PUBLIC pseudo-role — a different grant — and leaves `anon=X` standing.
--
--   REVOKING FROM `public` IS NOT REVOKING FROM `anon`.
--
-- ── THE FIX, IN TWO LAYERS ─────────────────────────────────────────────────
--
-- 1. BINDING: the function now REQUIRES a session. `auth.uid() is null` is a
--    refusal, not a bypass, and it is checked BEFORE the staff lookup so the
--    "No staff record for X" error cannot be used as an oracle for which
--    legacy_ids exist. Nothing needs the old behaviour: the invite route calls
--    this through the MANAGER's client on purpose, precisely so the permission
--    check runs (src/app/api/staff/[id]/invite/route.ts:199), and no seed or
--    migration invokes it.
--
-- 2. DEFENCE: revoke execute from `anon` by name, so a future edit to the body
--    cannot silently reopen the door.
--
-- Everything else in the body is BYTE-FOR-BYTE what 20260803210000 shipped.
-- Only the guard changed.
--
-- The four onboarding token RPCs keep their `anon` grant. That is deliberate
-- and not the same mistake: a new hire has no account by definition, the token
-- IS the credential, and it is verified by hash inside the function rather than
-- by a policy predicate (see 20260803180000).
-- ============================================================================

create or replace function public.link_staff_invite(
  p_staff_legacy_id text,
  p_user_id         uuid,
  p_email           text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_staff       public.staff;
  v_membership  uuid;
begin
  -- THE FIX. A session is required, checked before the lookup.
  if (select auth.uid()) is null then
    raise exception 'You must be signed in to invite staff.'
      using errcode = '42501';
  end if;

  select * into v_staff
    from public.staff
   where legacy_id = p_staff_legacy_id;

  if v_staff.id is null then
    raise exception 'No staff record for %.', p_staff_legacy_id
      using errcode = 'no_data_found';
  end if;

  -- The permission check, against the row's own facility. Not an argument, so
  -- a caller cannot point this at a facility they merely have rights in.
  if not private.has_permission(v_staff.facility_id, 'manage_staff')
     and not private.is_platform_admin() then
    raise exception 'You may not invite staff at this facility.'
      using errcode = '42501';
  end if;

  -- 1. The profile. `on conflict (id)` because the auth user may already have
  --    one — someone who is a customer here, or was staff before.
  insert into public.profiles (id, email, full_name)
  values (p_user_id, p_email,
          trim(v_staff.first_name || ' ' || v_staff.last_name))
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  -- 2. The membership, at the staff row's facility, in the staff row's role.
  --    Re-inviting reactivates rather than duplicating: the unique key is
  --    (profile_id, facility_id), so the second call updates the first.
  insert into public.facility_memberships
    (facility_id, profile_id, role, is_active)
  values (v_staff.facility_id, p_user_id, v_staff.primary_role, true)
  on conflict (profile_id, facility_id) do update
    set role      = excluded.role,
        is_active = true
  returning id into v_membership;

  -- 3. The staff row points at the membership, and says `invited`.
  --
  --    NOTE the status is set HERE and not by the route: the route marks the
  --    invite sent only after the email provider accepted it, and calls this
  --    function at that point. A staff row therefore never says `invited`
  --    because of an email that was never delivered.
  update public.staff
     set membership_id = v_membership,
         status        = 'invited',
         status_changed_at = now()
   where id = v_staff.id;

  return jsonb_build_object(
    'staffId',      v_staff.legacy_id,
    'facilityId',   v_staff.facility_id,
    'membershipId', v_membership,
    'profileId',    p_user_id);
end;
$$;

-- ── Defence in depth: revoke from `anon` BY NAME ───────────────────────────
-- `from public` was already there and did nothing for anon. These are the lines
-- that actually remove the grant Supabase's default privileges handed out.

revoke execute on function public.link_staff_invite(text, uuid, text) from anon;
revoke execute on function public.offboard_staff(text, text, uuid, date) from anon;

-- ── Advisor cleanup on two adjacent trigger functions ──────────────────────
-- Both are a bare `raise exception` with no name resolution at all, so the
-- mutable search_path the linter flags is not exploitable today. Setting it
-- costs nothing and means a future edit that DOES resolve a name starts from a
-- safe search_path rather than needing to remember to add one.

alter function private.prevent_document_update()    set search_path = '';
alter function private.prevent_signature_mutation() set search_path = '';

comment on function public.link_staff_invite(text, uuid, text) is
  'Profile + membership + staff.status in ONE transaction. Requires a SESSION with manage_staff on the staff row''s own facility — a null auth.uid() is a refusal, not a service-role bypass. anon holds no grant.';
