-- ============================================================================
-- Grooming, slice 1: the CATALOGUE — what a facility sells.
--
-- Nothing here is an appointment. You cannot book a service that does not
-- exist, so the catalogue lands first and the appointment (slice 2) attaches
-- to it.
--
-- ── DECISION 1: "PACKAGE" IS TWO DIFFERENT THINGS, SO THE SCHEMA SAYS SERVICE
--
-- The mock exports `groomingPackages` (Bath & Brush, Full Groom — a thing with
-- a duration and size pricing) AND `grooming-prepaid-packages.ts` (a punch card:
-- "5x Full Groom, valid 6 months"). The mock's own header calls this out:
--
--     "Distinct from `groomingPackages` in `./grooming.ts`, which are the
--      actual grooming SERVICES with size pricing"
--
-- Two unrelated concepts sharing a name is exactly the collision the debt map
-- warns about (see the Loyalty and Calling entries, and the three "tag"
-- concepts). This table is `grooming_services`. When prepaid bundles arrive
-- they get `grooming_prepaid_packages` and the two can never be confused again.
-- `legacy_id` still carries "groom-pkg-001" because the UI keys on it.
--
-- ── DECISION 2: PET SIZE IS DERIVED, NOT STORED
--
-- `pets` has `weight` and `coat_type` and deliberately gains nothing here. Size
-- is not a property of the animal — it is a FACILITY POLICY applied to weight
-- (`lib/grooming-config.ts:90`: small ≤15lb, medium ≤35lb, large ≤70lb, giant
-- above). Two facilities can call the same 30lb dog medium and large, and both
-- are right.
--
-- So the tiers live in `grooming_config.pet_size_tiers`, and size pricing keys
-- off the resulting label. Storing a `size` column on `pets` would freeze one
-- facility's policy onto a shared row and quietly break the moment a facility
-- edits its tiers.
--
-- ── DECISION 3: SIZE PRICING IS A CHILD TABLE, COAT ADJUSTMENT IS NOT
--
-- They look symmetrical and are not.
--
--   size    — THE pricing dimension. Every booking resolves it, reports group
--             by it, and a facility may price only some tiers. A child table
--             makes "what does a Large Full Groom cost" a query with a foreign
--             key, not a jsonb extraction.
--
--   coat    — a MODIFIER applied on top, and it travels with a `mode` flag
--             (flat dollars vs percent of the size price). The seven amounts
--             and the mode are meaningless apart, so they stay one value.
--
-- ── WHAT THIS SLICE DELIBERATELY DOES NOT BUILD ────────────────────────────
--
-- Stated so the absence reads as a decision rather than an oversight:
--
--   stylists            — `staff` already is the stylist roster. A parallel
--                         table would be a fourth id namespace for people, and
--                         the debt map already records three.
--   stations, inventory, products, photos, van tracking / route planner,
--   waitlist, prepaid packages, report cards, intake & express check-in
--                       — real features, none of them needed to sell or book a
--                         groom. They attach to this spine later.
--   the exotic pricing layers (per-stylist price, groomer-tier adjustment,
--   age-group rules, breed overrides) — the resolution ORDER is application
--   logic that already exists (`resolveEffectivePricing`); this stores the two
--   dimensions the booking flow cannot work without and leaves room for the
--   rest rather than guessing their shape.
--
-- ── PERMISSIONS ────────────────────────────────────────────────────────────
--
--   read   `view_services`, OR being a CLIENT of the facility. The online
--          booking page has to show a customer what they can book, and
--          `private.client_facility_ids()` already exists for exactly this
--          (20260801130000). Only ACTIVE services are visible to clients — an
--          inactive service is a facility's draft, not an offer.
--   write  `manage_services` for the catalogue, `manage_rates` for prices.
--
--          TWO KEYS, AND NO ROLE PRESET CURRENTLY SEPARATES THEM — owner,
--          admin and manager hold both; reception holds neither. Checked, not
--          assumed. So this split buys nothing today and is still right:
--
--            * the screens are already two screens (services vs rates), and
--              `manage_rates` already exists precisely to gate pricing;
--            * the permission system has two layers ABOVE the preset (facility
--              custom roles, per-membership/staff overrides), so a facility can
--              grant one without the other the moment it wants to — proven by
--              T7 below, which does exactly that;
--            * collapsing them to one key now would be a one-way door. Splitting
--              a permission later means auditing every holder; keeping them
--              apart costs a line of SQL.
--
--          The opposite mistake is the one already recorded in 20260803140000:
--          two keys guarding ONE screen is how they drift apart. These guard
--          two.
-- ============================================================================

