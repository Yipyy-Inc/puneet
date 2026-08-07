-- ============================================================================
-- An owner is not a new hire, and must not be sent to a new hire's checklist.
--
-- Reported from production: the owner of a freshly provisioned facility signed
-- up, signed in, and landed on
--
--   "Welcome to Doggieville Mtl, Tatiana — a few things left before your first
--    shift. Your manager has not set up your onboarding checklist yet."
--
-- A dead end, and an insulting one: she IS the manager. There is nobody above
-- her to set a checklist up, so that screen can never become non-empty.
--
-- ── THE CHAIN, ALL FOUR LINKS INTENDED IN ISOLATION ───────────────────────
--
--   1. provision_facility inserts the owner's staff row with status 'active'.
--   2. private.record_grant_for_staff then overwrites it to 'invited' —
--      unconditionally, because it was written for the staff-invite path where
--      that is exactly right.
--   3. private.claim_grants_for deliberately LEAVES it on sign-up, and says so:
--      "it says `invited` until onboarding is submitted, and signing up is not
--      the same as having been onboarded." Also right, for a hire.
--   4. redirectIfStillOnboarding sends anyone `invited` to /employee/onboarding.
--
-- Every link is defensible; the composition strands the one person who cannot
-- escape it. An invited groomer submits a checklist and becomes active. An
-- owner has no template, no manager and no checklist to submit, so `invited`
-- is terminal.
--
-- ── THE FIX IS AT LINK 2, NOT LINK 4 ──────────────────────────────────────
--
-- Making the gate skip owners would leave the DATA wrong — every owner's staff
-- row reading `invited` forever, which the facility's own Staff screen shows.
-- The gate is being told a falsehood, and the honest fix is to stop telling it.
--
-- `invited` is an EMPLOYMENT status meaning "hired, not yet started". An owner
-- provisioned with their facility has started: they are the proprietor from the
-- moment the business exists. Whether they have SIGNED IN is a different
-- question, and it already has its own answer — the unclaimed grant, which the
-- superadmin's Staff tab reads as "invited" in its Account column. Two facts,
-- two columns; conflating them is what produced this.
--
-- The app-side gate is hardened too (src/lib/auth/onboarding-gate.ts), because
-- routing a proprietor into "your manager has not set up your checklist" is
-- wrong however the data got that way. Belt and braces, with this as the belt.
-- ============================================================================

create or replace function private.record_grant_for_staff(
  p_staff      public.staff,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id         uuid;
  v_profile_id text;
  v_claimed    integer := 0;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'You must be signed in to invite staff.'
      using errcode = '42501';
  end if;

  if p_staff.id is null then
    raise exception 'No staff record to grant a membership to.'
      using errcode = '22023';
  end if;

  if not private.has_permission(p_staff.facility_id, 'manage_staff')
     and not private.is_platform_admin() then
    raise exception 'You may not invite staff at this facility.'
      using errcode = '42501';
  end if;

  if coalesce(trim(p_staff.email), '') = '' then
    raise exception 'That staff member has no email address to invite.'
      using errcode = '22023';
  end if;

  insert into public.facility_membership_grants
    (facility_id, staff_id, email, role, granted_by, expires_at)
  values (p_staff.facility_id, p_staff.id, lower(trim(p_staff.email)),
          p_staff.primary_role, (select auth.jwt()->>'sub'), p_expires_at)
  on conflict (staff_id) do update
    set email       = excluded.email,
        role        = excluded.role,
        granted_by  = excluded.granted_by,
        expires_at  = excluded.expires_at,
        created_at  = now(),
        claimed_at         = null,
        claimed_profile_id = null
  returning id into v_id;

  -- THE ONE CHANGED LINE. An owner is not onboarded by anybody, so marking
  -- them `invited` is a state they can never leave — see the header.
  --
  -- A facility inviting a SECOND owner lands here too, and gets the same
  -- treatment for the same reason: there is no manager above an owner to build
  -- them a checklist.
  if p_staff.primary_role <> 'owner'::public.facility_staff_role then
    update public.staff
       set status            = 'invited',
           status_changed_at = now()
     where id = p_staff.id;
  end if;

  select p.id into v_profile_id
    from public.profiles p
   where lower(p.email) = lower(trim(p_staff.email))
   limit 1;

  if v_profile_id is not null then
    v_claimed := private.claim_grants_for(v_profile_id, p_staff.email);
  end if;

  return jsonb_build_object(
    'grantId',    v_id,
    'staffId',    p_staff.legacy_id,
    'facilityId', p_staff.facility_id,
    'email',      lower(trim(p_staff.email)),
    'role',       p_staff.primary_role,
    'claimed',    v_claimed > 0);
end;
$function$;

revoke execute on function private.record_grant_for_staff(public.staff, timestamptz)
  from public, anon, authenticated;

-- ── The owners already stranded ────────────────────────────────────────────
--
-- Two of them at the time of writing, one of whom reported it. Narrow on
-- purpose: only rows whose role is owner and whose status is the terminal
-- `invited`. A genuinely invited groomer is untouched.

update public.staff
   set status            = 'active',
       status_changed_at = now()
 where primary_role = 'owner'::public.facility_staff_role
   and status = 'invited';
