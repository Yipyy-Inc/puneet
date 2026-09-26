-- ============================================================================
-- ONE ADD-ONS LIST FOR EVERY SERVICE.
--
-- Until now there were two, and neither was the list the client asked for:
--
--   * `facility_settings` domain 'service_addons' — one JSON value per
--     facility holding every boarding / daycare / training add-on AND their
--     categories, checked only by the API's Zod schema; categories referenced
--     BY NAME, so renaming one orphaned its add-ons;
--   * `public.grooming_add_ons` — grooming's own table (20260805100000), with
--     no app writer at all, and none of tax, image, colour, locations, staff,
--     applicable services or pet limits.
--
-- The client wants add-ons set up exactly as the reference article describes
-- (2026-09-26): ONE list under Settings > Services > Add-ons, each add-on with
-- basic info, the locations that offer it, price / tax / duration and an
-- override per location, whether it needs a staff member, the services it
-- applies to — all of them "including future ones", or chosen ones — and the
-- pets it is for (type & breed, weight range, coat type). Its categories can be
-- sorted, and deleting one moves its add-ons to Uncategorized.
--
-- ── WHAT MOVES ──────────────────────────────────────────────────────────────
--
-- Measured on the copy of production the day this was written: 3 add-ons in
-- the JSON (two facilities), 10 in grooming_add_ons (demo facilities only), 2
-- grooming_appointment_add_ons rows, 0 grooming or boarding default add-ons.
-- Small enough to move outright, in this transaction.
--
--   * JSON add-ons keep their string id as `legacy_id`, so the ids already
--     written into booking details, the pre-arrival form and service defaults
--     keep resolving (every reader matches `legacy_id` OR `id::text`).
--   * grooming add-ons keep THEIR uuid, so the foreign keys on appointment
--     add-ons and grooming default add-ons re-point without a data rewrite.
--   * a care type in `applicableServices` becomes every current service of
--     that type; an empty list or "all" becomes "all services, including
--     future ones" — the reference's two options, and nothing in between.
--
-- What the reference does not have is not carried: a price unit (per day, per
-- hour, % of the booking), unit label, maximum quantity, per-booking-or-pet,
-- scheduling, automatic tasks, default/required flags, size pricing and a tax
-- rate override. A booking line is price x quantity, which is already the
-- arithmetic every reader uses; defaults live on the SERVICE, as boarding's
-- already do. None of the 3 JSON add-ons used a default, a pet limit, a
-- location limit or size pricing.
--
-- ── WHAT STAYS, FOR NOW ─────────────────────────────────────────────────────
--
-- `grooming_add_ons` becomes a VIEW over this table with the same columns, so
-- `create_booking`, the appointment triggers and `/api/grooming/add-ons` read
-- the one list without being rewritten in the same change. The JSON domain is
-- left in place and unread. Both go when every reader has moved.
--
-- Deleting an add-on ARCHIVES it (`archived_at`): it disappears from the list
-- and from anything new, and a booking that used it still resolves.
-- ============================================================================

-- ── Categories ──────────────────────────────────────────────────────────────

