-- ============================================================================
-- Things added to a booking at the counter, and what that does to the bill.
--
-- `booking.invoice` is not a table. It is fixture data living in the `details`
-- jsonb, and `invoiceId` is `10000 + bookingId`, invented at render time. The
-- checkout dialog on the client's booking page builds a whole invoice —
-- items, fees, subtotal, total, tipTotal, payments[] — in React state and
-- sends none of it. A bag of food added at pickup exists until the tab is
-- closed.
--
-- ── DECISION 1: ONLY THE ADDITIONS ARE STORED ──────────────────────────────
--
-- Most of that invoice object is already derivable and is therefore not here:
--
--   subtotal / total    the booking's price plus these lines
--   depositCollected    sum over `payments` for the booking
--   remainingDue        amount_due - amount_paid
--   tipTotal            sum(payments.tip)
--   payments[]          `public.payments` — a SECOND payment ledger on the
--                       booking is one of them going stale, and it would be
--                       the one on screen
--
-- What is NOT derivable is the additions themselves: a bag of food, a nail
-- trim added on the day, a late-pickup fee. Those are events with no other
-- record, so they get a table and nothing else does.
--
-- ── DECISION 2: THE LINE'S PRICE IS GENERATED ──────────────────────────────
--
-- `price` is `unit_price * quantity`, always, as a stored generated column. A
-- writable `price` that disagrees with its own parts is the shape this project
-- has now removed four times.
--
-- ── DECISION 3: THE BILL GROWS, SO EVERY DERIVATION HAS TO MOVE ────────────
--
-- This is why the table cannot land on its own. `total_cost` is the BOOKING's
-- price and stays that. What a customer owes is `total_cost + extras_total`,
-- and three things already compare against `total_cost`:
--
--   private.derive_booking_payment      'paid' when amount_paid >= it
--   private.client_outstanding_balance  the client's debt
--   public.settle_bookings              what a batch charges
--
-- Left alone, a $100 booking with $30 of added food reads PAID at $100 and the
-- $30 is never chased. So `amount_due` is a generated column — one name for
-- "what this booking costs in total" — and 20260806840000 points all three at
-- it in the same change.
--
-- ── DECISION 4: retail_process_sale, NOT edit_bookings ─────────────────────
--
-- Putting something on a customer's bill is a till job. The preset that covers
-- every till role — owner, admin, manager, supervisor, reception AND retail —
-- is `retail_process_sale`. `edit_bookings` would exclude `retail`, who are the
-- people at the counter; `financial_manage_invoices` would include the
-- accountant, who has no business adding shampoo to a stay.
-- ============================================================================

