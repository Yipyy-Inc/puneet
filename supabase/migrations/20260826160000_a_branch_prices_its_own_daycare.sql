-- ============================================================================
-- A branch can price daycare its own way.
--
-- Daycare has no catalog item to attach a price to -- unlike boarding's
-- kennel classes (room_category_location_prices, 20260826150000) or
-- grooming's services, daycare prices from ONE flat number,
-- daycare_config.basePrice, a single JSON row in facility_settings. So this
-- table has no category dimension at all: one row per (facility, location).
--
-- The trigger derives facility_id from location_id directly, not through a
-- category the way boarding's did -- location_id alone already implies the
-- facility here, so there is nothing else to look up.
-- ============================================================================

create table public.daycare_location_prices (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  base_price  numeric(10,2) not null check (base_price >= 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint daycare_location_price_unique unique (facility_id, location_id)
);

create index daycare_location_prices_facility_idx
  on public.daycare_location_prices (facility_id);

comment on table public.daycare_location_prices is
  'A branch''s own full-day daycare rate, replacing daycare_config.basePrice for that branch only. One row per (facility, location) -- daycare has no priced catalog item the way boarding and grooming do.';

-- ── facility_id, kept true by trigger ──────────────────────────────────────

create or replace function private.daycare_location_price_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_facility uuid;
begin
  select facility_id into v_facility
    from public.locations where id = new.location_id;

  if v_facility is null then
    raise exception 'Cannot resolve the facility for this row.'
      using errcode = '23503';
  end if;

  new.facility_id := v_facility;
  return new;
end;
$$;

create trigger daycare_location_price_facility
  before insert or update on public.daycare_location_prices
  for each row execute function private.daycare_location_price_facility();

create trigger daycare_location_prices_touch before update
  on public.daycare_location_prices
  for each row execute function private.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- Read mirrors every sibling price table this session (room_categories_read,
-- room_category_location_prices_read): anyone active at the facility.
--
-- Writes are settings_general, NOT manage_services -- this overrides the same
-- number facility_settings_insert/_update already gate on settings_general
-- (20260809140000) for daycare_config.basePrice itself. manage_services
-- governs catalog items (room_categories, grooming_services); daycare has
-- none, so there is no catalog-item permission to match here.

alter table public.daycare_location_prices enable row level security;

create policy daycare_location_prices_read on public.daycare_location_prices
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = daycare_location_prices.facility_id
         and m.profile_id = (select (auth.jwt() ->> 'sub'))
         and m.is_active
    )
  );

create policy daycare_location_prices_insert on public.daycare_location_prices
  for insert to authenticated
  with check (private.has_permission(facility_id, 'settings_general'));

create policy daycare_location_prices_update on public.daycare_location_prices
  for update to authenticated
  using (private.has_permission(facility_id, 'settings_general'))
  with check (private.has_permission(facility_id, 'settings_general'));

create policy daycare_location_prices_delete on public.daycare_location_prices
  for delete to authenticated
  using (private.has_permission(facility_id, 'settings_general'));
