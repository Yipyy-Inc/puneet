-- ============================================================================
-- A workflow is a SEQUENCE, and an enrolment is somebody partway through it.
--
-- An `automation_rule` is one event -> one message: booking created, send the
-- confirmation, done. A workflow is one trigger -> several messages spread over
-- days, aimed at a chosen group, that stops early when the customer does the
-- thing it was nagging them about.
--
-- ── THREE TABLES BECAUSE THOSE ARE THREE DIFFERENT LIFETIMES ──────────────
--
--   workflows             edited by staff, whenever they like
--   workflow_steps        ordered, and rewritten as a set when the wizard saves
--   workflow_enrollments  one person's position, moving on its own schedule
--
-- The third is the one people underestimate. Editing step 3 tomorrow must not
-- reach into somebody who is on day 2 of a five-day sequence and change what
-- they are about to receive. `steps_snapshot` freezes the sequence at enrolment.
-- The chore list arrived at the identical rule from the other direction
-- (20260823181004): a generated task COPIES what the definition said, it does
-- not point at it.
--
-- ── WHAT THIS DOES NOT NEED TO BUILD ──────────────────────────────────────
--
-- Sending. `message_sends` already holds messages with a future
-- `scheduled_for`, and the messaging tick already drains them. A workflow step
-- coming due queues a row exactly like a rule does; everything downstream —
-- suppression, quiet hours, the unresolved-variable refusal, idempotency — is
-- the same code path and therefore cannot disagree with the rules.
-- ============================================================================

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  name text not null check (btrim(name) <> ''),
  description text,

  -- 'event'    : something happened to a client (reuses automation_events)
  -- 'audience' : a filter, re-checked on a schedule
  kind text not null check (kind in ('event', 'audience')),

  trigger text,
  audience jsonb,

  -- A discriminated union, enforced. Without this a workflow can carry both a
  -- trigger and an audience, and nothing in the engine knows which one wins.
  -- Same idiom as facility_task_groups_scope_target.
  constraint workflows_kind_target check (
    (kind = 'event'    and trigger is not null and audience is null)
    or
    (kind = 'audience' and audience is not null and trigger is null)
  ),

  -- 'draft', not `enabled boolean`. A half-built workflow needs somewhere to
  -- live, and an abandoned wizard must not be able to send anything.
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'archived')),

  location_ids uuid[] not null default '{}',

  -- Audience scheduling. Wall-clock TIME, never UTC: 9am means 9am on the
  -- facility's clock in January and in July, and storing an instant bakes in a
  -- DST offset that is wrong six months later. Resolved at queue time.
  frequency text check (frequency in ('daily', 'weekly', 'monthly')),
  day_of_week smallint check (day_of_week between 0 and 6),
  day_of_month smallint check (day_of_month between 1 and 31),
  send_at_local time,

  -- Do not write to the same client from this workflow more often than this.
  -- MoeGo's own documentation warns that a daily filter re-sends to the same
  -- people every day and leaves the operator to notice; this is the thing that
  -- actually stops it.
  min_days_between_sends smallint not null default 30
    check (min_days_between_sends >= 0),

  -- ['booked','replied','unsubscribed','manual']
  stop_on jsonb not null default '["booked","unsubscribed"]',

  -- Cached so the list does not re-run a count query per row.
  last_estimate integer,
  last_estimated_at timestamptz,

  last_run_at timestamptz,
  activated_at timestamptz,
  activated_by text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workflows is
  'Multi-step message sequences. kind=event reuses automation_events; kind=audience is a filter re-checked on a schedule.';

create unique index if not exists workflows_name_unique
  on public.workflows (facility_id, lower(name));

create index if not exists workflows_live_idx
  on public.workflows (facility_id, kind, trigger) where status = 'active';

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,

  step_index smallint not null check (step_index >= 0),

  -- Minutes to wait AFTER the previous step (or after the trigger, for step 0).
  delay_minutes integer not null default 0 check (delay_minutes >= 0),

  email_template_id uuid references public.message_templates(id) on delete restrict,
  sms_template_id   uuid references public.message_templates(id) on delete restrict,

  created_at timestamptz not null default now(),

  constraint workflow_steps_needs_a_template
    check (email_template_id is not null or sms_template_id is not null)
);

-- NO facility_id here, deliberately. It resolves through workflow_id in the
-- policy, the way facility_task_group_items does: a facility_id column would
-- let a step claim one facility while its workflow belongs to another.
comment on table public.workflow_steps is
  'Ordered steps of a workflow. Facility resolves through workflow_id - a column here could disagree with the parent.';

create unique index if not exists workflow_steps_order_unique
  on public.workflow_steps (workflow_id, step_index);

