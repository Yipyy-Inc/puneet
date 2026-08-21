-- ============================================================================
-- A loyalty point is a ledger entry, and a voucher can be spent once.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- Three hand-authored files — `loyalty-accounts`, `loyalty-transactions`,
-- `loyalty-redemptions` — all keyed by `facilityId: 1`, all discarded on
-- reload. The programme that governs them became real on 2026-08-21
-- (`facility_settings.loyalty_config`); this is the other half.
--
-- ── THE BALANCE IS NOT A NUMBER SOMEBODY SETS ─────────────────────────────
--
-- The fixture stored `pointsBalance` on the account AND kept a separate list of
-- transactions. Two sources of truth for the same fact, which is the shape that
-- lets a balance drift away from the history that explains it — and a customer
-- cannot be told "your balance is 1840" and "here is why" if the two are
-- maintained independently.
--
-- Here the TRANSACTIONS are the truth. `points_balance`,
-- `lifetime_points_earned` and `lifetime_points_redeemed` are maintained by
-- trigger from them and can be recomputed from the ledger at any time. The same
-- rule `bookings.amount_paid` already follows: the ledger says what is true.
--
-- ── AND THE LEDGER IS APPEND-ONLY ─────────────────────────────────────────
--
-- No UPDATE, enforced by trigger; no DELETE, enforced by the absence of a
-- policy (a trigger there would break the cascade — see the note by the
-- triggers).
-- A points history somebody can edit is not a history; it is a number with
-- extra steps. Correcting a mistake means posting the opposite entry, which is
-- what a ledger is for. Same treatment `audit_log` already gets.
--
-- ── A VOUCHER CAN BE SPENT ONCE, AND THE DATABASE IS WHAT SAYS SO ─────────
--
-- The fixture's `consumeRedemption()` mutated an in-memory array, so a voucher
-- came back after a refresh — and that voucher reaches a card: the checkout
-- computes `netAmountDue = amountDue - voucher`, and the tax and the Clover
-- total follow from it. (It was inert only because all three fixture vouchers
-- were expired or already used.)
--
-- `consume_loyalty_voucher` updates WHERE the row is still active and not past
-- expiry, and raises when that matches nothing. Two concurrent checkouts race
-- for one row; exactly one wins. No amount of application code can provide that
-- guarantee, which is why it is here rather than there.
--
-- ── SECURITY DEFINER FOR ATOMICITY, NOT PRIVILEGE ─────────────────────────
--
-- Both functions assert a permission FIRST and touch nothing the caller could
-- not reach through RLS. What they buy is that the points and the voucher move
-- together, or neither does.
-- ============================================================================

-- ── ACCOUNTS ──────────────────────────────────────────────────────────────
--
-- One per (facility, client). Deliberately NOT carrying `total_spend` or
-- `total_visits`, which the fixture had: bookings already know both, and a
-- denormalised copy of a fact another table owns is the same two-sources-of-
-- truth mistake the balance avoids. Tier resolution against spend and visits
-- reads the bookings; it is not this table's job to remember them.
create table if not exists public.loyalty_accounts (
  id                        uuid primary key default gen_random_uuid(),
  facility_id               uuid not null
                              references public.facilities(id) on delete cascade,
  client_id                 uuid not null
                              references public.clients(id) on delete cascade,
  -- Maintained by trigger from loyalty_transactions. Never written directly by
  -- an application; see the banner.
  points_balance            integer not null default 0,
  lifetime_points_earned    integer not null default 0,
  lifetime_points_redeemed  integer not null default 0,
  -- Account credit a redemption has granted, in the facility's currency.
  credit_balance            numeric(12,2) not null default 0,
  -- A `Tier.id` from the facility's own `loyalty_config`. Text, not a foreign
  -- key: the tiers live in a settings document, and a constraint against a
  -- jsonb array is not one Postgres can keep.
  current_tier_id           text,
  tier_joined_at            timestamptz,
  referral_code             text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint loyalty_accounts_one_per_client unique (facility_id, client_id),
  constraint loyalty_accounts_balance_not_negative check (points_balance >= 0),
  constraint loyalty_accounts_credit_not_negative check (credit_balance >= 0)
);

