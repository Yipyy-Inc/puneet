-- ============================================================================
-- A task somebody was asked to do.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `src/data/work-tasks.ts` — a module-level `standaloneTasks` array with an
-- `addStandaloneTask()` that pushed onto it. Two LIVE features already write
-- through that function: the calling screen creates a follow-up when a call is
-- marked pending, and the reputation hook creates one when a review escalates.
-- Both said "task created" and both lost it on the next refresh.
--
-- A call follow-up that evaporates is not a missing feature, it is a customer
-- nobody rings back. That is the whole reason this table exists.
--
-- ── THE DEDUP KEY IS A CONSTRAINT, NOT A SCAN ─────────────────────────────
--
-- Both producers dedup: the caller checks `hasTaskForCallLog(call.id)` before
-- creating, the reputation hook keys on the request id. A scan of an array
-- answers "did I already make one" for one browser tab. Two people working the
-- same queue would each make one, and neither would see the other's.
--
-- `facility_tasks_source_unique` is the same rule where it can actually hold.
--
-- ── WHAT IS STORED AND WHAT IS JOINED ─────────────────────────────────────
--
-- `assigned_to` names a STAFF row, and the assignee's name is NOT copied
-- alongside it. That is the opposite of the decision taken for waiver
-- signatures and form versions, and deliberately so: a signature is a record of
-- what a person was shown and must not move under them, whereas a task is a
-- live instruction. When somebody's name changes, the task should say the new
-- one — there is nothing historical to preserve.
--
-- ── NO DELETE, ANYWHERE ───────────────────────────────────────────────────
--
-- `cancelled` is the operation. A task that was created and abandoned is a fact
-- about how the facility ran that week, and deleting it would quietly make the
-- completion rate look better than it was.
-- ============================================================================

create table if not exists public.facility_tasks (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null
    references public.facilities(id) on delete cascade,

  title text not null check (btrim(title) <> ''),
  description text,
  category text not null default 'general',

  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'completed', 'cancelled')),

  -- Nullable: an unassigned task is a real state — work the shift has to pick
  -- up. `set null` rather than cascade, because somebody leaving must not
  -- silently delete the work they were carrying.
  assigned_to uuid references public.staff(id) on delete set null,

  -- One instant, not a date plus an optional time. The fixture split them and
  -- every consumer re-joined them with a `??  "23:59"` default, which is a
  -- timezone bug waiting for the first facility outside one offset.
  due_at timestamptz,

  estimated_minutes integer
    check (estimated_minutes is null or estimated_minutes > 0),
  requires_photo boolean not null default false,
  requires_signoff boolean not null default false,
  notes text,

  completed_at timestamptz,
  completed_by uuid references public.staff(id) on delete set null,

  -- Where it came from. `source_ref` is the producer's own id — a call log, a
  -- reputation request — and it is what the unique index below keys on.
  source text not null default 'manual'
    check (source in ('manual', 'call_follow_up', 'reputation_escalation', 'template')),
  source_ref text,
  template_id uuid references public.task_templates(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Completion is one fact in two columns, so they cannot disagree. Without
  -- this, "completed with no completed_at" is representable and every report
  -- that measures turnaround silently drops those rows.
  constraint facility_tasks_completed_together
    check ((status = 'completed') = (completed_at is not null))
);

comment on table public.facility_tasks is
  'Work assigned to staff. Cancelled, never deleted - an abandoned task is a fact about how the week ran.';

comment on column public.facility_tasks.source_ref is
  'The producing feature''s own id. Unique per (facility, source) so two people working one queue cannot each create the same follow-up.';

-- THE DEDUP RULE. Partial, because a manual task has no ref and any number of
-- them may exist.
create unique index if not exists facility_tasks_source_unique
  on public.facility_tasks (facility_id, source, source_ref)
  where source_ref is not null;

create index if not exists facility_tasks_facility_idx
  on public.facility_tasks (facility_id, status, due_at);
create index if not exists facility_tasks_assignee_idx
  on public.facility_tasks (assigned_to, status, due_at);

-- ── The assignee may finish their work, not rewrite it ────────────────────
--
-- `manage_own_tasks` is held by every role, including ones with no
-- `ops_manage_tasks` at all. Without this trigger the update policy below would
-- let anyone holding a task change its title, its due date, or hand it to
-- somebody else — which is not "manage own tasks", it is managing the roster
-- through the back door. The same shape as the access-level escalation guard.

