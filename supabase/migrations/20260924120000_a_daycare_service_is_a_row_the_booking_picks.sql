-- ============================================================================
-- A daycare service is a ROW the facility writes and the booking PICKS.
--
-- ── WHAT WAS WRONG ────────────────────────────────────────────────────────
--
-- A facility already authored a list of named daycare rates — `Daycare Half
-- Day`, `Full day` — and nobody was ever offered one. `daycareRateForHours`
-- filtered the active rates that covered the stay's hours and charged THE
-- CHEAPEST, so the facility wrote a menu the till ignored and could not
-- explain its own price. `bookings.service_type` held `full_day`/`half_day`
-- derived from "is the stay under 5 hours", and nothing in the money path
-- read it.
--
-- This is the table the picker picks from.
--
-- ── WHY A TABLE AND NOT THE SETTINGS DOMAIN ───────────────────────────────
--
-- The rates lived in `facility_settings` under `daycare_rates`. Three things
-- do not fit in one JSON blob: a price per service PER BRANCH, categories
-- with their own order, and a sort order that survives an edit. And
-- `settingsFromRows` DROPS a whole domain whose stored value stops parsing
-- (src/lib/settings/from-rows.ts), so every schema change there risks
-- silently deleting a facility's whole rate card on deploy.
--
-- `grooming_services` (20260805100000) already solved all of it, so this is
-- built to the same shape: a services table gated by `manage_services`, a
-- price table gated by `manage_RATES`, `legacy_id` for the UI's key, arrays
-- where empty means no restriction, and the two PARTIAL unique indexes of
-- 20260825180000 rather than one three-column constraint.
--
-- ── WHAT THE DATA SAYS, MEASURED 2026-09-23 ───────────────────────────────
--
-- Three facilities hold 6 rates between them, and 3 branch prices exist (all
-- $38, one facility). FOUR OF THE SIX RATES CARRY A NON-ZERO `sizePricing`
-- — a small/medium/large/giant price a facility typed in — and no pricing
-- code has ever read one. A Great Dane and a Chihuahua were charged the same.
--
-- Those numbers are COPIED INTO `size_pricing` here rather than dropped. The
-- decision on 2026-09-23 was to price by service and restrict by weight, the
-- way MoéGo does, so nothing reads this column — but deleting money somebody
-- entered, to implement a screen they have not seen yet, is not this
-- migration's call to make. It is one jsonb column and it costs nothing.
-- ============================================================================

-- ── Categories ──────────────────────────────────────────────────────────────

create table if not exists public.daycare_service_categories (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  name          text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint daycare_service_categories_name_key unique (facility_id, name)
);

create index if not exists daycare_service_categories_facility_idx
  on public.daycare_service_categories (facility_id, display_order);

comment on table public.daycare_service_categories is
  'How a facility groups its daycare services on the menu. MoéGo calls this Category; it is presentation, never eligibility or price.';

-- ── Services ────────────────────────────────────────────────────────────────

create table if not exists public.daycare_services (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- "rate-full-day". The UI keys on it, and the settings rows being migrated
  -- already carry exactly this string as their `id` — same reasoning as
  -- grooming_services.legacy_id.
  legacy_id   text,

  category_id uuid references public.daycare_service_categories (id) on delete set null,

  name        text not null,
  description text not null default '',
  image_url   text,

  -- Internal only. MoéGo is explicit that the colour code is for the calendar
  -- and is never shown to a client.
  color       text,

  -- The facility-wide price. A branch's own row in
  -- daycare_service_location_prices replaces it FOR THAT BRANCH only.
  price       numeric(10,2) not null default 0 check (price >= 0),

  -- Absent means TAXED. Matches src/types/daycare.ts, which says so about the
  -- settings field this replaces: an untaxed default under-collects tax, and
  -- that is the more expensive mistake to find later.
  taxable     boolean not null default true,

  -- MoéGo's "Max stay duration": minimum 30 minutes, half-hour steps. Null is
  -- genuinely distinct from 0 here — null is "no ceiling", and a service with
  -- no ceiling covers any stay.
  max_duration_hours numeric(5,2) check (max_duration_hours >= 0.5),

  -- MoéGo's auto-rollover. Both null = off. A service becomes
  -- `rollover_to_service_id` once the pet is still here
  -- `rollover_after_minutes` past `max_duration_hours`.
  rollover_after_minutes  integer check (rollover_after_minutes >= 0),
  rollover_to_service_id  uuid references public.daycare_services (id) on delete set null,

  -- Eligibility. EMPTY MEANS NO RESTRICTION, which is why these are arrays
  -- with a '{}' default rather than nullable: "no restriction" and "not set
  -- yet" are the same thing, and one representation for one meaning.
  -- (grooming_services says the same about its three.)
  eligible_species      text[] not null default '{}',
  eligible_breeds       text[] not null default '{}',
  eligible_weight_tiers text[] not null default '{}',

  -- MoéGo's "Pet Code(s)". Ours are pet TAGS. Blocked beats eligible.
  eligible_pet_tags text[] not null default '{}',
  blocked_pet_tags  text[] not null default '{}',

  -- Which play-area sections this service may use, and which add-ons come
  -- free with it. Empty = no restriction / none, as above.
  allowed_section_ids text[] not null default '{}',
  included_addon_ids  text[] not null default '{}',

  -- Which branches offer it at all. Empty = every branch.
  location_ids uuid[] not null default '{}',

  -- MoéGo asks these as two separate questions, because they are: one stops
  -- STAFF booking the service, the other stops a CUSTOMER booking it online.
  requires_evaluation        boolean not null default false,
  requires_evaluation_online boolean not null default false,

  -- Carried over from the settings rate card and read by nothing. See the
  -- header: this is preserved data, not a feature.
  size_pricing jsonb not null default '{}'::jsonb,

  display_order integer not null default 0,
  is_active     boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint daycare_services_legacy_key unique (facility_id, legacy_id),
  -- A service cannot roll over into itself: the check-out would never settle.
  constraint daycare_services_rollover_not_self check (rollover_to_service_id is null or rollover_to_service_id <> id)
);