create index if not exists loyalty_accounts_facility_idx
  on public.loyalty_accounts (facility_id);
create index if not exists loyalty_accounts_client_idx
  on public.loyalty_accounts (client_id);
-- A referral code is a facility's own namespace, and only when it is set.
create unique index if not exists loyalty_accounts_referral_code_idx
  on public.loyalty_accounts (facility_id, referral_code)
  where referral_code is not null;

comment on table public.loyalty_accounts is
  'One loyalty account per client per facility. The three points columns are maintained by trigger from loyalty_transactions and must never be written directly — the ledger is the truth.';

-- ── THE LEDGER ────────────────────────────────────────────────────────────
create table if not exists public.loyalty_transactions (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null
                 references public.facilities(id) on delete cascade,
  account_id   uuid not null
                 references public.loyalty_accounts(id) on delete cascade,
  kind         text not null
                 check (kind in ('earned', 'redeemed', 'expired',
                                 'adjusted', 'referral')),
  -- SIGNED. Positive adds, negative takes away. One column rather than a
  -- separate direction flag, so a balance is `sum(points)` and cannot be
  -- computed two different ways.
  points       integer not null,
  description  text not null,
  source       text not null
                 check (source in ('booking', 'pos', 'online_payment',
                                   'membership', 'package', 'referral',
                                   'manual', 'expiry')),
  source_id    text,
  booking_id   uuid references public.bookings(id) on delete set null,
  -- Who posted it, for a manual adjustment. Null for anything automatic.
  staff_id     uuid references public.staff(id) on delete set null,
  reason       text,
  created_at   timestamptz not null default now(),
  constraint loyalty_transactions_points_not_zero check (points <> 0)
);

create index if not exists loyalty_transactions_account_idx
  on public.loyalty_transactions (account_id, created_at desc);
create index if not exists loyalty_transactions_facility_idx
  on public.loyalty_transactions (facility_id, created_at desc);

comment on table public.loyalty_transactions is
  'Append-only points ledger. `points` is signed. UPDATE is refused by trigger and no DELETE policy exists, so an application can only add — correct a mistake by posting the opposite entry. A cascade from the account deletes it, deliberately.';

-- ── VOUCHERS ──────────────────────────────────────────────────────────────
--
-- What a customer got for their points, and whether it has been spent.
create table if not exists public.loyalty_vouchers (
  id                      uuid primary key default gen_random_uuid(),
  facility_id             uuid not null
                            references public.facilities(id) on delete cascade,
  account_id              uuid not null
                            references public.loyalty_accounts(id)
                            on delete cascade,
  reward_type             text not null
                            check (reward_type in ('discount_pct',
                                                   'discount_fixed',
                                                   'free_service',
                                                   'credit_balance')),
  -- A percentage for `discount_pct` (10 = 10%), an amount for the rest.
  reward_value            numeric(12,2) not null check (reward_value > 0),
  status                  text not null default 'active'
                            check (status in ('active', 'used',
                                              'expired', 'cancelled')),
  -- Null means every service. A list narrows it, and is what the checkout's
  -- "most specific" tiebreak reads.
  applies_to_services     text[],
  -- What it cost, so a voucher can be reversed for exactly what was paid.
  points_spent            integer not null default 0
                            check (points_spent >= 0),
  issued_at               timestamptz not null default now(),
  expires_at              timestamptz,
  used_at                 timestamptz,
  used_on_booking_id      uuid references public.bookings(id) on delete set null,
  -- A used voucher must say when. Anything else is a row that claims to have
  -- been spent at no time.
  constraint loyalty_vouchers_used_has_a_time
    check ((status = 'used') = (used_at is not null))
);

create index if not exists loyalty_vouchers_account_idx
  on public.loyalty_vouchers (account_id, status);
create index if not exists loyalty_vouchers_facility_idx
  on public.loyalty_vouchers (facility_id, status);

comment on table public.loyalty_vouchers is
  'A reward a customer holds. Spend it with consume_loyalty_voucher(), which is the only thing that can move it to `used` — and can only do so once.';

