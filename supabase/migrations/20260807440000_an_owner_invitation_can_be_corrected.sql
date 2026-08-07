-- ============================================================================
-- An invitation sent to the wrong address can be corrected.
--
-- 20260807220000 called a mistyped address "a live route into somebody's
-- business sitting in a table" and gave us revoke_facility_owner_invite to take
-- it back. Taking it back is half an answer: the staff row still holds the
-- wrong address, so re-inviting sends to the same place. The only exit was to
-- edit the database by hand — which is exactly what happened this afternoon
-- when an owner's invitation went astray.
--
-- ── TWO CORRECTIONS, AND ONE OF THEM IS A BUG I INTRODUCED TODAY ──────────
--
-- 20260807420000 stopped record_grant_for_staff marking an OWNER `invited`,
-- because an owner has no onboarding to submit and the status was terminal.
-- It did that by SKIPPING the update, which composes badly with withdrawal:
--
--   provision            -> active     (correct)
--   withdraw invitation  -> inactive   (correct: nothing is outstanding)
--   invite again         -> inactive   (WRONG: skipped, so it never recovers)
--
-- An inactive owner is hidden from rosters and calendars. So the owner branch
-- now SETS `active` rather than leaving whatever was there. Provisioning is
-- unaffected (already active); re-inviting recovers. Stating the value beats
-- assuming the previous one was right — the skip was assuming exactly that.
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

  -- An owner is onboarded by nobody — no manager, no template, no checklist to
  -- submit — so `invited` would be a state they can never leave. `active` is
  -- SET rather than left alone, because a withdrawal puts them `inactive` and
  -- re-inviting has to bring them back.
  update public.staff
     set status = case
                    when p_staff.primary_role = 'owner'::public.facility_staff_role
                      then 'active'
                    else 'invited'
                  end,
         status_changed_at = now()
   where id = p_staff.id;

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

-- ── Correcting the address ─────────────────────────────────────────────────
--
-- ── A CLAIMED INVITATION IS REFUSED, AND THAT IS THE IMPORTANT PART ───────
--
-- Once claimed, a Clerk identity holds a membership. Changing the staff row's
-- email address would not move that access one inch — it would leave the real
-- owner signed in and the record naming somebody else. That is worse than the
-- typo: a correction that silently corrects nothing.
--
-- Removing access is a different act against a different table and must look
-- different, which is the same reasoning revoke_facility_owner_invite uses for
-- refusing a claimed grant.
--
-- The unclaimed grant is moved WITH the staff row, in one statement pair. They
-- are matched on email when the invitee signs up, so leaving the grant behind
-- would send an invitation to the new address that the old address claims.

create or replace function public.set_facility_owner_email(
  p_facility_id uuid,
  p_email       text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_staff   public.staff;
  v_grant   public.facility_membership_grants;
  v_email   text := lower(trim(coalesce(p_email, '')));
  v_before  text;
begin
  if not private.is_platform_admin() then
    raise exception 'Only a platform administrator may change an owner''s address.'
      using errcode = '42501';
  end if;

  -- Shape only. The address is proved by the invitee signing up with it and
  -- Clerk verifying it; this is here so an obvious typo fails now rather than
  -- as a silent non-delivery in a fortnight.
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That is not a valid email address.' using errcode = '22023';
  end if;

  -- The FIRST owner by creation, matching invite_facility_owner — otherwise
  -- "change the address" and "resend" could act on different people.
  select * into v_staff
    from public.staff
   where facility_id = p_facility_id
     and primary_role = 'owner'
   order by created_at
   limit 1;

  if v_staff.id is null then
    raise exception 'That facility has no owner.' using errcode = 'no_data_found';
  end if;

  select * into v_grant
    from public.facility_membership_grants
   where staff_id = v_staff.id;

  if v_grant.claimed_at is not null then
    raise exception
      'That invitation has already been accepted. Changing the address would not move their access — remove the membership instead.'
      using errcode = '42501';
  end if;

  v_before := v_staff.email;
  if lower(trim(v_before)) = v_email then
    return jsonb_build_object('changed', false, 'email', v_email);
  end if;

  -- staff_facility_email_key is UNIQUE (facility_id, email), so 23505 here
  -- means somebody at this facility already holds the address. The route turns
  -- that into a sentence.
  update public.staff
     set email = v_email
   where id = v_staff.id;

  if v_grant.id is not null then
    update public.facility_membership_grants
       set email = v_email
     where id = v_grant.id;
  end if;

  return jsonb_build_object(
    'changed', true,
    'from',    v_before,
    'email',   v_email,
    'staffId', v_staff.id);
end;
$fn$;

revoke execute on function public.set_facility_owner_email(uuid, text)
  from public, anon;
grant execute on function public.set_facility_owner_email(uuid, text)
  to authenticated;
