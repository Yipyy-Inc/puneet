// ============================================================================
// Fixtures that only exist in the DEPLOYED environment.
//
// ── THE TRAP THIS CLOSES ──────────────────────────────────────────────────
//
// Eight spec files are built on real Clover data and the staff account attached
// to it: CLOVER_E2E_STAFF_EMAIL, CLOVER_E2E_CUSTOMER_EMAIL, the booking refs,
// and the E2E_POSTGRES_* client. Each one already guards itself with
// `test.skip(!VAR, "set VAR…")`, which is correct as far as it goes.
//
// It does not go far enough, and a local run is where that shows. Those
// addresses are PRODUCTION WorkOS identities. The suite runs on STAGING keys —
// `_workos-keys.ts` requires `sk_test_…` and refuses anything else, on purpose.
// So with the variables set in `.env.local`, the guard sees non-empty values,
// runs the tests, and every one of them fails at sign-in with
//
//   Invalid credentials for 'clover-staff@yipyy.com'
//
// which reads like a broken account or a broken app. It is neither: it is the
// wrong environment. Measured on 2026-08-18, that was 8 of 50 spec files —
// client-file alone is 15 tests, each burning a 30-second sign-in timeout twice
// over with retries, and the run was still in the c's after an hour.
//
// ── WHY E2E_BASE_URL IS THE RIGHT DISCRIMINATOR ───────────────────────────
//
// The data these specs read lives in the one shared Postgres, so it IS
// reachable from a local dev server. Only the IDENTITY is not. The suite can
// authenticate a production identity exactly when it is pointed at the
// deployment that owns it, and `E2E_BASE_URL` is what points it there
// (playwright.config.ts calls the same value REMOTE and skips its webServer
// block for it).
//
// So these values are readable on a remote run and empty on a local one, which
// makes each file's own guard fire and report an honest SKIP instead of a
// failure that means nothing.
//
//   bun run test:e2e                                    # local, these skip
//   E2E_BASE_URL=https://www.yipyy.com bun run test:e2e  # these run
//
// Do NOT "fix" a skip by hardcoding a value here. The account has to exist in
// the WorkOS environment the run authenticates against, and no amount of
// configuration makes a production user resolve on staging keys.
// ============================================================================

/**
 * True when the suite is pointed at a DEPLOYED environment.
 *
 * Not merely "E2E_BASE_URL is set". Pointing it at a locally built server —
 * `next build && next start`, which is a sane way to dodge the dev server's
 * on-demand compilation — would otherwise count as remote and hand production
 * identities back to a run using staging keys, which is the exact trap this
 * file exists to close. A local host is still a local run whatever the port.
 */
export const REMOTE_RUN = (() => {
  const url = process.env.E2E_BASE_URL?.trim();
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
})();

/**
 * A fixture that only resolves on a remote run.
 *
 * Returns "" locally so the caller's existing `test.skip(!VALUE, …)` fires,
 * rather than handing it a value that cannot authenticate.
 */
export function deployedFixture(name: string): string {
  if (!REMOTE_RUN) return "";
  return process.env[name]?.trim() ?? "";
}

/** The numeric form. NaN locally, which every caller already treats as absent. */
export function deployedFixtureRef(name: string): number {
  return Number(deployedFixture(name));
}
