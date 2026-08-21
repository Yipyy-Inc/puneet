-- ============================================================================
-- A booking earns its points once.
--
-- ── WHY A CONSTRAINT AND NOT A CHECK IN THE ROUTE ─────────────────────────
--
-- Earning fires from a checkout, and a checkout is retried: a staff member
-- clicks again when a toast is missed, a network blips between the charge and
-- the award, a page is refreshed mid-flow. A route that reads "has this booking
-- earned yet?" and then writes has a window between the two, and both callers
-- pass through it.
--
-- So the ledger itself refuses the second row. `source_id` holds the booking
-- for an earn, and one account cannot hold two of them.
--
-- ── PARTIAL, BECAUSE THE OTHER SOURCES ARE NOT UNIQUE ─────────────────────
--
-- `source = 'manual'` is a staff adjustment and there may be many for the same
-- account with no source_id at all; expiry runs post repeatedly. Only an earn
-- against a booking claims to be one-per-thing, so only that is constrained.
--
-- A partial unique index rather than a table constraint for exactly that: the
-- rule is about a subset of rows, and stating it as a whole-table uniqueness
-- would forbid perfectly ordinary history.
-- ============================================================================
create unique index if not exists loyalty_transactions_one_earn_per_booking
  on public.loyalty_transactions (account_id, source_id)
  where source = 'booking' and source_id is not null;

comment on index public.loyalty_transactions_one_earn_per_booking is
  'A booking earns points once. The route relies on this rather than on a read-then-write, because a checkout is retried.';
