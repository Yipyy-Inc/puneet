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
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Bun loads .env.local for `bun run dev`, so the SERVER sees AUTH_ENFORCED —
 * but Playwright's runner is node and does not, so specs could not tell which
 * regime they were testing. Reading it here means a spec that only applies
 * under enforcement can skip itself instead of failing with a puzzle.
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
  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
