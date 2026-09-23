-- ============================================================================
-- `bookings.total_cost` is GROSS of the discount, and three rows are corrected
-- to say so.
--
-- ── THE BUG ───────────────────────────────────────────────────────────────
--
-- `amount_due` is GENERATED as
-- `greatest(0, total_cost + extras_total - coalesce(discount, 0))`
-- (20260819210000), so the database takes the discount off itself. The
-- booking form sent a `total_cost` that ALREADY had it off, and sent
-- `discount` beside it — so it came off twice.
--
-- Measured against this database on 2026-09-24, not inferred: a booking
-- posted as `basePrice 100, discount 20, totalCost 80` came back owing $60
-- against a quote of $80.
--
-- ── WHICH CONVENTION IS RIGHT, AND HOW THE DATA SETTLED IT ────────────────
--
-- Everything on the database side already assumed GROSS: `amount_due`'s own
-- comment ("total_cost + extras_total - discount"), the commission basis
-- `greatest(0, total_cost - discount)` (20260923220000), and
-- `supabase/tests/booking-commission.sql` T2. Only the WRITER disagreed — and
-- `tests/e2e/booking-form-saves.spec.ts` pinned the writer, so a green gate
-- kept the bug alive.
--
-- The money settled it. Booking ref 7 is `completed`, `paid`, with a single
-- payment of $63.75 against `base_price 75, discount 11.25, total_cost 63.75`
-- — an `amount_due` of $52.50. The customer was charged 75 − 11.25, exactly
-- what the gross convention produces. The ledger was right and `amount_due`
-- was wrong.
--
-- ── WHAT THIS CORRECTS ────────────────────────────────────────────────────
--
-- Only rows whose `total_cost` is EXACTLY `base_price - discount`, which is
-- the net shape and nothing else. A multi-night stay priced gross (ref 15:
-- base 65, discount 16.25, total_cost 130 for two nights) does not match and
-- is left alone, and neither do the rows that were already gross.
--
-- No row loses money. Ref 7's `amount_due` rises to the $63.75 that was
-- actually paid, so it stays `paid`; the other two carry no payments at all.
-- ============================================================================

update public.bookings b
   set total_cost = b.total_cost + b.discount
 where b.discount > 0
   and b.total_cost = b.base_price - b.discount;

comment on column public.bookings.total_cost is
  'The SERVICE''s price, GROSS of the discount and before tax. What a customer owes is amount_due = total_cost + extras_total - discount, so a caller that nets the discount out of this column has it taken twice. Set by 20260924100000.';

comment on column public.bookings.discount is
  'Money off the whole bill, subtracted ONCE by amount_due. Never already inside total_cost. Capped at base_price by bookings_discount_within_price.';