-- ── THE BALANCE FOLLOWS THE LEDGER ────────────────────────────────────────
create or replace function private.loyalty_apply_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  -- ── LOCK, THEN CHECK, THEN WRITE ────────────────────────────────────────
  --
  -- `for update` rather than a bare read, for two reasons.
  --
  -- It SERIALISES redemptions against one account. Two staff redeeming the
  -- last 500 points at the same moment would otherwise both read 500, both
  -- pass their check, and both write — leaving the balance negative and two
  -- vouchers issued for points that existed once. The lock makes the second
  -- wait and then fail honestly.
  --
  -- And it lets the refusal be a SENTENCE. The `points_balance >= 0` check
  -- constraint would catch an overdraft too, but it fires during the UPDATE —
  -- so a message written after the UPDATE could never be reached, and the
  -- caller would get a constraint name instead of what they did wrong. The
  -- constraint stays as the backstop; this is the explanation.
  select a.points_balance into v_balance
    from public.loyalty_accounts a
   where a.id = new.account_id
     for update;

  if v_balance is null then
    raise exception 'That loyalty account does not exist.'
      using errcode = '23503';
  end if;

  if v_balance + new.points < 0 then
    raise exception
      'That account has % points and this would take %.',
      v_balance, -new.points
      using errcode = '23514';
  end if;

  -- Announces that this balance change came from the ledger. The guard below
  -- refuses every one that did not.
  perform set_config('app.loyalty_ledger_write', 'on', true);

  update public.loyalty_accounts a
     set points_balance           = a.points_balance + new.points,
         lifetime_points_earned   = a.lifetime_points_earned
                                      + greatest(new.points, 0),
         lifetime_points_redeemed = a.lifetime_points_redeemed
                                      + greatest(-new.points, 0),
         updated_at               = now()
   where a.id = new.account_id;

  perform set_config('app.loyalty_ledger_write', 'off', true);

  return new;
end;
$$;

-- ── THE BALANCE COLUMNS ARE NOT WRITABLE BY HAND ──────────────────────────
--
-- Without this the banner above would be a claim rather than a rule: the
-- `loyalty_accounts_update` policy lets anyone holding `marketing_manage_loyalty`
-- edit the row, and PostgREST would happily accept
-- `PATCH /loyalty_accounts?id=eq.… {"points_balance": 999999}` — a balance with
-- no ledger entry explaining it, which is exactly the drift the split was meant
-- to end.
--
-- So the four money-bearing columns may only move under the flag the ledger
-- trigger and `redeem_loyalty_points` set. Everything else on the row — tier,
-- referral code — stays editable normally.
create or replace function private.loyalty_balances_come_from_the_ledger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.loyalty_ledger_write', true), 'off') = 'on' then
    return new;
  end if;

  if new.points_balance is distinct from old.points_balance
     or new.lifetime_points_earned is distinct from old.lifetime_points_earned
     or new.lifetime_points_redeemed is distinct from old.lifetime_points_redeemed
  then
    raise exception
      'A points balance follows the ledger. Post a loyalty_transactions row instead.'
      using errcode = '0A000';
  end if;

  if new.credit_balance is distinct from old.credit_balance then
    raise exception
      'Account credit is granted by redeem_loyalty_points, not set directly.'
      using errcode = '0A000';
  end if;

  return new;
end;
$$;

drop trigger if exists loyalty_accounts_balances_guard on public.loyalty_accounts;
create trigger loyalty_accounts_balances_guard
  before update on public.loyalty_accounts
  for each row execute function private.loyalty_balances_come_from_the_ledger();

drop trigger if exists loyalty_transactions_apply on public.loyalty_transactions;
create trigger loyalty_transactions_apply
  after insert on public.loyalty_transactions
  for each row execute function private.loyalty_apply_transaction();

-- ── AND THE LEDGER CANNOT BE REWRITTEN ────────────────────────────────────
create or replace function private.loyalty_ledger_is_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception
    'The points ledger is append-only. Post a correcting entry instead.'
    using errcode = '0A000';
end;
$$;

drop trigger if exists loyalty_transactions_no_update on public.loyalty_transactions;
create trigger loyalty_transactions_no_update
  before update on public.loyalty_transactions
  for each row execute function private.loyalty_ledger_is_append_only();