create table if not exists public.booking_line_items (
  id uuid primary key default gen_random_uuid(),

  -- A real foreign key, unlike `payments`. That table has none because it is
  -- immutable and cannot participate in a cascade (20260806220000, Decision 1).
  -- These are editable right up to checkout, so there is nothing to protect.
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  facility_id uuid not null references public.facilities (id),

  -- 'item' is something sold; 'fee' is something charged. They render in
  -- separate blocks on an invoice and are counted the same.
  kind text not null check (kind in ('item', 'fee')),

  name       text not null check (btrim(name) <> ''),
  unit_price numeric(10,2) not null,
  quantity   integer not null default 1 check (quantity > 0),

  -- Decision 2.
  price numeric(10,2)
    generated always as (unit_price * quantity) stored,

  -- Where it came from, when it came from somewhere: a retail product id, a
  -- module id. Free-form on purpose — retail has no table here yet, and a
  -- foreign key to a fixture is worse than a string.
  source_id text,

  author_name text not null default 'Staff',
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists booking_line_items_booking_idx
  on public.booking_line_items (booking_id);

comment on table public.booking_line_items is
  'Things added to a booking at the counter — products, add-ons, fees. ONLY the additions: totals, deposits and payments are derived. See Decision 1 in 20260806820000.';

alter table public.booking_line_items enable row level security;

create policy booking_line_items_read on public.booking_line_items
  for select using (
    private.is_platform_admin()
    or exists (
      select 1 from public.bookings b
       where b.id = booking_line_items.booking_id
         and (b.client_id in (select private.own_client_ids())
              or private.has_permission(b.facility_id, 'view_bookings'))
    )
  );

create policy booking_line_items_insert on public.booking_line_items
  for insert with check (
    private.has_permission(facility_id, 'retail_process_sale')
  );
create policy booking_line_items_update on public.booking_line_items
  for update using (private.has_permission(facility_id, 'retail_process_sale'))
          with check (private.has_permission(facility_id, 'retail_process_sale'));
create policy booking_line_items_delete on public.booking_line_items
  for delete using (private.has_permission(facility_id, 'retail_process_sale'));

drop trigger if exists booking_line_items_set_updated_at on public.booking_line_items;
create trigger booking_line_items_set_updated_at
  before update on public.booking_line_items
  for each row execute function private.set_updated_at();

drop trigger if exists booking_line_items_stamp_author on public.booking_line_items;
create trigger booking_line_items_stamp_author
  before insert on public.booking_line_items
  for each row execute function private.stamp_author();

-- ── What the booking costs in total ─────────────────────────────────────────

alter table public.bookings
  add column if not exists extras_total numeric(10,2) not null default 0;

alter table public.bookings
  add column if not exists amount_due numeric(10,2)
    generated always as (total_cost + extras_total) stored;

comment on column public.bookings.extras_total is
  'DERIVED from public.booking_line_items. Never write it: private.derive_booking_extras() overwrites any value on every insert and update.';
comment on column public.bookings.amount_due is
  'What this booking costs in total: its own price plus anything added to it. The number every balance is measured against — see Decision 3 in 20260806820000.';

create or replace function private.booking_extras_total(p_booking_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(li.price), 0)::numeric(10,2)
    from public.booking_line_items li
   where li.booking_id = p_booking_id;
$$;

revoke execute on function private.booking_extras_total(uuid) from public;
revoke execute on function private.booking_extras_total(uuid) from anon;
revoke execute on function private.booking_extras_total(uuid) from authenticated;

create or replace function private.derive_booking_extras()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.extras_total := private.booking_extras_total(new.id);
  return new;
end;
$$;

-- Runs BEFORE bookings_set_derived_payment, which needs the final figure to
-- decide whether the booking is settled: after the shared prefix
-- `bookings_set_derived_`, 'e' < 'p'. Both run after bookings_enforce_integrity
-- ('e' < 's') and before bookings_set_updated_at ('set_d' < 'set_u').
--
-- Note that `amount_due` is unavailable to any of them: a STORED generated
-- column is computed after BEFORE triggers, so inside one it reads NULL. They
-- add `total_cost + extras_total` themselves — see 20260806840000.
drop trigger if exists bookings_set_derived_extras on public.bookings;
create trigger bookings_set_derived_extras
  before insert or update on public.bookings
  for each row execute function private.derive_booking_extras();

-- ── A line item moves its booking ───────────────────────────────────────────
--
-- SECURITY DEFINER, and this time the reason is known rather than guessed:
-- `retail` holds `retail_process_sale` and NOT `edit_bookings`, so as INVOKER
-- this fails twice — loudly on the helper's EXECUTE, and then, if that were
-- granted, silently on the bookings UPDATE with zero rows and no error. The
-- same pair 20260806780000 found the hard way.

create or replace function private.line_item_moves_the_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old uuid := case when tg_op <> 'INSERT' then old.booking_id end;
  v_new uuid := case when tg_op <> 'DELETE' then new.booking_id end;
begin
  if v_new is not null then
    update public.bookings
       set extras_total = private.booking_extras_total(v_new) where id = v_new;
  end if;
  -- Both ids, for the same reason as private.booking_moves_the_client: an item
  -- moved to another booking otherwise leaves its price behind on the first.
  if v_old is not null and v_old is distinct from v_new then
    update public.bookings
       set extras_total = private.booking_extras_total(v_old) where id = v_old;
  end if;
  return null;
end;
$$;

drop trigger if exists booking_line_items_move_the_booking on public.booking_line_items;
create trigger booking_line_items_move_the_booking
  after insert or update or delete on public.booking_line_items
  for each row execute function private.line_item_moves_the_booking();
