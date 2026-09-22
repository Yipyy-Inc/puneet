-- ============================================================================
-- The clock the schedulers read (one_clock_for_the_schedulers).
--
--   bun run test:sql db-clock
--
-- One transaction, rolled back. Nothing here survives the run.
--
-- ── WHY A FUNCTION THIS SMALL HAS A TEST ──────────────────────────────────
--
-- Not for `select now()`, which is not going to stop working. For the GRANTS.
-- Five schedulers now call this on every tick through the service role, and a
-- `db_now()` that `service_role` cannot execute would send every one of them
-- to their fallback — this machine's clock — which is the exact bug they were
-- changed to stop having. The fallback is deliberately silent enough to keep
-- a tick running, so nothing else would report it.
--
-- C1  it answers, and with the database's own time
-- C2  the doors: authenticated and service_role in, anon and public out
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $tap$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$tap$;

-- ── C1  It is the database's clock, not something near it ─────────────────
--
-- Inside one transaction `now()` is the transaction's start, and `db_now()` is
-- `stable`, so these are the same instant rather than merely close. Equality
-- is the honest assertion; a tolerance would pass even if the function had
-- been rewritten to return something else entirely.
select pg_temp.t(
  'C1 db_now() is the transaction clock, exactly',
  public.db_now() = now(),
  public.db_now()::text || ' vs ' || now()::text);

-- ── C2  The doors ─────────────────────────────────────────────────────────
--
-- `public`, `anon` and `authenticated` are three different grants. A revoke
-- naming a privilege the role does not hold succeeds silently and looks
-- exactly like one that worked, so the state is read back rather than assumed.
--
-- service_role is asserted BECAUSE the ticks run as it: this is the grant
-- whose absence would put all five schedulers back on the machine clock.
select pg_temp.t(
  'C2 the schedulers can read it',
  has_function_privilege('service_role', 'public.db_now()', 'execute')
  and has_function_privilege('authenticated', 'public.db_now()', 'execute'));

select pg_temp.t(
  'C2 and a signed-out caller cannot',
  not has_function_privilege('anon', 'public.db_now()', 'execute')
  and not has_function_privilege('public', 'public.db_now()', 'execute'));

select n, name, ok, detail from tap order by n;

rollback;
