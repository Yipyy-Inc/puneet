import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// ============================================================================
// The config behind `bun run shoot` — looking at the app, not testing it.
//
// Deliberately separate from playwright.config.ts, which scans ./tests/e2e and
// is what CI runs. A screenshot errand must never be able to join the suite, and
// the suite's retries, traces and reporters are all wrong for one page view.
//
// No `webServer`: point it at something already running. Starting a server here
// would mean waiting three minutes to look at a screen.
// ============================================================================

// The same four lines playwright.config.ts uses, and for its stated reason: a
// `dotenv` import compiles locally because the package is hoisted into
// node_modules by something else, and FAILS in CI, where `bun install
// --frozen-lockfile` installs exactly the lockfile and dotenv is not a
// dependency of this project. Caught by CI typecheck on 2026-08-24 after a
// local typecheck passed — the difference between the two is the whole lesson.
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match || process.env[match[1]!]) continue;
    // Quote-stripping, and why: see the identical block in playwright.config.ts.
    process.env[match[1]!] = match[2]!.replace(/^(["'])(.*)\1$/, "$2");
  }
} catch {
  /* no .env.local — CI, or a fresh clone */
}

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/shots",
  // One page at a time, in the order asked for. Parallelism would interleave
  // the console output of several errands into something unreadable.
  workers: 1,
  fullyParallel: false,
  // A screenshot that failed should say so once. Retrying would double the wait
  // and produce two files with the same name.
  retries: 0,
  reporter: [["list"]],
  timeout: 180_000,
  use: {
    baseURL: BASE_URL,
    headless: true,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: "light", use: { ...devices["Desktop Chrome"] } },
    {
      // The app is theme-aware and half of every palette decision lives in the
      // dark blocks. `--dark` selects this project rather than passing a flag,
      // so both can be captured in one run if you ask for both.
      name: "dark",
      use: { ...devices["Desktop Chrome"], colorScheme: "dark" },
    },
  ],
});
