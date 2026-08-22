-- ============================================================================
-- A facility owns its own care routine.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `src/data/task-templates.ts` holds 34 hardcoded templates and keeps every
-- edit a facility makes in **localStorage**, under `yipyy_task_templates`.
--
-- That is the worst shape a fake can take, because it works. The screen saves,
-- the toast appears, the list updates, and it survives a refresh — so nobody
-- reports it. What it does not survive is a second person: the manager who
-- adds "Administer 6pm insulin" sees it, and the closing shift on the other
-- terminal does not. Clearing site data erases the routine with no trace.
--
-- ── WHAT ELSE DIES WITH THE FIXTURE ───────────────────────────────────────
--
-- `getAllTemplates()` returns `[...defaults, ...localStorage]`, which produces
-- one outright bug and one hard limitation:
--
--   * EDITING A DEFAULT DUPLICATES IT. `updateTemplate` cannot change a
--     hardcoded array, so it pushes a modified COPY into localStorage — under
--     the SAME id. Both then come back from `getAllTemplates`. Rename
--     "Feeding" to "Breakfast" and the list shows Feeding AND Breakfast, with
--     colliding React keys, and the original can never be got rid of.
--
--   * NONE OF THE 34 DEFAULTS CAN BE REMOVED. `removeTemplate` filters
--     localStorage, where a default does not live, so it would silently remove
--     nothing — and the screen does not offer the option: `TemplateRow` hides
--     the delete button when `isDefault`. So this one is honest about itself
--     rather than a lie, and it is still wrong: a facility that does not walk
--     dogs cannot remove "Daily walk" from its own routine.
--
-- Neither survives templates being rows. An update updates, a delete deletes,
-- and "default" stops being a category — every template belongs to the
-- facility, which is what makes the delete button safe to show for all of them.
--
-- ── WHY COLUMNS AND NOT jsonb ─────────────────────────────────────────────
--
-- `report_cards.input` is jsonb because a facility defines its own questions
-- and the key set genuinely cannot be enumerated. This is the opposite case:
-- `timing.type` is one of six values the scheduler switches on, and
-- `recurring.frequency` one of three. Those belong in columns where a check
-- constraint can hold them, not in a document where a typo becomes a task that
-- silently never fires.
-- ============================================================================

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- The fixture's string id, kept so a row can be traced back to the template
  -- it was seeded from. Not unique: a facility may duplicate a template.
  legacy_id text,

  -- 'boarding' | 'daycare' | 'grooming' | 'training' | a custom service slug.
  -- Deliberately NOT an enum: a facility invents custom services with
  -- arbitrary slugs, and an enum would make adding one a migration.
  module_id text not null,

  name text not null check (length(btrim(name)) > 0),
  description text,

  category text not null check (
    category in ('setup', 'execution', 'cleanup', 'transport', 'care', 'custom')
  ),

  -- When it happens, relative to the booking.
  timing_type text not null check (
    timing_type in ('before_start', 'at_start', 'during',
                    'at_end', 'after_end', 'custom_time')
  ),
  timing_offset_minutes integer,
  -- 'HH:MM'. Nullable even for timing_type = 'custom_time': the seeded feeding
  -- and medication templates use custom_time WITH a recurring times list and
  -- no single fixed time, so a NOT NULL here would reject the routine the
  -- product already ships.
  timing_custom_time text check (
    timing_custom_time is null or timing_custom_time ~ '^[0-2][0-9]:[0-5][0-9]$'
  ),

  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),

  assign_to text check (
    assign_to is null
    or assign_to in ('booking_staff', 'any_available', 'specific_role')
  ),
  required_role text,
  -- No template ships with 'specific_role' today, but the form offers it, and
  -- a specific-role assignment naming no role is an unassignable task.
  constraint task_templates_role_required_when_specific check (
    assign_to is distinct from 'specific_role' or required_role is not null
  ),

  -- Blocks checkout until done.
  is_required boolean not null default false,
  -- Generated automatically when a booking is confirmed.
  auto_create boolean not null default false,

  recurring_frequency text check (
    recurring_frequency is null
    or recurring_frequency in ('daily', 'per_meal', 'per_medication')
  ),
  recurring_times text[],
  -- Times without a frequency would never be read; a frequency is what makes
  -- them mean anything.
  constraint task_templates_times_need_a_frequency check (
    recurring_times is null
    or cardinality(recurring_times) = 0
    or recurring_frequency is not null
  ),

  sort_order integer not null default 0,

  created_by text references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_templates_facility_module_idx
  on public.task_templates (facility_id, module_id, sort_order);

create trigger task_templates_set_updated_at
  before update on public.task_templates
  for each row execute function private.set_updated_at();