create index if not exists daycare_services_facility_idx
  on public.daycare_services (facility_id);
-- The booking flow's hot path: the active menu for a facility, in order.
create index if not exists daycare_services_active_idx
  on public.daycare_services (facility_id, display_order)
  where is_active;

comment on table public.daycare_services is
  'What a facility SELLS as daycare, one row per named service. The booking picks one; it is not inferred from how long the pet stayed. Replaces the daycare_rates setting.';
comment on column public.daycare_services.size_pricing is
  'Carried over from the daycare_rates setting on 2026-09-23 and read by NOTHING. Four of six rates had one set and no pricing code had ever charged it. Kept so the money a facility typed in is not deleted by a migration; the shipped model prices by service and restricts by weight.';
comment on column public.daycare_services.max_duration_hours is
  'MoéGo''s "Max stay duration". Null is NO ceiling, which is different from 0 — a service with no ceiling covers any stay.';

-- ── The price a branch pays ─────────────────────────────────────────────────

create table if not exists public.daycare_service_location_prices (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.daycare_services (id) on delete cascade,

  -- Denormalised from the service so RLS can gate this table without a join on
  -- every row. Kept true by a TRIGGER, not by trust — grooming's pattern.
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- Null = the facility-wide price. A branch's own row replaces it for that
  -- branch only.
  location_id uuid references public.locations (id) on delete cascade,

  price       numeric(10,2) not null check (price >= 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- TWO PARTIAL unique indexes, not one two-column constraint: Postgres treats
-- every null as distinct from every other null, so a plain
-- `unique (service_id, location_id)` would admit any number of facility-wide
-- rows for one service. 20260825180000 exists because of exactly this.
create unique index if not exists daycare_service_price_facility_wide
  on public.daycare_service_location_prices (service_id)
  where location_id is null;
create unique index if not exists daycare_service_price_per_branch
  on public.daycare_service_location_prices (service_id, location_id)
  where location_id is not null;

create index if not exists daycare_service_price_facility_idx
  on public.daycare_service_location_prices (facility_id);

comment on table public.daycare_service_location_prices is
  'A branch''s own price for one daycare service. Null location_id = the facility-wide price. Gated by manage_rates, not manage_services — pricing a service and creating one are different jobs.';

-- ── The facility of a child row is derived, never supplied ──────────────────
--
-- A TRIGGER, which only fires on a write that already cleared RLS, so this
-- cannot be used to reach into another facility.

create or replace function private.daycare_child_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_facility uuid;
begin
  select facility_id into v_facility
    from public.daycare_services where id = new.service_id;

  if v_facility is null then
    raise exception 'Cannot resolve the facility for this row.'
      using errcode = '23503';
  end if;

  new.facility_id := v_facility;
  return new;
end;
$$;

drop trigger if exists daycare_service_price_facility on public.daycare_service_location_prices;
create trigger daycare_service_price_facility
  before insert or update on public.daycare_service_location_prices
  for each row execute function private.daycare_child_facility();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.daycare_service_categories      enable row level security;
alter table public.daycare_services                enable row level security;
alter table public.daycare_service_location_prices enable row level security;

-- The client branch is narrower than the staff one on purpose: ACTIVE only.
-- An inactive service is a draft the facility is working on, and a customer
-- seeing it would be shown something they cannot book.
drop policy if exists daycare_services_read on public.daycare_services;
create policy daycare_services_read on public.daycare_services
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or (is_active and facility_id in (select private.client_facility_ids()))
  );
drop policy if exists daycare_services_insert on public.daycare_services;
create policy daycare_services_insert on public.daycare_services
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
drop policy if exists daycare_services_update on public.daycare_services;
create policy daycare_services_update on public.daycare_services
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
drop policy if exists daycare_services_delete on public.daycare_services;
create policy daycare_services_delete on public.daycare_services
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));

drop policy if exists daycare_categories_read on public.daycare_service_categories;
create policy daycare_categories_read on public.daycare_service_categories
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );
drop policy if exists daycare_categories_write on public.daycare_service_categories;
create policy daycare_categories_write on public.daycare_service_categories
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

