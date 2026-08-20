-- ============================================================================
-- Staff scheduling, phase 1: departments, positions and shifts.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- Thirteen screens under /facility/dashboard/services/scheduling that save to
-- localStorage. A roster built on one browser did not exist on another, and a
-- shift assigned to somebody was gone when the cache cleared. `bun run
-- audit:facility --risky` lists them; this migration takes the first three.
--
-- ── EMPLOYEES ARE `staff`. THERE IS NO EMPLOYEE TABLE HERE ────────────────
--
-- `ScheduleEmployee` in src/types/scheduling.ts carries a name, an email, a
-- phone, an avatar, initials, a hire date and a status — every one of which is
-- already a column on `public.staff`, which has 25 rows. A second registry of
-- the same people is how two screens end up disagreeing about who works here.
--
-- `staff_shifts.staff_id` references `staff`. What scheduling adds is which
-- DEPARTMENTS somebody belongs to, and that is a join table.
--
-- ── PAY LIVES IN ITS OWN TABLE, BECAUSE RLS IS ROW-LEVEL ──────────────────
--
-- `Position` carries `hourlyRate` and `salary`. Postgres row-level security
-- cannot hide a COLUMN from one caller and show it to another — every
-- authenticated request arrives as the same database role, so a column grant
-- cannot tell a manager from a groomer.
--
-- So the pay is a separate row, in `facility_position_pay`, gated on
-- `scheduling_view_labor_cost`. A groomer reading `facility_positions` gets the
-- position and no pay, because the pay is not in the table they read.
--
-- The permission is the EXISTING one. `scheduling_view_labor_cost` is held by
-- owner, admin, manager and ACCOUNTANT — and the accountant is the reason not
-- to write this as "facility admins only": the person whose job is payroll is
-- not a facility administrator, and an admin-only rule would have locked out
-- precisely the role that needs it.
--
-- ── THE PERMISSION CATALOGUE ALREADY DESCRIBED THIS MODULE ────────────────
--
-- Nothing here invents a permission. `public.permissions` already carries
-- scheduling_view_all, scheduling_create_shifts, scheduling_edit_shifts,
-- scheduling_publish, scheduling_view_labor_cost and the personal
-- view_own_schedule, with presets across all thirteen job titles. The RBAC for
-- a feature that had no storage was designed years before its tables.
--
-- ── A SHIFT IS AN INSTANT RANGE, NOT A DATE AND TWO CLOCK TIMES ───────────
--
-- `starts_at`/`ends_at timestamptz`, the same shape `bookings` uses, and for
-- the same reasons: an overnight shift is not a special case, a facility that
-- changes timezone does not rewrite its history, and "is this person already
-- working then" is a range comparison rather than arithmetic on strings.
--
-- The API converts to and from the facility-local date and HH:MM the roster
-- draws, exactly as the booking mapper does.
--
-- ── AND THE SAME PERSON CANNOT BE IN TWO PLACES AT ONCE ───────────────────
--
-- An exclusion constraint, the same instrument `boarding_stays` uses to stop
-- two dogs in one kennel. A double-booked employee is the single mistake a
-- roster exists to prevent, and an app-side check cannot hold it under two
-- managers dragging shifts at the same time.
--
-- Cancelled shifts are excluded from the constraint: a cancelled shift is a
-- record that something was planned, not a claim on anybody's time.
-- ============================================================================

create type public.shift_status as enum (
  'draft',
  'published',
  'confirmed',
  'completed',
  'cancelled'
);

create type public.position_pay_type as enum ('hourly', 'salary');

-- ── Departments ───────────────────────────────────────────────────────────

