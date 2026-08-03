-- ============================================================================
-- Onboarding & offboarding TEMPLATES, and the facility's staff/HR config.
--
-- These are facility CONFIGURATION — the checklists a business designs once and
-- applies to every hire. They live in src/data/staff-onboarding.ts behind a
-- localStorage store (`yipyy-staff-onboarding-v2`), which means a facility's
-- onboarding design exists in exactly one browser on one machine. A manager who
-- builds a Groomer template on their laptop has not configured the facility;
-- they have configured Chrome.
--
-- Per-hire INSTANCES are deliberately NOT in this migration. They are a harder
-- problem with a different access shape — an unauthenticated token-bearer must
-- read and write their own instance — and mixing that into a config migration
-- would mean designing the hardest policy in the file under the least scrutiny.
--
-- ── SHAPE, following the three migrations before this one ───────────────────
--
-- RLS decides WHO (20260801150000_staff.sql), a SECURITY DEFINER BEFORE trigger
-- decides WHAT (20260802140000, 20260802120000), helpers live in `private`, and
-- every trigger opens with a service_role bypass keyed on `auth.uid() is null`
-- so the seed scripts keep working.
--
-- ============================================================================
-- DECISION 1 — TWO task tables, not one with an `audience` discriminator.
-- ============================================================================
--
-- The honest argument FOR one table: identical policies, one ordering column,
-- one uniqueness rule, and "a task is a task". That is not nothing, and if the
-- two shapes were 80% shared this is what I would have built.
--
-- They are not. The overlap is name/description/required and stops there:
--
--   manager  (OnboardingTask)          employee (EmployeeOnboardingTask)
--   ----------------------------       ---------------------------------
--   type: OnboardingTaskType (9)       type: EmployeeOnboardingTaskType (9)
--     document_sign, shadow_shift,       personal_info, banking, availability,
--     equipment_issue, facility_tour…    uniform_prefs, custom_question…
--   when / whenDays / assignedTo       fields: EmployeeFieldSpec[]
--   requiresManager                    question: EmployeeCustomQuestion
--                                      documentName / documentRef
--
-- Two disjoint enums and two disjoint field sets. One table would make every
-- column nullable and leave no CHECK worth writing: "if audience='employee'
-- then assigned_to is null and fields is not null" is expressible, but it is a
-- growing pile of conditional constraints re-deriving the discriminator that a
-- table name states for free.
--
-- The decider is what comes NEXT. Per-hire instances key their sections by
-- employee-task id (saveOnboardingSectionByTask), so the instance table wants a
-- foreign key to employee tasks SPECIFICALLY. Against one table that FK cannot
-- express "…and only the employee ones", and the discriminator becomes a rule
-- enforced nowhere.
--
-- Offboarding tasks are a third shape again (assignedTo manager|owner|hr, due
-- on_termination|within_days|before_last_day), so: three task tables.
--
-- ============================================================================
-- DECISION 2 — what is a column, what is jsonb.
-- ============================================================================
--
-- The bookings split: queryable or filterable → column; the long tail → jsonb.
--
--   applies_to_roles  COLUMN (text[]).  resolveTemplateForRole FILTERS on this;
--                     it is the whole point of the row. A GIN index makes the
--                     overlap check below cheap. Putting it in jsonb would be
--                     burying the one field this table is queried by.
--   status, name, the day counts, welcome_message  COLUMNS. Scalars, all shown
--                     in the templates list, `status` filtered on every read.
--   manager tasks     NO jsonb at all. Every field is a scalar; a `config`
--                     column here would hold nothing.
--   employee tasks    `config` jsonb for `fields` and `question` only — nested
--                     arrays and objects that no query filters on. The scalars
--                     (type, name, required, document_name, document_ref) stay
--                     columns.
--   hr config         scalars and two text[] as columns; notification_triggers
--                     as jsonb, being a 12-key record of {enabled,inApp,email}
--                     that is read whole and never filtered.
--
-- ============================================================================
-- DECISION 3 — ordering is explicit, and reorderable.
-- ============================================================================
--
-- `position integer not null` with unique (template_id, position). Insertion
-- order is not an order: it survives no edit, and "add a task, then move it
-- second" is the first thing anyone does.
--
-- DEFERRABLE INITIALLY DEFERRED because the obvious reorder — swap positions 2
-- and 3 — transiently duplicates a value mid-statement. A non-deferrable
-- constraint forces callers into the negative-position shuffle, which is a
-- workaround for a constraint that did not need to be immediate.
--
-- ============================================================================
-- DECISION 4 — one active template per role, or resolveTemplateForRole lies.
-- ============================================================================
--
-- resolveTemplateForRole (staff-onboarding.ts:1298) does:
--     active.find(t => t.appliesToRoles.includes(role)) ?? active.find(empty)
-- `.find` returns whichever came first. With two active Groomer templates the
-- answer depends on array order, so two hires on the same day can be onboarded
-- differently and nothing anywhere reports it.
--
-- HOW IT IS ENFORCED, and why not the tidier options:
--
--   • An EXCLUSION constraint (facility_id =, applies_to_roles &&) WHERE active
--     is exactly the right idea and does not work: exclusion needs an index AM
--     supporting amgettuple, i.e. GiST, and Postgres ships no GiST opclass for
--     text[]. GIN supports && but cannot back an exclusion constraint.
--   • A plain unique index cannot address array ELEMENTS.
--
--   So: a BEFORE trigger doing the overlap check (below), which has the side
--   benefit of naming the conflict — "Groomer already has an active template" —
--   where a constraint would surface as an index name.
--
--   Plus a partial unique index for the universal fallback: two active
--   templates with an EMPTY applies_to_roles are equally non-deterministic, and
--   that case a unique index CAN express.
--
-- OFFBOARDING GETS NO SUCH RULE, deliberately. getOffboardingTemplatesForReason
-- returns a LIST and the UI offers a choice; multiple matches are the design,
-- not a bug. (resolveOffboardingTemplateForReason, the singular one, is dead
-- code — Knip confirms — so it is not evidence of an intent to be unique.)
--
-- ============================================================================
-- PERMISSIONS — both keys already exist in supabase/seed.sql. None invented.
-- ============================================================================
--
--   read   `view_onboarding`  — held by EVERY role preset. Correct: a groomer
--          being onboarded has to see the checklist they are working through,
--          and a template is not sensitive.
--   write  `manage_staff`     — owner/admin/manager. As instructed. Note that
--          `manage_onboarding` also exists with the same three holders; I used
--          manage_staff because it is what the staff table already writes on,
--          and two keys guarding one screen is how they drift apart.
-- ============================================================================