-- ── Services ────────────────────────────────────────────────────────────────

create table public.grooming_services (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- "groom-pkg-001". The UI keys on it; same reasoning as staff.legacy_id.
  legacy_id   text,

  name        text not null,
  description text not null default '',

  -- The fallback when no size tier matches. Not a duplicate of the size prices:
  -- a facility may price a service flat and never fill the size table in.
  base_price      numeric(10,2) not null default 0 check (base_price >= 0),
  duration_min    integer not null check (duration_min > 0),

  -- Percent of the size price, or flat dollars, depending on the mode.
  coat_adjustments      jsonb not null default '{}'::jsonb,
  coat_adjustment_mode  text not null default 'flat'
                          check (coat_adjustment_mode in ('flat', 'percent')),

  -- Suggested starting value for the manual matted surcharge. The surcharge
  -- itself is always opt-in per appointment, so this is a default and not a
  -- price.
  matted_surcharge_default numeric(10,2) not null default 0
                          check (matted_surcharge_default >= 0),

  -- What the client is told they get. Display copy, not billable line items —
  -- billable extras are add-ons.
  includes    text[] not null default '{}',

  is_active   boolean not null default true,
  is_popular  boolean not null default false,

  -- Eligibility filters. EMPTY MEANS NO RESTRICTION, which is why these are
  -- arrays with a '{}' default rather than nullable: "no restriction" and "not
  -- set yet" are the same thing here, and one representation for one meaning.
  eligible_pet_sizes  text[] not null default '{}',
  eligible_coat_types text[] not null default '{}',
  eligible_breeds     text[] not null default '{}',

  required_skill_level text,

  -- Online-booking guards. Null = unrestricted, which is genuinely distinct
  -- from 0 ("no notice needed" / "none allowed"), so these ARE nullable.
  min_booking_notice_hours integer check (min_booking_notice_hours >= 0),
  max_per_day              integer check (max_per_day > 0),

  display_order integer not null default 0,
  color       text,
  image_url   text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint grooming_services_legacy_key unique (facility_id, legacy_id)
);

create index grooming_services_facility_idx
  on public.grooming_services (facility_id);
-- The booking flow's hot path: active services for a facility, in menu order.
create index grooming_services_active_idx
  on public.grooming_services (facility_id, display_order)
  where is_active;

comment on table public.grooming_services is
  'What a facility SELLS (Bath & Brush, Full Groom). Not a prepaid bundle — see the header of 20260805100000 on the package/service name collision.';

-- ── Size pricing ────────────────────────────────────────────────────────────

create table public.grooming_service_size_prices (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.grooming_services (id) on delete cascade,

  -- Denormalised from the service so RLS can gate this table without a join on
  -- every row. Kept true by a trigger, not by trust — same pattern as the
  -- onboarding task tables.
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- The label a facility's own tiers produce. NOT an enum: a facility can
  -- rename or add a tier in grooming_config, and an enum would need a
  -- migration to allow "toy" or "extra-large".
  size_label  text not null,
  price       numeric(10,2) not null check (price >= 0),

  -- Some services take materially longer on a bigger dog. Null = use the
  -- service's own duration.
  duration_min integer check (duration_min > 0),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint grooming_size_price_unique unique (service_id, size_label)
);

create index grooming_service_size_prices_service_idx
  on public.grooming_service_size_prices (service_id);

-- ── Add-ons ─────────────────────────────────────────────────────────────────

