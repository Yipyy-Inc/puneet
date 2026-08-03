-- ============================================================================
-- Offboarding: the departure record, and the revocation that goes with it.
--
-- P1 already built `offboarding_templates` and `offboarding_tasks` — the
-- checklists a facility designs. This adds the per-departure half, and the one
-- rule onboarding never needed: leaving must actually take access away.
--
-- ============================================================================
-- WHAT IS REUSED, AND WHAT IS DELIBERATELY NOT
-- ============================================================================
--
-- REUSED — templates and tasks (P1). Nothing new; getOffboardingTemplatesFor
-- Reason resolves against the same rows the settings screen edits.
--
-- REUSED — `staff_documents` (P4) for OffboardingDocument. The shapes genuinely
-- match: kind→doc_type, name→file_name, fileUrl→storage_path, uploadedAt→
-- uploaded_at, and the append-only rules are the ones a final payslip wants
-- anyway. One field does not map — `retainUntil` — so that is one added column
-- and three added doc_type values, against the alternative of a parallel table
-- duplicating the private bucket, the storage policies, the magic-byte checks
-- and the immutability triggers. A second documents table would be four copies
-- of the same decisions, drifting from the day it landed.
--
-- NOT REUSED — `onboarding_instances`. The resemblance is superficial and the
-- differences are structural:
--
--   onboarding                        offboarding
--   ----------------------------      -----------------------------
--   a TOKEN, hashed, expiring         no token; there is no anonymous
--     (the hire has no account yet)     second party — a manager drives it
--   sections the EMPLOYEE fills       tasks a MANAGER completes, with a note
--   change requests, submit, review   a reason, and a last day
--
-- Merging them means a token_hash that is always null for half the rows and a
-- reason that is always null for the other half, plus a status machine with two
-- disjoint halves. The tables are not the same table wearing a hat.
--
-- Same reasoning for OffboardingTaskState vs onboarding_sections: one is
-- manager-completed with completedBy and a free-text note, the other is
-- employee-submitted with a data blob keyed by field spec.
--
-- ============================================================================
-- DEACTIVATION, NOT DELETION — because staff.sql already decided this
-- ============================================================================
--
-- 20260801150000_staff.sql:158, verbatim:
--
--     "No delete policy. Staff are terminated, not deleted — payroll, worked
--      shifts and the audit trail all reference them."
--
-- So there is nothing to choose between here; the pattern exists and this
-- follows it. The staff row stays, `status` becomes 'terminated', and every
-- historical row that references them keeps referencing them. `bookings.
-- assigned_staff_id` is ON DELETE SET NULL, which never fires precisely because
-- the delete never happens — the shifts they worked still say who worked them.
--
-- Write-ups, signed agreements and documents survive the same way: they are
-- rows keyed on staff_id, and staff_id still exists.
--
-- ============================================================================
-- REVOKING ACCESS, ATOMICALLY — and why there is no new mechanism
-- ============================================================================
--
-- `facility_memberships.is_active` is ALREADY the switch. Every access path in
-- this schema routes through one of three helpers, and all three filter on it:
--
--   private.has_permission      ... and m.is_active
--   private.member_facility_ids where ... and m.is_active
--   private.own_staff_ids       ... and m.is_active
--
-- and private.custom_access_token_hook only emits ACTIVE memberships into the
-- JWT, so the portal gates (which count memberships) close too, and the claims
-- stop carrying the facility at the next token refresh.
--
-- So this migration invents no revocation. What it adds is ATOMICITY: the
-- status change and the deactivation happen in ONE function, one transaction.
-- The brief asks for exactly this, and the reason is concrete — a follow-up
-- call that fails on its own leaves a person marked 'terminated' whose
-- membership is still active, which is a terminated employee who can still
-- read the roster and is recorded as gone.
--
-- ============================================================================
-- THE FINAL PAYSLIP — the problem deactivation creates
-- ============================================================================
--
-- `own_staff_ids()` requires m.is_active. The instant a membership is
-- deactivated the person loses read access to their OWN documents — the last
-- payslip, the exit letter, the ROE. That is the correct default for everything
-- else and the wrong answer for those three.
--
-- Handled with `private.former_staff_ids()`: the same lookup WITHOUT the
-- is_active filter, used by exactly two read policies (documents and
-- signatures) and by nothing else in the schema.
--
-- What that gives a former employee, precisely:
--   • read their own documents and their own signed agreements  ✔
--   • read anything else at that facility                       ✘ (own_staff_ids
--     still gates every other policy, and it still requires is_active)
--   • write anything, anywhere                                  ✘ (the INSERT
--     policies were never changed; they use own_staff_ids)
--
-- Write access ends the moment the transaction commits. Read access to their
-- own paperwork does not, which is the distinction the brief asks for.
--
-- ONE HONEST LIMITATION, stated rather than papered over: this is the DATABASE
-- half. A terminated person's JWT carries no memberships, so canAccessStaffPortal
-- refuses /employee and landingPathForClaims sends them to /customer/dashboard.
-- The policy below means their documents ARE readable; surfacing them needs a
-- route outside the staff-portal gate, which this migration does not add.
-- ============================================================================

