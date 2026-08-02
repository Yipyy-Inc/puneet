-- ============================================================================
-- Staff write integrity — and the privilege escalation it closes.
--
-- `staff_update` lets you write your own row: `id in own_staff_ids OR
-- has_permission(facility_id, 'manage_staff')`. Reasonable-sounding, and it
-- was reasonable while a staff row was a directory entry.
--
-- It stopped being reasonable when private.resolve_permission started reading
-- roles from it. That function computes `held_roles` as the union of the
-- MEMBERSHIP role, staff.primary_role, and staff.additional_roles — so the
-- staff row is an input to the permission cascade, and every staff member
-- could write their own.
--
-- Demonstrated against the live project before writing this, as the groomer:
--
--     BEFORE  manage_roles=none     view_payroll=none    manage_staff=none
--       update public.staff set primary_role = 'owner'
--        where legacy_id = 'fs-dev-groomer';
--     AFTER   manage_roles=anytime  view_payroll=anytime
--
-- One statement, reachable from PostgREST with the anon key and a session
-- cookie. Not a missing feature — a live escalation.
--
-- There is a second, quieter half. RLS gates rows, so `manage_staff` was all
-- you needed to write ANY column, including the ones 20260802... withholds on
-- READ. Someone allowed to manage the roster but not to see payroll could
-- still set it. Read and write have to agree, or the redaction is decoration.
--
-- ── SHAPE ───────────────────────────────────────────────────────────────────
--
-- A BEFORE trigger, for the same reason bookings has one: RLS answers yes/no
-- about a row, and this has to answer "yes, but not that column".
--
-- Escalation attempts RAISE. Field-level overreach REVERTS silently, because
-- the app PATCHes the whole merged object and a caller who legitimately cannot
-- see payroll will send it back absent — that must preserve the stored value,
-- not delete it. Reverting is what makes a redacted read safe to write back.
-- ============================================================================

create or replace function private.enforce_staff_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_can_manage  boolean;
  v_can_payroll boolean;
  v_can_roles   boolean;
  v_is_self     boolean;
  v_details     jsonb;
  v_key         text;
  -- Everything in `details` that is nobody's business but management's.
  -- `notifications` is deliberately absent: your own alert preferences are
  -- yours to set, and they carry no authority.
  c_managed_keys constant text[] := array[
    'employment', 'clockIn', 'calendarAccess', 'assignedLocations',
    'upcomingAppointments', 'openTasks', 'invitationSentAt'
  ];
