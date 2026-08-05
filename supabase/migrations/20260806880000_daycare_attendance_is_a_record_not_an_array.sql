-- ============================================================================
-- Who is on the daycare floor, and when they arrived.
--
-- `src/data/daycare.ts` has no table behind it. The check-in board reads
-- `daycareCheckIns` into `useState` and every arrival and departure is lost on
-- reload. The fixture's check-in times are **2024-03-09 and 2024-03-10** — so
-- the board currently shows dogs who arrived on the tenth of March 2024 and
-- have never been collected. Five hundred and thirteen days on the floor.
--
-- It is not one screen's data either. `daycareCheckIns` is read by
-- `use-unified-bookings`, `operations-calendar`, `report-data-sources` and
-- `scheduling-workload` — the calendar, the facility reports and the staff
-- workload planner all take daycare attendance from that array.
--
-- ── DECISION 1: ATTENDANCE IS THE DAYCARE HALF OF A BOOKING ────────────────
--
-- `booking_id` is both primary key and foreign key, exactly as
-- `grooming_appointments` is (Decision 1 in 20260805140000) and for the same
-- reason: a visit is not a second kind of appointment, it is what a daycare
-- booking looks like on the day.
--
-- The fixture modelled it as free-standing — `petId` and `ownerId`, no booking.
-- That cannot survive contact with the rest of the system: payments, the
-- balance, the client's outstanding total and anything added at the counter all
-- hang off a booking. A visit with no booking is a dog nobody can charge for.
--
-- A walk-in is not an exception to this. It is a booking created at the door,
-- which `create_booking` already does.
--
-- ── DECISION 2: THE STATUS IS THE TIMESTAMPS ───────────────────────────────
--
-- `DaycareCheckIn.status` is stored beside `checkInTime` and `checkOutTime`,
-- which is one fact in two places and the same defect as `payment_status`
-- before 20260806680000. Here it is a GENERATED column — it depends on nothing
-- but this row, so it needs no trigger and cannot be written at all:
--
--   checked_out_at set  →  'checked-out'
--   checked_in_at set   →  'checked-in'
--   neither             →  'scheduled'
--
-- And a dog cannot leave before arriving: the CHECK refuses a checkout with no
-- check-in, and one that precedes it.
--
-- ── DECISION 3: PET AND OWNER ARE NOT COPIED HERE ──────────────────────────
--
-- The fixture carries petName, petBreed, petSize, ownerName, ownerPhone and a
-- photo on every check-in row. Those are the pet's and the client's, they are
-- already in `pets` and `clients`, and a copy taken at check-in is a phone
-- number that stops being reachable the day it changes. They come back through
-- the join.
--
-- `rate_type` and `play_group` DO live here: which rate was applied and which
-- group the dog ran with are facts about the visit, true on the day and not
-- derivable from anything else afterwards.
--
-- ── DECISION 4: READ BY ANY MEMBER, WRITE ON daycare_check_in_out ──────────
--
-- Reading is gated on membership rather than `daycare_view_dashboard`, because
-- `reception` holds the check-in permission and NOT the dashboard one — gating
-- the list on the dashboard would hide the board from the people standing at
-- it. That is the mistake 20260806540000 corrected for stylists and
-- 20260806660000 for kennels.
--
-- Writing is `daycare_check_in_out`: owner, admin, supervisor, reception,
-- caretaker and daycare_attendant. Note `manager` does NOT have it while
-- holding `daycare_manage_groups` — managers arrange the groups, the floor
-- checks the dogs in. That is the preset's decision, honoured rather than
-- widened here.
-- ============================================================================

create table if not exists public.daycare_attendance (
  -- PK and FK both: one visit per booking, and it cannot outlive it.
  booking_id  uuid primary key references public.bookings (id) on delete cascade,
  facility_id uuid not null references public.facilities (id),

  checked_in_at  timestamptz,
  checked_out_at timestamptz,

  -- Decision 2. Not writable by anyone, including service_role.
  status text generated always as (
    case
      when checked_out_at is not null then 'checked-out'
      when checked_in_at  is not null then 'checked-in'
      else 'scheduled'
    end
  ) stored,

  -- Facts about the visit, true on the day and not recoverable later.
  rate_type  text,
  play_group text,
  notes      text not null default '',

  author_name text not null default 'Staff',
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- A dog cannot leave without arriving, and cannot leave before it arrived.
  constraint daycare_attendance_leaves_after_arriving check (
    checked_out_at is null
    or (checked_in_at is not null and checked_out_at >= checked_in_at)
  )
);

