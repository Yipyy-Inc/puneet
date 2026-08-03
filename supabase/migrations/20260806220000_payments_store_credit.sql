-- ============================================================================
-- Money: payments taken, and the store-credit ledger.
--
-- The check-in board's last local-only surface. `PaymentResult` — method,
-- tender, tip, tax, store credit applied, pass redeemed, what was actually
-- charged — is assembled by the payment dialog and then dropped on the floor.
-- `bookings.payment_status` flips to `paid` and nothing records who took what.
--
-- ── DECISION 1: A PAYMENT IS IMMUTABLE, AND A REFUND IS A NEW ROW ──────────
--
-- Same three layers as the history trail (20260806160000) and for a stronger
-- reason: a payment that happened, happened. If the row can be edited then the
-- record of what a customer was charged is whatever the last person to touch it
-- says, and the business has no books.
--
-- So: trigger, REVOKE by name, RLS with no update or delete policies. The
-- trigger is the binding layer because RLS is bypassed by service_role and
-- GRANTs by the table owner.
--
-- AND THEREFORE NO FOREIGN KEYS — the rule that fell out of 20260806160000.
-- Every FK action is a mutation the trigger must refuse: `on delete cascade`
-- would try to DELETE payments when a client is removed, `on delete set null`
-- would try to UPDATE them. Neither corrupts anything; both would make clients
-- and bookings undeletable with an error about a payments trigger. The columns
-- hold identifiers, validated once at insert by
-- `private.payment_refs_valid()`, which is the only moment they can be wrong.
--
-- ── DECISION 2: AMOUNTS ARE SIGNED. A REFUND IS A NEGATIVE PAYMENT ────────
--
-- No `kind` column. `grooming_price_adjustments.amount` already made this
-- choice — "a magnitude plus a direction flag is two ways to say the same thing
-- and they drift" — and the same argument holds here. Summing a client's
-- payments gives what they have net paid, with no CASE.
--
-- ── DECISION 3: TAKING MONEY AND GIVING IT BACK ARE DIFFERENT AUTHORITIES ──
--
-- The insert policy branches on the sign, because the role presets already draw
-- exactly this line:
--
--   financial_take_payment  owner, admin, manager, supervisor, reception,
--                           retail, accountant
--   process_refund          owner, admin, manager, accountant
--
-- A receptionist can take a payment and cannot issue a refund. Enforcing that
-- in the UI only would mean the rule holds until somebody calls the API.
--
-- ── DECISION 4: THE STORE-CREDIT BALANCE IS DERIVED, NEVER STORED ──────────
--
-- `StoreCredit` in the mock carries `balance` AND `transactions[]`. That is one
-- fact in two places, and the one that goes stale is money — a balance that
-- disagrees with its own ledger is worse than no balance at all, because it
-- looks authoritative.
--
-- There is no balance column and no balances table. The balance is
-- `sum(amount)` over the client's entries, which cannot disagree with itself.
-- `public.client_store_credit` below exposes it so callers do not each write
-- their own aggregate.
--
-- ── WHAT IS NOT HERE ───────────────────────────────────────────────────────
--
-- PREPAID PACKAGES. `PaymentResult.appliedPackagePassId` is recorded as a plain
-- identifier with no table behind it yet, exactly as `booking_id` is. Packages
-- are their own domain — a catalogue (`PrepaidPackage`), customer ownership
-- (`CustomerPackage`) and a redemption log — and giving them columns as a rider
-- on payments would mean designing three tables to store one string.
--
-- Consequence, stated: a payment can say a pass was redeemed and how much it
-- was worth; nothing yet decrements a pass count, because nothing counts them.
-- ============================================================================

-- ── The author stamp, correctly named ───────────────────────────────────────
--
-- `private.grooming_note_author()` (20260806140000) does exactly this and is
-- not grooming-specific in anything but its name. Payments are platform-wide,
-- so calling that function here would leave a money table depending on
-- something called "grooming note author". This is the generic one; the older
-- triggers keep pointing at the older name until something else touches them.

create or replace function private.stamp_author()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_name text;
begin
  if v_uid is null then
    return new;
  end if;
  new.created_by := v_uid;
  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.email), ''))
    into v_name
    from public.profiles p where p.id = v_uid;
  if v_name is not null then
    new.author_name := v_name;
  end if;
  return new;
end;
$$;

comment on function private.stamp_author is
  'Stamps created_by and author_name from the session. Generic successor to private.grooming_note_author(); use this one for new tables.';

-- ── Payments ────────────────────────────────────────────────────────────────

