-- ============================================================================
-- A service charge is a line on the bill, and it lands ONCE.
--
-- A custom fee is folded into `bookings.total_cost` today, indistinguishable
-- from the base price. It cannot appear on an invoice by name, no report can
-- see it, and nothing records which rule charged it.
--
-- 20260806820000's own Decision 3 already settles where it belongs:
--
--     "`total_cost` is the BOOKING's price and stays that. What a customer
--      owes is `total_cost + extras_total`."
--
-- A service charge is not the booking's price. It is an addition. So it is a
-- line item, and the fold is the defect.
--
-- ── THE CONSTRAINT IS THE FEATURE ────────────────────────────────────────
--
-- MoéGo's rule is "each fee can only be added once per appointment". Three
-- separate passes will want to apply a fee — booking create, checkout open,
-- and a member of staff adding one by hand — and any two of them running
-- against the same booking is a double charge.
--
-- `unique (booking_id, fee_id)` makes that a database fact rather than a
-- discipline three call sites have to remember. A second attempt is refused
-- by Postgres, and the automatic passes upsert with `ignoreDuplicates` so
-- running twice costs nothing.
--
-- ── WHY NULL IS SAFE, AND WHY IT IS A CONSTRAINT AND NOT AN INDEX ────────
--
-- Four writers already put `kind: 'fee'` rows on bookings — time fees, the
-- cancellation fee, the grooming matting surcharge and mark-ready charges.
-- None of them is a custom fee and none sets `fee_id`. Postgres treats every
-- NULL as distinct, so they can keep writing as many rows as they like and
-- this constraint never fires on them. The SQL test's negative control runs
-- that case FIRST, before any positive assertion, because "it does not
-- over-fire" is the property that protects existing revenue.
--
-- A partial unique index would express the same rule, but PostgREST cannot
-- name a predicate for `ON CONFLICT` to infer, so the client could not target
-- it. A plain constraint gives identical protection and a conflict target the
-- Supabase client can name.
--
-- ── A NOTE FOR WHOEVER BUILDS COMMISSION ─────────────────────────────────
--
-- MoéGo excludes service charges from staff commission. This product has no
-- commission engine at all — `PayrollConfig.generalServiceCommission` stores
-- a percentage that nothing computes, and `api/payroll` is purely time-based.
-- So there is nothing to exclude from yet. When there is, the exclusion is
-- `where fee_id is null`, and this comment is why that line exists.
-- ============================================================================

alter table public.booking_line_items
  add column if not exists fee_id text;

comment on column public.booking_line_items.fee_id is
  'The custom-fee rule that charged this line, where one did. NULL for everything else — retail items, time fees, cancellation fees, grooming charges — and NULLs are distinct, so the once-per-booking constraint never fires on them.';

-- Idempotent: `add constraint` has no `if not exists`, so ask the catalogue.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.booking_line_items'::regclass
       and conname  = 'booking_line_items_fee_once'
  ) then
    alter table public.booking_line_items
      add constraint booking_line_items_fee_once unique (booking_id, fee_id);
  end if;
end $$;

-- For the reports branch that sums service charges by facility. Partial,
-- because the overwhelming majority of line items carry no fee_id at all.
create index if not exists booking_line_items_fee_idx
  on public.booking_line_items (facility_id, fee_id)
  where fee_id is not null;
