import { readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke harness for the staff-portal nav-parity work (see the spec in
 * tests/e2e/). Deliberately minimal: one Chromium project against the dev
 * server. The webServer block auto-starts `bun run dev` and reuses an already
 * running one locally, so `bun run test:e2e` works from a cold repo.
 *
 * NOTE: dev-mode compiles routes on first hit, so the first navigation to a
 * route is slow — the generous timeouts below account for that.
 */
const PORT = 3000;

/**
 * Point the whole suite somewhere else with E2E_BASE_URL, e.g.
 *
 *   E2E_BASE_URL=https://www.yipyy.com bun run test:e2e
 *
 * Added while verifying an AUTH_ENFORCED rollout, after running the
 * enforcement specs "against production" and only afterwards noticing the URL
 * was hardcoded — they had passed against localhost, which has the same flag
 * set, so they proved nothing. A hardcoded base that silently ignores an
 * override is a good way to believe you tested something you did not.
 *
 * REMOTE RUNS SKIP THE webServer BLOCK (below), since there is nothing local
 * to start, and specs that WRITE run against real data — see the cleanup in
 * booking-write-integrity.spec.ts before pointing this at production.
 */
const REMOTE = process.env.E2E_BASE_URL?.trim();
const BASE_URL = REMOTE || `http://localhost:${PORT}`;

/**
 * Bun loads .env.local for `bun run dev`, so the SERVER sees its contents — but
 * Playwright's runner is node and does not. E2E_PASSWORD is what needs it now:
 * rotate the dev accounts, put the new value in .env.local, and the suite picks
 * it up without a code change.
 *
 * It was added for AUTH_ENFORCED, so specs that only applied under enforcement
 * could skip themselves rather than fail with a puzzle. That flag is gone —
 * every portal requires a session — and the specs that skipped now sign in.
 *
 * Deliberately minimal: KEY=value, no quoting or interpolation. If this ever
 * needs to grow, use a real dotenv rather than extending it.
 */
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!;
  }
} catch {
  /* no .env.local — CI, or a fresh clone */
}

export default defineConfig({
  testDir: "./tests/e2e",
  // The dev server is a single shared process; serialise to avoid compile races.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Nothing to start when pointing at a deployed URL — and starting a local
  // dev server would be worse than pointless, since Playwright would wait for
  // it and then test somewhere else entirely.
  webServer: REMOTE
    ? undefined
    : {
        command: "bun run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