comment on table public.task_templates is
  'What a facility''s staff are supposed to do during a service, per module. `care_log_entries` records what they actually did; this defines the routine that produces the list. Replaces src/data/task-templates.ts, whose edits lived in one browser''s localStorage.';

-- ── Who may read, and who may change it ───────────────────────────────────
--
-- READ is any active member of the facility. A caretaker who cannot configure
-- the routine still has to be able to see what the routine IS — the same list
-- drives the day's tasks on the calendar sidebar.
--
-- WRITE is `ops_manage_checklists`, which is the permission the product
-- already defines for exactly this object ("Manage checklists"). Note what
-- that includes, because it is a real decision rather than an obvious one:
-- seed.sql grants it to owner, admin, manager AND to `supervisor` and
-- `sanitation`. So a sanitation lead can edit the cleaning routine — which
-- reads as the intent behind granting it to them — and can also set
-- `is_required`, which blocks a checkout until the task is done.
--
-- The narrower alternative is `manage_services` (owner/admin/manager only),
-- which is what `facility_rooms` uses. It was not chosen because rooms are
-- physical service resources and this is a checklist, and because narrowing a
-- grant the product deliberately made would be inventing policy here rather
-- than reading it. If that blast radius turns out to be wrong, the fix is one
-- word in four policies, and this comment is where to start.
alter table public.task_templates enable row level security;

-- `profile_id` is TEXT — it holds the auth subject, not a uuid — so the
-- comparison is against `auth.jwt() ->> 'sub'` and NOT `auth.uid()`, which
-- returns uuid and fails with "operator does not exist: text = uuid". Copied
-- from `facility_rooms_read` as it stands in the database rather than from a
-- migration file, because that is the version that is actually running.
create policy task_templates_select on public.task_templates
  for select using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = task_templates.facility_id
         and m.profile_id = (select auth.jwt() ->> 'sub')
         and m.is_active
    )
  );

create policy task_templates_insert on public.task_templates
  for insert with check (
    private.has_permission(facility_id, 'ops_manage_checklists')
  );

create policy task_templates_update on public.task_templates
  for update using (
    private.has_permission(facility_id, 'ops_manage_checklists')
  ) with check (
    private.has_permission(facility_id, 'ops_manage_checklists')
  );

create policy task_templates_delete on public.task_templates
  for delete using (
    private.has_permission(facility_id, 'ops_manage_checklists')
  );

