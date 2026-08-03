-- ============================================================================
-- REBUILD: the package tables modelled the wrong one of three package types.
--
-- 20260806280000 was built against `PrepaidPackage` in src/types/packages.ts —
-- one service, one pass count, one price. The screen that facilities actually
-- use (`GroomingPrepaidPackages`) edits a different, richer type in
-- src/data/grooming-prepaid-packages.ts, and `gpp-003` in that fixture bundles
-- TWO services. A single pool of passes cannot express "5 Full Grooms and 2
-- Nail Trims", which is a package the product already ships.
--
-- Caught before any UI was built on it and before a single row existed, so this
-- drops and recreates rather than patching a shape nothing depends on.
--
-- ── DECISION 1: FOUR OF THE SIX MONEY/COUNT FIELDS ARE DERIVED ─────────────
--
-- `GroomingPrepaidPackage` stores all of:
--
--   regularPrice        = sum(quantity × pricePerSession) over the lines
--   packagePrice        ← the only real input
--   savings             = regularPrice − packagePrice
--   savingsPercentage   = savings / regularPrice × 100
--   purchaseCount       = how many customers bought it
--   validityDays        ← a real input
--
-- Four of those are consequences of the other two plus the lines, and the
-- fixture already carries them independently — `gpp-001` says savings 50 and
-- 15.4%, both of which are just arithmetic. Storing an arithmetic result is
-- storing a value that can disagree with its own inputs, and the screen edits
-- the inputs.
--
-- So the table holds `package_price` and `validity_days`. Everything else comes
-- from `prepaid_package_pricing`. `purchase_count` is a count of purchases,
-- which is the one number nobody should ever be able to type.
--
-- ── DECISION 2: PASSES ARE POOLED PER SERVICE ─────────────────────────────
--
-- The consequence of multi-service bundles. A purchase gets one row per
-- service, each with its own `passes_total`, and every ledger entry names the
-- pool it draws from. Without that, redeeming a Nail Trim could silently eat a
-- Full Groom pass — the counts would still balance, and the customer would
-- discover it at the counter.
--
-- ── DECISION 3: THE POLICY IS COLUMNS, NOT JSONB ──────────────────────────
--
-- Seven fields, and two of them constrain each other: a refund amount is
-- meaningless unless refunds are allowed, and an extension fee is meaningless
-- unless extensions are. Columns make that a CHECK. `session_progress` earned
-- jsonb because nothing branches on it; this is the opposite — a refund policy
-- is read to decide what a customer is owed.
-- ============================================================================

drop function if exists public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, uuid, text, text
);
drop function if exists public.redeem_package_pass(uuid, text, uuid, uuid, text);
drop view if exists public.customer_package_status;
drop table if exists public.package_pass_entries;
drop table if exists public.customer_packages;
drop table if exists public.prepaid_packages;

-- ── The catalogue ───────────────────────────────────────────────────────────

create table public.prepaid_packages (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  legacy_id text,

  name        text not null check (length(btrim(name)) > 0),
  description text not null default '',

  -- The only price that is an input. See Decision 1.
  package_price numeric(10,2) not null check (package_price >= 0),
  validity_days integer not null check (validity_days > 0),

  status text not null default 'active'
    check (status in ('active', 'inactive', 'seasonal')),
  is_popular boolean not null default false,

  -- The policy, as columns. See Decision 3.
  allow_refund_unused        boolean not null default false,
  refund_per_unused_pass     numeric(10,2) check (refund_per_unused_pass is null
                                                  or refund_per_unused_pass >= 0),
  allow_store_credit_on_cancel boolean not null default true,
  allow_transfer             boolean not null default false,
  allow_extension            boolean not null default true,
  max_extension_days         integer not null default 30 check (max_extension_days >= 0),
  extension_fee              numeric(10,2) not null default 0 check (extension_fee >= 0),
  policy_notes               text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prepaid_packages_legacy_key unique (facility_id, legacy_id),

  -- A refund amount with refunds switched off is a number nobody will honour.
  constraint prepaid_packages_refund_policy_coherent
    check (allow_refund_unused or refund_per_unused_pass is null),
  -- An extension window or fee with extensions switched off is the same.
  constraint prepaid_packages_extension_policy_coherent
    check (allow_extension or (max_extension_days = 0 and extension_fee = 0))
);