create table if not exists public.facility_departments (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  color       text not null default '#64748b',
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Case-insensitive, because "Grooming" and "grooming" are one department and a
-- roster that shows both is a roster nobody trusts.
create unique index if not exists facility_departments_name_unique
  on public.facility_departments (facility_id, lower(name));

-- ── Positions ─────────────────────────────────────────────────────────────

create table if not exists public.facility_positions (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  -- RESTRICT: deleting a department that still has positions in it would leave
  -- shifts pointing at a role nobody can describe.
  department_id uuid not null references public.facility_departments (id) on delete restrict,
  name          text not null check (length(trim(name)) > 0),
  color         text not null default '#64748b',
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists facility_positions_name_unique
  on public.facility_positions (facility_id, lower(name));

create index if not exists facility_positions_department
  on public.facility_positions (department_id);

-- ── What a position pays ──────────────────────────────────────────────────

create table if not exists public.facility_position_pay (
  position_id uuid primary key references public.facility_positions (id) on delete cascade,
  -- Denormalised so a policy can answer without joining to the position it is
  -- protecting — a policy that has to read another table to decide is a policy
  -- that depends on that table's own policy.
  facility_id uuid not null references public.facilities (id) on delete cascade,
  pay_type    public.position_pay_type not null,
  hourly_rate numeric(10, 2) check (hourly_rate is null or hourly_rate >= 0),
  salary      numeric(12, 2) check (salary is null or salary >= 0),
  updated_at  timestamptz not null default now(),
  constraint facility_position_pay_has_a_figure check (
    (pay_type = 'hourly' and hourly_rate is not null) or
    (pay_type = 'salary' and salary is not null)
  )
);

-- ── Who works in which department ─────────────────────────────────────────

create table if not exists public.staff_departments (
  staff_id      uuid not null references public.staff (id) on delete cascade,
  department_id uuid not null references public.facility_departments (id) on delete cascade,
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (staff_id, department_id)
);

create index if not exists staff_departments_department
  on public.staff_departments (department_id);

-- ── Shifts ────────────────────────────────────────────────────────────────

create table if not exists public.staff_shifts (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  -- NULL is an OPEN shift — a slot the facility needs filled and nobody has
  -- taken. SET NULL rather than CASCADE on the staff reference: somebody
  -- leaving should free their shifts, not silently delete a day's roster.
  staff_id      uuid references public.staff (id) on delete set null,
  department_id uuid not null references public.facility_departments (id) on delete restrict,
  position_id   uuid not null references public.facility_positions (id) on delete restrict,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes >= 0),
  notes         text,
  status        public.shift_status not null default 'draft',
  -- Every shift generated from one recurrence carries the same id, so "delete
  -- this series" is a where clause rather than a guess about which rows matched.
  recurrence_id uuid,
  required_skills text[] not null default '{}',
  urgent        boolean not null default false,
  slots         integer not null default 1 check (slots >= 1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint staff_shifts_ends_after_it_starts check (ends_at > starts_at),
  -- The break cannot exceed the shift. A four-hour shift with a five-hour break
  -- is a data-entry slip that becomes negative paid hours downstream.
  constraint staff_shifts_break_fits check (
    break_minutes * interval '1 minute' < (ends_at - starts_at)
  )
);

create index if not exists staff_shifts_facility_window
  on public.staff_shifts (facility_id, starts_at);

create index if not exists staff_shifts_staff_window
  on public.staff_shifts (staff_id, starts_at);

-- Nobody is in two places at once. The same instrument boarding_stays uses to
-- keep two dogs out of one kennel, for the same reason: two managers dragging
-- shifts at the same moment both pass an app-side check.
alter table public.staff_shifts
  drop constraint if exists staff_shifts_no_double_booking;

alter table public.staff_shifts
  add constraint staff_shifts_no_double_booking
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (staff_id is not null and status <> 'cancelled');

-- ── updated_at ────────────────────────────────────────────────────────────

create trigger facility_departments_set_updated_at
  before update on public.facility_departments
  for each row execute function private.set_updated_at();

create trigger facility_positions_set_updated_at
  before update on public.facility_positions
  for each row execute function private.set_updated_at();

create trigger staff_shifts_set_updated_at
  before update on public.staff_shifts
  for each row execute function private.set_updated_at();

-- ============================================================================
-- Row-level security.
--
-- Reads are for members of the facility; writes are for the permission the
-- catalogue already names. Nothing here is admin-only: `scheduling_edit_shifts`
-- reaches a supervisor and `scheduling_view_labor_cost` reaches an accountant,
-- and both of those are deliberate in the presets.
-- ============================================================================

alter table public.facility_departments enable row level security;
alter table public.facility_positions enable row level security;
alter table public.facility_position_pay enable row level security;
alter table public.staff_departments enable row level security;
alter table public.staff_shifts enable row level security;

revoke all on public.facility_departments from anon;
revoke all on public.facility_positions from anon;
revoke all on public.facility_position_pay from anon, authenticated;
revoke all on public.staff_departments from anon;
revoke all on public.staff_shifts from anon;

grant select on public.facility_position_pay to authenticated;

-- ── Departments ───────────────────────────────────────────────────────────

create policy facility_departments_read on public.facility_departments
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

create policy facility_departments_write on public.facility_departments
  for all using (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'manage_staff')
  )
  with check (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'manage_staff')
  );