create table public.service_add_on_categories (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  name          text not null check (length(btrim(name)) between 1 and 80),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index service_add_on_categories_name_key
  on public.service_add_on_categories (facility_id, lower(btrim(name)));
create index service_add_on_categories_facility_idx
  on public.service_add_on_categories (facility_id);

comment on table public.service_add_on_categories is
  'The headings add-ons are grouped under in Settings > Services > Add-ons, in the order the facility sorted them. Deleting one leaves its add-ons Uncategorized (on delete set null).';

create trigger service_add_on_categories_touch
  before update on public.service_add_on_categories
  for each row execute function private.set_updated_at();

-- ── The add-ons ─────────────────────────────────────────────────────────────

create table public.service_add_ons (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  -- The id the add-on had before this table: a JSON add-on's string id, or a
  -- grooming add-on's legacy id. Resolved alongside `id::text` everywhere.
  legacy_id     text,
  category_id   uuid references public.service_add_on_categories (id) on delete set null,

  -- Basic info
  name          text not null check (length(btrim(name)) between 1 and 120),
  description   text not null default '' check (length(description) <= 2000),
  is_active     boolean not null default true,
  image_url     text check (image_url is null or length(image_url) <= 2048),
  color_code    text check (color_code is null or length(color_code) <= 32),

  -- Businesses: the locations that offer it. Empty = every location.
  location_ids  uuid[] not null default '{}',

  -- Price & duration
  price         numeric(10,2) not null default 0 check (price >= 0),
  taxable       boolean not null default true,
  duration_min  integer not null default 0 check (duration_min between 0 and 1440),

  -- Staff
  requires_staff boolean not null default false,

  -- Applicable services: all of them, including ones created later — or the
  -- services named here. A ref is `boarding:<uuid>`, `daycare:<uuid>`,
  -- `grooming:<uuid>`, `training`, `evaluation` or `custom:<module slug>`.
  applies_to_all_services boolean not null default true,
  service_refs  text[] not null default '{}'
    check (
      cardinality(service_refs) = 0
      or array_to_string(service_refs, ',') ~
         '^((boarding|daycare|grooming):[0-9a-f-]{36}|training|evaluation|custom:[a-z0-9_-]+)(,((boarding|daycare|grooming):[0-9a-f-]{36}|training|evaluation|custom:[a-z0-9_-]+))*$'
    ),

  -- Pet details. Empty = every pet, the services' own convention.
  eligible_species      text[] not null default '{}',
  eligible_breeds       text[] not null default '{}',
  eligible_weight_tiers text[] not null default '{}'
    check (eligible_weight_tiers <@ array['small', 'medium', 'large', 'giant']),
  eligible_coat_types   text[] not null default '{}'
    check (eligible_coat_types <@ array['short', 'medium', 'long', 'wire', 'curly', 'hairless']),

  display_order integer not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index service_add_ons_legacy_key
  on public.service_add_ons (facility_id, legacy_id) where legacy_id is not null;
create index service_add_ons_facility_idx on public.service_add_ons (facility_id);
create index service_add_ons_category_idx on public.service_add_ons (category_id);

comment on table public.service_add_ons is
  'One add-ons list for every service (Settings > Services > Add-ons). Replaced the facility_settings service_addons JSON and grooming_add_ons on 2026-09-26; grooming_add_ons is now a view over it. Delete = archive (archived_at).';
comment on column public.service_add_ons.service_refs is
  'When applies_to_all_services is false: boarding:<uuid> | daycare:<uuid> | grooming:<uuid> | training | evaluation | custom:<slug>.';

create trigger service_add_ons_touch
  before update on public.service_add_ons
  for each row execute function private.set_updated_at();

-- A category and a location must belong to the add-on's own facility. A
-- foreign key cannot say that, and RLS would only hide the mismatch.
create or replace function private.service_add_on_same_facility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.service_add_on_categories c
     where c.id = new.category_id and c.facility_id = new.facility_id
  ) then
    raise exception 'That category belongs to another facility.' using errcode = '23503';
  end if;

  if exists (
    select 1 from unnest(new.location_ids) l(id)
     where not exists (
       select 1 from public.locations x where x.id = l.id and x.facility_id = new.facility_id
     )
  ) then
    raise exception 'That location belongs to another facility.' using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger service_add_ons_same_facility
  before insert or update of category_id, location_ids, facility_id on public.service_add_ons
  for each row execute function private.service_add_on_same_facility();

-- ── Override by business: price, tax, duration per location ────────────────

create table public.service_add_on_location_overrides (
  id           uuid primary key default gen_random_uuid(),
  add_on_id    uuid not null references public.service_add_ons (id) on delete cascade,
  facility_id  uuid not null references public.facilities (id) on delete cascade,
  location_id  uuid not null references public.locations (id) on delete cascade,
  -- Null = the add-on's own value.
  price        numeric(10,2) check (price is null or price >= 0),
  taxable      boolean,
  duration_min integer check (duration_min is null or duration_min between 0 and 1440),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint service_add_on_location_overrides_once unique (add_on_id, location_id)
);

create index service_add_on_location_overrides_facility_idx
  on public.service_add_on_location_overrides (facility_id);

comment on table public.service_add_on_location_overrides is
  'Override by business: a different price, tax or duration for one location. A null column inherits the add-on''s own value.';

create trigger service_add_on_location_overrides_touch
  before update on public.service_add_on_location_overrides
  for each row execute function private.set_updated_at();

-- The facility comes from the add-on, never from the caller; the location must
-- be one of that facility's.
create or replace function private.service_add_on_override_facility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
begin
  select facility_id into v_facility from public.service_add_ons where id = new.add_on_id;
  if v_facility is null then
    raise exception 'Cannot resolve the facility for this row.' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.locations x where x.id = new.location_id and x.facility_id = v_facility
  ) then
    raise exception 'That location belongs to another facility.' using errcode = '23503';
  end if;
  new.facility_id := v_facility;
  return new;
