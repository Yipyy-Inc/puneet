-- ============================================================================
-- THE SCHEMA NAMES NO OTHER PRODUCT.
--
-- The repository is public, and eleven type, table, column and function
-- descriptions written from 20260924120000 to 20260924210000 named the product
-- whose guides those features were modelled on. They say "the reference" now,
-- and nothing else about them changes; the migration files that first wrote
-- them carry the same text. Descriptions only: no row, policy, grant or
-- function body is touched.
-- ============================================================================

comment on type public.lodging_space_type is
  'How a lodging type counts capacity. room = one family per unit, counted in '
  'units (the reference''s Room/Kennel). area = counted in pets, overlap '
  'expected.';

comment on function private.area_pets_in_use(uuid, tstzrange, uuid) is
  'Pets already in an area unit over a range — area occupancy as the reference '
  'counts it. Counts pets, not stays; ignores released stays; and because '
  'occupies is half-open, a pet checking out on a date is not counted on that '
  'date.';

comment on function public.lodging_occupancy(uuid, date) is
  'X of Y for one lodging unit on one date, in the reference''s format: a room '
  'is 0 or 1 of 1, an area is pets of max_pets_per_area. A pet checking out '
  'that date is not counted, because occupies is half-open.';

comment on table public.boarding_service_categories is
  'The reference''s "Edit Category" on the boarding service menu — a heading '
  'services are grouped under, not a kennel class.';

comment on table public.boarding_service_default_addons is
  'The reference''s BETA default add-ons: attached once a length-of-stay '
  'condition is met, and billed SEPARATELY from the base price.';

comment on column public.boarding_services.unit is
  'The reference''s "Unit" — per night (the gap between dates) or per day (the '
  'dates themselves). Monday to Wednesday is 2 nights or 3 days.';

comment on table public.daycare_service_categories is
  'How a facility groups its daycare services on the menu. The reference calls '
  'this Category; it is presentation, never eligibility or price.';

comment on column public.daycare_services.max_duration_hours is
  'The reference''s "Max stay duration". Null is NO ceiling, which is different '
  'from 0 — a service with no ceiling covers any stay.';

comment on column public.room_categories.default_capacity is
  'The reference''s "Max # of Pets (same family) per room" — the pets one '
  'FAMILY may put in one unit. Not a limit on unrelated bookings: the '
  'exclusion constraint already allows only one live stay per room.';

comment on column public.room_categories.space_type is
  'The reference''s Space type. Every row existing before 20260924180000 is a '
  'room, which is what boarding_stay_no_double_booking has always assumed.';

comment on column public.room_categories.max_pets_per_area is
  'The reference''s "Max # of pets per area" — pets in the area at once, '
  'regardless of family. Null for a room type, and required for an area.';
