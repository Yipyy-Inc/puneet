-- ============================================================================
-- Two audit entries written in one transaction are still in order.
--
-- `occurred_at` defaulted to now(), which in Postgres is TRANSACTION START
-- TIME and constant for the whole transaction. Provisioning a facility writes
-- three entries — the facility, the owner's invitation, the access grant — in
-- a single transaction, so all three carried the identical timestamp and
--
--   order by occurred_at desc
--
-- returned them in whatever order the planner felt like. Caught by asserting
-- the NEWEST row after provisioning-then-suspending: the answer was "Facility
-- provisioned", which happened first.
--
-- For most tables that is a cosmetic tie. For an audit trail the sequence IS
-- the content: "who suspended it, and what happened just before" is the
-- question these rows exist to answer, and a trail that cannot order itself
-- answers it wrongly while looking complete.
--
-- clock_timestamp() reads the actual wall clock at each insert, so entries
-- within a transaction differ by microseconds and sort correctly. It is not
-- transaction-safe in the sense now() is — a rolled-back transaction leaves
-- nothing behind either way, so that difference does not arise here.
--
-- Existing rows keep the timestamp they were written with. There is only one,
-- and it could not be corrected in any case: the table refuses UPDATE.
-- ============================================================================

alter table public.audit_log
  alter column occurred_at set default clock_timestamp();

comment on column public.audit_log.occurred_at is
  'clock_timestamp(), not now(): several entries can be written in one transaction (provisioning writes three) and the order between them is load-bearing.';
