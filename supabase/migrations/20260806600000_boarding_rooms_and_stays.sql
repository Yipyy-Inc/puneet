-- ============================================================================
-- A kennel holds one booking at a time, and the database is what says so.
--
-- ── THE BUG ───────────────────────────────────────────────────────────────
--
-- Two customers could book the same kennel for the same nights and nothing
-- anywhere would notice. Measured before writing this:
--
--   * All 7 boarding bookings have `details->>'unitAssignment'` = NULL. The
--     room the booking modal assigns is React state in BookingModal.tsx and
--     never reached the database at all.
--   * `BOARDING_ROOMS` is a fixture (src/data/boarding-ops.ts, 6 rooms).
--   * `RoomAssignmentBoard.canDrop` checks `assignedPetIds.length >=
--     room.capacity`, where `assignedPetIds` comes from the CURRENT booking's
--     own assignment map. It cannot see any other booking, so it is a
--     within-this-form check wearing the clothes of a capacity rule.
--   * src/app/api/bookings/route.ts already says this is where "the domain
--     invariants RLS cannot express (capacity, ledger balance, handover) have
--     somewhere to live". The word `capacity` appears in that comment and
--     nowhere else under src/app/api. The intent was written down and never
--     built.
--
-- ── DECISION 1: an EXCLUSION CONSTRAINT, not a check-then-insert ──────────
--
-- The obvious implementation is "query whether the room is free, then insert".
-- That is a race: two requests both read free, both write, and the kennel is
-- double-booked by exactly the amount of time between the read and the write.
-- Same lesson as `SELECT ... FOR UPDATE` returning nothing under a failing
-- policy (20260806480000) and the advisory lock that replaced it -- put the
-- invariant where concurrency cannot get underneath it.
--
-- `EXCLUDE USING gist` makes Postgres refuse the overlapping row itself. It
-- needs btree_gist for the `room_id WITH =` half, since plain gist has no
-- equality operator class for uuid.
--
-- ── DECISION 2: one BOOKING per room, not one PET ─────────────────────────
--
-- Rooms carry `capacity` (Deluxe is 2) and `allows_shared`, which reads at
-- first like "two bookings may share a Deluxe". The fixture answers it: the
-- Deluxe rooms' restriction text is "Shared allowed (same booking only)".
-- Sharing means several pets from ONE booking, so capacity limits pets within
-- a stay and the room itself is exclusive for the dates. That is what makes an
-- overlap constraint the right shape; a per-pet count would need a counting
-- constraint, which this is not.
--
-- ── DECISION 3: `released_at`, because the constraint cannot see status ────
--
-- A cancelled booking must free its room. The obvious predicate --
-- `WHERE booking is not cancelled` -- cannot be written: a constraint's
-- predicate may only reference its own table, and `status` lives on
-- `bookings`. Deleting the stay on cancellation would work and would throw
-- away who had the room and when.
--
-- So the stay carries `released_at`, a trigger on `bookings.status` sets it,
-- and the constraint applies only to unreleased stays. The room is free and
-- the record survives.
--
-- ── DECISION 4: the range is STORED, not derived from the booking ─────────
--
-- The constraint needs the room and the range in the same row, so the range
-- cannot be a join to `bookings`. It is kept in step by the same trigger that
-- handles cancellation: change a booking's dates and its stay moves with them,
-- and if that move would collide the whole update is refused.
--
-- Storing it also leaves room for the truth: a stay occupies the room for the
-- nights between check-in and check-out, which is not identical to the
-- booking's own timestamps. Today it mirrors them exactly.
--
-- ── DECISION 5: the override is IN the schema, not outside it ─────────────
--
-- `override_booking_capacity` ("Override capacity limits") is an existing
-- permission, and `RoomAssignmentBoard.canDrop` opens with
-- `if (allowOverride) return true`. So "a manager may double up a room" is a
-- capability this product already claims.
--
-- An absolute constraint would delete it, and the predictable consequence is
-- that the next person who needs an override drops the constraint to get one.
-- So a stay may carry `override_reason`, and overridden stays are excluded
-- from the check. The rule still holds for everyone who has not said, in
-- writing, that they are breaking it.
--
-- THE ROUTE MUST GATE `override_reason` ON THE PERMISSION. The database cannot:
-- a policy can decide whether you may write the row, not whether this
-- particular column should have been yours to set.
--
-- ── WHAT THIS DOES NOT DO ─────────────────────────────────────────────────
--
-- A boarding booking may be created with NO room. Unlike a groom, which must
-- name its service (20260806560000), a stay is routinely booked first and
-- assigned on the ops board later. An unassigned stay is a real state, so
-- there is no row until a room is chosen.
-- ============================================================================