create table public.grooming_add_ons (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  legacy_id   text,

  name        text not null,
  description text not null default '',
  price       numeric(10,2) not null default 0 check (price >= 0),
  -- Minutes this add-on adds to the appointment. 0 is legitimate (a product
  -- upsell that costs money and no time).
  duration_min integer not null default 0 check (duration_min >= 0),
  is_active   boolean not null default true,
  display_order integer not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint grooming_add_ons_legacy_key unique (facility_id, legacy_id)
);

create index grooming_add_ons_facility_idx
  on public.grooming_add_ons (facility_id);

-- ── Auto-attach rules ───────────────────────────────────────────────────────
-- "Teeth brushing on every Full Groom" is unconditional; "de-shedding only for
-- double coats" carries a condition. Conditions on ONE rule are AND-ed, which
-- is why they are columns on the rule rather than rows in a condition table.

create table public.grooming_service_default_add_ons (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.grooming_services (id) on delete cascade,
  add_on_id   uuid not null references public.grooming_add_ons (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- Empty = no condition on that dimension.
  when_pet_sizes  text[] not null default '{}',
  when_coat_types text[] not null default '{}',
  when_breeds     text[] not null default '{}',

  -- Whether the client may untick it. A rule the client can remove is a
  -- suggestion; one they cannot is part of the service.
  removable   boolean not null default true,

  created_at  timestamptz not null default now(),

  constraint grooming_default_add_on_unique unique (service_id, add_on_id)
);

create index grooming_service_default_add_ons_service_idx
  on public.grooming_service_default_add_ons (service_id);

-- ── Facility grooming config ────────────────────────────────────────────────
-- One row per facility, PK is the facility: a second config is not a thing to
-- prevent, it is a thing that cannot exist. Same shape as staff_hr_config.

create table public.grooming_config (
  facility_id uuid primary key references public.facilities (id) on delete cascade,

  -- Decision 2. Ordered ascending by max_weight_lbs; the last tier has none
  -- ("and everything heavier"), which is why this is jsonb and not a table with
  -- a NOT NULL weight.
  pet_size_tiers jsonb not null default
    '[{"id":"small","label":"Small","maxWeightLbs":15},
      {"id":"medium","label":"Medium","maxWeightLbs":35},
      {"id":"large","label":"Large","maxWeightLbs":70},
      {"id":"giant","label":"Giant"}]'::jsonb,

  -- Operational toggles the appointment slice will read.
  require_before_photos boolean not null default false,
  require_after_photos  boolean not null default false,
  progress_checklist_enabled boolean not null default false,

  -- Salon and/or mobile. Both false is a facility that has not set up grooming,
  -- which is a real state and not an error.
  offers_salon  boolean not null default true,
  offers_mobile boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.grooming_config is
  'One row per facility. pet_size_tiers is the policy that turns pets.weight into a size label — see Decision 2 in 20260805100000.';

-- ── Derived facility_id, and the write-integrity rules ──────────────────────
--
-- THE CHILD TABLES DERIVE facility_id FROM THEIR PARENT rather than accepting
-- it. This is the same rule as every other child table in this schema and for
-- the same reason: RLS gates ROWS, so a caller who can insert a size price can
-- choose its facility_id, and a wrong one is a price that leaks into another
-- business's menu. The column exists for the policy to read; the trigger makes
-- it true.
--
-- THE SERVICE-ROLE CARVE-OUT belongs here — this is a TRIGGER, which only fires
-- on a write that already cleared RLS, so a missing JWT subject really does
-- mean a seed. (Contrast an RPC: see 20260804200000.)

create or replace function private.grooming_child_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_facility uuid;
begin
  if tg_table_name = 'grooming_service_size_prices'
     or tg_table_name = 'grooming_service_default_add_ons' then
    select facility_id into v_facility
      from public.grooming_services where id = new.service_id;
  end if;

  if v_facility is null then
    raise exception 'Cannot resolve the facility for this row.'
      using errcode = '23503';
  end if;

  new.facility_id := v_facility;
  return new;
end;
$$;

create trigger grooming_size_price_facility
  before insert or update on public.grooming_service_size_prices
  for each row execute function private.grooming_child_facility();

create trigger grooming_default_add_on_facility
  before insert or update on public.grooming_service_default_add_ons
  for each row execute function private.grooming_child_facility();

-- An add-on rule must point at an add-on from the SAME facility. The FK alone
-- does not say that — it only says the add-on exists — so a caller could attach
-- another business's add-on to their own service and read its name and price.
create or replace function private.grooming_add_on_same_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_add_on_facility uuid;
begin
  select facility_id into v_add_on_facility
    from public.grooming_add_ons where id = new.add_on_id;

  if v_add_on_facility is distinct from new.facility_id then
    raise exception 'That add-on belongs to a different facility.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- AFTER the facility trigger, so it checks the derived value and not one the
-- caller supplied. Trigger order within a timing is alphabetical, and
-- `grooming_size_price_facility` < `grooming_zz_add_on_same_facility`.
create trigger grooming_zz_add_on_same_facility
  before insert or update on public.grooming_service_default_add_ons
  for each row execute function private.grooming_add_on_same_facility();

-- ── updated_at ──────────────────────────────────────────────────────────────
-- private.set_updated_at() already exists (20260726120000). Reused rather than
-- reintroduced under a second name — one behaviour, one function.

create trigger grooming_services_touch before update on public.grooming_services
  for each row execute function private.set_updated_at();
create trigger grooming_size_prices_touch before update on public.grooming_service_size_prices
  for each row execute function private.set_updated_at();
create trigger grooming_add_ons_touch before update on public.grooming_add_ons
  for each row execute function private.set_updated_at();
create trigger grooming_config_touch before update on public.grooming_config
  for each row execute function private.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.grooming_services                enable row level security;
alter table public.grooming_service_size_prices     enable row level security;
alter table public.grooming_add_ons                 enable row level security;
alter table public.grooming_service_default_add_ons enable row level security;
alter table public.grooming_config                  enable row level security;

-- Services. The client branch is narrower than the staff one on purpose:
-- ACTIVE only. An inactive service is a draft the facility is working on, and a
-- customer seeing it would be shown something they cannot book.
create policy grooming_services_read on public.grooming_services
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or (is_active and facility_id in (select private.client_facility_ids()))
  );
