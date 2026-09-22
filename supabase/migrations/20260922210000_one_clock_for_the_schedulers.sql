-- ============================================================================
-- The database's own clock, readable by the code that schedules against it.
--
-- ── THE BUG THIS EXISTS TO END ────────────────────────────────────────────
--
-- Every scheduler in the product asks "what is due?" by comparing a column
-- written with the DATABASE's `now()` against a bound built from the NODE
-- process's `new Date()`. Those are two different clocks, and on 2026-09-22
-- this machine measured **1.664 s behind** Supabase — stable across three
-- rounds at 120 ms round trip.
--
-- That is enough. Proven against a seeded row:
--
--   seeded, recovery_not_before (DB clock) = 14:00:48.429562+00
--   the tick's new Date()                  = 14:00:46.885Z
--   rows the tick would find NOW           : 0
--   rows it would find with a +5s allowance: 1
--
-- A row stamped `now()` by a trigger lands in the tick's own future, so the
-- tick does not see it. `abandonment-recovery-send` had been failing on
-- exactly this since the clock drifted past the gap, with no code change in
-- the window.
--
-- ── WHY A FUNCTION AND NOT A CAST ─────────────────────────────────────────
--
-- PostgREST accepts `?col=lte.now`, which makes Postgres cast the literal and
-- decide with its own clock — and that fixes a FILTER. It does not fix the
-- comparisons the schedulers then make in JavaScript: recovery's
-- `recoveryDueAt(abandoned_at, delayHours) > now` would still defer a
-- zero-delay row, and the form reminder's window is computed from `now`
-- before the query is built. One clock read, threaded through a tick, fixes
-- both kinds at once and is far easier to reason about than four casts and
-- three subtractions.
--
-- One round trip per tick, against a job that runs every few minutes.
-- ============================================================================

create or replace function public.db_now()
returns timestamptz
language sql
stable
parallel safe
set search_path to ''
as $clock$
  select now();
$clock$;

comment on function public.db_now() is
  'The database clock, for code that schedules against database timestamps.';

-- `public`, `anon` and `authenticated` are three different grants; revoking
-- one leaves the others. Asserted in supabase/tests/db-clock.sql, because a
-- revoke naming a privilege the role does not hold succeeds silently and looks
-- exactly like one that worked.
revoke all on function public.db_now() from public;
revoke all on function public.db_now() from anon;
grant execute on function public.db_now() to authenticated, service_role;