create extension if not exists btree_gist with schema extensions;

-- ── The rooms ──────────────────────────────────────────────────────────────

create table if not exists public.boarding_rooms (
  id                 uuid primary key default gen_random_uuid(),
  facility_id        uuid not null references public.facilities(id) on delete cascade,
  -- Bridges to the fixture ids the app already keys on ("R-STD-01"), exactly
  -- as grooming_services does with "groom-pkg-001".
  legacy_id          text not null,
  name               text not null,
  room_type          text not null,
  capacity           integer not null default 1 check (capacity > 0),
  allows_shared      boolean not null default false,
  allowed_pet_types  text[] not null default '{}',
  restrictions       text[] not null default '{}',
  is_active          boolean not null default true,
  display_order      integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (facility_id, legacy_id)
);

-- A room that allows sharing is the only kind that can hold more than one pet.
alter table public.boarding_rooms
  add constraint boarding_room_shared_capacity
  check (allows_shared or capacity = 1);

-- ── The stay ───────────────────────────────────────────────────────────────

create table if not exists public.boarding_stays (
  booking_id   uuid primary key references public.bookings(id) on delete cascade,
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  room_id      uuid not null references public.boarding_rooms(id) on delete restrict,
  occupies     tstzrange not null,
  released_at  timestamptz,
  -- Set only by a caller holding `override_booking_capacity`; see Decision 5.
  -- A blank string is not a reason, hence the length check.
  override_reason text check (override_reason is null or length(trim(override_reason)) >= 3),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ON DELETE RESTRICT on the room, deliberately: a room with guests in it is not
-- something to remove by accident. Retire it with is_active instead.

alter table public.boarding_stays
  add constraint boarding_stay_occupies_forward
  check (not isempty(occupies) and lower(occupies) < upper(occupies));

alter table public.boarding_stays
  add constraint boarding_stay_no_double_booking
  exclude using gist (
    room_id  with =,
    occupies with &&
  ) where (released_at is null and override_reason is null);

comment on constraint boarding_stay_no_double_booking on public.boarding_stays is
  'One booking per room per overlapping range. Released (cancelled) stays are '
  'excluded so a cancellation frees the kennel without losing the record; so '
  'are stays carrying an override_reason, which is the recorded form of the '
  'override_booking_capacity permission.';

create index if not exists boarding_stays_room_idx
  on public.boarding_stays (room_id) where released_at is null;
create index if not exists boarding_stays_facility_idx
  on public.boarding_stays (facility_id);

-- ── Keeping the stay in step with its booking ──────────────────────────────

create or replace function private.sync_boarding_stay()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A cancelled or abandoned stay releases the room. Re-opening it takes the
  -- room back, which is exactly when the exclusion constraint should fire: if
  -- somebody else was given the kennel in the meantime, the reopen is refused
  -- rather than silently double-booking it.
  if new.status in ('cancelled', 'no_show') then
    update public.boarding_stays
       set released_at = coalesce(released_at, now()),
           updated_at  = now()
     where booking_id = new.id;
  elsif old.status in ('cancelled', 'no_show') then
    update public.boarding_stays
       set released_at = null,
           updated_at  = now()
     where booking_id = new.id;
  end if;

  -- Dates moved: the stay moves with them. A move that would collide with
  -- another guest raises, and the booking update goes with it.
  if new.start_at is distinct from old.start_at
     or new.end_at is distinct from old.end_at
  then
    update public.boarding_stays
       set occupies   = tstzrange(new.start_at, new.end_at, '[)'),
           updated_at = now()
     where booking_id = new.id;
  end if;

  return new;
end;
$$;

create trigger bookings_sync_boarding_stay
  after update of status, start_at, end_at on public.bookings
  for each row
  execute function private.sync_boarding_stay();

comment on function private.sync_boarding_stay() is
  'Mirrors a booking''s cancellation and dates onto its boarding stay, so the '
  'exclusion constraint always judges the current range and cancelled stays '
  'free their room.';

-- ── Who may see and change them ────────────────────────────────────────────

alter table public.boarding_rooms  enable row level security;
alter table public.boarding_stays  enable row level security;

-- Read mirrors `staff_read`: anyone working at the facility needs the room
-- list, the same way the grooming floor needs the stylist roster
-- (20260806540000, where requiring `view_services` hid the board from the
-- groomer standing at it).
create policy boarding_rooms_read on public.boarding_rooms
  for select using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = boarding_rooms.facility_id
         and m.profile_id = (select auth.uid())
         and m.is_active
    )
  );

