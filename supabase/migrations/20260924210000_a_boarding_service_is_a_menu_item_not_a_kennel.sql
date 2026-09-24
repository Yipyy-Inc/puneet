-- ============================================================================
-- A BOARDING SERVICE IS A MENU ITEM. A LODGING TYPE IS A ROOM. THEY ARE NOT
-- THE SAME ROW.
--
-- Phase 5 of the MoéGo lodging work, and the structural one. MoéGo's boarding
-- setup is two steps, and its own overview says so: "Set Up Boarding Services —
-- create your boarding service menu, set pricing, define pet eligibility" and
-- then "Set Up Lodging — define your lodging types, add individual room units".
-- A service names the lodging types it may be booked into; a lodging type holds
-- rooms. Two objects, one pointing at the other.
--
-- ── OURS HAS ALWAYS BEEN ONE ROW ──────────────────────────────────────────
--
-- `room_categories` is simultaneously the kennel class and the nightly rate.
-- The Rooms page and the Rates page are two editors over the same table:
-- `services/boarding/rates/page.tsx` filters `c.service === "boarding"` and so
-- does `BoardingRoomsClient`. "Deluxe Suite" is the room, the price and the
-- menu item at once.
--
-- So a facility cannot offer two priced services in one kennel class — no
-- "Standard stay" and "All-inclusive stay" in the same suite — nor one service
-- across two classes. The menu is the building.
--
-- That is the daycare defect one level deeper. There the facility wrote a menu
-- nobody picked from (20260924120000); here there is no menu to write.
--
-- ── WHAT THE DATA SAYS, MEASURED 2026-09-24 ───────────────────────────────
--
-- 10 boarding categories across 3 facilities, every one of them priced, and
-- 459 boarding bookings resting on those prices. ZERO rows in
-- `room_category_location_prices`, so no branch has yet overridden a nightly
-- rate and there is nothing to fan out.
--
-- ── SO THE MIGRATION CARRIES ALL TEN, UNCHANGED ───────────────────────────
--
-- Every priced class becomes a service at the same price, per NIGHT, restricted
-- to the lodging type it came from. That reproduces today's behaviour exactly —
-- one service per class, bookable only in that class — and leaves the facility
-- free to add a second service to a class, which is the thing they could not do
-- before.
--
-- Nothing is deleted. `room_categories.default_base_price` stays where it is
-- and keeps pricing every existing booking until Phase 6 moves the money path,
-- because a migration that moves the schema AND the money in one step has no
-- safe half.
--
-- SQL S0-S8 in boarding-services.sql.
-- ============================================================================

-- ── Per night, or per day ──────────────────────────────────────────────────
--
-- MoéGo: "Unit — Charged per night or per day (affects calculation)." A night
-- is the gap between two dates and a day is a date, so a Monday-to-Wednesday
-- stay is 2 nights or 3 days. Which one a facility charges is theirs to say.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'boarding_price_unit') then
    create type public.boarding_price_unit as enum ('night', 'day');
  end if;
end $$;

-- ── Categories ──────────────────────────────────────────────────────────────

create table if not exists public.boarding_service_categories (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  name          text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint boarding_service_categories_name_key unique (facility_id, name)
);

create index if not exists boarding_service_categories_facility_idx
  on public.boarding_service_categories (facility_id);

comment on table public.boarding_service_categories is
  'MoeGo "Edit Category" on the boarding service menu — a heading services are grouped under, not a kennel class.';

-- ── Services ────────────────────────────────────────────────────────────────

