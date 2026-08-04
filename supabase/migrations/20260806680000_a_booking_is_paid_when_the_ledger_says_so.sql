-- ============================================================================
-- A booking is paid because money was recorded, not because a string says so.
--
-- Before this migration: thirteen bookings carried payment_status = 'paid',
-- for $790.75, and `public.payments` had ZERO ROWS. Nothing derived the status,
-- nothing reconciled it, and nothing would have noticed if it were wrong.
--
-- `private.enforce_booking_integrity` (20260802120000) already refuses to let a
-- CUSTOMER set it — forced to 'pending' on insert, put back on update. The hole
-- is everyone else: `v_is_staff` returns early, and so does the seed path
-- (auth.uid() is null). Both write the column freely. Thirteen rows is what
-- that looks like after one seed.
--
-- ── DECISION 1: DERIVED, NOT MAINTAINED ────────────────────────────────────
--
-- Same argument as the store-credit balance (20260806220000, Decision 4): one
-- fact in two places, and the one that goes stale is money. But a balance
-- cannot be `sum()` at read time here, because `payments_read` requires
-- `financial_view_amounts` — a receptionist without it would sum ZERO VISIBLE
-- ROWS and read a balance of nought. Not an error. A wrong number, silently.
--
-- So `amount_paid` is denormalised onto the booking and recomputed by trigger,
-- exactly as `boarding_stays.released_at` is (20260806600000) and for a related
-- reason: the derivation has to see rows the reader may not.
--
-- The recompute is a full `sum()`, not `amount_paid + new.grand_total`. An
-- incremental counter drifts once and stays wrong forever; a recompute is
-- idempotent and repairs itself the next time anything touches the row.
--
-- ── DECISION 2: A TIP IS NOT PAYMENT TOWARD THE BILL ───────────────────────
--
-- `grand_total = subtotal + tax + tip`, so summing grand_total would let a
-- generous tip settle a shortfall — pay $80 of a $100 bill with a $25 tip and
-- the booking reads 'paid'. What was paid toward the bill is `grand_total -
-- tip`. Store credit and package passes DO settle it, which is why the measure
-- is grand_total and not `amount_charged`: those reduce what the card is asked
-- for, not what the customer owes.
--
-- ── DECISION 3: NO 'partial' — YET ─────────────────────────────────────────
--
-- The column's CHECK allows ('pending','paid','refunded') and 46 files read the
-- app-side field. A half-paid booking reads 'pending', which is true — it is
-- not settled — and `amount_paid` carries the actual figure for anyone who may
-- see money. Adding a fourth value is a change to 46 surfaces and belongs to
-- whichever change builds deposits, not to this one.
--
-- ── DECISION 4: THE SEED GETS REAL PAYMENT ROWS ────────────────────────────
--
-- The thirteen could have been dropped to 'pending'. They are instead given one
-- `payments` row each, because they are FIXTURE data: the bookings are
-- fabricated, the pets are fabricated, and a payment for a booking the fixture
-- says was paid is consistent fabrication rather than a new claim.
--
-- It also buys the strongest check this migration has. The status distribution
-- must be IDENTICAL either side of it — 13 paid, 45 pending. If the derivation
-- is wrong, that number moves.
-- ============================================================================

alter table public.bookings
  add column if not exists amount_paid numeric(10,2) not null default 0;

comment on column public.bookings.amount_paid is
  'DERIVED from public.payments — sum(grand_total - tip). Never write it: private.derive_booking_payment() overwrites any value on every insert and update.';

-- ── What the ledger says about one booking ──────────────────────────────────
--
-- SECURITY DEFINER so the sum covers every payment, not the subset the caller
-- may read. That is the whole point of Decision 1, and it is why this function
-- is not granted to anyone: it is reachable only from the triggers below, and
-- `private` is not an exposed schema. A caller who could invoke it would be
-- asking "how much has been paid on this booking" without
-- `financial_view_amounts`, which is precisely the question the policy refuses.

create or replace function private.booking_amount_paid(p_booking_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.grand_total - p.tip), 0)::numeric(10,2)
    from public.payments p
   where p.booking_id = p_booking_id;
$$;

revoke execute on function private.booking_amount_paid(uuid) from public;
revoke execute on function private.booking_amount_paid(uuid) from anon;
revoke execute on function private.booking_amount_paid(uuid) from authenticated;

comment on function private.booking_amount_paid is
  'What has been paid toward a booking: sum(grand_total - tip). DEFINER so it sees payments the reader may not — see Decision 1 in 20260806680000. Deliberately granted to nobody.';

-- ── The derivation itself ───────────────────────────────────────────────────
--
-- A SEPARATE trigger rather than more code inside enforce_booking_integrity,
-- because that function rewrites `total_cost` on the customer path and the
-- status depends on it. Deriving inside it would mean deriving before the
-- number it derives from is final.
--
-- Trigger order is by NAME, which 20260802120000 already relies on:
--   bookings_enforce_integrity  →  bookings_set_derived_payment  →  bookings_set_updated_at
-- 'e' < 's', and 'set_d' < 'set_u'. Stated because it is load-bearing.

create or replace function private.derive_booking_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.amount_paid := private.booking_amount_paid(new.id);

  new.payment_status := case
    -- Net negative: refunded more than was taken.
    when new.amount_paid < 0 then 'refunded'
    -- `> 0` as well as `>=` so a zero-cost booking is not 'paid' by default.
    when new.amount_paid > 0 and new.amount_paid >= new.total_cost then 'paid'
    else 'pending'
  end;

  return new;
end;
$$;

comment on function private.derive_booking_payment is
  'Overwrites bookings.amount_paid and payment_status from the payments ledger. Runs for EVERY writer including service_role — there is no path that sets them by hand.';

drop trigger if exists bookings_set_derived_payment on public.bookings;
create trigger bookings_set_derived_payment
  before insert or update on public.bookings
  for each row execute function private.derive_booking_payment();

-- ── Taking a payment moves the booking ──────────────────────────────────────
--
-- SECURITY DEFINER for a specific reason, not by habit: the role presets grant
-- `financial_take_payment` to reception and retail, neither of which has
-- `edit_bookings`. Running as the invoker, this UPDATE would match zero rows
-- under `bookings_update` and REPORT SUCCESS — the payment lands, the booking
-- never moves, and no error is raised anywhere. That failure mode is the one
-- this project has now hit three times (see the debt map, 2026-08-06).
--
-- The authority it adds is bounded by what it can write: the statement sets
-- only `amount_paid`, and the value is computed from the ledger rather than
-- taken from anyone. There is no argument through which a caller can influence
-- the result except by inserting a payment, which is already policed.
--
-- AFTER INSERT only. Payments are immutable (Decision 1 in 20260806220000):
-- there is no update or delete policy and a trigger blocks both, so an insert
-- is the only event there is.

create or replace function private.payment_moves_the_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.booking_id is not null then
    -- amount_paid is assigned here and then overwritten by
    -- derive_booking_payment with the same computation. The assignment is what
    -- makes this an UPDATE at all; the recompute is what makes it correct.
    update public.bookings
       set amount_paid = private.booking_amount_paid(new.booking_id)
     where id = new.booking_id;
  end if;
  return null;
end;
$$;

comment on function private.payment_moves_the_booking is
  'Recomputes the booking a payment names. DEFINER because financial_take_payment does not imply edit_bookings — see the header of 20260806680000.';

drop trigger if exists payments_move_the_booking on public.payments;
create trigger payments_move_the_booking
  after insert on public.payments
  for each row execute function private.payment_moves_the_booking();
