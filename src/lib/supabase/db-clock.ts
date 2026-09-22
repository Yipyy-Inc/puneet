import "server-only";

// ============================================================================
// The clock a scheduler must use.
//
// ── WHY NOT `new Date()` ──────────────────────────────────────────────────
//
// Every "what is due?" query in this product compares a column written with
// the DATABASE's `now()` against a bound built from the NODE process's clock.
// Those are two different clocks. Measured 2026-09-22: this machine ran
// **1.664 s behind** Supabase, stable across three rounds, and that was enough
// to make the abandoned-booking tick miss a draft created moments earlier —
// the row was stamped in the tick's own future.
//
// The failure is silent and it is NOT a test artifact: a production host that
// drifts delays every scheduled thing by its drift. Cron re-running absorbs
// it, so it costs a tick rather than a message — until a delay is configured
// as zero, which the schema allows and a facility may well choose.
//
// ── ONE READ PER TICK, THREADED DOWN ──────────────────────────────────────
//
// Call this once where a tick starts and pass the value down. Calling it per
// row would be a round trip per row, and would also reintroduce the thing
// being fixed: two rows in one batch judged against two different instants.
//
// ── IT NEVER BREAKS A TICK ────────────────────────────────────────────────
//
// If the clock cannot be read, the machine's own is returned rather than
// throwing. A tick running on a possibly-skewed clock is what happened for
// months; a tick that does not run at all is worse. The fallback says so in
// the log so it is not mistaken for the fixed behaviour.
// ============================================================================

interface ClockDb {
  rpc: (
    fn: string,
    args?: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

/**
 * The database's current time.
 *
 * `db` is any Supabase client — the admin client for a cron tick, a request
 * client elsewhere. `db_now()` is granted to `authenticated` and
 * `service_role`, so both can read it.
 */
export async function databaseNow(db: ClockDb): Promise<Date> {
  try {
    const { data, error } = await db.rpc("db_now");
    if (error || typeof data !== "string") {
      console.warn(
        `[clock] db_now() unavailable (${error?.message ?? typeof data}); ` +
          "falling back to this machine's clock, which may be skewed",
      );
      return new Date();
    }
    return new Date(data);
  } catch (failure) {
    console.warn(
      `[clock] db_now() threw (${failure instanceof Error ? failure.message : "unknown"}); ` +
        "falling back to this machine's clock, which may be skewed",
    );
    return new Date();
  }
}