-- ── The departure record ────────────────────────────────────────────────────

create table public.offboarding_instances (
  id          uuid primary key default gen_random_uuid(),
  -- One per staff member, like onboarding: the mock keys by staffId, and a
  -- second concurrent departure for the same person is not a thing.
  staff_id    uuid not null unique references public.staff (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  template_id uuid references public.offboarding_templates (id) on delete set null,

  -- The termination reason LABEL, matching StaffHrConfig.terminationReasons and
  -- offboarding_templates.applies_to_reasons. A label rather than an id because
  -- that is what the settings screen edits and what the templates match on.
  reason      text not null,
  last_day    date,

  started_at   timestamptz not null default now(),
  completed_at timestamptz,

  -- Notification dedup, carried over from the mock instance.
  last_reminder_date       date,
  due_today_notified_date  date,
  complete_notified_at     timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offboarding_instances_facility_idx
  on public.offboarding_instances (facility_id);
create index offboarding_instances_open_idx
  on public.offboarding_instances (facility_id) where completed_at is null;

-- ── Per-task state ──────────────────────────────────────────────────────────

create table public.offboarding_task_states (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid not null
                references public.offboarding_instances (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- Nullable FK plus a snapshot, the same shape onboarding_sections uses and
  -- for the same reason: editing a template deletes task rows, and "ROE
  -- submitted, ref #XYZ" must outlive somebody renaming the step.
  task_id  uuid references public.offboarding_tasks (id) on delete set null,
  task_key text not null,

  -- Snapshotted at materialisation. Not the full copy-not-reference treatment
  -- staff_signatures gets — a checklist item is not a legal proof — but enough
  -- that a completed task still reads correctly a year later.
  name        text not null,
  description text not null default '',
  required    boolean not null default true,
  position    integer not null,

  due_date        date,
  completed_at    timestamptz,
  completed_by    uuid references auth.users (id) on delete set null,
  completion_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint offboarding_task_states_key unique (instance_id, task_key)
);

create index offboarding_task_states_instance_idx
  on public.offboarding_task_states (instance_id, position);
create index offboarding_task_states_facility_idx
  on public.offboarding_task_states (facility_id);

-- ── staff_documents carries the final documents too ─────────────────────────

alter table public.staff_documents
  drop constraint if exists staff_documents_doc_type_check;

alter table public.staff_documents
  add constraint staff_documents_doc_type_check check (doc_type in (
    'work_permit', 'id_document', 'certification', 'contract', 'tax_form',
    'emergency_contact', 'health_record', 'other',
    -- Offboarding: OffboardingDocumentKind.
    'roe', 'termination_letter', 'settlement_agreement'));

-- The one field of OffboardingDocument that did not already have a home.
-- Computed from StaffHrConfig.hrDocRetentionYears at upload time, and stored
-- rather than derived: the retention policy can change, and a document filed
-- under a seven-year rule does not become a five-year document because someone
-- edited a setting afterwards.
alter table public.staff_documents
  add column if not exists retain_until date;

comment on column public.staff_documents.retain_until is
  'Computed from hrDocRetentionYears AT UPLOAD TIME. Stored, not derived: changing the setting later must not retroactively shorten an existing document''s retention.';

-- ── updated_at ──────────────────────────────────────────────────────────────

create trigger offboarding_instances_set_updated_at
  before update on public.offboarding_instances
  for each row execute function private.set_updated_at();
create trigger offboarding_task_states_set_updated_at
  before update on public.offboarding_task_states
  for each row execute function private.set_updated_at();

-- ── Derived facility ────────────────────────────────────────────────────────

create or replace function private.offboarding_child_inherit_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select i.facility_id into new.facility_id
    from public.offboarding_instances i where i.id = new.instance_id;
  return new;
end;
$$;

create trigger offboarding_task_states_set_facility
  before insert or update of instance_id on public.offboarding_task_states
  for each row execute function private.offboarding_child_inherit_facility();

-- ── Former staff, for their own paperwork only ──────────────────────────────

create or replace function private.former_staff_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  -- own_staff_ids() WITHOUT the is_active filter. Deliberately separate rather
  -- than a parameter on the original: this must be reachable from exactly two
  -- policies, and a boolean argument on the helper every other policy calls is
  -- how it ends up passed by accident.
  select s.id
    from public.staff s
    join public.facility_memberships m on m.id = s.membership_id
   where m.profile_id = (select auth.uid());
$$;

grant execute on function private.former_staff_ids() to authenticated;

-- Documents and signatures: readable by the person they belong to, including
-- after they leave. Nothing else changes — the INSERT policies still use
-- own_staff_ids, so write access ends with the membership.
drop policy if exists staff_documents_read on public.staff_documents;
create policy staff_documents_read on public.staff_documents
  for select to authenticated
  using (
    private.is_platform_admin()
    or (staff_id in (select private.former_staff_ids()) and visible_to_employee)
    or private.has_permission(facility_id, 'manage_staff')
  );

drop policy if exists staff_signatures_read on public.staff_signatures;
create policy staff_signatures_read on public.staff_signatures
  for select to authenticated
  using (
    private.is_platform_admin()
    or staff_id in (select private.former_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  );

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Offboarding is a MANAGER's record about a departure. The departing person
-- does not read their own — the checklist contains "revoke building access",
-- "recover laptop", "final pay calculated at X" — so unlike onboarding there is
-- no self-read policy here. That is a deliberate difference, not an omission.

alter table public.offboarding_instances   enable row level security;
alter table public.offboarding_task_states enable row level security;

create policy offboarding_instances_read on public.offboarding_instances
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy offboarding_instances_insert on public.offboarding_instances
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_instances_update on public.offboarding_instances
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_instances_delete on public.offboarding_instances
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

create policy offboarding_task_states_read on public.offboarding_task_states
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy offboarding_task_states_insert on public.offboarding_task_states
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_task_states_update on public.offboarding_task_states
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_task_states_delete on public.offboarding_task_states
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- ============================================================================
-- THE ONE TRANSACTION
-- ============================================================================
--
-- Terminate + revoke + materialise the checklist. All of it or none of it.
--
-- The brief's requirement, and the failure it prevents: a follow-up call that
-- fails on its own leaves someone marked 'terminated' whose membership is still
-- active — recorded as gone, still able to read the roster. The two facts have
-- to move together or they will eventually disagree, and the disagreement is
-- silent in the direction that matters.
--
-- SECURITY DEFINER because it writes facility_memberships, which a manager has
-- no direct policy to write. Safe because the facility comes from the STAFF ROW
-- rather than an argument, and manage_staff is checked against that facility
-- before anything happens.
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
  -- as an oracle for which legacy_ids exist.
  --
  -- NOT the `auth.uid() is null` carve-out used by the write-integrity
  -- triggers. That pattern is correct in a trigger, which only fires on a write
  -- that already cleared RLS, so a missing subject really does mean
  -- service_role. An RPC is a FRONT DOOR: `anon` reaches it directly with the
  -- publishable key and no subject at all, and the carve-out meant to admit the
  -- seed script would admit the internet. Nothing calls this without a session
  -- — see 20260804200000, which fixes the same mistake in link_staff_invite.
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
     position, due_date)
  select v_instance, v_staff.facility_id, t.id, coalesce(t.legacy_id, t.id::text),
         t.name, t.description, t.required, t.position,
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

-- REVOKING FROM `public` IS NOT REVOKING FROM `anon`. Supabase ships
-- `alter default privileges in schema public grant execute on functions to
-- anon, authenticated, service_role`, so this function is born with an explicit
-- `anon=X` entry in its ACL; `revoke ... from public` drops the PUBLIC
-- pseudo-role grant, a different one, and leaves `anon=X` standing. The third
-- line is the one that closes the door. See 20260804200000.
revoke all on function public.offboard_staff(text, text, uuid, date) from public;
revoke execute on function public.offboard_staff(text, text, uuid, date) from anon;
grant execute on function public.offboard_staff(text, text, uuid, date) to authenticated;

comment on function public.offboard_staff(text, text, uuid, date) is
  'Terminate + revoke + materialise the checklist in ONE transaction. is_active=false is the revocation; every access helper already filters on it.';
comment on table public.offboarding_instances is
  'A manager''s record of a departure. No self-read policy: the checklist is about the person, not for them.';
