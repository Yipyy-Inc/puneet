-- ============================================================================
-- Staff scheduling, phase 5: the time clock.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `src/lib/employee/clock-store.ts` — a `Map` in module scope. Not localStorage,
-- not a cookie: memory. Somebody clocks in, refreshes the page, and was never
-- there. Two tabs disagree. Closing the laptop ends the shift silently and the
-- record of it never existed.
--
-- Its own comment said "TODO: back with real time-clock / attendance when a
-- backend exists". The backend has existed for months.
--
-- Meanwhile `staff_hr_config.require_clock_in_confirm` is REAL and has been
-- settable all along — a confirmation dialog guarding a write that went
-- nowhere.
--
-- ── AN ENTRY IS A RANGE, AND AN OPEN ONE HAS NO END ───────────────────────
--
-- `clocked_out_at IS NULL` means ON THE CLOCK RIGHT NOW. That is the whole
-- state; there is no boolean beside it to fall out of step.
--
-- ── NOBODY IS CLOCKED IN TWICE ────────────────────────────────────────────
--
-- An exclusion constraint over `[clocked_in_at, coalesce(clocked_out_at,
-- 'infinity'))`. Two open entries are both `[t, ∞)` and overlap, so this
-- forbids the double clock-in AND a backdated correction that would overlap
-- an existing session — one constraint, not a flag and a hope.
--
-- An app-side "are they already clocked in?" check cannot hold this: two
-- devices, or one impatient double-tap, both pass it.
--
-- ── A SHIFT IS OPTIONAL, DELIBERATELY ─────────────────────────────────────
--
-- People cover. A rota goes unpublished. Somebody comes in on their day off to
-- help. Requiring a `shift_id` would mean the choice between refusing to record
-- real work and inventing a shift that nobody planned — and attendance is an
-- employment record before it is a scheduling one.
--
-- ── AND WHO STAMPED IT IS PART OF THE RECORD ──────────────────────────────
--
-- `source` separates "they clocked out" from "a manager closed it for them".
-- Both are legitimate; conflating them makes a corrected timesheet
-- indistinguishable from a worked one, which is the thing a dispute turns on.
-- ============================================================================

create type public.time_clock_source as enum ('self', 'manager');

create table if not exists public.staff_time_clock_entries (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references public.facilities (id) on delete cascade,
  staff_id       uuid not null references public.staff (id) on delete cascade,
  -- NULL is somebody working without a rostered shift — covering, or before the
  -- week was published. SET NULL rather than CASCADE: deleting a shift must not
  -- delete the record that somebody worked it.
  shift_id       uuid references public.staff_shifts (id) on delete set null,
  clocked_in_at  timestamptz not null default now(),
  -- NULL means ON THE CLOCK. The only representation of that state.
  clocked_out_at timestamptz,
  source         public.time_clock_source not null default 'self',
  notes          text,
  -- Derived, so three screens cannot each round it differently. NULL while the
  -- entry is open, which is correct: an unfinished session has no duration yet.
  minutes_worked integer generated always as (
    case
      when clocked_out_at is null then null
      else (extract(epoch from (clocked_out_at - clocked_in_at)) / 60)::integer
    end
  ) stored,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint staff_time_clock_out_after_in check (
    clocked_out_at is null or clocked_out_at > clocked_in_at
  )
);

create index if not exists staff_time_clock_facility_window
  on public.staff_time_clock_entries (facility_id, clocked_in_at desc);

create index if not exists staff_time_clock_staff_window
  on public.staff_time_clock_entries (staff_id, clocked_in_at desc);

-- Finding "who is on the clock" must not scan a year of history.
create index if not exists staff_time_clock_open
  on public.staff_time_clock_entries (facility_id)
  where (clocked_out_at is null);

alter table public.staff_time_clock_entries
  drop constraint if exists staff_time_clock_no_overlap;

alter table public.staff_time_clock_entries
  add constraint staff_time_clock_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(clocked_in_at, coalesce(clocked_out_at, 'infinity'::timestamptz)) with &&
  );

