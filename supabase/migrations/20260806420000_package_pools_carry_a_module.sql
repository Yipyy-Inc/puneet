-- ============================================================================
-- A pass pool says which module it is for.
--
-- ── WHY THIS IS ON THE LINE AND NOT ON THE PACKAGE ────────────────────────
--
-- The obvious place is `prepaid_packages.module` — a package is a grooming
-- package or a daycare package. That is wrong, and the customer portal's own
-- catalogue is the proof:
--
--   "Weekend Getaway"    2 nights boarding + 1 bath & brush
--   "Vacation Package"   7 nights luxury suite + 1 full groom
--
-- Both are sold as one package and redeemed at two different counters. A module
-- on the package could not describe either of them, and the record the app
-- already consumes agrees: `passes[].moduleId` has always been per-pool.
--
-- ── THE CONSTANT IT REPLACES WAS TRUE, AND ABOUT TO STOP BEING ────────────
--
-- `rowToCustomerPackage` hardcoded `moduleId: "grooming"`, flagged at the time
-- as true-but-guessed: `customer_packages` hung off `prepaid_packages`, which
-- held only the grooming catalogue. Seeding the portal's daycare, boarding and
-- training packages is exactly the change that makes it a lie, so the column
-- lands first.
--
-- ── WHY A BACKFILL DEFAULT AND THEN NO DEFAULT ────────────────────────────
--
-- Every existing row IS grooming, so `default 'grooming'` fills them correctly
-- rather than by assumption. The default is then DROPPED: a new pool that
-- forgets to say which counter can spend it would silently become a grooming
-- pass, and a boarding pass that reads as a grooming pass is a pass the wrong
-- counter can spend.
--
-- `service_module` already exists as an enum (grooming, training, daycare,
-- boarding, reception, retail, sanitation, transport). Reusing it rather than
-- adding a parallel text+CHECK, because two lists of the same modules is how
-- they drift.
-- ============================================================================

alter table public.prepaid_package_lines
  add column module public.service_module not null default 'grooming';
alter table public.prepaid_package_lines
  alter column module drop default;

alter table public.customer_package_lines
  add column module public.service_module not null default 'grooming';
alter table public.customer_package_lines
  alter column module drop default;

comment on column public.prepaid_package_lines.module is
  'Which counter can spend this pool. Per-line because a package may bundle '
  'services from more than one module (boarding + grooming).';
comment on column public.customer_package_lines.module is
  'Copied from the catalogue line at purchase time, like the rest of the terms.';

-- ── The sale copies it, like every other term ───────────────────────────────
--
-- Unchanged except for the module in the pool copy. Restated in full rather
-- than patched, because a `create or replace` that silently dropped a check
-- would be worse than the duplication.

create or replace function public.purchase_package(
  p_client_id uuid,
  p_package_id uuid,
  p_price_override numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pkg    record;
  v_client uuid;
  v_cp     uuid;
begin
  select p.id, p.facility_id, p.name, p.package_price, p.validity_days, p.status
    into v_pkg
    from public.prepaid_packages p
   where p.id = p_package_id;

  if v_pkg.id is null then
    raise exception 'That package does not exist, or is not yours.'
      using errcode = 'no_data_found';
  end if;

  if v_pkg.status <> 'active' and v_pkg.status <> 'seasonal' then
    raise exception 'That package is not on sale.' using errcode = '23514';
  end if;

  select c.id into v_client
    from public.clients c
   where c.id = p_client_id and c.facility_id = v_pkg.facility_id;

  if v_client is null then
    raise exception 'That client is not at this facility.'
      using errcode = 'no_data_found';
  end if;

  if not exists (select 1 from public.prepaid_package_lines l
                  where l.package_id = v_pkg.id) then
    raise exception 'That package has nothing in it.' using errcode = '23514';
  end if;

  if p_price_override is not null and p_price_override < 0 then
    raise exception 'A package cannot be sold for less than nothing.'
      using errcode = '23514';
  end if;

  insert into public.customer_packages
    (facility_id, client_id, package_id, package_name, price_paid,
     purchased_at, expires_at)
  values
    (v_pkg.facility_id, v_client, v_pkg.id, v_pkg.name,
     coalesce(p_price_override, v_pkg.package_price),
     now(), now() + make_interval(days => v_pkg.validity_days))
  returning id into v_cp;

  insert into public.customer_package_lines
    (customer_package_id, service_id, service_name, passes_total, module)
  select v_cp, l.service_id, l.service_name, l.quantity, l.module
    from public.prepaid_package_lines l
   where l.package_id = v_pkg.id;

  return v_cp;
end;
$$;

revoke execute on function public.purchase_package(uuid, uuid, numeric)
  from public, anon;
grant execute on function public.purchase_package(uuid, uuid, numeric)
  to authenticated;

-- ── The pool view carries it through ───────────────────────────────────────
--
-- `module` is APPENDED rather than slotted in beside `service_name` where it
-- belongs, because `create or replace view` can only add columns at the end —
-- inserting one renames every column after it, which Postgres refuses. The
-- alternative is `drop view ... cascade`, which would take
-- `customer_package_status` with it and rebuild both to fix a column order
-- nothing selects by position. Untidy on purpose.

create or replace view public.customer_package_pool_status
with (security_invoker = true) as
  select
    cp.id as customer_package_id,
    cp.facility_id,
    cp.client_id,
    l.service_id,
    l.service_name,
    l.passes_total,
    l.passes_total + coalesce(sum(e.passes), 0) as passes_remaining,
    l.module
  from public.customer_packages cp
  join public.customer_package_lines l
    on l.customer_package_id = cp.id
  left join public.package_pass_entries e
    on e.customer_package_id = cp.id and e.service_id = l.service_id
  group by cp.id, l.id;
