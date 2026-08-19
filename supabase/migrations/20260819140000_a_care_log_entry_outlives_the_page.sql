-- ============================================================================
-- A care log entry is a record, and a record has to survive a reload.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `src/data/care-log-store.ts`: `let executions: TaskExecution[]` at module
-- scope, seeded with fixture entries, with `log()` pushing onto the array and
-- notifying subscribers. Not even localStorage — a module-level variable, so a
-- refresh loses it and two requests of the same session on serverless never
-- shared one.
--
-- The booking page's FEEDING and MEDICATIONS panels had their own copy of the
-- same problem: `useState` plus `toast.success("Feeding logged")`. Those
-- controls were hidden on 2026-08-19 rather than left to lose somebody's work
-- (PR #145). This is what lets them come back.
--
-- ── WHY A TABLE AND NOT A JSONB COLUMN ON THE BOOKING ─────────────────────
--
-- The instructions belong to the booking — one feeding plan for the stay — and
-- they live in `bookings.details`. An EXECUTION is a different thing: it has an
-- actor, a clock time, an outcome and a day, and there are many per booking per
-- day. Appending them to the booking's jsonb would mean every log rewriting the
-- whole booking row, no way to ask "what did this member of staff do today",
-- and a lost update whenever two people log at once — which is exactly what a
-- morning shift is.
--
-- ── UPSERT BY (BOOKING, TASK, DAY), WHICH THE MOCK ALREADY DID ────────────
--
-- `careLogStore.log()` upserted on `taskId + date` so that correcting a
-- mis-logged meal edited the record instead of appending a second one. That is
-- the right behaviour and it becomes a unique constraint here, so the database
-- enforces what the mock merely intended: one execution per scheduled task per
-- day, correctable.
--
-- ── WHO MAY READ IT ───────────────────────────────────────────────────────
--
-- Facility staff with `view_pet_records`, and platform admins. Writing is
-- narrower and per task type — see `care_log_permission_for` below. NOT the
-- pet's owner, deliberately, for now: `notes` is where staff write candidly about an
-- animal ("resisted the pill", "snapped at the neighbour"), and showing an
-- owner their dog's day is a product decision about what to show, not a policy
-- to make by accident in a migration. When it is made, this is one clause.
-- ============================================================================

create table if not exists public.care_log_entries (
  id           uuid primary key default gen_random_uuid(),

  -- Derived from the booking by trigger, never accepted from a request. Same
  -- rule as pets_set_facility: a caller naming a facility here would be naming
  -- one they might have no business in.
  facility_id  uuid not null references public.facilities (id) on delete cascade,
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  -- Nullable: a stay-level task (kennel cleaning) belongs to the booking and
  -- not to one animal. `on delete set null` keeps the record when a pet row
  -- goes — what happened still happened.
  pet_id       uuid references public.pets (id) on delete set null,

  -- The scheduled task this executes, e.g. `feed-<bookingRef>-08:00`. Opaque to
  -- the database; it is the app's handle for "the breakfast slot".
  task_key     text not null,
  task_type    text not null
    check (task_type in ('feeding','medication','potty','cleaning','walk','addon','other')),

  occurred_on  date not null,
  executed_at  time not null,
  /** Feeding only: when the food was put down, as distinct from when it was judged. */
  served_at    time,

  outcome      text not null,
  notes        text,

  -- Who. `profiles` rather than `staff`, because the actor is a person with a
  -- session; the staff row is which job they hold. Nullable so a record
  -- outlives the account, and the name is snapshotted for the same reason —
  -- a journal that renames itself when somebody leaves is not a journal.
  recorded_by      text references public.profiles (id) on delete set null,
  recorded_by_name text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One execution per scheduled task per day, correctable in place. This is
  -- careLogStore's upsert, enforced.
  constraint care_log_one_per_task_per_day
    unique (booking_id, task_key, occurred_on)
);

comment on table public.care_log_entries is
  'What was actually done for a booking, day by day: meals, doses, rounds. The instructions live on bookings.details; this is the execution of them.';

create index if not exists care_log_entries_booking_day_idx
  on public.care_log_entries (booking_id, occurred_on);
create index if not exists care_log_entries_facility_day_idx
  on public.care_log_entries (facility_id, occurred_on);

-- ── The facility comes from the booking ────────────────────────────────────

create or replace function private.care_log_inherit_facility()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_facility uuid;
  v_client   uuid;
begin
  select b.facility_id, b.client_id into v_facility, v_client
    from public.bookings b where b.id = new.booking_id;

  if v_facility is null then
    raise exception 'No such booking: %', new.booking_id
      using errcode = '23503';
  end if;

  new.facility_id := v_facility;

  -- A pet on somebody else's booking is not a typo to tidy up silently; the
  -- same refusal booking_pets makes, for the same reason.
  if new.pet_id is not null then
    if not exists (
      select 1 from public.pets p
       where p.id = new.pet_id and p.client_id = v_client
    ) then
      raise exception 'That pet is not on this booking''s client record.'
        using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists care_log_set_facility on public.care_log_entries;
create trigger care_log_set_facility
  before insert or update on public.care_log_entries
  for each row execute function private.care_log_inherit_facility();

-- ── WHICH PERMISSION, AND WHY IT DEPENDS ON THE TASK ──────────────────────
--
-- The first draft of this gated writes on `edit_pet_records`. Measured against
-- the presets, that was wrong for the product: `edit_pet_records` belongs to
-- owner, admin, manager and supervisor — so the caretaker and the boarding
-- attendant, the people who actually put the bowl down and hold the pill,
-- could not record having done it.
--
-- The right keys already existed and did not need inventing:
--
--   log_feedings       admin, boarding_attendant, caretaker, daycare_attendant,
--   log_medications    manager, owner, supervisor
--   log_potty_breaks
--   log_cleaning       ...and sanitation
--
-- Changing a pet's medical profile and recording that you fed it are different
-- authorities, and the catalogue already said so. This maps the row to the key
-- its own `task_type` names.
create or replace function private.care_log_permission_for(p_task_type text)
returns text
language sql
immutable
set search_path to ''
as $fn$
  select case p_task_type
    when 'feeding'    then 'log_feedings'
    when 'medication' then 'log_medications'
    when 'potty'      then 'log_potty_breaks'
    when 'cleaning'   then 'log_cleaning'
    when 'walk'       then 'log_play_sessions'
    when 'addon'      then 'log_play_sessions'
    -- Anything else is not a routine round, so it takes the broader authority
    -- rather than defaulting to the easiest one to hold.
    else 'edit_pet_records'
  end;
$fn$;

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.care_log_entries enable row level security;

drop policy if exists care_log_entries_read on public.care_log_entries;
create policy care_log_entries_read on public.care_log_entries
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_pet_records')
  );