-- ── Templates ───────────────────────────────────────────────────────────────

create table public.onboarding_templates (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- The app-facing id, same reasoning as staff.legacy_id: the mock store keys
  -- templates by string ("tpl-groomer") and the settings UI still does.
  legacy_id   text,

  name        text not null,
  status      text not null default 'draft'
                check (status in ('active', 'draft')),

  -- Empty array = applies to every role (the universal fallback).
  applies_to_roles text[] not null default '{}',

  completion_deadline_days integer not null default 7
                check (completion_deadline_days > 0),
  invite_expiry_days       integer not null default 7
                check (invite_expiry_days > 0),
  welcome_message          text not null default '',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint onboarding_templates_legacy_key unique (facility_id, legacy_id)
);

create index onboarding_templates_facility_idx
  on public.onboarding_templates (facility_id);
create index onboarding_templates_roles_idx
  on public.onboarding_templates using gin (applies_to_roles);

-- The universal-fallback half of Decision 4. One active template with no roles
-- per facility; the per-role half needs the trigger below.
create unique index onboarding_templates_one_universal_active
  on public.onboarding_templates (facility_id)
  where status = 'active' and applies_to_roles = '{}';

-- ── Manager tasks ───────────────────────────────────────────────────────────

create table public.onboarding_manager_tasks (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null
                references public.onboarding_templates (id) on delete cascade,

  -- Denormalised from the template so every policy below is a scalar test
  -- rather than a join. Kept honest by a trigger, exactly as pets.facility_id
  -- is (20260801120000).
  facility_id uuid not null references public.facilities (id) on delete cascade,

  legacy_id   text,
  position    integer not null,

  task_type   text not null check (task_type in (
                'document_sign', 'waiver_sign', 'training_module',
                'shadow_shift', 'equipment_issue', 'system_access_verify',
                'meet_the_team', 'facility_tour', 'custom')),
  name        text not null,
  description text not null default '',

  requires_manager boolean not null default true,
  required         boolean not null default true,

  when_due    text not null default 'on_hire'
                check (when_due in ('on_hire', 'within_days', 'by_first_shift')),
  -- Only meaningful for within_days, and required there: "due in N days" with
  -- no N is a task with no due date pretending to have one.
  when_days   integer check (when_days is null or when_days >= 0),
  constraint onboarding_manager_tasks_when_days_present check (
    (when_due = 'within_days') = (when_days is not null)
  ),

  assigned_to text not null default 'manager',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint onboarding_manager_tasks_position_key
    unique (template_id, position) deferrable initially deferred
);

