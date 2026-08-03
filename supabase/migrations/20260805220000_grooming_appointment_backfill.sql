-- ============================================================================
-- Gives the existing grooming bookings their extension rows.
--
-- Nine bookings have `service = 'grooming'` and are not cancelled. Without a
-- `grooming_appointments` row they render with no service name, no size and no
-- check-in clock — the board would list them as blanks. This backfills what the
-- booking already knows and INVENTS NOTHING.
--
-- ── THE MAPPING, AND WHERE IT STOPS ────────────────────────────────────────
--
--   service_type = 'full_groom'  → the facility's 'Full Groom' (groom-pkg-002)
--   service_type = 'bath_brush'  → 'Basic Bath' (groom-pkg-001)
--   service_type is null         → service_name 'Grooming', service_id NULL
--
-- That last case is two of the nine, and it is deliberately not guessed at.
-- Their base prices ($90 and $0) match no service on the menu, so picking one
-- would be fabricating a sale that never happened. `service_id` stays null —
-- which the schema already allows, because a retired service leaves the same
-- shape (20260805140000, Decision 2) — and the name says only what is true:
-- it was a groom.
--
-- PRICE AND DURATION COME FROM THE BOOKING, not from the menu. `base_price` is
-- what was actually charged, and the duration is `end_at - start_at` as booked.
-- Reading either off today's catalogue would rewrite history the first time the
-- facility repriced, which is the whole reason the extension snapshots them.
--
-- Cancelled bookings are skipped: 59 of the 68 are cancelled probe rows from
-- earlier write-path testing, and giving them appointment records would put
-- them on a board they have no business appearing on.
--
-- Idempotent — `on conflict (booking_id) do nothing`.
-- ============================================================================

insert into public.grooming_appointments
  (booking_id, facility_id, service_id, service_name, size_label,
   service_price, service_duration_min)
select
  b.id,
  b.facility_id,
  s.id,
  coalesce(s.name, 'Grooming'),
  -- The size the pet WOULD be under the facility's current tiers. Recorded now
  -- because from here on it is a snapshot, and a booking with no recorded pet
  -- weight simply has none.
  (select t.tier
     from public.grooming_config c
     cross join lateral (
       select elem->>'id' as tier, (elem->>'maxWeightLbs')::numeric as max_lbs
         from jsonb_array_elements(c.pet_size_tiers) elem
        order by coalesce((elem->>'maxWeightLbs')::numeric, 1e9)
     ) t
    where c.facility_id = b.facility_id
      and (t.max_lbs is null or p.weight <= t.max_lbs)
      and p.weight is not null
    limit 1),
  b.base_price,
  greatest(1, round(extract(epoch from (b.end_at - b.start_at)) / 60))::integer
from public.bookings b
left join public.grooming_services s
  on s.facility_id = b.facility_id
 and s.legacy_id = case b.service_type
                     when 'full_groom' then 'groom-pkg-002'
                     when 'bath_brush' then 'groom-pkg-001'
                   end
left join lateral (
  select pt.weight
    from public.booking_pets bp
    join public.pets pt on pt.id = bp.pet_id
   where bp.booking_id = b.id
   limit 1
) p on true
where b.service = 'grooming'
  and b.status <> 'cancelled'
on conflict (booking_id) do nothing;