create trigger staff_time_clock_entries_set_updated_at
  before update on public.staff_time_clock_entries
  for each row execute function private.set_updated_at();

-- ============================================================================
-- Row-level security.
--
-- `clock_in_out` is a PERSONAL permission held by all thirteen job titles —
-- clocking in is not a privilege, it is the job. Reading somebody ELSE's
-- attendance is `scheduling_view_all`, the same key that decides whether the
-- roster shows you everybody or only yourself.
-- ============================================================================

alter table public.staff_time_clock_entries enable row level security;

revoke all on public.staff_time_clock_entries from anon;

-- `revoke all` takes INSERT/UPDATE/DELETE with it and RLS cannot grant back a
-- privilege the role does not hold. Phase 1 shipped that bug on
-- facility_position_pay.
grant select, insert, update, delete
  on public.staff_time_clock_entries to authenticated;

create policy staff_time_clock_read on public.staff_time_clock_entries
  for select using (
    private.is_platform_admin()
    or (
      facility_id in (select private.member_facility_ids())
      and (
        private.has_permission(facility_id, 'scheduling_view_all')
        or staff_id in (select private.own_staff_ids())
      )
    )
  );

-- Clocking IN for yourself needs only the personal key. A manager stamping for
-- somebody else is a correction, and needs the key that already means "may
-- change the rota for other people".
--
-- `scheduling_edit_shifts` rather than a new `manage_attendance`: nothing here
-- invents a permission, and the population is exactly right (owner, admin,
-- manager, and supervisor during operating hours). If payroll ever needs to
-- amend a timesheet without touching the rota, THAT is when to add a key.
create policy staff_time_clock_insert on public.staff_time_clock_entries
  for insert with check (
    (
      staff_id in (select private.own_staff_ids())
      and private.has_permission(facility_id, 'clock_in_out')
    )
    or private.has_permission(facility_id, 'scheduling_edit_shifts')
  );

-- You may close YOUR OWN open entry — that is clocking out. You may not reach
-- back and edit a session that is already finished; a timesheet you can rewrite
-- is not a record of anything.
create policy staff_time_clock_update on public.staff_time_clock_entries
  for update using (
    private.has_permission(facility_id, 'scheduling_edit_shifts')
    or (
      staff_id in (select private.own_staff_ids())
      and (
        -- Clocking out: your own session, still open.
        clocked_out_at is null
        -- ── OR UNDOING A STAMP YOU MADE A MOMENT AGO ────────────────────
        --
        -- The clock-out toast offers Undo, and a mistaken tap is the single
        -- most common thing that happens to a time clock. Without this the
        -- affordance is a button that cannot do what it says, and correcting a
        -- mis-tap needs a manager — which at a three-person facility means the
        -- owner, at 6am.
        --
        -- TWO MINUTES, and not a minute more: beyond that this stops being "I
        -- mis-tapped" and becomes editing a timesheet, which is exactly what a
        -- record of hours worked must not permit. `updated_at` still moves, so
        -- an amendment is visible even inside the window.
        or clocked_out_at > now() - interval '2 minutes'
      )
    )
  )
  with check (
    private.has_permission(facility_id, 'scheduling_edit_shifts')
    or staff_id in (select private.own_staff_ids())
  );

-- Deleting an entry is erasing a record that somebody worked. Managers only,
-- and it exists for the mistaken stamp rather than for tidying.
create policy staff_time_clock_delete on public.staff_time_clock_entries
  for delete using (
    private.has_permission(facility_id, 'scheduling_edit_shifts')
  );

comment on table public.staff_time_clock_entries is
  'One clock-in, and the clock-out that ended it. clocked_out_at NULL means ON THE CLOCK — the only representation of that state. shift_id is optional because people cover. An exclusion constraint forbids two overlapping sessions for one person, which is also what stops a double clock-in.';

comment on column public.staff_time_clock_entries.source is
  'Who stamped it. Separating "they clocked out" from "a manager closed it for them" is what a pay dispute turns on.';
