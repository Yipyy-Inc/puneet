-- ============================================================================
-- offboarding_task_states.assigned_to — the column the materialiser dropped.
--
-- 20260804180000 copies the checklist off the template on purpose, so that
-- editing a template later does not rewrite a departure already in progress.
-- It snapshotted name, description, required and position — and missed
-- `assigned_to`, which is not derivable from anything else on the row.
--
-- That matters because it is RENDERED, on both offboarding surfaces:
--
--   staff/_components/offboarding-tab.tsx:242   ASSIGNEE_LABEL[task.assignedTo]
--   tasks/OffboardingTasksTab.tsx:168           ASSIGNEE_LABEL[task.assignedTo]
--
-- and it is the whole point of a task list shared between a manager, an owner
-- and HR: "recover the laptop" and "submit the ROE" are not the same person's
-- job. Without it the UI can only fall back to a blank chip.
--
-- CONTRAST WITH `due`/`days`, which are correctly ABSENT here. Those are a
-- relative rule ("within 5 days"), and materialising resolves them into the
-- concrete `due_date` this table already has. Keeping the rule as well would be
-- two sources of truth for one date. `assigned_to` has no such resolution — it
-- is a value, so it gets copied.
--
-- NOT NULL with a default of 'manager': the default exists only to make the
-- backfill total for any row written between 20260804180000 and now, and the
-- same CHECK as the template column keeps the two in step.
-- ============================================================================

alter table public.offboarding_task_states
  add column if not exists assigned_to text not null default 'manager'
    check (assigned_to in ('manager', 'owner', 'hr'));

-- Backfill from the template task each state was copied from. `task_id` is
-- nullable (a template task can be deleted after a departure starts), so rows
-- that no longer have one keep the default rather than being lost.
update public.offboarding_task_states s
   set assigned_to = t.assigned_to
  from public.offboarding_tasks t
 where t.id = s.task_id
   and s.assigned_to is distinct from t.assigned_to;

comment on column public.offboarding_task_states.assigned_to is
  'Snapshotted from offboarding_tasks.assigned_to at materialisation. A value, not a rule — unlike due/days, which resolve into due_date.';

-- ── The materialiser now copies it ─────────────────────────────────────────
-- Body identical to 20260804180000 apart from the two lines carrying
-- assigned_to through, and this file supersedes that definition.

create or replace function public.offboard_staff(
  p_staff_legacy_id text,
  p_reason          text,
  p_template_id     uuid default null,
  p_last_day        date default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_staff     public.staff;
  v_template  public.offboarding_templates;
  v_instance  uuid;
  v_tasks     integer := 0;
begin
  -- A SESSION IS REQUIRED, and this is checked FIRST — before the staff lookup,
  -- so that "No staff record for X" cannot be used by an unauthenticated caller
  -- as an oracle for which legacy_ids exist. See 20260804200000 for why the
  -- trigger-style `auth.uid() is null` carve-out must never appear in an RPC.
  if (select auth.uid()) is null then
    raise exception 'You must be signed in to offboard staff.'
      using errcode = '42501';
  end if;

  select * into v_staff from public.staff where legacy_id = p_staff_legacy_id;
  if v_staff.id is null then
    raise exception 'No staff record for %.', p_staff_legacy_id
      using errcode = 'no_data_found';
  end if;

  if not private.has_permission(v_staff.facility_id, 'manage_staff')
     and not private.is_platform_admin() then
    raise exception 'You may not offboard staff at this facility.'
      using errcode = '42501';
  end if;

  -- Reason-specific template first, then a universal one. The plural resolver
  -- (getOffboardingTemplatesForReason) exists because several may match and the
  -- UI offers a choice; when the caller has already chosen, p_template_id wins.
  if p_template_id is not null then
    select * into v_template from public.offboarding_templates
     where id = p_template_id and facility_id = v_staff.facility_id;
  else
    select * into v_template from public.offboarding_templates
     where facility_id = v_staff.facility_id
       and p_reason = any (applies_to_reasons)
     order by created_at limit 1;
    if v_template.id is null then
      select * into v_template from public.offboarding_templates
       where facility_id = v_staff.facility_id
         and cardinality(applies_to_reasons) = 0
       order by created_at limit 1;
    end if;
  end if;

  -- 1. The record.
  insert into public.offboarding_instances
    (staff_id, facility_id, template_id, reason, last_day)
  values (v_staff.id, v_staff.facility_id, v_template.id, p_reason, p_last_day)
  on conflict (staff_id) do update
    set reason      = excluded.reason,
        last_day    = excluded.last_day,
        template_id = coalesce(excluded.template_id,
                               public.offboarding_instances.template_id)
  returning id into v_instance;

  -- 2. The checklist, materialised from the template with concrete due dates.
  --    `on conflict do nothing` so re-running does not wipe completed tasks.
  insert into public.offboarding_task_states
    (instance_id, facility_id, task_id, task_key, name, description, required,
     assigned_to, position, due_date)
  select v_instance, v_staff.facility_id, t.id, coalesce(t.legacy_id, t.id::text),
         t.name, t.description, t.required, t.assigned_to, t.position,
         case t.due
           when 'within_days'     then coalesce(p_last_day, current_date) + t.days
           when 'before_last_day' then p_last_day
           else current_date
         end
    from public.offboarding_tasks t
   where t.template_id = v_template.id
  on conflict (instance_id, task_key) do nothing;

  get diagnostics v_tasks = row_count;

  -- 3. Terminated…
  update public.staff
     set status            = 'terminated',
         status_reason     = p_reason,
         status_changed_at = now()
   where id = v_staff.id;

  -- 4. …and revoked, in the SAME statement sequence and the same transaction.
  --    This is the line the brief is about. is_active = false closes every
  --    policy in the schema at once, because all three access helpers filter on
  --    it and the JWT hook stops emitting the facility.
  update public.facility_memberships
     set is_active = false
   where id = v_staff.membership_id;

  return jsonb_build_object(
    'staffId',    v_staff.legacy_id,
    'instanceId', v_instance,
    'templateId', v_template.id,
    'tasks',      v_tasks,
    'revoked',    v_staff.membership_id is not null);
end;
$$;

revoke execute on function public.offboard_staff(text, text, uuid, date) from anon;
