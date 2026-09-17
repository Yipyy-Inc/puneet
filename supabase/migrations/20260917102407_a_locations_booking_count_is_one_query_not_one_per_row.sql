-- ============================================================================
-- How many bookings each location holds, in one query.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- `LOCATION_SELECT` ends `…, bookings(count)`. Measured 2026-09-17, A/B'd
-- inside the route itself over three passes:
--
--   plain locations select through PostgREST      155 ms
--   the same select with bookings(count)      1,589-2,255 ms
--
-- `GET /api/locations` is in the `/facility/dashboard` shell, so EVERY screen
-- in the portal waits for it. A sixteen-screen walkthrough put the whole portal
-- at 9-16 s a page, with retail never finishing at all.
--
-- The database is not the problem and it is worth saying so, because that was
-- the first four guesses: 6 locations, 61 clients, an index on every column the
-- RLS helpers touch, 80 ms to Supabase, 100 ms to WorkOS, and the same question
-- answered in 22 ms on a direct connection. What is slow is PostgREST's
-- generated count embed against `bookings`, whose RLS predicate is the
-- `permitted_facility_ids('view_bookings')` chain, evaluated per location.
--
-- This function answers it in 9 ms.
--
-- ── WHY NOT JUST DROP THE COUNT ───────────────────────────────────────────
--
-- Its one consumer is `LocationDetailView`, where it shows "N bookings" and
-- DISABLES THE DELETE BUTTON while a location has any. That is a safety guard,
-- not decoration — removing it would let somebody delete a location with 1,376
-- bookings against it.
--
-- ── AND WHY NOT A GROUPED SELECT ──────────────────────────────────────────
--
-- PostgREST aggregates are disabled on this project: `select("location_id,
-- count()")` is refused with "Use of aggregate functions is not allowed". So
-- the count comes from a function, in the shape `booking_facility_totals` and
-- `gift_card_totals` already use.
--
-- ── SECURITY INVOKER ──────────────────────────────────────────────────────
--
-- No DEFINER. `bookings_read` already decides which bookings a caller may see,
-- so running as the caller means this counts exactly the rows they could have
-- counted by hand — and a caller who may see none gets zeroes rather than a
-- number they were not entitled to.
--
-- jsonb rather than a set of rows, for the reason gift_card_totals is jsonb:
-- Postgres refuses to change an OUT-parameter row type, so a shape that may
-- grow should not have one. A location with no bookings is absent from the
-- object; the caller reads it as 0.
-- ============================================================================

create or replace function public.location_booking_counts(p_facility_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $fn$
  select coalesce(
    jsonb_object_agg(x.location_id, x.n),
    '{}'::jsonb)
  from (
    select b.location_id::text as location_id, count(*) as n
    from public.bookings b
    where b.facility_id = p_facility_id
      and b.location_id is not null
    group by b.location_id
  ) x;
$fn$;

comment on function public.location_booking_counts(uuid)
  is 'location_id -> booking count for one facility, as one grouped query rather than a PostgREST count embed evaluated per location. Security invoker: bookings RLS decides what is counted.';

-- A signed-in member, and nobody else. `public` and `anon` are DIFFERENT grants
-- and both have to go — see 20260822610000, which exists only because one
-- attempt named a single one of them.
revoke all on function public.location_booking_counts(uuid) from public;
revoke all on function public.location_booking_counts(uuid) from anon;
grant execute on function public.location_booking_counts(uuid) to authenticated;

-- A revoke naming a privilege the role does not hold SUCCEEDS silently and
-- looks identical to one that worked, so it is read back rather than trusted.
do $check$
begin
  if has_function_privilege('anon', 'public.location_booking_counts(uuid)', 'execute') then
    raise exception 'anon can still execute location_booking_counts';
  end if;
  if not has_function_privilege('authenticated', 'public.location_booking_counts(uuid)', 'execute') then
    raise exception 'authenticated cannot execute location_booking_counts';
  end if;
end
$check$;
