-- ============================================================================
-- FIX: payments had only two of the three reductions.
--
-- 20260806220000 modelled the charge as
--
--   amount_charged = grand_total - store_credit_applied - package_pass_applied
--
-- which is what `PaymentResult` looks like from the outside. Reading the dialog
-- that produces it shows a THIRD reduction between those two:
--
--   const postPassTotal = Math.max(0, grandTotal - packagePassDiscount
--                                                - loyaltyDiscountAmount);
--   const amountCharged  = Math.max(0, postPassTotal - effectiveStoreCredit);
--
-- A loyalty voucher reduces the bill exactly as a pass or credit does, and is
-- consumed on confirm (`consumeLoyaltyDiscount()`), so it is a real reduction
-- and not a display-only figure. Without a column for it, every payment that
-- used one would fail the CHECK — the constraint would have been correct and
-- the schema incomplete, which is the good failure mode but still a failure.
--
-- Caught before anything wrote a row: the app does not read these tables yet.
--
-- ── AND THE CLAMP MATTERS ──────────────────────────────────────────────────
--
-- Both `Math.max(0, …)` calls above mean the dialog can compute a charge of
-- zero while the NOMINAL value of the credits exceeds the bill — a $60 pass
-- against a $50 ticket. Recording 60 there would say the customer spent 60 of
-- something on a 50 ticket, and the equation would not balance.
--
-- So `*_applied` means APPLIED — what was actually consumed, capped at what was
-- owed. The new constraint enforces the arithmetic rather than trusting the
-- caller to have clamped: with the equation plus non-negative credits, an
-- over-applied credit can only produce a negative `amount_charged`, and
-- `payments_charge_matches_direction` refuses that on a positive sale.
--
-- That constraint is sign-aware rather than a flat `>= 0` because a refund is a
-- negative payment (Decision 2 of the original migration) and must stay legal.
-- ============================================================================

alter table public.payments
  add column loyalty_discount_applied numeric(10,2) not null default 0;

comment on column public.payments.loyalty_discount_applied is
  'Loyalty voucher value consumed by this payment. APPLIED, not nominal — capped at what was owed; see 20260806240000.';

-- Replace the two-reduction equation with the three-reduction one.
alter table public.payments
  drop constraint payments_charged_is_the_remainder;

alter table public.payments
  add constraint payments_charged_is_the_remainder
    check (amount_charged = grand_total
                            - store_credit_applied
                            - package_pass_applied
                            - loyalty_discount_applied);

alter table public.payments
  drop constraint payments_credits_are_not_negative;

alter table public.payments
  add constraint payments_credits_are_not_negative
    check (store_credit_applied >= 0
           and package_pass_applied >= 0
           and loyalty_discount_applied >= 0);

-- A sale cannot charge a negative amount, and a refund cannot charge a positive
-- one. Together with the equation above, this is what stops credits worth more
-- than the ticket from being recorded as if they had all been spent.
alter table public.payments
  add constraint payments_charge_matches_direction
    check (
      (grand_total >= 0 and amount_charged >= 0)
      or (grand_total < 0 and amount_charged <= 0)
    );