create index prepaid_packages_facility_idx
  on public.prepaid_packages (facility_id, status);

-- What is in the bundle. One row per service.
create table public.prepaid_package_lines (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null
    references public.prepaid_packages (id) on delete cascade,

  -- The grooming service's legacy id ('groom-pkg-002'). Text, matching how
  -- every other grooming table addresses the catalogue.
  service_id   text not null,
  service_name text not null,
  quantity     integer not null check (quantity > 0),
  -- Snapshotted when the package was built: the à-la-carte comparison must not
  -- move when the facility reprices the service.
  price_per_session numeric(10,2) not null check (price_per_session >= 0),

  constraint prepaid_package_lines_one_per_service unique (package_id, service_id)
);

create index prepaid_package_lines_package_idx
  on public.prepaid_package_lines (package_id);

-- ── What a customer bought ──────────────────────────────────────────────────

create table public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  legacy_id text,

  client_id uuid not null references public.clients (id) on delete cascade,
  package_id uuid references public.prepaid_packages (id) on delete set null,

  -- Snapshotted terms: retiring or repricing a package must not rewrite what
  -- somebody already paid.
  package_name text not null,
  price_paid   numeric(10,2) not null check (price_paid >= 0),

  purchased_at timestamptz not null default now(),
  expires_at   timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customer_packages_legacy_key unique (facility_id, legacy_id)
);

create index customer_packages_client_idx
  on public.customer_packages (facility_id, client_id);

-- One pool per service. See Decision 2.
create table public.customer_package_lines (
  id uuid primary key default gen_random_uuid(),
  customer_package_id uuid not null
    references public.customer_packages (id) on delete cascade,
  service_id   text not null,
  service_name text not null,
  passes_total integer not null check (passes_total > 0),

  constraint customer_package_lines_one_per_service
    unique (customer_package_id, service_id)
);

-- The four derived figures, in one place.
create view public.prepaid_package_pricing
with (security_invoker = true) as
  select
    p.id,
    p.facility_id,
    p.package_price,
    coalesce(sum(l.quantity * l.price_per_session), 0) as regular_price,
    coalesce(sum(l.quantity), 0)                       as total_passes,
    coalesce(sum(l.quantity * l.price_per_session), 0) - p.package_price
      as savings,
    case
      when coalesce(sum(l.quantity * l.price_per_session), 0) > 0
        then round(
          (coalesce(sum(l.quantity * l.price_per_session), 0) - p.package_price)
          / sum(l.quantity * l.price_per_session) * 100, 1)
      else 0
    end as savings_percentage,
    (select count(*) from public.customer_packages cp where cp.package_id = p.id)
      as purchase_count
  from public.prepaid_packages p
  left join public.prepaid_package_lines l on l.package_id = p.id
  group by p.id;

-- ── The pass ledger ─────────────────────────────────────────────────────────

create table public.package_pass_entries (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  customer_package_id uuid not null
    references public.customer_packages (id) on delete cascade,

  -- WHICH POOL. The whole point of Decision 2 — a Nail Trim redemption must not
  -- be able to eat a Full Groom pass.
  service_id text not null,

  passes integer not null check (passes <> 0),
  reason text not null check (reason in ('redeemed', 'reversed', 'adjustment')),

  booking_id uuid,
  pet_id     uuid,
  pet_name   text,
  service_label text not null default '',
  note text not null default '',

  author_name text not null default 'Staff',
  created_by  uuid,
  created_at  timestamptz not null default now(),

  constraint package_pass_sign_matches_reason check (
    case reason
      when 'redeemed'   then passes < 0
      when 'reversed'   then passes > 0
      when 'adjustment' then true
    end
  )
);

create index package_pass_entries_package_idx
  on public.package_pass_entries (customer_package_id, service_id, created_at);

-- ── Derived state, per pool and per package ─────────────────────────────────

create view public.customer_package_pool_status
with (security_invoker = true) as
  select
    cp.id as customer_package_id,
    cp.facility_id,
    cp.client_id,
    l.service_id,
    l.service_name,
    l.passes_total,
    l.passes_total + coalesce(sum(e.passes), 0) as passes_remaining
  from public.customer_packages cp
  join public.customer_package_lines l
    on l.customer_package_id = cp.id
  left join public.package_pass_entries e
    on e.customer_package_id = cp.id and e.service_id = l.service_id
  group by cp.id, l.id;

