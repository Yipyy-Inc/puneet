-- ============================================================================
-- AN ESTIMATE KEEPS ITS WHOLE TAX RATE.
--
-- `estimates.tax_rate` was `numeric(6,3)` — three decimal places on a value the
-- schema documents as a FRACTION, "0.05 for 5%". Quebec's combined GST (5%) and
-- QST (9.975%) is 0.14975, and three decimals store that as 0.150.
--
--   Tax on a $2,000 estimate:  $299.50 owed,  $300.00 quoted.
--
-- Small per estimate and wrong on every one of them, at every facility whose
-- combined rate has more than three decimals — which is every Quebec facility,
-- because QST is 9.975%. `EstimateWizard` derives the rate by measuring
-- `computeTax(1_000_000)`, so it produces the exact 0.14975 and always has; the
-- column was the only thing rounding it.
--
-- ── THE EIGHT ESTIMATES ALREADY STORED ARE NOT REWRITTEN ──────────────────
--
-- They were SENT at the figure they show. A quote is a document the customer
-- has; silently changing its total afterwards is worse than the half-dollar it
-- would correct. New estimates are exact from here.
-- ============================================================================

alter table public.estimates
  alter column tax_rate type numeric(8,5);

comment on column public.estimates.tax_rate is
  'The combined tax rate as a FRACTION (0.14975 for GST+QST). numeric(8,5), not (6,3): three decimals rounded 0.14975 to 0.150 and over-quoted every Quebec estimate. See 20260921190000.';
