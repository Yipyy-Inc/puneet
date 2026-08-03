-- ============================================================================
-- Linking an invited hire to the account that was just created for them.
--
-- The invite route does four things across TWO SYSTEMS:
--
--   1. create an auth user            GoTrue  (admin API, service-role key)
--   2. create/attach a profile row    Postgres
--   3. create/attach a membership     Postgres
--   4. mark the staff row `invited`   Postgres
--
-- There is no transaction spanning 1 and 2-4. So steps 2-4 are made ATOMIC
-- here, in one function, and step 1 is made RECOVERABLE by the route (it
-- deletes the auth user it created if this function then fails).
--
-- ── WHY THESE THREE BELONG IN ONE STATEMENT ────────────────────────────────
--
-- The failure the task names — "the auth user is created but the membership
-- insert fails, leaving an account that can sign in with no facility" — has a
-- second, quieter version: the PROFILE is created but the MEMBERSHIP is not.
-- That account signs in, passes every portal gate that only checks for a
-- session, and resolves to a viewer with zero memberships. Doing all three in
-- one function means that state cannot be reached: either the hire is linked to
-- their facility or nothing happened.
--
-- ── IDEMPOTENT, because inviting twice is a normal thing to do ─────────────
--
-- A manager resends an invite when the first one is lost. Every write below is
-- an upsert against a key that already exists:
--
--   profiles                     on (id)                    — the auth user id
--   facility_memberships         on (profile_id, facility_id)
--   staff.membership_id          set, not appended
--
-- so a second call produces the same row set as the first, not a duplicate.
--
-- ── SECURITY DEFINER, and what stops it being a hole ───────────────────────
--
-- It writes to profiles and facility_memberships, which the calling manager
-- has no direct policy to write. It is safe because it checks manage_staff on
-- the staff row's OWN facility before doing anything, takes the facility from
-- that row rather than from an argument, and grants only the role already
-- recorded on the staff record — a caller cannot pass a role in and cannot aim
-- it at a facility they do not manage.
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
  select * into v_staff
    from public.staff
   where legacy_id = p_staff_legacy_id;

  if v_staff.id is null then
    raise exception 'No staff record for %.', p_staff_legacy_id
      using errcode = 'no_data_found';
  end if;

  -- The permission check, against the row's own facility. Not an argument, so
  -- a caller cannot point this at a facility they merely have rights in.
  --
  -- `auth.uid() is null` is the service_role path: the invite route calls this
  -- with the ordinary cookie-bound client, so uid is the MANAGER, not null.
  -- The carve-out exists for seeds and for nothing else.
  if (select auth.uid()) is not null
     and not private.has_permission(v_staff.facility_id, 'manage_staff')
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

revoke all on function public.link_staff_invite(text, uuid, text) from public;
grant execute on function public.link_staff_invite(text, uuid, text) to authenticated;

comment on function public.link_staff_invite(text, uuid, text) is
  'Profile + membership + staff status in ONE transaction. The auth user is created outside it (GoTrue) and compensated by the caller on failure.';