end;
$$;

create trigger service_add_on_override_facility
  before insert or update on public.service_add_on_location_overrides
  for each row execute function private.service_add_on_override_facility();

-- ── Who may read and write ──────────────────────────────────────────────────
--
-- Staff read with `view_services` and write with `manage_services`, like every
-- other menu table. A facility's CLIENTS read what they could book: live
-- add-ons only, and only their own facility's.

alter table public.service_add_on_categories enable row level security;
alter table public.service_add_ons enable row level security;
alter table public.service_add_on_location_overrides enable row level security;

create policy service_add_on_categories_read on public.service_add_on_categories
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );

create policy service_add_on_categories_write on public.service_add_on_categories
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

create policy service_add_ons_read on public.service_add_ons
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or (is_active and archived_at is null
        and facility_id in (select private.client_facility_ids()))
  );

create policy service_add_ons_write on public.service_add_ons
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

create policy service_add_on_location_overrides_read on public.service_add_on_location_overrides
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );

create policy service_add_on_location_overrides_write on public.service_add_on_location_overrides
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

-- Default privileges hand every new table to anon. `public` and `anon` are
-- different grants; both are revoked.
revoke all on public.service_add_on_categories from public, anon;
revoke all on public.service_add_ons from public, anon;
revoke all on public.service_add_on_location_overrides from public, anon;
grant select, insert, update, delete on public.service_add_on_categories to authenticated;
grant select, insert, update, delete on public.service_add_ons to authenticated;
grant select, insert, update, delete on public.service_add_on_location_overrides to authenticated;
grant all on public.service_add_on_categories to service_role;
grant all on public.service_add_ons to service_role;
grant all on public.service_add_on_location_overrides to service_role;

revoke all on function private.service_add_on_same_facility() from public, anon;
revoke all on function private.service_add_on_override_facility() from public, anon;

-- ── Move the JSON categories and add-ons ────────────────────────────────────

insert into public.service_add_on_categories (facility_id, name, display_order)
select s.facility_id,
       btrim(c.value ->> 'name'),
       coalesce(
         case when jsonb_typeof(c.value -> 'sortOrder') = 'number' then (c.value ->> 'sortOrder')::numeric::int end,
         c.ord::int)
  from public.facility_settings s
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(s.value -> 'categories') = 'array' then s.value -> 'categories' else '[]'::jsonb end
  ) with ordinality c(value, ord)
 where s.domain = 'service_addons'
   and nullif(btrim(c.value ->> 'name'), '') is not null
on conflict do nothing;