begin
  -- service_role: seeds and server-side jobs. No JWT subject, no restriction —
  -- the same carve-out the bookings trigger makes, and for the same reason.
  if (select auth.uid()) is null then
    return new;
  end if;

  v_can_manage  := private.has_permission(new.facility_id, 'manage_staff');
  v_can_payroll := private.has_permission(new.facility_id, 'edit_payroll');
  v_can_roles   := private.has_permission(new.facility_id, 'manage_roles');

  -- ── INSERT ────────────────────────────────────────────────────────────────
  -- The row-level right is already the staff_insert policy's job. What is left
  -- is making sure a new row cannot be born carrying what its author may not
  -- grant: a starting salary, or a set of permission overrides.
  if tg_op = 'INSERT' then
    if not v_can_payroll then
      new.details := (coalesce(new.details, '{}'::jsonb)) - 'payroll';
    end if;
    if not v_can_roles then
      new.details := (coalesce(new.details, '{}'::jsonb)) - 'permissionOverrides';
    end if;
    return new;
  end if;

  -- ── UPDATE ────────────────────────────────────────────────────────────────
  v_is_self := old.id in (select private.own_staff_ids());

  -- A staff row does not move between facilities. There is no transfer flow,
  -- and `own_staff_ids` is keyed on the row id — so without this, writing your
  -- own row lets you re-file yourself under another facility and, with the
  -- role fields below, own it. Harmless today with one facility; a hole the
  -- moment there are two.
  if new.facility_id is distinct from old.facility_id then
    raise exception 'A staff record cannot be moved between facilities.'
      using errcode = '42501';
  end if;

  -- Pointing your staff row at somebody else's membership is the same attack
  -- wearing a different hat: resolve_permission reaches roles THROUGH
  -- membership_id.
  if new.membership_id is distinct from old.membership_id and not v_can_manage then
    raise exception 'You may not change which account a staff record belongs to.'
      using errcode = '42501';
  end if;

  -- THE ESCALATION. These three feed held_roles in resolve_permission, so
  -- writing them is writing your own permissions. Raising rather than
  -- reverting: there is no legitimate path where a non-manager submits a role
  -- change and should be told it worked.
  if not v_can_manage
     and (new.primary_role     is distinct from old.primary_role
       or new.additional_roles is distinct from old.additional_roles
       or new.legacy_id        is distinct from old.legacy_id)
  then
    raise exception 'You may not change your own role.'
      using errcode = '42501';
  end if;

  if not v_can_manage
     and (new.status        is distinct from old.status
       or new.status_reason is distinct from old.status_reason
       or new.status_note   is distinct from old.status_note)
  then
    raise exception 'Employment status is set by a manager.'
      using errcode = '42501';
  end if;

  -- Columns that are the facility's record of a person rather than the
  -- person's own contact details. Reverted rather than raised, so a
  -- whole-object PATCH that happens to echo them back is not an error.
  if not v_can_manage then
    new.first_name          := old.first_name;
    new.last_name           := old.last_name;
    -- Email is the identity bridge (lib/auth/legacy-identity.ts matches the
    -- session email against this column). Letting someone edit it lets them
    -- detach themselves from their own record, or claim another.
    new.email               := old.email;
    new.job_title           := old.job_title;
    new.service_assignments := old.service_assignments;
    new.show_on_calendar    := old.show_on_calendar;
    new.last_active         := old.last_active;
    new.status_changed_at   := old.status_changed_at;
  end if;

  -- ── details ───────────────────────────────────────────────────────────────
  -- Rebuilt from the STORED value, with permitted subtrees layered on. Built
  -- this way round on purpose: a caller who cannot see payroll receives a row
  -- without it (20260802... redaction) and will send it back without it. Take
  -- `new.details` as the base and that read-side protection quietly becomes a
  -- delete on every save.
  v_details := coalesce(old.details, '{}'::jsonb);

  if v_can_manage then
    -- Everything except the two subtrees with their own permission.
    v_details := coalesce(new.details, '{}'::jsonb)
                 - 'payroll' - 'permissionOverrides';
    v_details := v_details
      || case when coalesce(old.details, '{}'::jsonb) ? 'payroll'
              then jsonb_build_object('payroll', old.details -> 'payroll')
              else '{}'::jsonb end
      || case when coalesce(old.details, '{}'::jsonb) ? 'permissionOverrides'
              then jsonb_build_object('permissionOverrides',
                                      old.details -> 'permissionOverrides')
              else '{}'::jsonb end;
  elsif v_is_self then
    -- Your own preferences, and nothing else. Note this branch never reaches
    -- the managed keys, so HR notes and the clock-in code are safe from the
    -- person they describe as well as from their colleagues.
    if coalesce(new.details, '{}'::jsonb) ? 'notifications' then
      v_details := v_details || jsonb_build_object(
        'notifications', new.details -> 'notifications');
    end if;
  end if;

  -- Belt and braces on the managed keys for the self branch: if the shape of
  -- `details` grows a new sensitive key, it is denied by default rather than
  -- granted by omission.
  if not v_can_manage then
    foreach v_key in array c_managed_keys loop
      if coalesce(old.details, '{}'::jsonb) ? v_key then
        v_details := v_details || jsonb_build_object(
          v_key, old.details -> v_key);
      else
        v_details := v_details - v_key;
      end if;
    end loop;
  end if;

  -- The two subtrees with their own permission, layered last so they win.
  if v_can_payroll and coalesce(new.details, '{}'::jsonb) ? 'payroll' then
    v_details := v_details || jsonb_build_object('payroll', new.details -> 'payroll');
  elsif v_can_payroll and not (coalesce(new.details, '{}'::jsonb) ? 'payroll') then
    v_details := v_details - 'payroll';   -- genuine removal by someone allowed to
  end if;

  if v_can_roles and coalesce(new.details, '{}'::jsonb) ? 'permissionOverrides' then
    v_details := v_details || jsonb_build_object(
      'permissionOverrides', new.details -> 'permissionOverrides');
  elsif v_can_roles and not (coalesce(new.details, '{}'::jsonb) ? 'permissionOverrides') then
    v_details := v_details - 'permissionOverrides';
  end if;

  new.details := v_details;
  return new;
end;
$$;

-- "enforce" sorts before "set", so this runs before staff_set_updated_at if
-- one exists — stated rather than relied on silently.
drop trigger if exists staff_enforce_integrity on public.staff;
create trigger staff_enforce_integrity
  before insert or update on public.staff
  for each row execute function private.enforce_staff_integrity();