-- ── NO DELETE TRIGGER, DELIBERATELY ───────────────────────────────────────
--
-- One was written here and taken out before it shipped. `account_id` is
-- ON DELETE CASCADE, and a BEFORE DELETE trigger that always raises fires on
-- the CASCADE too — so deleting a client would cascade to their loyalty
-- account, cascade to the ledger, hit the guard and abort. The client would be
-- undeletable, and the error would point at loyalty rather than at the cascade.
--
-- That is exactly the bug the debt map already records for `audit_log`, where a
-- facility cannot be deleted for the same reason. Writing it a second time
-- knowingly would be worse than having written it once.
--
-- Append-only against APPLICATIONS does not need it: this table has a SELECT
-- policy and an INSERT policy and NO DELETE POLICY, so PostgREST refuses a
-- delete from every caller. A cascade runs as the table owner — the one actor
-- that should be able to take the ledger with the account it belongs to.

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────────────────
--
-- Read: staff with `marketing_view`, or the customer whose account it is.
-- Write: `marketing_manage_loyalty`, and only through the functions below for
-- anything that moves points.
alter table public.loyalty_accounts     enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_vouchers     enable row level security;

drop policy if exists loyalty_accounts_read on public.loyalty_accounts;
create policy loyalty_accounts_read on public.loyalty_accounts
  for select using (
    private.is_platform_admin()
    or client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'marketing_view')
  );

-- An account is created for a customer, so opening one is a loyalty action.
drop policy if exists loyalty_accounts_insert on public.loyalty_accounts;
create policy loyalty_accounts_insert on public.loyalty_accounts
  for insert with check (
    private.has_permission(facility_id, 'marketing_manage_loyalty')
  );

-- The three points columns are trigger-maintained; this covers the rest
-- (tier, referral code). The trigger runs as definer and is not subject to it.
drop policy if exists loyalty_accounts_update on public.loyalty_accounts;
create policy loyalty_accounts_update on public.loyalty_accounts
  for update using (
    private.has_permission(facility_id, 'marketing_manage_loyalty')
  );

drop policy if exists loyalty_transactions_read on public.loyalty_transactions;
create policy loyalty_transactions_read on public.loyalty_transactions
  for select using (
    private.is_platform_admin()
    or account_id in (
      select a.id from public.loyalty_accounts a
       where a.client_id in (select private.own_client_ids())
    )
    or private.has_permission(facility_id, 'marketing_view')
  );

-- A manual adjustment is a direct insert; everything else arrives through a
-- function. No UPDATE or DELETE policy exists at all, which is the second half
-- of append-only — the triggers are the first.
drop policy if exists loyalty_transactions_insert on public.loyalty_transactions;
create policy loyalty_transactions_insert on public.loyalty_transactions
  for insert with check (
    private.has_permission(facility_id, 'marketing_manage_loyalty')
  );

drop policy if exists loyalty_vouchers_read on public.loyalty_vouchers;
create policy loyalty_vouchers_read on public.loyalty_vouchers
  for select using (
    private.is_platform_admin()
    or account_id in (
      select a.id from public.loyalty_accounts a
       where a.client_id in (select private.own_client_ids())
    )
    or private.has_permission(facility_id, 'marketing_view')
    -- Whoever can take a payment can see what would come off the bill.
    or private.has_permission(facility_id, 'take_payment')
  );

drop policy if exists loyalty_vouchers_update on public.loyalty_vouchers;
create policy loyalty_vouchers_update on public.loyalty_vouchers
  for update using (
    private.has_permission(facility_id, 'marketing_manage_loyalty')
  );

-- ── SPENDING POINTS ───────────────────────────────────────────────────────
--
-- The negative ledger entry and the voucher it buys, together or not at all.
create or replace function public.redeem_loyalty_points(
  p_account_id      uuid,
  p_reward_type     text,
  p_reward_value    numeric,
  p_points          integer,
  p_expires_at      timestamptz default null,
  p_applies_to      text[] default null,
  p_description     text default null
)
returns public.loyalty_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
  v_voucher  public.loyalty_vouchers;