-- ── Positions (without the pay) ───────────────────────────────────────────

create policy facility_positions_read on public.facility_positions
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

create policy facility_positions_write on public.facility_positions
  for all using (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'manage_staff')
  )
  with check (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'manage_staff')
  );

-- ── Pay ───────────────────────────────────────────────────────────────────
--
-- READ is the labour-cost permission alone, so the accountant who is not a
-- facility administrator can still do payroll. WRITE additionally requires
-- admin: seeing what a role pays and deciding what it pays are different jobs.

create policy facility_position_pay_read on public.facility_position_pay
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'scheduling_view_labor_cost')
  );

create policy facility_position_pay_write on public.facility_position_pay
  for all using (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'scheduling_view_labor_cost')
  )
  with check (
    private.is_facility_admin(facility_id)
    and private.has_permission(facility_id, 'scheduling_view_labor_cost')
  );

-- ── Department membership ─────────────────────────────────────────────────

create policy staff_departments_read on public.staff_departments
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

create policy staff_departments_write on public.staff_departments
  for all using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));

-- ── Shifts ────────────────────────────────────────────────────────────────
--
-- Three ways to be allowed to see one, and the second is the point of
-- `view_own_schedule` being a PERSONAL permission: a groomer with no rostering
-- rights still has to be able to find out when they are working.
--
-- An OPEN shift (staff_id null) is visible to every member, because an
-- open-shift board that only managers can see is not an open-shift board.

create policy staff_shifts_read on public.staff_shifts
  for select using (
    private.is_platform_admin()
    or (
      facility_id in (select private.member_facility_ids())
      and (
        private.has_permission(facility_id, 'scheduling_view_all')
        or staff_id is null
        or staff_id in (select private.own_staff_ids())
      )
    )
  );

create policy staff_shifts_insert on public.staff_shifts
  for insert
  with check (private.has_permission(facility_id, 'scheduling_create_shifts'));

create policy staff_shifts_update on public.staff_shifts
  for update using (private.has_permission(facility_id, 'scheduling_edit_shifts'))
  with check (private.has_permission(facility_id, 'scheduling_edit_shifts'));

create policy staff_shifts_delete on public.staff_shifts
  for delete using (private.has_permission(facility_id, 'scheduling_edit_shifts'));

-- ── Comments, because the next person reads these before the migration ────

comment on table public.facility_departments is
  'A facility''s own departments. Referenced by positions and shifts; not the RBAC job titles, which are facility_staff_role.';

comment on table public.facility_positions is
  'A rosterable role within a department. Pay is deliberately NOT here — see facility_position_pay.';

comment on table public.facility_position_pay is
  'What a position pays. A separate row because RLS is row-level and cannot hide a column: gated on scheduling_view_labor_cost, which the accountant holds and a facility admin may not.';

comment on table public.staff_shifts is
  'One rostered shift. staff_id NULL is an OPEN shift. Times are instants, like bookings; the API converts to the facility-local date and HH:MM the roster draws.';
