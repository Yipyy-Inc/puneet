-- ============================================================================
-- A branch can price a boarding kennel class its own way.
--
-- Unlike grooming's per-location price table (20260825180000), this one holds
-- ONLY overrides -- there is no "facility-wide row" convention here because
-- the facility-wide default already lives on room_categories.default_base_price
-- itself. So location_id is NOT NULL and a plain unique(category_id,
-- location_id) is enough; grooming's nullable-location partial-index dance
-- solved a problem this table doesn't have.
--
-- Scoped to service = 'boarding' by the API route, not a DB constraint --
-- daycare shares room_categories but prices from a flat facility_settings day
-- rate, not from this table at all; a row here for a daycare category would be
-- a price shown that nothing charges, which is exactly the shape
-- check:success-claims exists to catch on the app side.
-- ============================================================================

create table public.room_category_location_prices (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.room_categories (id) on delete cascade,

  -- Denormalised from the category so RLS can gate this table without a join
  -- on every row. Kept true by a trigger, not by trust -- same pattern as
  -- grooming_service_size_prices (20260805100000).
  facility_id uuid not null references public.facilities (id) on delete cascade,

  location_id uuid not null references public.locations (id) on delete cascade,
  price       numeric(10,2) not null check (price >= 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint room_category_location_price_unique unique (category_id, location_id)
);

create index room_category_location_prices_category_idx
  on public.room_category_location_prices (category_id);

comment on table public.room_category_location_prices is
  'A branch''s own nightly rate for a boarding kennel class, replacing room_categories.default_base_price for that branch only. Overrides only -- there is no facility-wide row in this table.';

-- ── facility_id, kept true by trigger ──────────────────────────────────────

create or replace function private.room_category_location_price_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_facility uuid;
begin
  select facility_id into v_facility
    from public.room_categories where id = new.category_id;

  if v_facility is null then
    raise exception 'Cannot resolve the facility for this row.'
      using errcode = '23503';
  end if;

  new.facility_id := v_facility;
  return new;
end;
$$;

create trigger room_category_location_price_facility
  before insert or update on public.room_category_location_prices
  for each row execute function private.room_category_location_price_facility();

create trigger room_category_location_prices_touch before update
  on public.room_category_location_prices
  for each row execute function private.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- Read mirrors room_categories_read (20260806660000): anyone active at the
-- facility, not gated behind a rates-specific permission -- boarding has no
-- such permission distinct from manage_services, unlike grooming's
-- manage_rates. Writes are manage_services, matching room_categories itself.

alter table public.room_category_location_prices enable row level security;

create policy room_category_location_prices_read on public.room_category_location_prices
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = room_category_location_prices.facility_id
         and m.profile_id = (select (auth.jwt() ->> 'sub'))
         and m.is_active
    )
  );

create policy room_category_location_prices_insert on public.room_category_location_prices
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));

create policy room_category_location_prices_update on public.room_category_location_prices
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

create policy room_category_location_prices_delete on public.room_category_location_prices
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));
