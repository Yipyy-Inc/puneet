-- ============================================================================
-- Prepaid packages: the catalogue, what a customer bought, and what they used.
--
-- The last thing keeping `applyPaymentResult` partly fictional. A payment can
-- already record WHICH pass was redeemed (20260806220000); nothing decrements a
-- count, because nothing counts. `redeemPackagePass` mutates a module-level
-- array, so a 10-pack is back to ten passes on reload.
--
-- ── DECISION 1: THE REMAINING COUNT IS DERIVED. IT WAS STORED THREE TIMES ──
--
-- `redeemPackagePass` in the mock updates all of:
--
--   pkg.passesUsed = nextPassNumber
--   pkg.passes[0].usedPasses = nextPassNumber
--   pkg.redemptions.push(...)
--
-- Three representations of one fact, kept in step by hand. Any code path that
-- forgets one leaves a customer with passes they did not buy or lost passes
-- they did — and the fix is not "be careful", it is to stop storing it.
--
-- `customer_packages.passes_total` is a fact of the PURCHASE and stays. What
-- has been consumed is `package_pass_entries`, and what is left is the sum.
-- `customer_package_status` below is the only place that arithmetic is written.
--
-- ── DECISION 2: THE LEDGER IS SIGNED, SO A REVERSAL IS AN ENTRY ────────────
--
-- Same shape as the store-credit ledger, and for the same reason: a booking
-- cancelled after its pass was redeemed has to give the pass back. With a
-- `passes_used` counter that is an UPDATE; with an append-only log of
-- redemptions it needs a `voided` flag, which is an update wearing a hat.
--
-- Signed entries make it an insert: -1 to redeem, +1 to reverse, and the
-- remaining count is still just a sum. `pass_number` is therefore NOT stored —
-- it was `passesUsed + 1` in the mock, which stops being meaningful the moment
-- anything is reversed. Redemptions are ordered by time, like everything else.
--
-- ── DECISION 3: STATUS IS DERIVED TOO ─────────────────────────────────────
--
-- `CustomerPackage.status` is one of active / exhausted / expired. Stored, it
-- is wrong the moment a package expires with nobody looking at it — expiry is a
-- function of the clock, and no write happens when a date passes. The view
-- computes it from `expires_at` and the remaining count.
--
-- ── DECISION 4: THE PURCHASE SNAPSHOTS ITS TERMS ──────────────────────────
--
-- `passes_total` and `price_paid` live on the purchase, not on a join to the
-- catalogue. A facility that reprices a 10-pack or turns it into a 12-pack must
-- not retroactively change what somebody already bought — the same reason
-- `grooming_appointments` snapshots its service name and price.
-- ============================================================================

-- ── The catalogue ───────────────────────────────────────────────────────────

create table public.prepaid_packages (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  legacy_id text,

  name        text not null check (length(btrim(name)) > 0),
  description text not null default '',
  price       numeric(10,2) not null check (price >= 0),

  -- Which module the passes are good for ('grooming', 'daycare', …). Text
  -- rather than an enum: `bookings.service` is text too, and a second
  -- vocabulary for the same idea is how the two drift.
  service_id text not null,

  total_passes integer not null check (total_passes > 0),
  -- Null means it never expires, which is different from expiring today.
  expiration_days integer check (expiration_days is null or expiration_days > 0),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint prepaid_packages_legacy_key unique (facility_id, legacy_id)
);

create index prepaid_packages_facility_idx
  on public.prepaid_packages (facility_id, service_id) where is_active;

-- ── What a customer bought ──────────────────────────────────────────────────

create table public.customer_packages (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  legacy_id text,

  client_id uuid not null references public.clients (id) on delete cascade,
  -- `on delete set null`: retiring a package from the menu must not delete what
  -- somebody already paid for. The terms are snapshotted below, so the purchase
  -- survives intact.
  package_id uuid references public.prepaid_packages (id) on delete set null,

  -- Snapshotted terms. See Decision 4.
  package_name text not null,
  service_id   text not null,
  passes_total integer not null check (passes_total > 0),
  price_paid   numeric(10,2) not null check (price_paid >= 0),

  purchased_at timestamptz not null default now(),
  expires_at   timestamptz,

  -- NO passes_used AND NO status. Both are derived — Decisions 1 and 3.

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint customer_packages_legacy_key unique (facility_id, legacy_id)
);

create index customer_packages_client_idx
  on public.customer_packages (facility_id, client_id);

comment on table public.customer_packages is
  'A prepaid package purchase. Carries NO passes_used and NO status — both are derived; see Decisions 1 and 3 in 20260806280000.';

-- ── The pass ledger ─────────────────────────────────────────────────────────

