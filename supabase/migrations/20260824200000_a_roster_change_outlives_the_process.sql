-- ============================================================================
-- The roster records what happened to it, and the facility can read it back.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `src/lib/schedule-audit.ts`: a module-level array.
--
--   const auditLog: ScheduleAuditEntry[] = [ ...seeded entries ];
--   export function logShiftCreated(ctx) { auditLog.unshift(...) }
--
-- `ScheduleView.tsx` genuinely called it — logShiftCreated, logShiftMoved,
-- logSchedulePublished — against a roster that is REAL Postgres. So shifts
-- moved, people were assigned and unassigned, and the record of who did it
-- died with the process. On serverless it was not even shared between two
-- requests of the same session.
--
-- That is the identical defect `src/lib/api/audit-log.ts` was already fixed
-- for; its own header describes it. The bug was diagnosed, corrected in one
-- file, and left standing in another. This migration is the second half.
--
-- ── TRIGGERS, FOR THE REASON 20260807480000 GAVE ──────────────────────────
--
-- A trigger fires for every writer: the API, a migration, psql, a support
-- engineer with a connection string. `apply_schedule_template` writes shifts
-- directly and would have been invisible to any app-layer logger.
--
-- ── AND THE FACILITY CAN NOW READ ITS OWN ─────────────────────────────────
--
-- `audit_log_read` admitted private.is_platform_admin() and nobody else, so
-- every facility-facing audit screen was reading a fixture because the real
-- table would have returned nothing at all. A facility admin may now read the
-- rows that belong to THEIR facility.
--
-- `facility_id is not null` is load-bearing, not defensive: the
-- platform_membership entries — who was made a Yipyy superadmin, and when —
-- carry a null facility, and that null is what keeps them out of every
-- facility's view. Measured before writing this: 3 platform rows, all null;
-- 25 facility rows, none null.
--
-- Admin, not a permission key. `private.is_facility_admin` is deliberately not
-- routed through `has_permission` — this table records who was granted access
-- to the facility, so gating it on a permission the facility can hand out
-- would let a facility grant somebody sight of the access history.
-- ============================================================================

-- ── A shift is created, changed, or taken away ─────────────────────────────
--
-- VOLUME IS EXPECTED. `apply_schedule_template` can create thirty-odd shifts
-- in one statement and each earns a line. That is what a trail is; the screens
-- bound their reads rather than the trigger dropping facts on the floor.

create or replace function private.audit_staff_shift()
returns trigger language plpgsql security definer set search_path to '' as $fn$
declare
  v_row       public.staff_shifts;
  v_facility  text;
  v_who       text;
  v_changes   jsonb := '[]'::jsonb;
  v_action    text;
  v_severity  text := 'Low';
begin
  v_row := case when tg_op = 'DELETE' then old else new end;

  -- A facility being deleted cascades into its shifts. Writing an audit row
  -- for each one would reference a facility on its way out, and the
  -- append-only trigger on audit_log means the resulting `on delete set null`
  -- can never be applied — the exact shape that already makes a facility
  -- undeletable (see the debt map). If the parent is gone, say nothing.
  if tg_op = 'DELETE'
     and not exists (select 1 from public.facilities f where f.id = v_row.facility_id)
  then
    return null;
  end if;

  select f.name into v_facility
    from public.facilities f where f.id = v_row.facility_id;

  select trim(s.first_name || ' ' || s.last_name) into v_who
    from public.staff s where s.id = v_row.staff_id;
  -- An unassigned line is an OPEN shift, not a missing person.
  v_who := coalesce(nullif(v_who, ''), 'Open shift');

  if tg_op = 'INSERT' then
    v_action := 'Shift created';

  elsif tg_op = 'DELETE' then
    v_action := 'Shift deleted';
    -- Somebody who was rostered is now not. Worth more than a whisper.
    v_severity := case when old.staff_id is not null then 'Medium' else 'Low' end;

  else
    -- Only the facts a person would recognise as a change to their week.
    if new.staff_id is distinct from old.staff_id then
      v_changes := v_changes || jsonb_build_object(
        'field', 'assigned_to', 'from', old.staff_id, 'to', new.staff_id);
    end if;
    if new.starts_at is distinct from old.starts_at then
      v_changes := v_changes || jsonb_build_object(
        'field', 'starts_at', 'from', old.starts_at, 'to', new.starts_at);
    end if;
    if new.ends_at is distinct from old.ends_at then
      v_changes := v_changes || jsonb_build_object(
        'field', 'ends_at', 'from', old.ends_at, 'to', new.ends_at);
    end if;
    if new.status is distinct from old.status then
      v_changes := v_changes || jsonb_build_object(
        'field', 'status', 'from', old.status, 'to', new.status);
    end if;
    if new.position_id is distinct from old.position_id then
      v_changes := v_changes || jsonb_build_object(
        'field', 'position_id', 'from', old.position_id, 'to', new.position_id);
    end if;

    -- An UPDATE that touched none of them is bookkeeping — updated_at moving,
    -- a note being retyped. A trail full of those is a trail nobody reads.
    if jsonb_array_length(v_changes) = 0 then
      return null;
    end if;

    v_action := case
      when new.status = 'published' and old.status is distinct from 'published'
        then 'Shift published'
      when new.staff_id is distinct from old.staff_id and new.staff_id is null
        then 'Shift unassigned'
      when new.staff_id is distinct from old.staff_id
        then 'Shift assigned'
      else 'Shift changed'
    end;
    v_severity := case when v_action = 'Shift changed' then 'Low' else 'Medium' end;
  end if;

  perform private.record_audit(
    v_action, 'Data', v_severity,
    'shift', v_row.id::text, v_who,
    v_row.facility_id, v_facility,
    format('%s on %s', v_who, to_char(v_row.starts_at, 'YYYY-MM-DD HH24:MI')),
    v_changes);
  return null;