create table if not exists public.boarding_services (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- The app-facing id, as everywhere else in this schema. A service carried
  -- over from a room category keeps a name derived from that class so the two
  -- can be told apart afterwards.
  legacy_id   text,

  category_id uuid references public.boarding_service_categories (id) on delete set null,

  name        text not null,
  description text not null default '',
  image_url   text,

  -- Internal only. MoeGo is explicit that the colour code is for the calendar
  -- and never shown to a client.
  color       text,

  -- The facility-wide price. A branch's own row in
  -- boarding_service_location_prices replaces it FOR THAT BRANCH only.
  price numeric(10,2) not null default 0 check (price >= 0),
  unit  public.boarding_price_unit not null default 'night',

  -- Absent means TAXED, as it does on every other service table here: an
  -- untaxed default under-collects, and that is the more expensive mistake to
  -- find later.
  taxable boolean not null default true,

  -- WHICH LODGING TYPES THIS SERVICE MAY BE BOOKED INTO. MoeGo: "By default all
  -- lodging types are selected. Toggle off All Lodging Types to limit."
  --
  -- EMPTY MEANS EVERY TYPE, which is the convention this schema already uses
  -- for eligibility arrays (grooming_services, 20260805100000): "no restriction"
  -- and "not set yet" are the same thing, and one representation for one
  -- meaning.
  --
  -- Not a foreign key, because Postgres cannot FK the elements of an array. A
  -- type that is deleted leaves a dead id here, which reads as a restriction to
  -- a class that no longer exists — so the app filters by what it can resolve
  -- rather than trusting the list. Said out loud because it is the cost of the
  -- array, and the alternative (a join table) buys referential integrity for a
  -- list the editor always writes whole.
  lodging_type_ids uuid[] not null default '{}',

  -- Eligibility. Empty = no restriction, as above.
  eligible_species      text[] not null default '{}',
  eligible_breeds       text[] not null default '{}',
  eligible_weight_tiers text[] not null default '{}',

  -- MoeGo "Pet Code(s)". Ours are pet TAGS. Blocked beats eligible.
  eligible_pet_tags text[] not null default '{}',
  blocked_pet_tags  text[] not null default '{}',

  -- Which branches offer it at all. Empty = every branch.
  location_ids uuid[] not null default '{}',

  -- Two questions, because MoeGo asks two: one stops STAFF booking the service,
  -- the other stops a CUSTOMER booking it online.
  requires_evaluation        boolean not null default false,
  requires_evaluation_online boolean not null default false,

  display_order integer not null default 0,
  is_active     boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boarding_services_legacy_key unique (facility_id, legacy_id)
);

create index if not exists boarding_services_facility_idx
  on public.boarding_services (facility_id);
create index if not exists boarding_services_active_idx
  on public.boarding_services (facility_id) where is_active;

comment on table public.boarding_services is
  'The boarding menu: what a client books and what it costs. Separate from room_categories, which is the ROOM. A service names the lodging types it may be booked into; empty means all of them.';

comment on column public.boarding_services.unit is
  'MoeGo "Unit" — per night (the gap between dates) or per day (the dates themselves). Monday to Wednesday is 2 nights or 3 days.';

comment on column public.boarding_services.lodging_type_ids is
  'room_categories this service may be booked into. Empty = every type. Not an FK: Postgres cannot reference array elements, so a deleted type leaves a dead id the app must filter rather than trust.';

-- ── The price a branch pays ─────────────────────────────────────────────────