create table public.package_pass_entries (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  customer_package_id uuid not null
    references public.customer_packages (id) on delete cascade,

  -- Signed. -1 spends a pass, +1 gives one back. Zero is not an event.
  passes integer not null check (passes <> 0),

  reason text not null check (reason in ('redeemed', 'reversed', 'adjustment')),

  -- What the pass was spent on. Identifiers, because a booking or pet being
  -- removed must not erase the record that a pass was consumed.
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
  on public.package_pass_entries (customer_package_id, created_at);

comment on table public.package_pass_entries is
  'Signed ledger of pass consumption. A reversal is an entry, not an edit — see Decision 2 in 20260806280000.';

-- ── The derived view ────────────────────────────────────────────────────────
--
-- The only place "how many passes are left" and "is this package usable" are
-- written. `security_invoker` so the caller's RLS still applies — a view is not
-- a way around a policy.

create view public.customer_package_status
with (security_invoker = true) as
  select
    cp.id,
    cp.facility_id,
    cp.client_id,
    cp.package_name,
    cp.service_id,
    cp.passes_total,
    cp.price_paid,
    cp.purchased_at,
    cp.expires_at,
    cp.passes_total + coalesce(sum(e.passes), 0) as passes_remaining,
    cp.passes_total - (cp.passes_total + coalesce(sum(e.passes), 0))
      as passes_used,
    case
      when cp.expires_at is not null and cp.expires_at < now() then 'expired'
      when cp.passes_total + coalesce(sum(e.passes), 0) <= 0 then 'exhausted'
      else 'active'
    end as status
  from public.customer_packages cp
  left join public.package_pass_entries e
    on e.customer_package_id = cp.id
  group by cp.id;

comment on view public.customer_package_status is
  'Derived pass count and status. Expiry is a function of the clock, so storing status would make it wrong the moment a package lapses unobserved.';

-- ── Redemption, as one transaction ──────────────────────────────────────────
--
-- Checking "are there passes left" and then inserting the entry are two steps,
-- and between them another till can redeem the last pass. The check and the
-- write belong in one statement.
--
-- SECURITY INVOKER: the insert is still subject to the ledger's own policy.
-- This function exists for atomicity, not for authority.

create or replace function public.redeem_package_pass(
  p_customer_package_id uuid,
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
  v_remaining integer;
  v_status text;
begin
  -- Locking the purchase row serialises concurrent redemptions of the same
  -- package: the second waits, re-reads, and finds the pass gone.
  select cp.facility_id into v_facility
    from public.customer_packages cp
   where cp.id = p_customer_package_id
     for update;

  if v_facility is null then
    raise exception 'That package does not exist, or is not yours.'
      using errcode = 'no_data_found';
  end if;

  select s.passes_remaining, s.status into v_remaining, v_status
    from public.customer_package_status s
   where s.id = p_customer_package_id;

  if v_status = 'expired' then
    raise exception 'That package has expired.' using errcode = '23514';
  end if;
  if v_remaining <= 0 then
    raise exception 'That package has no passes left.' using errcode = '23514';
  end if;

  insert into public.package_pass_entries
    (facility_id, customer_package_id, passes, reason,
     booking_id, pet_id, pet_name, service_label)
  values
    (v_facility, p_customer_package_id, -1, 'redeemed',
     p_booking_id, p_pet_id, p_pet_name, coalesce(p_service_label, ''));

  return v_remaining - 1;
end;
$$;

comment on function public.redeem_package_pass is
  'Spends one pass, checking availability and writing the entry in one transaction. SECURITY INVOKER — the ledger policy still applies.';

-- ── Author + updated_at ─────────────────────────────────────────────────────

create trigger package_pass_entries_author
  before insert on public.package_pass_entries
  for each row execute function private.stamp_author();

create trigger prepaid_packages_touch
  before update on public.prepaid_packages
  for each row execute function private.set_updated_at();
create trigger customer_packages_touch
  before update on public.customer_packages
  for each row execute function private.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- The catalogue is a menu: `view_services` reads it, `manage_services` edits
-- it — the same pair the grooming service catalogue uses, because it is the
-- same kind of thing.
--
-- A purchase and its ledger are money: `financial_view_amounts` reads,
-- `financial_take_payment` writes. Selling a package and spending a pass are
-- both taking payment; neither is a refund.

alter table public.prepaid_packages enable row level security;
alter table public.customer_packages enable row level security;
alter table public.package_pass_entries enable row level security;

create policy prepaid_packages_read on public.prepaid_packages
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
  );
create policy prepaid_packages_write on public.prepaid_packages
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

create policy customer_packages_read on public.customer_packages
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'financial_view_amounts')
  );
create policy customer_packages_insert on public.customer_packages
  for insert to authenticated
  with check (private.has_permission(facility_id, 'financial_take_payment'));
-- Update exists for the terms a facility can legitimately correct after a sale
-- — an expiry extended as a goodwill gesture. NOT the pass count, which has no
-- column here to change.
create policy customer_packages_update on public.customer_packages
  for update to authenticated
  using (private.has_permission(facility_id, 'financial_take_payment'))
  with check (private.has_permission(facility_id, 'financial_take_payment'));

create policy package_pass_entries_read on public.package_pass_entries
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'financial_view_amounts')
  );
create policy package_pass_entries_insert on public.package_pass_entries
  for insert to authenticated
  with check (private.has_permission(facility_id, 'financial_take_payment'));
-- No update, no delete. A pass that was spent was spent; giving it back is a
-- `reversed` entry, which is why the ledger is signed.

revoke execute on function public.redeem_package_pass(uuid, text, uuid, uuid, text) from public;
revoke execute on function public.redeem_package_pass(uuid, text, uuid, uuid, text) from anon;
grant execute on function public.redeem_package_pass(uuid, text, uuid, uuid, text) to authenticated;

grant select on public.customer_package_status to authenticated;