create table public.payments (
  id uuid primary key default gen_random_uuid(),

  -- Identifiers, NOT references. See Decision 1. Validated at insert.
  facility_id uuid not null,
  booking_id  uuid,
  client_id   uuid,

  method text not null
    check (method in ('card-on-file', 'new-card', 'cash',
                      'package-pass', 'store-credit')),

  -- All money is numeric(10,2). Never float: a cent that rounds differently on
  -- two machines is a cent somebody has to explain.
  subtotal   numeric(10,2) not null,
  tax        numeric(10,2) not null default 0,
  tip        numeric(10,2) not null default 0,

  -- What did NOT come from the payment method.
  store_credit_applied numeric(10,2) not null default 0,
  package_pass_applied numeric(10,2) not null default 0,

  amount_charged numeric(10,2) not null,
  grand_total    numeric(10,2) not null,

  cash_received numeric(10,2),
  saved_card_id text,

  -- No table behind this yet — see "what is not here".
  package_pass_id text,

  receipt_channels text[] not null default '{}',

  author_name text not null default 'Staff',
  created_by  uuid,
  created_at  timestamptz not null default now(),

  -- THE ARITHMETIC IS THE DATABASE'S PROBLEM TOO. A total that does not equal
  -- its parts is the kind of row that gets discovered during a dispute.
  constraint payments_total_is_its_parts
    check (grand_total = subtotal + tax + tip),
  constraint payments_charged_is_the_remainder
    check (amount_charged
             = grand_total - store_credit_applied - package_pass_applied),

  -- Credits reduce what is charged; they do not create money. Signed amounts
  -- are for the payment as a whole (Decision 2), not for these.
  constraint payments_credits_are_not_negative
    check (store_credit_applied >= 0 and package_pass_applied >= 0),

  -- Cash tendered is only meaningful for cash, and cannot be less than what the
  -- method was asked to cover.
  constraint payments_cash_shape check (
    (method = 'cash' and cash_received is not null
       and cash_received >= amount_charged)
    or (method <> 'cash' and cash_received is null)
  ),

  constraint payments_saved_card_shape check (
    saved_card_id is null or method = 'card-on-file'
  )
);

create index payments_booking_idx on public.payments (booking_id);
create index payments_client_idx  on public.payments (facility_id, client_id, created_at);

comment on table public.payments is
  'Immutable record of money taken. A refund is a NEW row with negative amounts — see Decisions 1 and 2 in 20260806220000. Holds identifiers rather than foreign keys because an immutable table cannot participate in cascades.';

-- ── The store-credit ledger ─────────────────────────────────────────────────

create table public.store_credit_entries (
  id uuid primary key default gen_random_uuid(),

  facility_id uuid not null,
  client_id   uuid not null,

  -- Signed: positive grants credit, negative spends it. Zero is not an event.
  amount numeric(10,2) not null check (amount <> 0),

  reason text not null
    check (reason in ('added', 'redeemed', 'expired', 'refund', 'adjustment')),
  note text not null default '',

  booking_id uuid,
  payment_id uuid,

  author_name text not null default 'Staff',
  created_by  uuid,
  created_at  timestamptz not null default now(),

  -- The sign and the reason have to agree. "Redeemed 50 dollars" that ADDS
  -- fifty is how a ledger silently mints money.
  constraint store_credit_sign_matches_reason check (
    case reason
      when 'added'      then amount > 0
      when 'refund'     then amount > 0
      when 'redeemed'   then amount < 0
      when 'expired'    then amount < 0
      when 'adjustment' then true   -- the deliberate escape hatch, both ways
    end
  )
);

create index store_credit_entries_client_idx
  on public.store_credit_entries (facility_id, client_id, created_at);

comment on table public.store_credit_entries is
  'Append-only store-credit ledger. There is deliberately NO balance column anywhere — the balance is sum(amount); see Decision 4 in 20260806220000.';

-- ── The balance, as a view ──────────────────────────────────────────────────
--
-- So that "what is this client''s balance" has exactly one implementation.
-- `security_invoker` so the view is subject to the caller's RLS on the
-- underlying table rather than the definer's — a view is not a way around a
-- policy.

create view public.client_store_credit
with (security_invoker = true) as
  select facility_id,
         client_id,
         sum(amount)   as balance,
         count(*)      as entry_count,
         max(created_at) as last_activity_at
    from public.store_credit_entries
   group by facility_id, client_id;

comment on view public.client_store_credit is
  'Derived store-credit balance. The only place the aggregate is written.';

-- ── Referential validation, at insert ───────────────────────────────────────
--
-- The trade for holding no foreign keys. Everything named must exist and must
-- belong to the same facility — without this, a caller who may take a payment
-- may file it against another business's booking and read the client back off
-- the join.