create table if not exists public.boarding_service_location_prices (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.boarding_services (id) on delete cascade,

  -- Denormalised from the service so RLS can gate this table without a join on
  -- every row. Kept true by a TRIGGER, not by trust.
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- Null = the facility-wide price.
  location_id uuid references public.locations (id) on delete cascade,

  price      numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- TWO PARTIAL unique indexes, not one two-column constraint: Postgres treats
-- every null as distinct from every other null, so a plain
-- `unique (service_id, location_id)` would admit any number of facility-wide
-- rows for one service. 20260825180000 exists because of exactly this.
create unique index if not exists boarding_service_price_facility_wide
  on public.boarding_service_location_prices (service_id)
  where location_id is null;
create unique index if not exists boarding_service_price_per_branch
  on public.boarding_service_location_prices (service_id, location_id)
  where location_id is not null;

create index if not exists boarding_service_price_facility_idx
  on public.boarding_service_location_prices (facility_id);

comment on table public.boarding_service_location_prices is
  'A branch''s own price for one boarding service. Null location_id = the facility-wide price.';

-- ── What comes with the stay ────────────────────────────────────────────────
--
-- MoéGo's "(BETA) Default Service(s)/Add-On(s)": an add-on attached
-- automatically once a length-of-stay condition is met. Its own words on the
-- money: "Default items are enforced once the length-of-stay condition is met.
-- These items are billed separately and not included in the base boarding
-- price."
--
-- The grooming-service half of that feature is deliberately NOT here — it
-- attaches an appointment rather than a line item, and that is a different
-- shape with a different price path.
create table if not exists public.boarding_service_default_addons (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.boarding_services (id) on delete cascade,

  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- The add-on's own id, from the `service_addons` settings domain. Text
  -- because that registry is a JSON blob keyed by string, not a table.
  addon_id text not null,

  -- MoéGo's four choices, in its own order.
  applies_on text not null default 'every_day'
    check (applies_on in ('every_day', 'except_checkout', 'except_checkin', 'last_day')),

  quantity_per_day integer not null default 1 check (quantity_per_day > 0),

  -- "once the length-of-stay condition is met" — nights, inclusive. Null means
  -- no condition, which is every stay.
  min_nights integer check (min_nights is null or min_nights > 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint boarding_default_addon_once unique (service_id, addon_id, applies_on)
);

create index if not exists boarding_default_addon_facility_idx
  on public.boarding_service_default_addons (facility_id);

comment on table public.boarding_service_default_addons is
  'MoeGo BETA default add-ons: attached once a length-of-stay condition is met, and billed SEPARATELY from the base price.';

-- ── The facility of a child row is derived, never supplied ──────────────────
--
-- A TRIGGER, which only fires on a write that already cleared RLS, so it cannot
-- be used to reach into another facility.

create or replace function private.boarding_service_child_facility()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare
  v_facility uuid;
begin
  select facility_id into v_facility
    from public.boarding_services where id = new.service_id;

  if v_facility is null then
    raise exception 'Cannot resolve the facility for this row.'
      using errcode = '23503';
  end if;

  new.facility_id := v_facility;
  return new;
end;
$fn$;

revoke all on function private.boarding_service_child_facility() from public;
revoke all on function private.boarding_service_child_facility() from anon;

drop trigger if exists boarding_service_price_facility on public.boarding_service_location_prices;
create trigger boarding_service_price_facility
  before insert or update on public.boarding_service_location_prices
  for each row execute function private.boarding_service_child_facility();

drop trigger if exists boarding_default_addon_facility on public.boarding_service_default_addons;
create trigger boarding_default_addon_facility
  before insert or update on public.boarding_service_default_addons
  for each row execute function private.boarding_service_child_facility();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.boarding_service_categories       enable row level security;
alter table public.boarding_services                 enable row level security;
alter table public.boarding_service_location_prices  enable row level security;
alter table public.boarding_service_default_addons   enable row level security;

-- The client branch is narrower than the staff one on purpose: ACTIVE only. An
-- inactive service is a draft the facility is working on, and a customer seeing
-- it would be shown something they cannot book.
drop policy if exists boarding_services_read on public.boarding_services;
create policy boarding_services_read on public.boarding_services
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or (is_active and facility_id in (select private.client_facility_ids()))
  );
drop policy if exists boarding_services_insert on public.boarding_services;
create policy boarding_services_insert on public.boarding_services
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
drop policy if exists boarding_services_update on public.boarding_services;
create policy boarding_services_update on public.boarding_services
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
drop policy if exists boarding_services_delete on public.boarding_services;
create policy boarding_services_delete on public.boarding_services
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));

drop policy if exists boarding_service_categories_read on public.boarding_service_categories;
create policy boarding_service_categories_read on public.boarding_service_categories
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );
drop policy if exists boarding_service_categories_write on public.boarding_service_categories;
create policy boarding_service_categories_write on public.boarding_service_categories
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