-- An add-on could name a category the list no longer held (a rename orphaned
-- it); give that name a row rather than drop the grouping.
insert into public.service_add_on_categories (facility_id, name, display_order)
select distinct s.facility_id, btrim(a.value ->> 'category'), 1000
  from public.facility_settings s
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(s.value -> 'addOns') = 'array' then s.value -> 'addOns' else '[]'::jsonb end
  ) a(value)
 where s.domain = 'service_addons'
   and nullif(btrim(a.value ->> 'category'), '') is not null
on conflict do nothing;

insert into public.service_add_ons (
  facility_id, legacy_id, category_id,
  name, description, is_active, image_url, color_code,
  location_ids, price, taxable, duration_min, requires_staff,
  applies_to_all_services, service_refs,
  eligible_species, eligible_breeds, eligible_weight_tiers, eligible_coat_types,
  display_order
)
select
  s.facility_id,
  a.value ->> 'id',
  (select c.id from public.service_add_on_categories c
    where c.facility_id = s.facility_id
      and lower(btrim(c.name)) = lower(btrim(a.value ->> 'category'))),
  coalesce(nullif(btrim(a.value ->> 'name'), ''), 'Add-on'),
  left(coalesce(a.value ->> 'description', ''), 2000),
  coalesce((a.value ->> 'isActive')::boolean, true),
  nullif(btrim(a.value ->> 'image'), ''),
  left(nullif(btrim(a.value ->> 'colorCode'), ''), 32),
  coalesce((
    select array_agg(l.id::uuid)
      from jsonb_array_elements_text(
             case when jsonb_typeof(a.value -> 'locationIds') = 'array' then a.value -> 'locationIds' else '[]'::jsonb end
           ) l(id)
     where l.id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       and exists (select 1 from public.locations x
                    where x.id = l.id::uuid and x.facility_id = s.facility_id)
  ), '{}'),
  case when jsonb_typeof(a.value -> 'price') = 'number'
       then greatest(0, round((a.value ->> 'price')::numeric, 2)) else 0 end,
  -- Absent means taxed, everywhere; only an explicit false stops it.
  not (coalesce((a.value ->> 'taxable')::boolean, true) = false
       or coalesce((a.value ->> 'taxEnabled')::boolean, true) = false),
  case when jsonb_typeof(a.value -> 'duration') = 'number'
       then least(1440, greatest(0, round((a.value ->> 'duration')::numeric)))::int else 0 end,
  coalesce((a.value ->> 'requiresStaff')::boolean, false),
  svc.all_services,
  case when svc.all_services then '{}'::text[] else svc.refs end,
  coalesce((select array_agg(distinct btrim(x)) from jsonb_array_elements_text(
             case when jsonb_typeof(a.value -> 'petTypeFilter' -> 'types') = 'array'
                  then a.value -> 'petTypeFilter' -> 'types' else '[]'::jsonb end) x
            where btrim(x) <> ''), '{}'),
  coalesce((select array_agg(distinct btrim(x)) from jsonb_array_elements_text(
             case when jsonb_typeof(a.value -> 'petTypeFilter' -> 'breeds') = 'array'
                  then a.value -> 'petTypeFilter' -> 'breeds' else '[]'::jsonb end) x
            where btrim(x) <> ''), '{}'),
  -- A pound range becomes the size tiers it overlaps (<=15, 15-35, 35-70, 70+).
  case when a.value -> 'petTypeFilter' ->> 'weightMin' is null
        and a.value -> 'petTypeFilter' ->> 'weightMax' is null then '{}'::text[]
       else coalesce((
         select array_agg(t.tier order by t.ord)
           from (values ('small', 0::numeric, 15::numeric, 1), ('medium', 15, 35, 2),
                        ('large', 35, 70, 3), ('giant', 70, 100000, 4)) t(tier, lo, hi, ord)
          where t.lo <= coalesce((a.value -> 'petTypeFilter' ->> 'weightMax')::numeric, 100000)
            and t.hi >= coalesce((a.value -> 'petTypeFilter' ->> 'weightMin')::numeric, 0)
       ), '{}') end,
  coalesce((select array_agg(distinct lower(btrim(x))) from jsonb_array_elements_text(
             case when jsonb_typeof(a.value -> 'petTypeFilter' -> 'coatTypes') = 'array'
                  then a.value -> 'petTypeFilter' -> 'coatTypes' else '[]'::jsonb end) x
            where lower(btrim(x)) in ('short', 'medium', 'long', 'wire', 'curly', 'hairless')), '{}'),
  coalesce(
    case when jsonb_typeof(a.value -> 'sortOrder') = 'number' then (a.value ->> 'sortOrder')::numeric::int end,
    a.ord::int)
