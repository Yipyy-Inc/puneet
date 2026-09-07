import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A converted settings section, read in French.
//
// ── WHY THIS EXISTS ALONGSIDE `check:ui-french` ───────────────────────────
//
// The gate is static, and on 2026-09-07 it certified six sections and five
// whole surfaces as finished while they rendered English. Three separate
// blind spots did it: a text node next to an interpolation, a paragraph over
// the extractor's length cap, and — the one no regex will ever close — copy
// living in a `src/data` fixture. All three were found by LOADING THE PAGE IN
// FRENCH AND READING IT.
//
// So this is the other half of the measurement: the gate proves a surface has
// not gone backwards in the SOURCE, and this proves what actually reaches the
// SCREEN. Neither is sufficient alone, and the gate's own header has said so
// since it was written.
//
// ── THE FIRST ASSERTION IS THE LOAD-BEARING ONE ───────────────────────────
//
// An earlier version of this spec set a cookie named `app-language-settings`,
// which this app does not read — the locale lives in `APP_LANG_PRIMARY`. It
// passed, cheerfully, against a page rendering English, because every other
// assertion here is about the ABSENCE of something. A spec that checks only
// for absences cannot tell "clean" from "not looking".
// ============================================================================

/** Sections whose baseline entry has been removed — they must be finished. */
const CONVERTED = [
  "yipyy-pay",
  "retail",
  "employment-types",
  "termination-reasons",
  "notifications",
  "form-requirements",
  "business",
  "hours",
  "language",
  "branding",
  "payroll-rules",
  "deposit-rules",
  "taxes",
  "mobile-app",
  "pet-breeds",
  "hr-config",
  "my-profile",
  "offboarding-templates",
  "my-notifications",
  "booking-rules",
  "form-notifications",
  "checkin-requirements",
  "onboarding-templates",
  "care-tasks",
  "tags-notes",
] as const;

test("a converted settings section renders no English, no key and no hole", async ({
  page,
}) => {
  test.slow();
  await signIn(page, ACCOUNTS.owner);

  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);

  for (const section of CONVERTED) {
    await page.goto(`/facility/dashboard/settings/${section}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);

    const body = (await page.locator("body").innerText()) ?? "";

    // 1. It really is French. Everything below tests for an ABSENCE, so
    //    without this the whole spec passes against an English page.
    expect(body, `${section} is not rendering French`).toMatch(
      /\b(?:paramètres|enregistrer|réservations|établissement|configuration)\b/i,
    );

    // 2. No raw catalogue key on screen — the failure mode when a constant is
    //    converted to keys and its render site is not. Two shapes: camelCase
    //    identifiers, and id-style keys (`notif-001`) that a camelCase test
    //    cannot see.
    const camel = [...body.matchAll(/\b[a-z]+[A-Z][a-zA-Z]{4,}\b/g)]
      .map((m) => m[0])
      .filter((w) => !/^(YipyyPay|QuickBooks|PayPal|MasterCard)$/.test(w));
    const ids = [...body.matchAll(/\b(?:notif|cat|role)-?\d{2,}\b/g)].map(
      (m) => m[0],
    );
    expect([...camel, ...ids], `raw catalogue keys on ${section}`).toEqual([]);

    // 3. No unfilled placeholder — a `.replace("{count}", …)` that named a
    //    token the French string spells differently leaves `{count}` visible.
    expect(
      [...body.matchAll(/\{[a-z]\w*\}/gi)].map((m) => m[0]),
      `unfilled placeholders on ${section}`,
    ).toEqual([]);
  }
});