-- Prices are gated by manage_RATES. Creating a service and pricing one are
-- different jobs, and a facility that lets a manager author the menu need not
-- let them change what it costs. Grooming and daycare both draw the line here;
-- boarding's OWN lodging tables do not, which is recorded in the debt map
-- rather than changed underneath a screen that never offered the distinction.
drop policy if exists boarding_service_prices_read on public.boarding_service_location_prices;
create policy boarding_service_prices_read on public.boarding_service_location_prices
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );
drop policy if exists boarding_service_prices_insert on public.boarding_service_location_prices;
create policy boarding_service_prices_insert on public.boarding_service_location_prices
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_rates'));
drop policy if exists boarding_service_prices_update on public.boarding_service_location_prices;
create policy boarding_service_prices_update on public.boarding_service_location_prices
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_rates'))
  with check (private.has_permission(facility_id, 'manage_rates'));
drop policy if exists boarding_service_prices_delete on public.boarding_service_location_prices;
create policy boarding_service_prices_delete on public.boarding_service_location_prices
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_rates'));

-- A default add-on changes what a stay COSTS, so it is manage_rates too.
drop policy if exists boarding_default_addons_read on public.boarding_service_default_addons;
create policy boarding_default_addons_read on public.boarding_service_default_addons
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );
drop policy if exists boarding_default_addons_write on public.boarding_service_default_addons;
create policy boarding_default_addons_write on public.boarding_service_default_addons
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_rates'))
  with check (private.has_permission(facility_id, 'manage_rates'));

-- ── The data that must survive ──────────────────────────────────────────────
--
-- Every priced boarding class becomes a service at the same price, per night,
-- restricted to the class it came from. Ten of them on 2026-09-24, and 459
-- boarding bookings resting on those numbers.
--
-- Idempotent on `legacy_id`, so re-running changes nothing.

insert into public.boarding_services (
  facility_id, legacy_id, name, description, image_url, color,
  price, unit, taxable, lodging_type_ids, display_order, is_active
)
select rc.facility_id,
       'svc-' || rc.legacy_id,
       rc.name,
       coalesce(rc.description, ''),
       rc.image_url,
       rc.color,
       rc.default_base_price,
       'night',
       coalesce(rc.taxable, true),
       -- Bookable only in the class it came from, which is exactly what it
       -- meant as a class. A facility widens it by editing the service.
       array[rc.id],
       rc.sort_order,
       rc.active
  from public.room_categories rc
 where rc.service = 'boarding'
   and rc.default_base_price is not null
on conflict (facility_id, legacy_id) do nothing;

-- The facility-wide price, as its own row, so the service reads the same way a
-- daycare or grooming service does.
insert into public.boarding_service_location_prices (service_id, facility_id, location_id, price)
select s.id, s.facility_id, null, s.price
  from public.boarding_services s
 where s.legacy_id like 'svc-%'
on conflict do nothing;

-- Every branch override too. There were none on 2026-09-24, so this carries
-- nothing today — it is here so that a facility which adds one before this
-- migration reaches their database does not lose it.
insert into public.boarding_service_location_prices (service_id, facility_id, location_id, price)
select s.id, s.facility_id, p.location_id, p.price
  from public.room_category_location_prices p
  join public.room_categories rc on rc.id = p.category_id
  join public.boarding_services s
    on s.facility_id = rc.facility_id
   and s.legacy_id = 'svc-' || rc.legacy_id
on conflict do nothing;

do $verify$
declare
  v_classes  integer;
  v_services integer;
begin
  select count(*) into v_classes from public.room_categories
   where service = 'boarding' and default_base_price is not null;

  select count(*) into v_services from public.boarding_services
   where legacy_id like 'svc-%';

  if v_services < v_classes then
    raise exception
      'Only % of % priced boarding classes became services.', v_services, v_classes;
  end if;
end $verify$;