create or replace function private.payment_refs_valid()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_other uuid;
begin
  if not exists (select 1 from public.facilities f where f.id = new.facility_id) then
    raise exception 'That facility does not exist.' using errcode = '23503';
  end if;

  if new.booking_id is not null then
    select facility_id into v_other from public.bookings where id = new.booking_id;
    if v_other is null then
      raise exception 'That booking does not exist.' using errcode = '23503';
    end if;
    if v_other is distinct from new.facility_id then
      raise exception 'That booking belongs to a different facility.'
        using errcode = '42501';
    end if;
  end if;

  if new.client_id is not null then
    select facility_id into v_other from public.clients where id = new.client_id;
    if v_other is null then
      raise exception 'That client does not exist.' using errcode = '23503';
    end if;
    if v_other is distinct from new.facility_id then
      raise exception 'That client belongs to a different facility.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger payments_refs_valid
  before insert on public.payments
  for each row execute function private.payment_refs_valid();

create trigger store_credit_refs_valid
  before insert on public.store_credit_entries
  for each row execute function private.payment_refs_valid();

create trigger payments_author
  before insert on public.payments
  for each row execute function private.stamp_author();

create trigger store_credit_author
  before insert on public.store_credit_entries
  for each row execute function private.stamp_author();

-- ── Immutability: the binding layer ─────────────────────────────────────────

create or replace function public.prevent_money_mutation()
returns trigger language plpgsql as $$
begin
  raise exception
    '%.% is append-only: % is not permitted', tg_table_schema, tg_table_name, tg_op
    using errcode = 'insufficient_privilege',
          hint    = 'Money records are immutable; append a correcting entry (a refund, or an adjustment) instead.';
  return null;
end;
$$;

comment on function public.prevent_money_mutation is
  'Raises on any UPDATE/DELETE/TRUNCATE of payments or store_credit_entries. Triggers fire for every role including the owner and service_role, which is what makes this binding.';

create trigger payments_block_update
  before update on public.payments
  for each row execute function public.prevent_money_mutation();
create trigger payments_block_delete
  before delete on public.payments
  for each row execute function public.prevent_money_mutation();
create trigger payments_block_truncate
  before truncate on public.payments
  for each statement execute function public.prevent_money_mutation();

create trigger store_credit_block_update
  before update on public.store_credit_entries
  for each row execute function public.prevent_money_mutation();
create trigger store_credit_block_delete
  before delete on public.store_credit_entries
  for each row execute function public.prevent_money_mutation();
create trigger store_credit_block_truncate
  before truncate on public.store_credit_entries
  for each statement execute function public.prevent_money_mutation();

-- ── Privileges ──────────────────────────────────────────────────────────────
-- Every role BY NAME. `revoke ... from public` is NOT `revoke ... from anon`:
-- Supabase grants to anon and authenticated by name, and revoking the PUBLIC
-- pseudo-role leaves those standing (20260804200000 was that bug, live).

revoke update, delete, truncate on public.payments from public;
revoke update, delete, truncate on public.payments from anon;
revoke update, delete, truncate on public.payments from authenticated;
revoke update, delete, truncate on public.payments from service_role;

revoke update, delete, truncate on public.store_credit_entries from public;
revoke update, delete, truncate on public.store_credit_entries from anon;
revoke update, delete, truncate on public.store_credit_entries from authenticated;
revoke update, delete, truncate on public.store_credit_entries from service_role;

grant select, insert on public.payments to authenticated;
grant select, insert on public.payments to service_role;
grant select, insert on public.store_credit_entries to authenticated;
grant select, insert on public.store_credit_entries to service_role;
grant select on public.client_store_credit to authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.payments enable row level security;
alter table public.payments force row level security;
alter table public.store_credit_entries enable row level security;
alter table public.store_credit_entries force row level security;

-- READ: staff who may see amounts. Named directly rather than mirrored from the
-- booking — 20260806140000 shipped a leak by copying `exists (… bookings …)`
-- onto internal rows, and `bookings_read` lets a client read their own.
--
-- A customer seeing their own receipts is a real requirement, but it belongs to
-- a customer-portal surface that decides what to show; it is not "every row in
-- the payments table for their bookings, including a colleague's till notes".
create policy payments_read on public.payments
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'financial_view_amounts')
  );

-- INSERT: the sign decides the key. See Decision 3.
create policy payments_insert on public.payments
  for insert to authenticated
  with check (
    case
      when grand_total < 0
        then private.has_permission(facility_id, 'process_refund')
      else private.has_permission(facility_id, 'financial_take_payment')
    end
  );

create policy store_credit_read on public.store_credit_entries
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'financial_view_amounts')
  );

-- Granting credit is giving money away; spending it is taking payment.
create policy store_credit_insert on public.store_credit_entries
  for insert to authenticated
  with check (
    case
      when amount > 0
        then private.has_permission(facility_id, 'process_refund')
      else private.has_permission(facility_id, 'financial_take_payment')
    end
  );
