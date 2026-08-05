-- ============================================================================
-- A training session is attended.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- Nothing. `/services/training/check-in` renders `ServiceCheckInBoard`, which
-- reads `useUnifiedBookings`, which built its training rows from
-- `trainingSessions` and `enrollments` — two module arrays. Checking a dog in
-- to a class flipped a status in `useState` and was gone when the tab closed.
-- `booking_presence` (20260806960000) reports training as `unknown` for the
-- same reason: there was no table to ask.
--
-- ── THE GATE IS `check_in_out`, CHOSEN BEFORE WRITING IT ──────────────────
--
-- `run_training_sessions` is the obvious guess and it is wrong: owner, admin
-- and trainer hold it, and RECEPTION DOES NOT. The person who meets a dog at
-- the door for a six-o'clock class is whoever is on the desk. `check_in_out`
-- is held by reception, the trainer, and everyone else customer-facing.
--
-- This is the fourth time in this run of work that the permission naming the
-- SCREEN and the permission held by the people STANDING at it turned out to be
-- different (20260806920000 has the other three). Checked against
-- `role_preset_permissions` first this time rather than after the fact.
--
-- `run_training_sessions` is still the right gate for what a trainer does
-- INSIDE the session — progress, skills, certificates. That is a different
-- table and a different change.
--
-- ── ONE ROW PER BOOKING, NOT PER SESSION ──────────────────────────────────
--
-- A class has many dogs in it, and the temptation is a `training_sessions`
-- table with an attendee list. But a booking is already per-pet — the two
-- training bookings in this database are one dog each — and attendance is a
-- fact about a dog turning up, not about a class happening. Keyed on
-- `booking_id`, exactly as daycare and boarding are, so the three read the
-- same way and `booking_presence` can join all of them identically.
--
-- The class itself — its name, its trainer, its curriculum — has no table yet.
-- That is the next change, not a rider on this one.
-- ============================================================================

create table if not exists public.training_attendance (
  booking_id     uuid primary key references public.bookings(id) on delete cascade,
  facility_id    uuid not null references public.facilities(id) on delete cascade,
  checked_in_at  timestamptz,
  checked_out_at timestamptz,
  -- Generated, so it cannot be written and cannot disagree with the times.
  status text generated always as (
    case
      when checked_out_at is not null then 'checked-out'
      when checked_in_at  is not null then 'checked-in'
      else 'scheduled'
    end
  ) stored,
  session_notes  text not null default '',
  author_name    text,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.training_attendance
  drop constraint if exists training_leaves_after_arriving;
alter table public.training_attendance
  add constraint training_leaves_after_arriving
  check (
    checked_out_at is null
    or (checked_in_at is not null and checked_out_at >= checked_in_at)
  );

create index if not exists training_attendance_facility_idx
  on public.training_attendance (facility_id, checked_in_at desc);

comment on table public.training_attendance is
  'Who turned up to a training session. One row per BOOKING, like daycare and '
  'boarding — a booking is already per-pet, and attendance is a fact about a '
  'dog arriving rather than about a class happening.';

create or replace function private.touch_training_attendance()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists training_attendance_set_updated_at on public.training_attendance;
create trigger training_attendance_set_updated_at
  before update on public.training_attendance
  for each row execute function private.touch_training_attendance();

-- ── Who may see and change it ──────────────────────────────────────────────

alter table public.training_attendance enable row level security;

drop policy if exists training_attendance_read on public.training_attendance;
create policy training_attendance_read
  on public.training_attendance for select
  using (exists (select 1 from public.bookings b where b.id = booking_id));

drop policy if exists training_attendance_insert on public.training_attendance;
create policy training_attendance_insert
  on public.training_attendance for insert
  with check (private.has_permission(facility_id, 'check_in_out'));

drop policy if exists training_attendance_update on public.training_attendance;
create policy training_attendance_update
  on public.training_attendance for update
  using (private.has_permission(facility_id, 'check_in_out'))
  with check (private.has_permission(facility_id, 'check_in_out'));

drop policy if exists training_attendance_delete on public.training_attendance;
create policy training_attendance_delete
  on public.training_attendance for delete
  using (private.has_permission(facility_id, 'check_in_out'));

revoke all on public.training_attendance from public;
grant select, insert, update, delete on public.training_attendance to authenticated;

-- ── And the presence view learns about it ──────────────────────────────────
--
-- `training` moves out of `unknown` and into the tracked list. Six bookings
-- read `unknown` before this; the ones left are the custom-service modules,
-- which genuinely have no table.

drop view if exists public.booking_presence;

create view public.booking_presence
with (security_invoker = true) as
  select
    b.id as booking_id,
    b.service as source,
    coalesce(g.check_in_at, d.checked_in_at, s.checked_in_at, t.checked_in_at)
      as arrived_at,
    coalesce(g.check_out_at, d.checked_out_at, s.checked_out_at, t.checked_out_at)
      as departed_at,
    case
      when b.service not in ('grooming', 'daycare', 'boarding', 'training')
        then 'unknown'
      when coalesce(g.check_out_at, d.checked_out_at, s.checked_out_at,
                    t.checked_out_at) is not null then 'departed'
      when coalesce(g.check_in_at, d.checked_in_at, s.checked_in_at,
                    t.checked_in_at) is not null then 'on-site'
      else 'expected'
    end as presence
  from public.bookings b
  left join public.grooming_appointments g on g.booking_id = b.id
  left join public.daycare_attendance    d on d.booking_id = b.id
  left join public.boarding_stays        s on s.booking_id = b.id
  left join public.training_attendance   t on t.booking_id = b.id;

comment on view public.booking_presence is
  'Is this pet here, and since when — derived from whichever table owns the '
  'answer for the service. security_invoker, so a row is visible only to '
  'somebody who could already read the booking. presence = unknown means the '
  'service has no attendance table (custom modules); expected means it has one '
  'and nobody has arrived yet.';

revoke all on public.booking_presence from public;
grant select on public.booking_presence to authenticated;