create table if not exists public.workflow_enrollments (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  pet_id uuid references public.pets(id) on delete set null,

  status text not null default 'active'
    check (status in ('active', 'completed', 'stopped', 'failed')),
  stopped_reason text,

  current_step smallint not null default 0,
  next_run_at timestamptz,

  -- THE STEPS AS THEY WERE WHEN THIS PERSON WAS ENROLLED. See the header.
  steps_snapshot jsonb not null,

  -- '<workflow>:<client>:<occasion>'. UNIQUE, so a double enrolment is
  -- structurally impossible rather than merely unlikely - the same idiom as
  -- facility_tasks.source_ref.
  enrolment_key text not null,

  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.workflow_enrollments is
  'One client''s position in one workflow. steps_snapshot freezes the sequence at enrolment so an edit cannot rewrite what somebody is midway through.';

create unique index if not exists workflow_enrollments_key_unique
  on public.workflow_enrollments (enrolment_key);

-- The tick's query, and the only index that matters for it.
create index if not exists workflow_enrollments_due_idx
  on public.workflow_enrollments (next_run_at)
  where status = 'active' and next_run_at is not null;

create index if not exists workflow_enrollments_client_idx
  on public.workflow_enrollments (workflow_id, client_id);

-- Same guard as automation_rules: a step may not name an SMS template in its
-- email slot, nor reach another facility's templates.
create or replace function private.assert_step_templates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_channel text;
  v_template_facility uuid;
  v_workflow_facility uuid;
begin
  select facility_id into v_workflow_facility
    from public.workflows where id = new.workflow_id;

  if new.email_template_id is not null then
    select channel, facility_id into v_channel, v_template_facility
      from public.message_templates where id = new.email_template_id;
    if v_channel is distinct from 'email' then
      raise exception 'email_template_id names a % template', coalesce(v_channel, 'missing');
    end if;
    if v_template_facility is distinct from v_workflow_facility then
      raise exception 'email_template_id belongs to a different facility';
    end if;
  end if;

  if new.sms_template_id is not null then
    select channel, facility_id into v_channel, v_template_facility
      from public.message_templates where id = new.sms_template_id;
    if v_channel is distinct from 'sms' then
      raise exception 'sms_template_id names a % template', coalesce(v_channel, 'missing');
    end if;
    if v_template_facility is distinct from v_workflow_facility then
      raise exception 'sms_template_id belongs to a different facility';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists workflow_steps_assert_templates on public.workflow_steps;
create trigger workflow_steps_assert_templates
  before insert or update on public.workflow_steps
  for each row execute function private.assert_step_templates();

-- An active workflow must have at least one step. Checked when it is ACTIVATED
-- rather than at insert, because the wizard writes the workflow before its
-- steps and a constraint here would make the draft unsaveable.
create or replace function private.assert_workflow_has_steps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.status = 'active' and coalesce(old.status, '') <> 'active' then
    if not exists (select 1 from public.workflow_steps s where s.workflow_id = new.id) then
      raise exception 'a workflow with no steps cannot be activated';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists workflows_assert_steps on public.workflows;
create trigger workflows_assert_steps
  before insert or update on public.workflows
  for each row execute function private.assert_workflow_has_steps();

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.workflows            enable row level security;
alter table public.workflow_steps       enable row level security;
alter table public.workflow_enrollments enable row level security;

drop policy if exists workflows_read on public.workflows;
create policy workflows_read on public.workflows
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists workflows_write on public.workflows;
create policy workflows_write on public.workflows
  for all using (
    private.has_permission(facility_id, 'marketing_manage_automations')
  ) with check (
    private.has_permission(facility_id, 'marketing_manage_automations')
  );

drop policy if exists workflow_steps_read on public.workflow_steps;
create policy workflow_steps_read on public.workflow_steps
  for select using (
    exists (
      select 1 from public.workflows w
       where w.id = workflow_id
         and (private.is_platform_admin()
              or w.facility_id in (select private.member_facility_ids()))
    )
  );

drop policy if exists workflow_steps_write on public.workflow_steps;
create policy workflow_steps_write on public.workflow_steps
  for all using (
    exists (select 1 from public.workflows w
             where w.id = workflow_id
               and private.has_permission(w.facility_id, 'marketing_manage_automations'))
  ) with check (
    exists (select 1 from public.workflows w
             where w.id = workflow_id
               and private.has_permission(w.facility_id, 'marketing_manage_automations'))
  );

-- Enrolments are READ-ONLY to a session, like the outbox. They are a record of
-- who was sent what and when; the engine writes them as service_role.
drop policy if exists workflow_enrollments_read on public.workflow_enrollments;
create policy workflow_enrollments_read on public.workflow_enrollments
  for select using (
    exists (
      select 1 from public.workflows w
       where w.id = workflow_id
         and (private.is_platform_admin()
              or w.facility_id in (select private.member_facility_ids()))
    )
  );

-- ── Privileges ────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.workflows      to authenticated;
grant select, insert, update, delete on public.workflow_steps to authenticated;
grant select on public.workflow_enrollments to authenticated;

revoke all on public.workflows            from public, anon;
revoke all on public.workflow_steps       from public, anon;
revoke all on public.workflow_enrollments from public, anon;

-- Explicit, because granting only SELECT above does NOT take the rest away:
-- the default privilege in this project hands `authenticated` the full set on
-- every new table. Measured on facility_tasks; asserted below rather than
-- trusted.
revoke insert, update, delete on public.workflow_enrollments from authenticated;

do $$
declare t text;
begin
  foreach t in array array['public.workflows','public.workflow_steps','public.workflow_enrollments'] loop
    if has_table_privilege('anon', t, 'select') then
      raise exception '% : anon can still read', t;
    end if;
    if has_table_privilege('anon', t, 'insert') then
      raise exception '% : anon can still write', t;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.workflow_enrollments', 'insert') then
    raise exception 'authenticated can forge an enrolment';
  end if;
  if has_table_privilege('authenticated', 'public.workflow_enrollments', 'update') then
    raise exception 'authenticated can rewrite an enrolment';
  end if;
end $$;
