-- ============================================================================
-- The owner is invited to their own facility.
--
-- Spec 002, phase 2. Phase 1 provisions a facility and records a membership
-- GRANT against the owner's email address, and there it stopped: unless that
-- person already happened to have a Yipyy account, nothing told them the
-- business existed. A facility nobody can enter.
--
-- ── WHAT THIS IS NOT ──────────────────────────────────────────────────────
--
-- Not a new invitation mechanism. The plan said "Clerk Backend API
-- invitations.create"; the codebase already answers this question differently
-- and has done since the Clerk migration:
--
--   grant recorded  ->  email with a link to /sign-up  ->  they sign up with
--   whatever method they like  ->  the webhook writes `profiles`  ->  the
--   trigger claims the grant  ->  the membership is live
--
-- /api/staff/[id]/invite and /api/admin/invite both work exactly this way. A
-- Clerk-issued invitation would be a SECOND way to do one thing, and it would
-- take away the free choice of Google or email-and-password at sign-up.
--
-- So this migration adds no mechanism. It adds the two entry points the owner
-- case needs and the staff case did not: addressing an owner by FACILITY (a
-- freshly provisioned facility has no legacy staff id) and withdrawing an
-- invitation that was sent to the wrong address.
-- ============================================================================

-- ── Sending, and re-sending ────────────────────────────────────────────────
--
-- Re-sending is the same call. `record_grant_for_staff` upserts on staff_id and
-- resets claimed_at, so a second invitation refreshes the expiry rather than
-- accumulating grants — which is what "resend" has to mean if the two can never
-- disagree about which one is live.

create or replace function public.invite_facility_owner(
  p_facility_id uuid,
  p_expires_at  timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_staff    public.staff;
  v_facility public.facilities;
  v_grant    jsonb;
begin
  -- First statement. SECURITY DEFINER runs around RLS, so this is the boundary,
  -- not a courtesy. supabase/tests/owner-invitation.sql O5 asserts it.
  if not private.is_platform_admin() then
    raise exception 'Only a platform administrator may invite a facility owner.'
      using errcode = '42501';
  end if;

  select * into v_facility from public.facilities where id = p_facility_id;
  if v_facility.id is null then
    raise exception 'No such facility.' using errcode = 'no_data_found';
  end if;

  -- The FIRST owner, by creation. A facility can grow more than one owner
  -- later; the one provisioning created is the one whose invitation this is,
  -- and picking arbitrarily would make "resend" mean different things on
  -- different days.
  select * into v_staff
    from public.staff
   where facility_id = p_facility_id
     and primary_role = 'owner'
   order by created_at
   limit 1;

  if v_staff.id is null then
    raise exception 'That facility has no owner to invite.'
      using errcode = 'no_data_found';
  end if;

  v_grant := private.record_grant_for_staff(v_staff, p_expires_at);

  return v_grant || jsonb_build_object(
    'facilityName', v_facility.name,
    'facilitySlug', v_facility.slug,
    'ownerName',    trim(v_staff.first_name || ' ' || coalesce(v_staff.last_name, '')),
    'expiresAt',    p_expires_at);
end;
$fn$;

revoke execute on function public.invite_facility_owner(uuid, timestamptz)
  from public, anon;
grant execute on function public.invite_facility_owner(uuid, timestamptz)
  to authenticated;

-- ── Withdrawing ────────────────────────────────────────────────────────────
--
-- An invitation sent to a mistyped address is a live route into somebody's
-- business sitting in a table, waiting for whoever owns that address to sign
-- up. There has to be a way to take it back, and until now there was not:
-- facility_membership_grants has a SELECT policy and no other, so nothing
-- outside a SECURITY DEFINER function can touch a row.
--
-- A CLAIMED grant is refused on purpose. Once claimed, the membership exists
-- and deleting the grant would change nothing about the access it produced —
-- it would only make the audit trail lie. Removing access is a different act
-- against a different table, and it should look different.

create or replace function public.revoke_facility_owner_invite(
  p_facility_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_grant   public.facility_membership_grants;
  v_staff_id uuid;
begin
  if not private.is_platform_admin() then
    raise exception 'Only a platform administrator may withdraw an invitation.'
      using errcode = '42501';
  end if;

  select g.* into v_grant
    from public.facility_membership_grants g
    join public.staff s on s.id = g.staff_id
   where g.facility_id = p_facility_id
     and s.primary_role = 'owner'
   order by g.created_at
   limit 1;

  if v_grant.id is null then
    raise exception 'There is no owner invitation to withdraw.'
      using errcode = 'no_data_found';
  end if;

  if v_grant.claimed_at is not null then
    raise exception 'That invitation has already been accepted. Remove the membership instead.'
      using errcode = '42501';
  end if;

  v_staff_id := v_grant.staff_id;
  delete from public.facility_membership_grants where id = v_grant.id;

  -- Back to `inactive`, not `active`: nothing was accepted, and `invited` would
  -- claim an outstanding invitation that no longer exists. Mirrors the
  -- compensation in /api/staff/[id]/invite for a rejected send.
  update public.staff
     set status            = 'inactive',
         status_changed_at = now()
   where id = v_staff_id;

  return jsonb_build_object(
    'revoked',   true,
    'staffId',   v_staff_id,
    'email',     v_grant.email,
    'facilityId', p_facility_id);
end;
$fn$;

revoke execute on function public.revoke_facility_owner_invite(uuid)
  from public, anon;
grant execute on function public.revoke_facility_owner_invite(uuid)
  to authenticated;
