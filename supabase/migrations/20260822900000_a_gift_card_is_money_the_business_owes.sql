-- ============================================================================
-- A gift card is money the business owes, so it is a row and a ledger.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- Nothing. Not an empty table — no table at all. `/facility/dashboard/gift-cards`
-- is 2,099 lines with sixty-odd handlers and an "Issue" action, it sits in the
-- sidebar behind `financial_manage_gift_cards`, and every card it created lived
-- in `src/data/gift-cards.ts` for as long as the tab stayed open.
--
-- So a facility could take a customer's money, hand over a card, and hold NO
-- record of the liability. Every other unconverted screen in this product loses
-- a setting. This one loses money the business owes somebody.
--
-- It was already visible from the other side: `src/lib/api/loyalty-badges.ts`
-- maps a `gift_card` badge reward to NOTHING and says why — "there is no
-- gift-card table in this database at all".
--
-- ── THE BALANCE IS DERIVED, LIKE EVERY OTHER BALANCE HERE ─────────────────
--
-- `gift_cards.balance` is maintained by trigger from `gift_card_transactions`
-- and must never be written directly, exactly as `loyalty_accounts.points_balance`
-- is (20260821260000). A balance an application can PATCH is not a balance, it
-- is a suggestion — and this one is denominated in dollars a customer is owed.
--
-- The ledger is append-only: UPDATE refused by trigger, DELETE impossible
-- because no policy grants it. A mistake is corrected by posting the opposite
-- entry, which is what somebody reconciling the till expects to find.
--
-- ── TWO THINGS LEARNED EARLIER TODAY, APPLIED HERE ────────────────────────
--
-- 1. `booking_id` on the ledger carries NO foreign key. An append-only table
--    cannot hold `on delete set null`, because SET NULL is an UPDATE and the
--    append-only guard refuses it — which is exactly how `audit_log` made every
--    facility undeletable until 20260822500000 removed that constraint. The
--    column is descriptive: it records which booking a redemption paid for,
--    including bookings that no longer exist.
--
-- 2. There is NO existence oracle, by construction. `redeem_gift_card` resolves
--    the card and checks permission in ONE query, so "no such code" and "not
--    your facility" are the same error and cannot be told apart from outside.
--    Every function this repo has had to fix for oracles (20260805210403,
--    20260822400000, 20260822600000) put the lookup first and the check second,
--    because the facility to check came out of the row. Here the row is only
--    found if the permission already holds.
--
--    That matters more here than there. A gift card code is a BEARER
--    INSTRUMENT: a function that answers "real code, but not yours" is a way to
--    discover real codes.
-- ============================================================================

-- ── THE CARD ──────────────────────────────────────────────────────────────

create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- What the customer types or scans. Unique per facility rather than globally:
  -- redemption is facility-scoped, and a physical batch may carry pre-printed
  -- numbers the business does not get to choose.
  code text not null,

  kind text not null default 'online',
  initial_amount numeric(10, 2) not null,

  -- MAINTAINED BY TRIGGER from gift_card_transactions. Never write this.
  balance numeric(10, 2) not null default 0,

  currency text not null default 'CAD',
  status text not null default 'active',

  -- Who bought it. `set null` is safe HERE because this table is not
  -- append-only — on the ledger below it would not be.
  purchased_by_client_id uuid references public.clients(id) on delete set null,

  recipient_name text,
  recipient_email text,
  message text,

  -- Null means it never expires. Deliberately nullable rather than a far-future
  -- date: "no expiry" is a decision somebody made, not a date they picked.
  expires_at timestamptz,

  issued_by text,
  issued_at timestamptz not null default now(),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint gift_cards_code_unique_per_facility unique (facility_id, code),
  constraint gift_cards_kind_known check (kind in ('online', 'physical')),
  constraint gift_cards_status_known
    check (status in ('active', 'redeemed', 'expired', 'cancelled')),
  constraint gift_cards_initial_amount_positive check (initial_amount > 0),
  -- The backstop. The trigger raises something readable before this can fire,
  -- but a negative balance must be impossible even if the trigger is wrong.
  constraint gift_cards_balance_not_negative check (balance >= 0)
);

comment on table public.gift_cards is
  'Stored value a facility owes a customer. `balance` is maintained by trigger from gift_card_transactions and must never be written directly - the ledger is the truth.';

comment on column public.gift_cards.balance is
  'DERIVED. Maintained by private.gift_card_apply_transaction from the ledger. A direct write is refused by private.gift_card_balance_comes_from_the_ledger.';

create index if not exists gift_cards_facility_idx
  on public.gift_cards (facility_id, status);

create index if not exists gift_cards_client_idx
  on public.gift_cards (purchased_by_client_id);

-- ── THE LEDGER ────────────────────────────────────────────────────────────

create table if not exists public.gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null
    references public.gift_cards(id) on delete cascade,
  facility_id uuid not null
    references public.facilities(id) on delete cascade,

  kind text not null,

  -- SIGNED. Positive puts money on the card, negative takes it off.
  amount numeric(10, 2) not null,
  balance_after numeric(10, 2) not null,

  -- NO FOREIGN KEY, deliberately - see the header. An append-only table cannot
  -- carry `on delete set null`, and RESTRICT would make a booking undeletable
  -- for having once been paid with a gift card.
  booking_id uuid,

  note text,
  created_by text,
  created_at timestamptz not null default now(),

  constraint gift_card_transactions_kind_known
    check (kind in ('issued', 'redeemed', 'refunded', 'adjusted')),
  constraint gift_card_transactions_amount_not_zero check (amount <> 0)
);