begin
  select a.facility_id into v_facility
    from public.loyalty_accounts a
   where a.id = p_account_id;

  if v_facility is null then
    raise exception 'That loyalty account does not exist.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_facility, 'marketing_manage_loyalty') then
    raise exception 'You do not have permission to redeem loyalty points.'
      using errcode = '42501';
  end if;

  if p_points < 0 then
    raise exception 'A redemption cannot cost negative points.'
      using errcode = '22023';
  end if;

  -- The ledger entry FIRST: its trigger is what refuses an account that cannot
  -- afford this, and doing it first means a refusal leaves no voucher behind.
  if p_points > 0 then
    insert into public.loyalty_transactions
      (facility_id, account_id, kind, points, description, source)
    values
      (v_facility, p_account_id, 'redeemed', -p_points,
       coalesce(p_description, 'Reward redeemed'), 'manual');
  end if;

  insert into public.loyalty_vouchers
    (facility_id, account_id, reward_type, reward_value,
     applies_to_services, points_spent, expires_at)
  values
    (v_facility, p_account_id, p_reward_type, p_reward_value,
     p_applies_to, p_points, p_expires_at)
  returning * into v_voucher;

  -- Credit is spendable money rather than a voucher to present, so it lands on
  -- the account instead of waiting to be applied to one bill.
  if p_reward_type = 'credit_balance' then
    perform set_config('app.loyalty_ledger_write', 'on', true);
    update public.loyalty_accounts
       set credit_balance = credit_balance + p_reward_value,
           updated_at     = now()
     where id = p_account_id;
    perform set_config('app.loyalty_ledger_write', 'off', true);
  end if;

  return v_voucher;
end;
$$;

comment on function public.redeem_loyalty_points(uuid, text, numeric, integer, timestamptz, text[], text) is
  'Spend points on a reward. The ledger entry and the voucher move together; an account that cannot afford it is refused by the balance trigger before any voucher exists.';

-- ── SPENDING A VOUCHER, EXACTLY ONCE ──────────────────────────────────────
create or replace function public.consume_loyalty_voucher(
  p_voucher_id uuid,
  p_booking_id uuid default null
)
returns public.loyalty_vouchers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
  v_voucher  public.loyalty_vouchers;
begin
  select v.facility_id into v_facility
    from public.loyalty_vouchers v
   where v.id = p_voucher_id;

  if v_facility is null then
    raise exception 'That reward does not exist.' using errcode = 'P0002';
  end if;

  -- Whoever can take the payment can spend the voucher against it. Requiring
  -- `marketing_manage_loyalty` would mean a receptionist could charge the card
  -- but not apply the discount the customer is standing there holding.
  if not (private.has_permission(v_facility, 'take_payment')
          or private.has_permission(v_facility, 'marketing_manage_loyalty')) then
    raise exception 'You do not have permission to apply a reward.'
      using errcode = '42501';
  end if;

  -- The whole guarantee is in this WHERE. Two checkouts racing for one voucher
  -- both reach here; the second finds no active row and is told so, rather than
  -- taking the same discount off a second bill.
  update public.loyalty_vouchers v
     set status             = 'used',
         used_at            = now(),
         used_on_booking_id = coalesce(p_booking_id, v.used_on_booking_id)
   where v.id = p_voucher_id
     and v.status = 'active'
     and (v.expires_at is null or v.expires_at > now())
  returning * into v_voucher;

  if v_voucher.id is null then
    raise exception 'That reward has already been used, or has expired.'
      using errcode = '22023';
  end if;

  return v_voucher;
end;
$$;

comment on function public.consume_loyalty_voucher(uuid, uuid) is
  'Spend a voucher against a booking. Single-use is enforced by the UPDATE predicate, so two concurrent checkouts cannot both take the same discount.';

revoke all on function public.redeem_loyalty_points(uuid, text, numeric, integer, timestamptz, text[], text) from public, anon;
grant execute on function public.redeem_loyalty_points(uuid, text, numeric, integer, timestamptz, text[], text) to authenticated, service_role;

revoke all on function public.consume_loyalty_voucher(uuid, uuid) from public, anon;
grant execute on function public.consume_loyalty_voucher(uuid, uuid) to authenticated, service_role;