create index onboarding_manager_tasks_template_idx
  on public.onboarding_manager_tasks (template_id, position);
create index onboarding_manager_tasks_facility_idx
  on public.onboarding_manager_tasks (facility_id);

-- ── Employee tasks ──────────────────────────────────────────────────────────

create table public.onboarding_employee_tasks (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null
                references public.onboarding_templates (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  legacy_id   text,
  position    integer not null,

  task_type   text not null check (task_type in (
                'personal_info', 'contact_details', 'banking',
                'document_upload', 'document_sign', 'availability',
                'emergency_contact', 'uniform_prefs', 'custom_question')),
  name        text not null,
  description text,
  required    boolean not null default true,

  document_name text,
  document_ref  text,

  -- `fields` (EmployeeFieldSpec[]) and `question` (EmployeeCustomQuestion).
  -- Nested, read whole, never filtered — see Decision 2.
  config      jsonb not null default '{}'::jsonb,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint onboarding_employee_tasks_position_key
    unique (template_id, position) deferrable initially deferred
);

create index onboarding_employee_tasks_template_idx
  on public.onboarding_employee_tasks (template_id, position);
create index onboarding_employee_tasks_facility_idx
  on public.onboarding_employee_tasks (facility_id);

-- ── Offboarding ─────────────────────────────────────────────────────────────

create table public.offboarding_templates (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  legacy_id   text,
  name        text not null,

  -- Termination-reason LABELS, matching StaffHrConfig.terminationReasons.
  -- Labels rather than ids because that is what the mock stores and what the
  -- settings screen edits; normalising reasons into their own table is a
  -- separate change with its own migration of existing strings.
  applies_to_reasons text[] not null default '{}',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint offboarding_templates_legacy_key unique (facility_id, legacy_id)
);

create index offboarding_templates_facility_idx
  on public.offboarding_templates (facility_id);

create table public.offboarding_tasks (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null
                references public.offboarding_templates (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  legacy_id   text,
  position    integer not null,

  name        text not null,
  description text not null default '',
  assigned_to text not null default 'manager'
                check (assigned_to in ('manager', 'owner', 'hr')),
  due         text not null default 'on_termination'
                check (due in ('on_termination', 'within_days', 'before_last_day')),
  days        integer check (days is null or days >= 0),
  constraint offboarding_tasks_days_present check (
    (due = 'within_days') = (days is not null)
  ),
  required    boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint offboarding_tasks_position_key
    unique (template_id, position) deferrable initially deferred
);

create index offboarding_tasks_template_idx
  on public.offboarding_tasks (template_id, position);
create index offboarding_tasks_facility_idx
  on public.offboarding_tasks (facility_id);

-- ── Facility staff & HR config ──────────────────────────────────────────────
-- One row per facility. `facility_id` is the primary key rather than a surrogate
-- + unique index: there is exactly one config per facility and a second row is
-- not a thing to be prevented later, it is a thing that cannot exist.

create table public.staff_hr_config (
  facility_id uuid primary key
                references public.facilities (id) on delete cascade,

  employment_types    text[] not null default '{}',
  termination_reasons text[] not null default '{}',

  invite_expiry_days        integer not null default 7  check (invite_expiry_days > 0),
  completion_deadline_days  integer not null default 7  check (completion_deadline_days > 0),
  hr_doc_retention_years    integer not null default 7  check (hr_doc_retention_years > 0),

  require_clock_in_confirm       boolean not null default true,
  require_clock_out_confirm      boolean not null default true,
  require_register_open_on_login boolean not null default true,
  register_close_reminder text not null default 'closing_time'
                check (register_close_reminder in
                       ('closing_time', 'opener_clock_out', 'manual')),

  -- Record<StaffNotifTriggerKey, {enabled,inApp,email,days?}> — twelve keys,
  -- read whole by the settings screen, never filtered.
  notification_triggers jsonb not null default '{}'::jsonb,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── updated_at ──────────────────────────────────────────────────────────────

create trigger onboarding_templates_set_updated_at
  before update on public.onboarding_templates
  for each row execute function private.set_updated_at();
create trigger onboarding_manager_tasks_set_updated_at
  before update on public.onboarding_manager_tasks
  for each row execute function private.set_updated_at();
create trigger onboarding_employee_tasks_set_updated_at
  before update on public.onboarding_employee_tasks
  for each row execute function private.set_updated_at();
create trigger offboarding_templates_set_updated_at
  before update on public.offboarding_templates
  for each row execute function private.set_updated_at();
create trigger offboarding_tasks_set_updated_at
  before update on public.offboarding_tasks
  for each row execute function private.set_updated_at();
create trigger staff_hr_config_set_updated_at
  before update on public.staff_hr_config
  for each row execute function private.set_updated_at();

-- ── A task's facility is its template's ─────────────────────────────────────
-- Enforced rather than trusted, same as pets_inherit_facility: a mismatch would
-- make a task invisible to its own facility while remaining visible to another,
-- which is the worst kind of RLS bug — silent, and wrong permissively.

create or replace function private.onboarding_task_inherit_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'offboarding_tasks' then
    select t.facility_id into new.facility_id
      from public.offboarding_templates t where t.id = new.template_id;
  else
    select t.facility_id into new.facility_id
      from public.onboarding_templates t where t.id = new.template_id;
  end if;
  return new;
end;
$$;

create trigger onboarding_manager_tasks_set_facility
  before insert or update of template_id on public.onboarding_manager_tasks
  for each row execute function private.onboarding_task_inherit_facility();
create trigger onboarding_employee_tasks_set_facility
  before insert or update of template_id on public.onboarding_employee_tasks
  for each row execute function private.onboarding_task_inherit_facility();
create trigger offboarding_tasks_set_facility
  before insert or update of template_id on public.offboarding_tasks
  for each row execute function private.onboarding_task_inherit_facility();

-- ── Decision 4, enforced ────────────────────────────────────────────────────

create or replace function private.enforce_template_role_uniqueness()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_clash text;
begin
  -- service_role: seeds and server-side jobs. Same carve-out as every other
  -- trigger in this schema, and necessary here because the seed inserts a
  -- template catalogue in one statement.
  if (select auth.uid()) is null then
    return new;
  end if;

  if new.status <> 'active' or array_length(new.applies_to_roles, 1) is null then
    return new;
  end if;

  select string_agg(distinct r, ', ')
    into v_clash
    from public.onboarding_templates t,
         lateral unnest(t.applies_to_roles) r
   where t.facility_id = new.facility_id
     and t.id <> new.id
     and t.status = 'active'
     and r = any (new.applies_to_roles);

  if v_clash is not null then
    -- Named, because "onboarding_templates_role_key violated" tells a manager
    -- nothing about which role to go and fix.
    raise exception
      'Another active template already covers: %. A role can have only one active onboarding template.',
      v_clash
      using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger onboarding_templates_role_uniqueness
  before insert or update on public.onboarding_templates
  for each row execute function private.enforce_template_role_uniqueness();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Split select/insert/update/delete throughout. No `for all`: a single policy
-- covering every command means one predicate has to be right for four different
-- questions, and the day someone widens it for reads they have widened deletes.

alter table public.onboarding_templates       enable row level security;
alter table public.onboarding_manager_tasks   enable row level security;
alter table public.onboarding_employee_tasks  enable row level security;
alter table public.offboarding_templates      enable row level security;
alter table public.offboarding_tasks          enable row level security;
alter table public.staff_hr_config            enable row level security;

-- onboarding_templates
create policy onboarding_templates_read on public.onboarding_templates
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_onboarding')
  );
create policy onboarding_templates_insert on public.onboarding_templates
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_templates_update on public.onboarding_templates
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_templates_delete on public.onboarding_templates
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- onboarding_manager_tasks
create policy onboarding_manager_tasks_read on public.onboarding_manager_tasks
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_onboarding')
  );
create policy onboarding_manager_tasks_insert on public.onboarding_manager_tasks
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_manager_tasks_update on public.onboarding_manager_tasks
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_manager_tasks_delete on public.onboarding_manager_tasks
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- onboarding_employee_tasks
create policy onboarding_employee_tasks_read on public.onboarding_employee_tasks
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_onboarding')
  );