comment on table public.gift_card_transactions is
  'Append-only money ledger for a gift card. `amount` is signed. UPDATE is refused by trigger and no DELETE policy exists, so an application can only add - correct a mistake by posting the opposite entry. A cascade from the card deletes it, deliberately.';

comment on column public.gift_card_transactions.booking_id is
  'Which booking a redemption paid for. DESCRIPTIVE, not referential: no foreign key, so the entry outlives the booking. An append-only table cannot hold `on delete set null` - SET NULL is an UPDATE and the guard refuses it. See 20260822500000, which removed exactly that constraint from audit_log.';

create index if not exists gift_card_transactions_card_idx
  on public.gift_card_transactions (gift_card_id, created_at desc);

-- ── THE BALANCE FOLLOWS THE LEDGER ────────────────────────────────────────

create or replace function private.gift_card_apply_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_card public.gift_cards%rowtype;
  v_new  numeric(10, 2);
begin
  -- Locked, so two redemptions of the same card cannot both read the old
  -- balance and both conclude there is enough. The check constraint catches an
  -- overdraft too, but only afterwards and by constraint name.
  select * into v_card from public.gift_cards
   where id = new.gift_card_id
   for update;

  if not found then
    raise exception 'That gift card does not exist.' using errcode = 'P0002';
  end if;

  v_new := v_card.balance + new.amount;

  if v_new < 0 then
    raise exception
      'That gift card holds %, which is less than the % being taken off it.',
      to_char(v_card.balance, 'FM999999990.00'),
      to_char(abs(new.amount), 'FM999999990.00')
      using errcode = '23514';
  end if;

  new.balance_after := v_new;

  update public.gift_cards
     set balance = v_new,
         -- Spent out is `redeemed`; money back on a spent card makes it live
         -- again. Cancelled and expired are decisions rather than arithmetic,
         -- so they are left where somebody put them.
         status = case
                    when status in ('cancelled', 'expired') then status
                    when v_new = 0 then 'redeemed'
                    else 'active'
                  end,
         last_used_at = case when new.amount < 0 then now() else last_used_at end,
         updated_at = now()
   where id = v_card.id;

  return new;
end;
$$;

-- The mirror of loyalty_balances_come_from_the_ledger: everything else on the
-- row stays editable, the money does not.
create or replace function private.gift_card_balance_comes_from_the_ledger()
returns trigger
language plpgsql
as $$
begin
  if new.balance is distinct from old.balance then
    raise exception
      'gift_cards.balance is derived from gift_card_transactions and cannot be set directly. Post a transaction instead.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.gift_card_ledger_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'gift_card_transactions is append-only: correct a mistake by posting the opposite entry.'
    using errcode = '42501';
end;
$$;

drop trigger if exists gift_card_transactions_apply on public.gift_card_transactions;
create trigger gift_card_transactions_apply
  before insert on public.gift_card_transactions
  for each row execute function private.gift_card_apply_transaction();

drop trigger if exists gift_cards_balance_guard on public.gift_cards;
create trigger gift_cards_balance_guard
  before update on public.gift_cards
  for each row execute function private.gift_card_balance_comes_from_the_ledger();

drop trigger if exists gift_card_transactions_no_update on public.gift_card_transactions;
create trigger gift_card_transactions_no_update
  before update on public.gift_card_transactions
  for each row execute function private.gift_card_ledger_is_append_only();

-- No DELETE trigger, for the reason spelled out in 20260821260000: a BEFORE
-- DELETE guard fires on the CASCADE too, and would make the card - and the
-- facility above it - undeletable. Append-only against APPLICATIONS is achieved
-- by granting no delete policy at all.

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────────────────

alter table public.gift_cards             enable row level security;
alter table public.gift_card_transactions enable row level security;

-- A customer sees a card they BOUGHT. They do not see one bought for them: the
-- recipient is an email on a row, not an identity, and matching on it would let
-- anyone who guessed an address read a balance.
drop policy if exists gift_cards_read on public.gift_cards;
create policy gift_cards_read on public.gift_cards
  for select using (
    private.is_platform_admin()
    or purchased_by_client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'financial_manage_gift_cards')
  );

-- Issuing goes through `issue_gift_card`. This covers the editable rest -
-- recipient, message, cancelling a card.
drop policy if exists gift_cards_update on public.gift_cards;
create policy gift_cards_update on public.gift_cards
  for update using (
    private.has_permission(facility_id, 'financial_manage_gift_cards')
  );

-- No INSERT policy: a card is created by `issue_gift_card` and nowhere else, so
-- its opening balance and its first ledger entry can never disagree.

drop policy if exists gift_card_transactions_read on public.gift_card_transactions;
create policy gift_card_transactions_read on public.gift_card_transactions
  for select using (
    private.is_platform_admin()
    or gift_card_id in (
      select c.id from public.gift_cards c
       where c.purchased_by_client_id in (select private.own_client_ids())
    )
    or private.has_permission(facility_id, 'financial_manage_gift_cards')
  );

-- No INSERT, UPDATE or DELETE policy at all. Every entry arrives through a
-- function below, which runs as definer. That is what makes the card and its
-- ledger impossible to separate.
