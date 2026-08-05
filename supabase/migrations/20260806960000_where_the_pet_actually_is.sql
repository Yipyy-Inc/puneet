-- ============================================================================
-- Where the pet actually is.
--
-- ── I HAD THIS FRAMED WRONG ───────────────────────────────────────────────
--
-- I have been calling it "two vocabularies for one idea": grooming records
-- arrival by moving `bookings.status` ('checked_in', 'in_progress', 'ready')
-- while daycare and boarding record it as timestamps on their own rows. The
-- implied fix was to make daycare and boarding move the status too.
--
-- That would have been wrong twice.
--
-- FIRST, it does not work. `enforce_booking_integrity` lets a caller through
-- only if they hold `edit_bookings`; everyone else gets "You may only cancel
-- this booking." The roles that check pets in — `boarding_attendant`,
-- `daycare_attendant` — hold neither `edit_bookings` nor `create_bookings`
-- (20260806920000 had to route around exactly this). So an attendance write
-- that also moved the booking's status would have been refused for the only
-- people who perform it, and the way out would have been a bypass flag on the
-- integrity trigger — a hole punched through the one guard that stops a
-- customer editing a booking's price.
--
-- SECOND, and worse, it is the wrong model. `bookings.status` is a LIFECYCLE:
-- requested, confirmed, completed, cancelled. Whether a dog is standing in the
-- building is a different axis, with different owners and different times.
-- Grooming's 'checked_in'/'in_progress'/'ready' are a workflow parked in the
-- lifecycle column; copying that mistake into two more services is not
-- reconciliation, it is spreading it.
--
-- ── SO: DERIVE THE ANSWER, DO NOT STORE IT AGAIN ──────────────────────────
--
-- One view, three sources, one question — "is this pet here, and since when".
-- Nothing is copied, nothing can drift, and each service keeps the table that
-- owns its own detail (a play group, a kennel, a ready-ETA).
--
-- ── WHAT THIS DOES NOT DO ─────────────────────────────────────────────────
--
-- It does not stop grooming writing 'checked_in' into `bookings.status`. That
-- column drives the grooming board, the lifecycle triggers from 20260805140000
-- and a tested status map; unpicking it is its own change with its own risk,
-- and this view makes it unnecessary to do so urgently. Recorded rather than
-- done.
--
-- Training and custom services have no attendance table at all, and come back
-- `presence = 'unknown'` — which is the truth, and distinct from `expected`.
-- ============================================================================

-- ── ONE ROW PER BOOKING, DRIVEN BY THE SERVICE ────────────────────────────
--
-- The first cut was a UNION over the three attendance tables. It made
-- `unknown` mean two different things, which is the ambiguity this view exists
-- to remove: a daycare booking has NO `daycare_attendance` row until somebody
-- checks in (20260806880000 decided that deliberately, so that "booked and not
-- here yet" is a real state), so it came back `unknown` — indistinguishable
-- from training, which has no table at all.
--
-- Driving off `bookings` and left-joining fixes it. The SERVICE decides whether
-- attendance is tracked; the join decides what has happened. `unknown` now
-- means exactly one thing: nothing here records arrivals for this service.

create or replace view public.booking_presence
with (security_invoker = true) as
  select
    b.id as booking_id,
    b.service as source,
    coalesce(g.check_in_at, d.checked_in_at, s.checked_in_at)    as arrived_at,
    coalesce(g.check_out_at, d.checked_out_at, s.checked_out_at) as departed_at,
    case
      when b.service not in ('grooming', 'daycare', 'boarding') then 'unknown'
      when coalesce(g.check_out_at, d.checked_out_at, s.checked_out_at)
             is not null then 'departed'
      when coalesce(g.check_in_at, d.checked_in_at, s.checked_in_at)
             is not null then 'on-site'
      else 'expected'
    end as presence
  from public.bookings b
  left join public.grooming_appointments g on g.booking_id = b.id
  left join public.daycare_attendance    d on d.booking_id = b.id
  left join public.boarding_stays        s on s.booking_id = b.id;

comment on view public.booking_presence is
  'Is this pet here, and since when — derived from whichever table owns the '
  'answer for the service. security_invoker, so a row is visible only to '
  'somebody who could already read the booking. presence = unknown means the '
  'service has no attendance table (training, custom); expected means it has '
  'one and nobody has arrived yet.';

revoke all on public.booking_presence from public;
grant select on public.booking_presence to authenticated;