create policy boarding_rooms_insert on public.boarding_rooms
  for insert with check (private.has_permission(facility_id, 'manage_services'));

create policy boarding_rooms_update on public.boarding_rooms
  for update using (private.has_permission(facility_id, 'manage_services'))
          with check (private.has_permission(facility_id, 'manage_services'));

create policy boarding_rooms_delete on public.boarding_rooms
  for delete using (private.has_permission(facility_id, 'manage_services'));

-- The stay is scoped by the booking it belongs to, exactly as
-- grooming_appointments is: if you can see the booking you can see where the
-- animal is sleeping, and if you may write the booking you may move it.
create policy boarding_stays_read on public.boarding_stays
  for select using (
    exists (select 1 from public.bookings b where b.id = boarding_stays.booking_id)
  );

create policy boarding_stays_insert on public.boarding_stays
  for insert with check (private.can_write_booking(booking_id));

create policy boarding_stays_update on public.boarding_stays
  for update using (private.can_write_booking(booking_id))
          with check (private.can_write_booking(booking_id));

create policy boarding_stays_delete on public.boarding_stays
  for delete using (private.has_permission(facility_id, 'edit_bookings'));

-- ── The demo facility's rooms ──────────────────────────────────────────────
--
-- Copied from src/data/boarding-ops.ts as it stands, legacy ids preserved
-- exactly -- the assignment board and the booking modal key on them. Prices
-- are not here: a room has no price, the RATE does, and boarding rates are a
-- separate fixture that has not moved yet.
do $$
declare v_fac uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) -- no rooms seeded.';
    return;
  end if;

  insert into public.boarding_rooms
    (facility_id, legacy_id, name, room_type, capacity, allows_shared,
     allowed_pet_types, restrictions, display_order)
  values
    (v_fac, 'R-STD-01', 'Std 01',    'standard',  1, false, '{dog}', '{"No shared stays"}', 1),
    (v_fac, 'R-STD-02', 'Std 02',    'standard',  1, false, '{dog}', '{}', 2),
    (v_fac, 'R-DLX-01', 'Deluxe 01', 'deluxe',    2, true,  '{dog}', '{"Shared allowed (same booking only)"}', 3),
    (v_fac, 'R-DLX-02', 'Deluxe 02', 'deluxe',    2, true,  '{dog}', '{"Shared allowed (same booking only)"}', 4),
    (v_fac, 'R-VIP-01', 'VIP 01',    'vip',       1, false, '{dog}', '{"Quiet zone"}', 5),
    (v_fac, 'R-CAT-01', 'Cat 01',    'cat-suite', 1, false, '{cat}', '{"Cats only"}', 6)
  on conflict (facility_id, legacy_id) do nothing;
end $$;