from public.facility_settings s
cross join lateral jsonb_array_elements(
  case when jsonb_typeof(s.value -> 'addOns') = 'array' then s.value -> 'addOns' else '[]'::jsonb end
) with ordinality a(value, ord)
cross join lateral (
  select
    (jsonb_typeof(a.value -> 'applicableServices') <> 'array'
      or jsonb_array_length(a.value -> 'applicableServices') = 0
      or (a.value -> 'applicableServices') ? 'all') as all_services,
    array(
      select 'boarding:' || b.id::text from public.boarding_services b
       where b.facility_id = s.facility_id and (a.value -> 'applicableServices') ? 'boarding'
      union all
      select 'daycare:' || d.id::text from public.daycare_services d
       where d.facility_id = s.facility_id and (a.value -> 'applicableServices') ? 'daycare'
      union all
      select 'grooming:' || g.id::text from public.grooming_services g
       where g.facility_id = s.facility_id and (a.value -> 'applicableServices') ? 'grooming'
      union all
      select 'training' where (a.value -> 'applicableServices') ? 'training'
      union all
      select 'evaluation' where (a.value -> 'applicableServices') ? 'evaluation'
      union all
      select 'custom:' || lower(x)
        from jsonb_array_elements_text(
               case when jsonb_typeof(a.value -> 'applicableServices') = 'array'
                    then a.value -> 'applicableServices' else '[]'::jsonb end) x
       where x not in ('all', 'boarding', 'daycare', 'grooming', 'training', 'evaluation')
         and lower(x) ~ '^[a-z0-9_-]+$'
    ) as refs
) svc
where s.domain = 'service_addons'
  and nullif(btrim(a.value ->> 'id'), '') is not null;

-- ── Move grooming's add-ons, keeping their ids ─────────────────────────────
--
-- A grooming add-on applied to grooming, so it becomes "these services": every
-- grooming service the facility has today.

insert into public.service_add_ons (
  id, facility_id, legacy_id, name, description, is_active,
  price, duration_min, display_order,
  applies_to_all_services, service_refs, created_at, updated_at
)
select g.id, g.facility_id, g.legacy_id, g.name, g.description, g.is_active,
       g.price, g.duration_min, g.display_order,
       false,
       coalesce((select array_agg('grooming:' || gs.id::text order by gs.id)
                   from public.grooming_services gs where gs.facility_id = g.facility_id), '{}'),
       g.created_at, g.updated_at
  from public.grooming_add_ons g;

alter table public.grooming_appointment_add_ons
  drop constraint grooming_appointment_add_ons_add_on_id_fkey,
  add constraint grooming_appointment_add_ons_add_on_id_fkey
    foreign key (add_on_id) references public.service_add_ons (id) on delete set null;

alter table public.grooming_service_default_add_ons
  drop constraint grooming_service_default_add_ons_add_on_id_fkey,
  add constraint grooming_service_default_add_ons_add_on_id_fkey
    foreign key (add_on_id) references public.service_add_ons (id) on delete cascade;

drop table public.grooming_add_ons;