create view public.customer_package_status
with (security_invoker = true) as
  select
    cp.id,
    cp.facility_id,
    cp.client_id,
    cp.package_name,
    cp.price_paid,
    cp.purchased_at,
    cp.expires_at,
    coalesce(sum(s.passes_total), 0)     as passes_total,
    coalesce(sum(s.passes_remaining), 0) as passes_remaining,
    coalesce(sum(s.passes_total), 0) - coalesce(sum(s.passes_remaining), 0)
      as passes_used,
    case
      when cp.expires_at is not null and cp.expires_at < now() then 'expired'
      when coalesce(sum(s.passes_remaining), 0) <= 0 then 'exhausted'
      else 'active'
    end as status
  from public.customer_packages cp
  left join public.customer_package_pool_status s
    on s.customer_package_id = cp.id
  group by cp.id;

-- ── Redemption, from a named pool ───────────────────────────────────────────

create or replace function public.redeem_package_pass(
  p_customer_package_id uuid,
  p_service_id text,
  p_service_label text default '',
  p_booking_id uuid default null,
  p_pet_id uuid default null,
  p_pet_name text default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_facility uuid;
  v_expires timestamptz;
  v_remaining integer;
begin
  select cp.facility_id, cp.expires_at into v_facility, v_expires
    from public.customer_packages cp
   where cp.id = p_customer_package_id
     for update;

  if v_facility is null then
    raise exception 'That package does not exist, or is not yours.'
      using errcode = 'no_data_found';
  end if;
  if v_expires is not null and v_expires < now() then
    raise exception 'That package has expired.' using errcode = '23514';
  end if;

  select s.passes_remaining into v_remaining
    from public.customer_package_pool_status s
   where s.customer_package_id = p_customer_package_id
     and s.service_id = p_service_id;

  if v_remaining is null then
    raise exception 'That package does not include that service.'
      using errcode = '23514';
  end if;
  if v_remaining <= 0 then
    raise exception 'No passes left for that service.' using errcode = '23514';
  end if;

  insert into public.package_pass_entries
    (facility_id, customer_package_id, service_id, passes, reason,
     booking_id, pet_id, pet_name, service_label)
  values
    (v_facility, p_customer_package_id, p_service_id, -1, 'redeemed',
     p_booking_id, p_pet_id, p_pet_name, coalesce(p_service_label, ''));

  return v_remaining - 1;
end;
$$;

-- ── record_payment, rebuilt against the new signature ──────────────────────

create or replace function public.record_payment(
  p_facility_id uuid,
  p_method text,
  p_subtotal numeric,
  p_tax numeric,
  p_tip numeric,
  p_amount_charged numeric,
  p_grand_total numeric,
  p_booking_id uuid default null,
  p_client_id uuid default null,
  p_store_credit_applied numeric default 0,
  p_package_pass_applied numeric default 0,
  p_loyalty_discount_applied numeric default 0,
  p_cash_received numeric default null,
  p_saved_card_id text default null,
  p_package_pass_id text default null,
  p_receipt_channels text[] default '{}',
  p_credit_note text default '',
  p_customer_package_id uuid default null,
  p_package_service_id text default null,
  p_pet_id uuid default null,
  p_pet_name text default null,
  p_service_label text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_passes_remaining integer;
begin
  insert into public.payments
    (facility_id, booking_id, client_id, method,
     subtotal, tax, tip,
     store_credit_applied, package_pass_applied, loyalty_discount_applied,
     amount_charged, grand_total,
     cash_received, saved_card_id, package_pass_id, receipt_channels)
  values
    (p_facility_id, p_booking_id, p_client_id, p_method,
     p_subtotal, p_tax, p_tip,
     p_store_credit_applied, p_package_pass_applied, p_loyalty_discount_applied,
     p_amount_charged, p_grand_total,
     p_cash_received, p_saved_card_id, p_package_pass_id, p_receipt_channels)
  returning id into v_payment_id;

  if p_store_credit_applied > 0 then
    if p_client_id is null then
      raise exception 'Store credit cannot be applied without a client.'
        using errcode = '23502';
    end if;
    insert into public.store_credit_entries
      (facility_id, client_id, amount, reason, note, booking_id, payment_id)
    values
      (p_facility_id, p_client_id, -p_store_credit_applied, 'redeemed',
       p_credit_note, p_booking_id, v_payment_id);
  end if;

  if p_customer_package_id is not null then
    if p_package_service_id is null then
      raise exception 'A pass redemption must name which service it is for.'
        using errcode = '23502';
    end if;
    v_passes_remaining := public.redeem_package_pass(
      p_customer_package_id, p_package_service_id, p_service_label,
      p_booking_id, p_pet_id, p_pet_name
    );
  end if;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'passes_remaining', v_passes_remaining
  );
end;
$$;

-- ── Triggers, RLS, grants ───────────────────────────────────────────────────

create trigger package_pass_entries_author
  before insert on public.package_pass_entries
  for each row execute function private.stamp_author();
create trigger prepaid_packages_touch
  before update on public.prepaid_packages
  for each row execute function private.set_updated_at();
create trigger customer_packages_touch
  before update on public.customer_packages
  for each row execute function private.set_updated_at();

alter table public.prepaid_packages enable row level security;
alter table public.prepaid_package_lines enable row level security;
alter table public.customer_packages enable row level security;
alter table public.customer_package_lines enable row level security;
alter table public.package_pass_entries enable row level security;

create policy prepaid_packages_read on public.prepaid_packages
  for select to authenticated
  using (private.is_platform_admin()
         or private.has_permission(facility_id, 'view_services'));
create policy prepaid_packages_write on public.prepaid_packages
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

-- The lines inherit the package's visibility: a bundle's contents are the
-- bundle. Mirroring the parent is right here because the child IS part of what
-- the parent shows — the distinction drawn in 20260806140000.
create policy prepaid_package_lines_read on public.prepaid_package_lines
  for select to authenticated
  using (exists (select 1 from public.prepaid_packages p where p.id = package_id));
create policy prepaid_package_lines_write on public.prepaid_package_lines
  for all to authenticated
  using (exists (select 1 from public.prepaid_packages p
                  where p.id = package_id
                    and private.has_permission(p.facility_id, 'manage_services')))
  with check (exists (select 1 from public.prepaid_packages p
                       where p.id = package_id
                         and private.has_permission(p.facility_id, 'manage_services')));

create policy customer_packages_read on public.customer_packages
  for select to authenticated
  using (private.is_platform_admin()
         or private.has_permission(facility_id, 'financial_view_amounts'));
create policy customer_packages_insert on public.customer_packages
  for insert to authenticated
  with check (private.has_permission(facility_id, 'financial_take_payment'));
create policy customer_packages_update on public.customer_packages
  for update to authenticated
  using (private.has_permission(facility_id, 'financial_take_payment'))
  with check (private.has_permission(facility_id, 'financial_take_payment'));

create policy customer_package_lines_read on public.customer_package_lines
  for select to authenticated
  using (exists (select 1 from public.customer_packages cp
                  where cp.id = customer_package_id));
create policy customer_package_lines_insert on public.customer_package_lines
  for insert to authenticated
  with check (exists (select 1 from public.customer_packages cp
                       where cp.id = customer_package_id
                         and private.has_permission(cp.facility_id, 'financial_take_payment')));

create policy package_pass_entries_read on public.package_pass_entries
  for select to authenticated
  using (private.is_platform_admin()
         or private.has_permission(facility_id, 'financial_view_amounts'));
create policy package_pass_entries_insert on public.package_pass_entries
  for insert to authenticated
  with check (private.has_permission(facility_id, 'financial_take_payment'));

revoke execute on function public.redeem_package_pass(uuid, text, text, uuid, uuid, text) from public;
revoke execute on function public.redeem_package_pass(uuid, text, text, uuid, uuid, text) from anon;
grant execute on function public.redeem_package_pass(uuid, text, text, uuid, uuid, text) to authenticated;

revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, text, uuid, text, text
) from public;
revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, text, uuid, text, text
) from anon;
grant execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, text, uuid, text, text
) to authenticated;

grant select on public.prepaid_package_pricing to authenticated;
grant select on public.customer_package_pool_status to authenticated;
grant select on public.customer_package_status to authenticated;