drop policy if exists care_log_entries_insert on public.care_log_entries;
create policy care_log_entries_insert on public.care_log_entries
  for insert to authenticated
  with check (
    private.has_permission(
      facility_id, private.care_log_permission_for(task_type)
    )
  );

-- Correcting a mis-logged meal is the whole reason for the unique constraint
-- above, so UPDATE is allowed — by somebody who could have logged it, and the
-- WITH CHECK re-asks in case the task_type is being changed too.
drop policy if exists care_log_entries_update on public.care_log_entries;
create policy care_log_entries_update on public.care_log_entries
  for update to authenticated
  using (
    private.has_permission(
      facility_id, private.care_log_permission_for(task_type)
    )
  )
  with check (
    private.has_permission(
      facility_id, private.care_log_permission_for(task_type)
    )
  );

-- NO delete policy. What happened, happened; a wrong entry is corrected, and
-- the correction is the record. Same reasoning as bookings.

comment on policy care_log_entries_read on public.care_log_entries is
  'Facility staff with view_pet_records, and platform admins. Deliberately NOT the pet''s owner: notes are candid. See 20260819140000.';

comment on function private.care_log_permission_for(text) is
  'The permission a care log row needs, from its task_type. Routine rounds take their own log_* key so the staff who do the work can record it; anything else takes edit_pet_records.';
