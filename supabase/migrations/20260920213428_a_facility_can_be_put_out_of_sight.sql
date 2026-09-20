-- ============================================================================
-- A facility can be put out of sight.
--
-- The ask was to remove three of four facilities and keep only Doggieville Mtl
-- for the client to test in. The database refuses that, and it is right to:
--
--   payments, loyalty_transactions, gift_card_transactions,
--   store_credit_entries and retail_sales are append-only by trigger,
--   AND payments holds a foreign key to facilities.
--
-- So a facility that has ever taken money can neither be DELETED (the foreign
-- key holds it) nor MERGED into another (the ledger refuses the UPDATE),
-- without switching off the financial-integrity triggers on a database shared
-- with production. Measured on 2026-09-20: a dry run moved 14,464 rows and
-- then hit thirteen tables that refused, payments among them.
--
-- Hiding is the honest version of the request. It is NOT a delete and NOT a
-- permission: every row the facility owns is untouched, RLS is unchanged, its
-- own subdomain keeps answering, and clearing the column brings it back. Two
-- readers respect it — the platform facility list and the staff switcher —
-- and nothing else, deliberately, so an archived facility that somebody is
-- still a member of keeps working for them rather than half-existing.
-- ============================================================================

alter table public.facilities
  add column if not exists archived_at timestamptz;

comment on column public.facilities.archived_at is
  $c$When set, this facility is kept out of the platform facility list and the
staff facility switcher. It is NOT a delete and not a permission: every row the
facility owns is untouched, RLS is unchanged, its own subdomain keeps answering,
and clearing the column brings it straight back.

WHY IT EXISTS (2026-09-20). The ask was to remove three of four facilities and
keep only Doggieville Mtl for client testing. The database refuses that by
design: payments, loyalty_transactions, gift_card_transactions,
store_credit_entries and retail_sales are all append-only by trigger, AND
payments holds a foreign key to facilities. So a facility that has ever taken
money can neither be deleted (the FK holds it) nor merged into another (the
ledger refuses the UPDATE) without switching off the financial-integrity
triggers. Hiding it is the honest version of the request, and it keeps the
e2e suite's own facility alive while the client sees one business.$c$;
