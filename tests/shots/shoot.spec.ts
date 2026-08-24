import { test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// Looking at the app, driven by the Playwright runner.
//
// ── WHY A SPEC AND NOT A SCRIPT ───────────────────────────────────────────
//
// This started as `bun scripts/shoot.ts`, importing `chromium` and launching a
// browser directly. It does not work: under **bun**, `chromium.launch()` starts
// the process and then never completes the handshake, failing at the 180-second
// launch timeout. Under **node** the identical call returns in 337ms. Measured
// both ways, twice.
//
// The cause is the transport — Playwright talks to the browser over
// `--remote-debugging-pipe`, and bun's pipe handling does not carry it. That is
// also why `bun run test:e2e` works: it shells out to the Playwright CLI, which
// spawns node workers. So this file goes through the same door the specs do.
//
// ── IT IS NOT A TEST, AND MUST NOT BECOME ONE ─────────────────────────────
//
// It asserts nothing and cleans nothing up. A spec answers "is this still
// true"; this answers "what does it look like" — the question you have when a
// screen is wrong in a way every assertion on it passes. It lives in
// `tests/shots/`, which `playwright.config.ts` does not scan and
// `check:doc-counts` does not count, so it can never be mistaken for coverage.
//
// Never point it at a flow that writes. There is one Postgres, and unlike a
// spec this leaves no `afterAll` behind it.
//
// ── WAITING IS THE WHOLE DIFFICULTY ───────────────────────────────────────
//
// The app renders skeletons while TanStack Query resolves, and they clear fast
// enough that a naive screenshot catches grey boxes about half the time — which
// looks exactly like a broken screen. So it waits for `[data-slot=skeleton]` to
// go, then for the network to settle, then a beat for the fade.
// ============================================================================

const OUT = process.env.SHOOT_OUT ?? "C:/tmp/pwv/shots";
const ACCOUNT = process.env.SHOOT_ACCOUNT ?? "admin";
const PATHS = (process.env.SHOOT_PATHS ?? "").split("\n").filter(Boolean);
const AS_API = process.env.SHOOT_API === "1";
const SETTLE_MS = Number(process.env.SHOOT_SETTLE ?? 600);

function resolveEmail(account: string): string {
  if (account.includes("@")) return account;
  const known = ACCOUNTS as Record<string, string>;
  const email = known[account];
  if (!email) {
    throw new Error(
      `Unknown account "${account}". Use an email, or one of: ${Object.keys(known).join(", ")}`,
    );
  }
  return email;
}

/** A filename that sorts sensibly and says what it is. */
function fileNameFor(path: string, dark: boolean): string {
  const slug =
    path
      .replace(/^\//, "")
      .replace(/[?&=]/g, "-")
      .replace(/\//g, "-")
      .replace(/-+/g, "-")
      .replace(/-$/, "") || "root";
  return `${slug}${dark ? "-dark" : ""}.png`;
}

test("shoot", async ({ page }, testInfo) => {
  // A page can be slow the first time a route is hit; there is nothing to gain
  // from failing the errand instead of waiting.
  test.setTimeout(180_000);

  if (PATHS.length === 0) {
    throw new Error("Nothing to look at. Set SHOOT_PATHS.");
  }

  const dark = testInfo.project.name === "dark";
  mkdirSync(OUT, { recursive: true });

  // Anything the page logs, we log. A screenshot of a screen that threw looks
  // identical to a screenshot of an empty one.
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

  const email = resolveEmail(ACCOUNT);
  await signIn(page, email);
  console.log(`signed in as ${email}`);

  for (const path of PATHS) {
    if (AS_API) {
      const response = await page.request.get(path);
      const body = await response.text();
      console.log(`\n--- ${path} -> ${response.status()} ---`);
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
      } catch {
        console.log(body.slice(0, 6000));
      }
      continue;
    }

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });

    // Best-effort by design: a screen with no skeletons and no pending requests
    // falls straight through, and one that never settles is still photographed
    // rather than throwing. A tool that refuses to show you a stuck page is
    // useless precisely when you need it.
    await page
      .waitForFunction(
        () => document.querySelectorAll("[data-slot=skeleton]").length === 0,
        undefined,
        { timeout: 15_000 },
      )
      .catch(() => {});
    await page
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => {});
    await page.waitForTimeout(SETTLE_MS);

    const file = join(OUT, fileNameFor(path, dark));
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${path} -> ${response?.status() ?? "?"}  ${file}`);
  }

  if (problems.length > 0) {
    console.log(`\n${problems.length} browser problem(s):`);
    for (const problem of problems.slice(0, 20)) console.log(`  ${problem}`);
  }
});
