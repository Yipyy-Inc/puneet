-- ============================================================================
-- A booking's stay gets a key of its own, so a booking can one day hold several.
--
-- `boarding_stays` has been keyed by `booking_id` since 20260806600000: one
-- kennel per booking, for the whole booking. Split lodging — nights 1–3 in
-- Suite 4, nights 4–6 in Condo 12 — needs a booking to hold its stays IN
-- SEQUENCE, so each stay needs a key of its own and a place in that sequence.
--
-- ── THIS CHANGES NOTHING A BOOKING CAN DO ─────────────────────────────────
--
-- `booking_id` stays UNIQUE, so there is still exactly one stay per booking,
-- PostgREST still embeds it as one object, and every writer
-- (`create_booking`, `assign_boarding_room`, `sync_boarding_stay`,
-- `record_boarding_arrival`, `save_checkout_cut_off`) still finds its row by
-- `booking_id` and inserts without naming the new columns, which default. The
-- uniqueness is dropped in the change that adds a way to split a stay — after
-- the two readers that take a list as well as an object (`embeddedStay`),
-- which shipped first so that no deployed reader meets a shape it cannot read.
--
-- The old key did two jobs and both are kept: one stay per booking, and the
-- index that RLS and the cascade from `bookings` find a booking's stay by.
-- Nothing references `boarding_stays` by its key (measured 2026-09-25: no
-- foreign key points at it), so moving the key breaks no other table.
-- ============================================================================

alter table public.boarding_stays
  add column id uuid not null default gen_random_uuid(),
  add column segment_order integer not null default 1
    constraint boarding_stay_segment_order_positive check (segment_order >= 1);

alter table public.boarding_stays drop constraint boarding_stays_pkey;
alter table public.boarding_stays
  add constraint boarding_stays_pkey primary key (id);

alter table public.boarding_stays
  add constraint boarding_stays_one_per_booking unique (booking_id);

comment on column public.boarding_stays.id is
  'The stay''s own key. A booking holds one stay today and, once a stay can be split, several in sequence.';
comment on column public.boarding_stays.segment_order is
  'This stay''s place in its booking''s sequence, from 1. Always 1 while boarding_stays_one_per_booking holds.';
comment on constraint boarding_stays_one_per_booking on public.boarding_stays is
  'One stay per booking until a stay can be split. Also the index RLS and the cascade from bookings use.';