-- ── The routine every facility starts with ────────────────────────────────
--
-- The 34 templates from `defaultTaskTemplates`, copied verbatim, for EVERY
-- existing facility rather than only the demo one. They are not demo data:
-- they are the product's opinion about how boarding, daycare, grooming and
-- training are run, and a facility that upgrades into this table must not find
-- its routine emptied. Seeding all of them is what makes deleting the fixture
-- safe.
--
-- A facility created AFTER this migration starts with none, and builds its
-- own. That is deliberate and it is the honest default — the alternative is a
-- trigger that copies a hardcoded list into every new tenant forever, which is
-- how the fixture's defaults became unremovable in the first place.
insert into public.task_templates (
  facility_id, legacy_id, module_id, name, description, category,
  timing_type, timing_offset_minutes, timing_custom_time,
  duration_minutes, assign_to, is_required, auto_create,
  recurring_frequency, recurring_times, sort_order
)
select f.id, t.legacy_id, t.module_id, t.name, t.description, t.category,
       t.timing_type, t.timing_offset_minutes, t.timing_custom_time,
       t.duration_minutes, t.assign_to, t.is_required, t.auto_create,
       t.recurring_frequency, t.recurring_times, t.sort_order
  from public.facilities f
 cross join (values
  ('boarding-checkin-prep','boarding','Check-in preparation','Prepare kennel, print paperwork, review care instructions','setup','before_start',-15,null,15,'booking_staff',true,true,null,null::text[],1),
  ('boarding-kennel-setup','boarding','Set up kennel with bedding & supplies',null,'setup','at_start',null,null,10,'booking_staff',true,true,null,null,2),
  ('boarding-feeding','boarding','Feeding','Follow feeding instructions from care plan','care','custom_time',null,null,15,'any_available',true,true,'per_meal',array['08:00','18:00'],3),
  ('boarding-medication','boarding','Medication administration','Administer medication per care plan — verify dosage','care','custom_time',null,null,5,'booking_staff',true,false,null,null,4),
  ('boarding-daily-walk','boarding','Daily walk','30-minute supervised walk','care','custom_time',null,null,30,'any_available',false,true,'daily',array['07:00','12:00','18:00'],5),
  ('boarding-kennel-clean','boarding','Kennel cleaning',null,'cleanup','custom_time',null,null,15,'any_available',true,true,'daily',array['10:00'],6),
  ('boarding-checkout-prep','boarding','Check-out preparation','Bath if included, prepare belongings, final check','cleanup','before_start',-30,null,30,'booking_staff',true,true,null,null,7),
  ('boarding-deep-clean','boarding','Kennel deep clean',null,'cleanup','after_end',15,null,20,'any_available',true,true,null,null,8),
  ('daycare-morning-setup','daycare','Morning setup','Prepare play areas, check supplies, sanitize','setup','before_start',-30,null,30,'any_available',true,true,null,null,9),
  ('daycare-checkin-assessment','daycare','Check-in & temperament assessment',null,'execution','at_start',null,null,10,'booking_staff',true,true,null,null,10),
  ('daycare-playgroup','daycare','Playgroup supervision',null,'execution','during',null,null,60,'any_available',true,true,null,null,11),
  ('daycare-feeding','daycare','Midday feeding',null,'care','custom_time',null,'12:00',20,'any_available',false,true,null,null,12),
  ('daycare-nap','daycare','Afternoon nap supervision',null,'care','custom_time',null,'13:00',60,'any_available',false,true,null,null,13),
  ('daycare-cleanup','daycare','End-of-day cleanup',null,'cleanup','after_end',15,null,30,'any_available',true,true,null,null,14),
  ('daycare-report-card','daycare','Report card completion','Fill in daily report card with photos and notes','execution','at_end',null,null,10,'booking_staff',false,true,null,null,15),
  ('grooming-review-notes','grooming','Review grooming notes','Check client preferences, allergies, special instructions','setup','before_start',-10,null,5,'booking_staff',true,true,null,null,16),
  ('grooming-prep-station','grooming','Prepare grooming station','Set up tools, shampoo, clippers based on pet needs','setup','before_start',-5,null,5,'booking_staff',true,true,null,null,17),
  ('grooming-session','grooming','Grooming session',null,'execution','at_start',null,null,60,'booking_staff',true,true,null,null,18),
  ('grooming-cleanup','grooming','Post-groom cleanup',null,'cleanup','at_end',null,null,10,'booking_staff',true,true,null,null,19),
  ('grooming-photo','grooming','Photo for report card','Take before/after photos for the owner','execution','at_end',null,null,5,'booking_staff',false,true,null,null,20),
  ('training-prep-area','training','Prepare training area','Set up equipment, treats, barriers','setup','before_start',-15,null,15,'booking_staff',true,true,null,null,21),
  ('training-session','training','Training session',null,'execution','at_start',null,null,60,'booking_staff',true,true,null,null,22),
  ('training-notes','training','Session notes & progress update','Record what was covered, homework for owner','execution','at_end',null,null,10,'booking_staff',false,true,null,null,23),
  ('training-cleanup','training','Equipment cleanup',null,'cleanup','after_end',5,null,10,'any_available',false,true,null,null,24),
  ('yodas-splash-pool-prep','yodas-splash','Prepare pool area','Check water temperature, set up towels, safety equipment','setup','before_start',-15,null,15,'booking_staff',true,true,null,null,25),
  ('yodas-splash-safety-check','yodas-splash','Safety briefing & waiver check','Verify waiver signed, review pet health, check life jacket','setup','at_start',null,null,5,'booking_staff',true,true,null,null,26),
  ('yodas-splash-session','yodas-splash','Supervise swim session',null,'execution','at_start',null,null,45,'booking_staff',true,true,null,null,27),
  ('yodas-splash-dry','yodas-splash','Dry & brush pet','Towel dry, blow dry if needed, quick brush','execution','at_end',null,null,10,'booking_staff',false,true,null,null,28),
  ('yodas-splash-photo','yodas-splash','Photo for report card',null,'execution','at_end',null,null,5,'booking_staff',false,true,null,null,29),
  ('yodas-splash-cleanup','yodas-splash','Pool area cleanup','Clean pool deck, sanitize, restock towels','cleanup','after_end',10,null,15,'any_available',true,true,null,null,30),
  ('paws-express-vehicle-prep','paws-express','Vehicle preparation','Check vehicle, load crate, verify route & address','setup','before_start',-20,null,10,'booking_staff',true,true,null,null,31),
  ('paws-express-pickup','paws-express','Pickup','Drive to pickup location, collect pet, secure in vehicle','transport','at_start',null,null,30,'booking_staff',true,true,null,null,32),
  ('paws-express-dropoff','paws-express','Drop-off','Deliver pet to destination, confirm handoff','transport','at_end',null,null,15,'booking_staff',true,true,null,null,33),
  ('paws-express-vehicle-clean','paws-express','Vehicle cleanup','Clean crate, sanitize vehicle interior','cleanup','after_end',5,null,10,'booking_staff',false,true,null,null,34)
) as t(legacy_id, module_id, name, description, category, timing_type,
       timing_offset_minutes, timing_custom_time, duration_minutes, assign_to,
       is_required, auto_create, recurring_frequency, recurring_times, sort_order);
