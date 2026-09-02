-- The gift-card activity feed asks one question: this facility's newest
-- movements. There was no index for it — only (gift_card_id, created_at desc),
-- which answers "one card's history".
--
-- Without it the planner sequential-scans and top-N sorts, which is 2.7ms on
-- its own and fine. What is not fine is that RLS runs per row on the way past:
-- `gift_card_transactions_read` calls
-- `private.has_permission(facility_id, 'financial_manage_gift_cards')`, and
-- because the argument is a COLUMN it cannot be hoisted out of the loop. At
-- 4,539 rows the read timed out — and `ledgersForFacility` discards its error,
-- so the screen reported a facility with no gift-card history at all rather
-- than a query that never finished.
--
-- With this index the planner walks in created_at order and stops once the
-- LIMIT is satisfied, so the permission is checked for the rows returned rather
-- than for every row in the table.
--
-- This changes no policy and no grant. It makes the existing one affordable.
create index if not exists gift_card_transactions_facility_idx
  on public.gift_card_transactions (facility_id, created_at desc);