create policy onboarding_employee_tasks_insert on public.onboarding_employee_tasks
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_employee_tasks_update on public.onboarding_employee_tasks
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_employee_tasks_delete on public.onboarding_employee_tasks
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- offboarding_templates
create policy offboarding_templates_read on public.offboarding_templates
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_onboarding')
  );
create policy offboarding_templates_insert on public.offboarding_templates
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_templates_update on public.offboarding_templates
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_templates_delete on public.offboarding_templates
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- offboarding_tasks
create policy offboarding_tasks_read on public.offboarding_tasks
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_onboarding')
  );
create policy offboarding_tasks_insert on public.offboarding_tasks
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_tasks_update on public.offboarding_tasks
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy offboarding_tasks_delete on public.offboarding_tasks
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- staff_hr_config
--
-- Readable on view_onboarding like the rest: it carries the invite expiry and
-- completion deadline a hire is measured against, plus the clock-in confirm
-- toggles every employee's own portal reads. Nothing in it is sensitive.
--
-- No DELETE policy at all, deliberately. A facility without an HR config is not
-- a state the app can render — every consumer reads it unconditionally — so
-- deleting the row is not an operation anyone should have. Resetting means
-- updating back to defaults, which UPDATE already covers.
create policy staff_hr_config_read on public.staff_hr_config
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_onboarding')
  );
create policy staff_hr_config_insert on public.staff_hr_config
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy staff_hr_config_update on public.staff_hr_config
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));

comment on table public.onboarding_templates is
  'Facility onboarding checklists. One ACTIVE template per role — see private.enforce_template_role_uniqueness.';
comment on table public.onboarding_manager_tasks is
  'Manager-completed steps. Separate from employee tasks: disjoint enums, disjoint fields, and instances FK the employee ones.';
comment on table public.onboarding_employee_tasks is
  'Self-serve steps the new hire completes. `config` holds fields[] and question.';
comment on table public.staff_hr_config is
  'One row per facility. PK is facility_id: a second config is not a thing to prevent, it is a thing that cannot exist.';