create index if not exists daycare_attendance_facility_idx
  on public.daycare_attendance (facility_id, checked_in_at);

comment on table public.daycare_attendance is
  'The daycare half of a booking: when the dog actually arrived and left. booking_id is PK and FK — see Decision 1 in 20260806880000. status is generated from the timestamps and cannot be written.';
comment on column public.daycare_attendance.status is
  'DERIVED from checked_in_at / checked_out_at. A stored status beside its own timestamps is the defect 20260806680000 removed from bookings.';

alter table public.daycare_attendance enable row level security;

create policy daycare_attendance_read on public.daycare_attendance
  for select using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = daycare_attendance.facility_id
         and m.profile_id = (select auth.uid())
         and m.is_active
    )
    or exists (
      select 1 from public.bookings b
       where b.id = daycare_attendance.booking_id
         and b.client_id in (select private.own_client_ids())
    )
  );

create policy daycare_attendance_insert on public.daycare_attendance
  for insert with check (
    private.has_permission(facility_id, 'daycare_check_in_out')
  );
create policy daycare_attendance_update on public.daycare_attendance
  for update using (private.has_permission(facility_id, 'daycare_check_in_out'))
          with check (private.has_permission(facility_id, 'daycare_check_in_out'));
create policy daycare_attendance_delete on public.daycare_attendance
  for delete using (private.has_permission(facility_id, 'daycare_check_in_out'));

drop trigger if exists daycare_attendance_set_updated_at on public.daycare_attendance;
create trigger daycare_attendance_set_updated_at
  before update on public.daycare_attendance
  for each row execute function private.set_updated_at();

drop trigger if exists daycare_attendance_stamp_author on public.daycare_attendance;
create trigger daycare_attendance_stamp_author
  before insert on public.daycare_attendance
  for each row execute function private.stamp_author();

-- ── How many dogs the floor holds ───────────────────────────────────────────
--
-- `daycareCapacity` was `{ total: 50, smallDogs: 15, mediumDogs: 20,
-- largeDogs: 15 }` in the fixture — a constant in a file, and the same shape
-- as `boardingCapacity` before the kennels became rows.
--
-- Unlike boarding, this one is NOT derivable. Kennel capacity is "count the
-- kennels"; floor capacity is a decision about how many dogs the facility will
-- have on the premises at once. So it is configuration, and it belongs beside
-- the facility's other configuration rather than in a fixture — one row per
-- facility, like `grooming_config`.
--
-- The bands are CEILINGS, not a partition: "no more than 15 large dogs" is a
-- separate rule from "no more than 50 dogs". They happen to sum to the total in
-- the seed, and nothing requires that — enforcing a sum would forbid a facility
-- from saying it will take up to 30 large dogs on a quiet day.

create table if not exists public.daycare_config (
  facility_id uuid primary key references public.facilities (id) on delete cascade,
  capacity_total integer not null default 0 check (capacity_total >= 0),
  capacity_by_size jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.daycare_config is
  'One row per facility. capacity_by_size holds per-size CEILINGS, not a partition of capacity_total — see 20260806880000.';

alter table public.daycare_config enable row level security;

create policy daycare_config_read on public.daycare_config
  for select using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = daycare_config.facility_id
         and m.profile_id = (select auth.uid())
         and m.is_active
    )
  );

create policy daycare_config_write on public.daycare_config
  for all using (private.has_permission(facility_id, 'manage_services'))
          with check (private.has_permission(facility_id, 'manage_services'));

drop trigger if exists daycare_config_set_updated_at on public.daycare_config;
create trigger daycare_config_set_updated_at
  before update on public.daycare_config
  for each row execute function private.set_updated_at();

-- ── The demo facility's floor ───────────────────────────────────────────────
--
-- Copied from src/data/daycare.ts exactly. NO ATTENDANCE IS SEEDED: the
-- fixture's arrivals are dated March 2024 and there is no daycare booking in
-- this database with a `checked_in` status, so inventing rows would be
-- fabricating a record of dogs that were never here — the same objection that
-- kept fake payments out of 20260806700000.

do $$
declare v_fac uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) -- no daycare config seeded.';
    return;
  end if;

  insert into public.daycare_config (facility_id, capacity_total, capacity_by_size)
  values (v_fac, 50, '{"small": 15, "medium": 20, "large": 15}'::jsonb)
  on conflict (facility_id) do nothing;
end;
$$;