-- ── grooming_add_ons, as the one list sees it ──────────────────────────────
--
-- Same columns as the table it replaces. `security_invoker` makes the caller's
-- row security on service_add_ons apply, so a client still sees live add-ons
-- only; the definer functions that read it (create_booking, the appointment
-- triggers) read it as before.

create view public.grooming_add_ons
  with (security_invoker = true) as
select a.id, a.facility_id, a.legacy_id, a.name, a.description, a.price,
       a.duration_min, a.is_active, a.display_order, a.created_at, a.updated_at
  from public.service_add_ons a
 where a.archived_at is null
   and (a.applies_to_all_services
        or exists (select 1 from unnest(a.service_refs) r(ref) where r.ref like 'grooming:%'));

comment on view public.grooming_add_ons is
  'The add-ons that apply to grooming, from service_add_ons (2026-09-26). Kept so create_booking and /api/grooming/add-ons read the one list unchanged; goes when they read it directly.';

revoke all on public.grooming_add_ons from public, anon;
grant select on public.grooming_add_ons to authenticated, service_role;

-- ── The pre-arrival form offers from the one list ──────────────────────────
--
-- Same contract as before. A booking line is price x quantity, and an add-on
-- belongs to a PET, as it does in the reference: the form is filled in pet by
-- pet, so each pet's request is its own line. Grooming keeps one per pet;
-- everything else lets the client choose how many (up to ten). The old
-- per-day and percentage branches in yipyy_go_price_add_on stay for the
-- offers already written, and nothing new reaches them.

create or replace function private.yipyy_go_offered_add_on(p_booking public.bookings, p_add_on_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'id', coalesce(a.legacy_id, a.id::text),
           'name', a.name,
           'description', a.description,
           'pricingType', case when p_booking.service = 'grooming' then 'flat' else 'per_item' end,
           'price', coalesce(o.price, a.price),
           'unitLabel', '',
           'maxQuantity', case when p_booking.service = 'grooming' then 1 else 10 end,
           'petScope', 'per_pet')
    from public.service_add_ons a
    left join public.service_add_on_location_overrides o
      on o.add_on_id = a.id and o.location_id = p_booking.location_id
   where a.facility_id = p_booking.facility_id
     and (a.legacy_id = p_add_on_id or a.id::text = p_add_on_id)
     and a.is_active
     and a.archived_at is null
     and (cardinality(a.location_ids) = 0
          or (p_booking.location_id is not null and p_booking.location_id = any (a.location_ids)))
     and (a.applies_to_all_services
          or exists (
            select 1 from unnest(a.service_refs) r(ref)
             where r.ref = p_booking.service
                or r.ref like p_booking.service || ':%'
                or r.ref = 'custom:' || p_booking.service))
   limit 1;
$$;

create or replace function public.yipyy_go_offered_add_ons(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found
     or not (
       private.yipyy_go_is_owner(v_booking.client_id)
       or private.has_permission(v_booking.facility_id, 'view_bookings')
     )
  then
    raise exception 'That booking is not yours.' using errcode = '42501';
  end if;

  if private.yipyy_go_requirement(v_booking.facility_id, v_booking.service) is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', o.offer ->> 'id',
             'name', o.offer ->> 'name',
             'description', o.offer ->> 'description',
             'pricingType', o.offer ->> 'pricingType',
             'unitPrice', pr.unit_price,
             'unitLabel', o.offer ->> 'unitLabel',
             'maxQuantity', (o.offer ->> 'maxQuantity')::int,
             'petScope', o.offer ->> 'petScope'
           ) order by o.ord)
      from (
        select private.yipyy_go_offered_add_on(v_booking, coalesce(a.legacy_id, a.id::text)) as offer,
               a.display_order::bigint as ord
          from public.service_add_ons a
         where a.facility_id = v_booking.facility_id
           and a.archived_at is null
      ) o
      cross join lateral private.yipyy_go_price_add_on(v_booking, o.offer, 1) pr
     where o.offer is not null
  ), '[]'::jsonb);
end;
$$;
