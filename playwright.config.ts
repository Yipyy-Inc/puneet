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
