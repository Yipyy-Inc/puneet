-- ============================================================================
-- A boarding arrival is the stay beginning.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- Nothing. `/facility/dashboard/services/boarding/check-in` rendered
-- <DaycareCheckInOutSection />: the boarding check-in screen was the daycare
-- floor. Since that board started posting to /api/daycare/attendance
-- (20260806880000), which refuses a non-daycare booking with 422, the boarding
-- check-in screen could not check anybody in at all. Before that it "worked" by
-- moving a daycare fixture object in local state.
--
-- ── WHY THE STAY AND NOT A NEW TABLE ──────────────────────────────────────
--
-- Daycare got `daycare_attendance` because a daycare visit carries things that
-- belong to the visit and to nothing else: a play group, a rate type, a
-- same-day capacity ceiling by size band. A boarding arrival carries none of
-- that. The row that already means "this booking is in kennel 7 for these
-- nights" is `boarding_stays`, and when the guest actually turned up is a fact
-- about exactly that.
--
-- The consequence is a rule, and it is deliberate: A GUEST CANNOT BE CHECKED IN
-- WITHOUT A KENNEL. There is no stay row until a room is chosen (20260806600000
-- decided that an unassigned booking is a real state), so there is nothing to
-- stamp. This is how boarding actually works — you cannot take a dog in and put
-- it nowhere — and the ops board built to assign kennels is one tab away. The
-- route says so in those words rather than returning a permissions error.
--
-- ── THE STATUS ORDERING PUTS THE DOG FIRST ────────────────────────────────
--
-- `released_at` means the booking was cancelled and the kennel is free again.
-- It is NOT the top of the CASE. A guest who is physically checked in and whose
-- booking is then cancelled reads `checked-in`, not `released` — because the
-- dog is in the building, and a board that drops it off the list is how an
-- animal gets left behind at closing. The paperwork loses to the headcount.
--
-- ── CHECKING OUT DOES NOT FREE THE KENNEL ─────────────────────────────────
--
-- `occupies` still runs to the booked end date after an early departure, so the
-- exclusion constraint keeps the room blocked for nights that are now empty.
-- That is on purpose here: shortening the range is an early-checkout decision
-- with money attached (the fixture's `earlyCheckoutAdjustment` — refund, credit
-- or fee), and quietly reselling the kennel as a side effect of pressing
-- "check out" would settle that question by accident. It stays a separate act.
--
-- ── WHAT THIS DOES NOT DO ─────────────────────────────────────────────────
--
-- It does not touch `bookings.status`. Grooming records arrival by moving that
-- column ('checked_in', 'in_progress', 'ready'); daycare and now boarding
-- record it as a timestamp on their own row. Two vocabularies for one idea,
-- and this migration adds the second one rather than reconciling them. Naming
-- it because the reconciliation is a real change with a real blast radius --
-- `enforce_booking_integrity` guards that column -- and doing it half way here
-- would be worse than leaving it visible.
-- ============================================================================

alter table public.boarding_stays
  add column if not exists checked_in_at  timestamptz,
  add column if not exists checked_out_at timestamptz;

-- A guest that left before it arrived is not a state this table can hold, and
-- neither is one collected from a kennel it never reached.
alter table public.boarding_stays
  drop constraint if exists boarding_stay_leaves_after_arriving;
alter table public.boarding_stays
  add constraint boarding_stay_leaves_after_arriving
  check (
    checked_out_at is null
    or (checked_in_at is not null and checked_out_at >= checked_in_at)
  );

alter table public.boarding_stays
  drop column if exists status;
alter table public.boarding_stays
  add column status text generated always as (
    case
      when checked_out_at is not null then 'checked-out'
      when checked_in_at  is not null then 'checked-in'
      when released_at    is not null then 'released'
      else 'scheduled'
    end
  ) stored;

comment on column public.boarding_stays.status is
  'Derived, never written. A stay that has been checked in reads checked-in '
  'even once released_at is set: a cancelled booking whose dog is on site is '
  'still a dog on site, and it must stay on the board.';

comment on column public.boarding_stays.checked_in_at is
  'When the guest actually arrived, as against occupies, which is when the '
  'kennel was booked from. A late arrival does not move the reservation.';

create index if not exists boarding_stays_on_site_idx
  on public.boarding_stays (facility_id)
  where checked_in_at is not null and checked_out_at is null;
