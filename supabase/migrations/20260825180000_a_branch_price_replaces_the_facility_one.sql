-- ============================================================================
-- A branch can price a grooming service its own way.
--
-- `location_id` is nullable: null means "the facility-wide price," the row
-- every branch uses until one sets its own. A branch's own row for the same
-- (service, size) REPLACES the facility-wide one for that branch -- nothing
-- merges or scales, matching the decision that a branch price is the whole
-- answer, not an adjustment.
--
-- Two PARTIAL unique indexes, not one three-column unique constraint: a plain
-- `unique(service_id, size_label, location_id)` would admit multiple
-- facility-wide rows for the same size, because Postgres treats every null as
-- distinct from every other null by default. This is the same idiom
-- `locations_one_primary_per_facility` already uses in this codebase for
-- exactly that reason (20260825095825).
-- ============================================================================

alter table public.grooming_service_size_prices
  drop constraint if exists grooming_size_price_unique,
  add column if not exists location_id uuid references public.locations(id) on delete set null;

create unique index if not exists grooming_size_price_facility_wide
  on public.grooming_service_size_prices (service_id, size_label)
  where location_id is null;

create unique index if not exists grooming_size_price_per_branch
  on public.grooming_service_size_prices (service_id, size_label, location_id)
  where location_id is not null;

comment on column public.grooming_service_size_prices.location_id is
  'Null = the facility-wide price. A branch''s own row for the same (service, size) replaces it for that branch only -- see the two partial unique indexes.';