end $fn$;

drop trigger if exists staff_shifts_audit on public.staff_shifts;
create trigger staff_shifts_audit
  after insert or update or delete on public.staff_shifts
  for each row execute function private.audit_staff_shift();

-- ── Leave is granted or refused ────────────────────────────────────────────
--
-- Only the DECISION. A request being filed is the person's own act and they
-- know they made it; who approved or refused it is the fact somebody comes
-- back to this table for months later.

create or replace function private.audit_time_off_decision()
returns trigger language plpgsql security definer set search_path to '' as $fn$
declare
  v_facility text;
  v_who      text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  select f.name into v_facility from public.facilities f where f.id = new.facility_id;
  select trim(s.first_name || ' ' || s.last_name) into v_who
    from public.staff s where s.id = new.staff_id;
  v_who := coalesce(nullif(v_who, ''), 'staff member');

  perform private.record_audit(
    format('Time off %s', new.status), 'Data', 'Medium',
    'time_off', new.id::text, v_who,
    new.facility_id, v_facility,
    format('%s, %s to %s', v_who, new.starts_on, new.ends_on),
    jsonb_build_array(jsonb_build_object(
      'field', 'status', 'from', old.status, 'to', new.status)));
  return null;
end $fn$;

drop trigger if exists time_off_audit_decision on public.staff_time_off_requests;
create trigger time_off_audit_decision
  after update of status on public.staff_time_off_requests
  for each row execute function private.audit_time_off_decision();

-- ── A swap is agreed or refused ────────────────────────────────────────────

create or replace function private.audit_shift_swap_decision()
returns trigger language plpgsql security definer set search_path to '' as $fn$
declare
  v_facility text;
  v_who      text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  select f.name into v_facility from public.facilities f where f.id = new.facility_id;
  select trim(s.first_name || ' ' || s.last_name) into v_who
    from public.staff s where s.id = new.requesting_staff_id;
  v_who := coalesce(nullif(v_who, ''), 'staff member');

  perform private.record_audit(
    format('Shift swap %s', new.status), 'Data', 'Medium',
    'shift_swap', new.id::text, v_who,
    new.facility_id, v_facility,
    format('requested by %s', v_who),
    jsonb_build_array(jsonb_build_object(
      'field', 'status', 'from', old.status, 'to', new.status)));
  return null;
end $fn$;

drop trigger if exists shift_swap_audit_decision on public.shift_swap_requests;
create trigger shift_swap_audit_decision
  after update of status on public.shift_swap_requests
  for each row execute function private.audit_shift_swap_decision();

-- ── A facility admin may read their own facility's trail ───────────────────

drop policy if exists audit_log_facility_read on public.audit_log;
create policy audit_log_facility_read on public.audit_log
  for select to authenticated
  using (
    facility_id is not null
    and private.is_facility_admin(facility_id)
  );

-- ── anon had SELECT on the audit trail ─────────────────────────────────────
--
-- RLS refused it — no policy admitted anon — so nothing leaked. But a grant
-- that only RLS is holding back is one policy mistake away from being the
-- whole story, and this table records who was given access to what. `public`
-- and `anon` are DIFFERENT grants, and a revoke naming a privilege the role
-- does not hold succeeds silently, so both are named and the result is
-- asserted below rather than assumed.

revoke select on public.audit_log from anon;
revoke select on public.audit_log from public;

do $$
begin
  if has_table_privilege('anon', 'public.audit_log', 'select') then
    raise exception 'anon can still read the audit trail';
  end if;
  if not has_table_privilege('authenticated', 'public.audit_log', 'select') then
    raise exception 'authenticated lost the SELECT the new policy depends on';
  end if;
  -- A policy nobody can use is not a boundary, it is a decoration.
  if not exists (
    select 1 from pg_policy p join pg_class c on c.oid = p.polrelid
     where c.relname = 'audit_log' and p.polname = 'audit_log_facility_read')
  then
    raise exception 'audit_log_facility_read was not created';
  end if;
end $$;

comment on policy audit_log_facility_read on public.audit_log is
  'A facility admin reads their own facility entries. Rows with a null facility are platform-level (who was made a Yipyy superadmin) and stay out of every facility view.';