create policy grooming_services_insert on public.grooming_services
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_services_update on public.grooming_services
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_services_delete on public.grooming_services
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));

-- Prices are gated by manage_RATES, not manage_services. See the header.
create policy grooming_size_prices_read on public.grooming_service_size_prices
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );
create policy grooming_size_prices_insert on public.grooming_service_size_prices
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_rates'));
create policy grooming_size_prices_update on public.grooming_service_size_prices
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_rates'))
  with check (private.has_permission(facility_id, 'manage_rates'));
create policy grooming_size_prices_delete on public.grooming_service_size_prices
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_rates'));

create policy grooming_add_ons_read on public.grooming_add_ons
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or (is_active and facility_id in (select private.client_facility_ids()))
  );
create policy grooming_add_ons_insert on public.grooming_add_ons
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_add_ons_update on public.grooming_add_ons
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_add_ons_delete on public.grooming_add_ons
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));

create policy grooming_default_add_ons_read on public.grooming_service_default_add_ons
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );
create policy grooming_default_add_ons_insert on public.grooming_service_default_add_ons
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_default_add_ons_update on public.grooming_service_default_add_ons
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_default_add_ons_delete on public.grooming_service_default_add_ons
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));

-- Config is staff-only. The size TIERS are a business's internal policy, and a
-- client has no use for them: they are told a price, not the rule that produced
-- it.
create policy grooming_config_read on public.grooming_config
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
  );
create policy grooming_config_insert on public.grooming_config
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_config_update on public.grooming_config
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

-- No delete policy on config. A facility that stops offering grooming turns
-- both offers_* off; deleting the row would silently restore the defaults,
-- which is the opposite of what they asked for.