-- Prices are gated by manage_RATES. Creating a service and pricing one are
-- different jobs, and a facility that lets a manager author the menu need not
-- let them change what it costs.
drop policy if exists daycare_service_prices_read on public.daycare_service_location_prices;
create policy daycare_service_prices_read on public.daycare_service_location_prices
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );
drop policy if exists daycare_service_prices_insert on public.daycare_service_location_prices;
create policy daycare_service_prices_insert on public.daycare_service_location_prices
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_rates'));
drop policy if exists daycare_service_prices_update on public.daycare_service_location_prices;
create policy daycare_service_prices_update on public.daycare_service_location_prices
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_rates'))
  with check (private.has_permission(facility_id, 'manage_rates'));
drop policy if exists daycare_service_prices_delete on public.daycare_service_location_prices;
create policy daycare_service_prices_delete on public.daycare_service_location_prices
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_rates'));

-- ── The data that must survive ──────────────────────────────────────────────
--
-- Every rate a facility authored becomes a row, keeping its id as `legacy_id`
-- so anything holding that string still resolves. Array position becomes
-- `display_order`, so the menu opens in the order it was written in.
--
-- `on conflict do nothing`: this migration is rerunnable, and a second run
-- must not duplicate a facility's menu.

insert into public.daycare_services (
  facility_id, legacy_id, name, description, color, price, taxable,
  max_duration_hours, eligible_species, allowed_section_ids,
  included_addon_ids, size_pricing, display_order, is_active
)
select
  fs.facility_id,
  r.value ->> 'id',
  coalesce(nullif(btrim(r.value ->> 'name'), ''), 'Daycare'),
  coalesce(r.value ->> 'description', ''),
  r.value ->> 'color',
  coalesce((r.value ->> 'basePrice')::numeric, 0),
  -- The settings field means "absent = taxed", and so does the column.
  coalesce((r.value ->> 'taxable')::boolean, true),
  -- `maxDurationHours` first, then the legacy `durationHours` mirror the old
  -- editor wrote beside it. Neither present = no ceiling.
  nullif(
    greatest(
      coalesce((r.value ->> 'maxDurationHours')::numeric, 0),
      coalesce((r.value ->> 'durationHours')::numeric, 0)
    ), 0),
  coalesce(
    (select array_agg(s #>> '{}') from jsonb_array_elements(
       case when jsonb_typeof(r.value -> 'species') = 'array'
            then r.value -> 'species' else '[]'::jsonb end) s),
    '{}'),
  coalesce(
    (select array_agg(s #>> '{}') from jsonb_array_elements(
       case when jsonb_typeof(r.value -> 'allowedSectionIds') = 'array'
            then r.value -> 'allowedSectionIds' else '[]'::jsonb end) s),
    '{}'),
  coalesce(
    (select array_agg(s #>> '{}') from jsonb_array_elements(
       case when jsonb_typeof(r.value -> 'includedAddOnIds') = 'array'
            then r.value -> 'includedAddOnIds' else '[]'::jsonb end) s),
    '{}'),
  coalesce(r.value -> 'sizePricing', '{}'::jsonb),
  r.ordinality - 1,
  coalesce((r.value ->> 'isActive')::boolean, true)
from public.facility_settings fs,
     lateral jsonb_array_elements(
       case when jsonb_typeof(fs.value -> 'rates') = 'array'
            then fs.value -> 'rates' else '[]'::jsonb end
     ) with ordinality as r(value, ordinality)
where fs.domain = 'daycare_rates'
on conflict (facility_id, legacy_id) do nothing;

-- The branch price fans out to EVERY service of that facility.
--
-- It has to. Today `daycareDayRate` returns the branch price outright,
-- whatever rate card would otherwise have applied, so a branch with a $38
-- override charges $38 for half a day as much as for a full one. Writing one
-- row per service reproduces exactly that, and the moment the facility gives
-- a service its own branch price it stops being true — which is the point.
insert into public.daycare_service_location_prices (service_id, facility_id, location_id, price)
select s.id, s.facility_id, lp.location_id, lp.base_price
  from public.daycare_location_prices lp
  join public.daycare_services s on s.facility_id = lp.facility_id
on conflict do nothing;

-- ── What was carried, said out loud ─────────────────────────────────────────

do $$
declare
  v_services integer;
  v_prices   integer;
  v_sized    integer;
begin
  select count(*) into v_services from public.daycare_services;
  select count(*) into v_prices   from public.daycare_service_location_prices;
  select count(*) into v_sized    from public.daycare_services
   where coalesce((size_pricing ->> 'small')::numeric, 0) > 0
      or coalesce((size_pricing ->> 'medium')::numeric, 0) > 0
      or coalesce((size_pricing ->> 'large')::numeric, 0) > 0
      or coalesce((size_pricing ->> 'giant')::numeric, 0) > 0;

  raise notice 'daycare menu: % service(s), % branch price(s), % carrying a size price nothing ever charged',
    v_services, v_prices, v_sized;
end $$;
