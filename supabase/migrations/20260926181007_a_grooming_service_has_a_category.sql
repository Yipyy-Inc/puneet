-- ============================================================================
-- A grooming service can be filed under a category, as a boarding rate and a
-- daycare service already can.
--
-- The client asked for a Categories button on grooming's Rates page like the
-- ones on boarding's and daycare's. Those two menus have had a category table
-- since 20260924210000 and 20260924120000; grooming's services were one flat
-- list with nowhere to put a heading.
--
-- The same table, the same `on delete set null` — removing a category keeps
-- its services, uncategorised (service-category-crud C3) — and the same
-- policies: read by whoever may read the menu, written with `manage_services`,
-- the permission grooming's own services are written with.
-- ============================================================================

create table if not exists public.grooming_service_categories (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities (id) on delete cascade,
  name          text not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint grooming_service_categories_name_key unique (facility_id, name)
);

create index if not exists grooming_service_categories_facility_idx
  on public.grooming_service_categories (facility_id);

comment on table public.grooming_service_categories is
  'A heading grooming services are grouped under on the Rates page — the twin of boarding_service_categories and daycare_service_categories.';

alter table public.grooming_services
  add column if not exists category_id uuid
    references public.grooming_service_categories (id) on delete set null;

create index if not exists grooming_services_category_idx
  on public.grooming_services (category_id);

alter table public.grooming_service_categories enable row level security;

drop policy if exists grooming_service_categories_read on public.grooming_service_categories;
create policy grooming_service_categories_read on public.grooming_service_categories
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
    or facility_id in (select private.client_facility_ids())
  );

drop policy if exists grooming_service_categories_write on public.grooming_service_categories;
create policy grooming_service_categories_write on public.grooming_service_categories
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
