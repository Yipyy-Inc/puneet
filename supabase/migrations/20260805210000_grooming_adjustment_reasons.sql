-- ============================================================================
-- Aligns grooming_price_adjustments with the taxonomy the app already has.
--
-- ── THE MISTAKE THIS FIXES ─────────────────────────────────────────────────
--
-- 20260805140000 invented its own reason set — matting, behavior,
-- size_correction, time_overrun, discount, other — without checking that
-- `priceAdjustmentReasonEnum` in src/types/grooming.ts already defined eight,
-- and that the surcharge UI renders its labels from exactly those:
--
--   matting-fee            de-shedding-upgrade    extra-brushing-time
--   behavioral-handling    extra-time-required    product-upgrade
--   special-treatment      other
--
-- Two taxonomies for one concept is the parallel-model problem the debt map
-- already records three times over. The app's is the one with a UI attached, so
-- the database moves.
--
-- Safe to replace outright rather than migrate values across: the table has
-- zero rows (checked, not assumed — the only writes so far were inside
-- rolled-back test transactions).
--
-- ── THREE COLUMNS THE FIRST CUT ALSO MISSED ────────────────────────────────
--
--   custom_reason     — the mock's companion to `other`, so a facility can name
--                       a charge the taxonomy does not cover.
--   customer_notified — whether the owner was TOLD about the surcharge, and
--   notified_at         when. This is not decoration: a charge added mid-groom
--                       that the customer first sees at the till is the single
--                       most disputed thing a salon does, and the model already
--                       tracked it. Losing it in translation would have made the
--                       database worse than the mock it replaced.
--
-- `note` stays, mapping to the schema's required `description`.
-- ============================================================================

alter table public.grooming_price_adjustments
  drop constraint if exists grooming_price_adjustments_reason_check,
  drop constraint if exists grooming_adjustment_other_needs_note;

alter table public.grooming_price_adjustments
  add column if not exists custom_reason    text,
  add column if not exists customer_notified boolean not null default false,
  add column if not exists notified_at      timestamptz;

alter table public.grooming_price_adjustments
  add constraint grooming_price_adjustments_reason_check
    check (reason in ('matting-fee', 'de-shedding-upgrade', 'extra-brushing-time',
                      'behavioral-handling', 'extra-time-required',
                      'product-upgrade', 'special-treatment', 'other'));

-- Unchanged in spirit, widened in fact: an `other` charge must SAY what it is,
-- in either field. An unexplained line on a customer's bill is the thing worth
-- refusing, and `custom_reason` is now the more natural place to put it.
alter table public.grooming_price_adjustments
  add constraint grooming_adjustment_other_needs_reason
    check (
      reason <> 'other'
      or length(btrim(coalesce(custom_reason, ''))) > 0
      or length(btrim(coalesce(note, ''))) > 0
    );

-- A notification timestamp without the flag, or the reverse, is a record that
-- half-remembers whether the customer was told.
alter table public.grooming_price_adjustments
  add constraint grooming_adjustment_notified_consistent
    check (customer_notified = (notified_at is not null));

comment on column public.grooming_price_adjustments.customer_notified is
  'Whether the owner was told about this surcharge. Paired with notified_at by a CHECK — see 20260805210000.';