create or replace function private.task_owner_moves_status_only()
returns trigger
language plpgsql
as $$
begin
  -- A CASCADE IS NOT A REASSIGNMENT. `staff.on delete set null` arrives here as
  -- an UPDATE, and a guard that refuses it makes the staff row undeletable —
  -- which is exactly how `audit_log.facility_id` made facilities undeletable
  -- and is still in the debt map. Caught by K15, which is why that assertion
  -- exists.
  --
  -- The `not exists` is what keeps this from being a hole: during an ordinary
  -- unassign the staff row is still there, so this branch does not apply and
  -- the checks below still run.
  if new.assigned_to is null
     and old.assigned_to is not null
     and not exists (select 1 from public.staff s where s.id = old.assigned_to)
  then
    return new;
  end if;

  -- Whoever can manage the team's tasks may change anything.
  if private.has_permission(new.facility_id, 'ops_manage_tasks') then
    return new;
  end if;

  if new.title            is distinct from old.title
     or new.description   is distinct from old.description
     or new.category      is distinct from old.category
     or new.priority      is distinct from old.priority
     or new.assigned_to   is distinct from old.assigned_to
     or new.due_at        is distinct from old.due_at
     or new.estimated_minutes is distinct from old.estimated_minutes
     or new.requires_photo    is distinct from old.requires_photo
     or new.requires_signoff  is distinct from old.requires_signoff
     or new.source        is distinct from old.source
     or new.source_ref    is distinct from old.source_ref
     or new.template_id   is distinct from old.template_id
     or new.facility_id   is distinct from old.facility_id
  then
    raise exception
      'You can update the progress of a task assigned to you, but not what it asks for or who it belongs to.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists facility_tasks_owner_status_only on public.facility_tasks;
create trigger facility_tasks_owner_status_only
  before update on public.facility_tasks
  for each row execute function private.task_owner_moves_status_only();

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.facility_tasks enable row level security;

-- Reading: the team's tasks for whoever manages them, and your own always. A
-- person must be able to see the work assigned to them even when they hold no
-- management permission at all.
drop policy if exists facility_tasks_read on public.facility_tasks;
create policy facility_tasks_read on public.facility_tasks
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'ops_manage_tasks')
    or assigned_to in (select private.own_staff_ids())
  );

-- Creating: for the team, or for yourself. The second arm is what lets an
-- accountant — who holds `manage_own_tasks` and no `ops_manage_tasks` — write
-- themselves a reminder without being able to assign work to anybody else.
drop policy if exists facility_tasks_insert on public.facility_tasks;
create policy facility_tasks_insert on public.facility_tasks
  for insert with check (
    private.has_permission(facility_id, 'ops_manage_tasks')
    or (
      private.has_permission(facility_id, 'manage_own_tasks')
      and assigned_to in (select private.own_staff_ids())
    )
  );

-- Updating: the trigger above decides WHAT may change; this decides who.
drop policy if exists facility_tasks_update on public.facility_tasks;
create policy facility_tasks_update on public.facility_tasks
  for update using (
    private.has_permission(facility_id, 'ops_manage_tasks')
    or assigned_to in (select private.own_staff_ids())
  ) with check (
    private.has_permission(facility_id, 'ops_manage_tasks')
    or assigned_to in (select private.own_staff_ids())
  );

-- No delete policy, deliberately. See the header.

grant select, insert, update on public.facility_tasks to authenticated;
revoke all on public.facility_tasks from public, anon;

-- DELETE has to be revoked explicitly, not merely left out of the grant above.
-- A default privilege in this project hands `authenticated` the full set on new
-- tables, so `has_table_privilege('authenticated', ..., 'delete')` came back
-- TRUE after the grant that never mentioned delete. RLS still refused every row
-- — there is no delete policy — but "no policy" and "no privilege" are two
-- different layers and the header says this table is never deleted from.
--
-- Asserted rather than assumed: a revoke naming a privilege the role does not
-- hold succeeds silently and looks identical to one that worked.
revoke delete, truncate, references, trigger on public.facility_tasks from authenticated;

do $$
begin
  if has_table_privilege('authenticated', 'public.facility_tasks', 'delete') then
    raise exception 'facility_tasks: authenticated still holds DELETE after the revoke';
  end if;
  if has_table_privilege('anon', 'public.facility_tasks', 'select') then
    raise exception 'facility_tasks: anon can still read';
  end if;
end $$;
