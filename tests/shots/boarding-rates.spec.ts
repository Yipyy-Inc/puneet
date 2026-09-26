import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE BOARDING RATES — the menu, on the Rates tab since 2026-09-26.
//
// The routes existed from Phase 6 and nothing rendered them, so a facility's
// menu was whatever the migration had carried — ten rows nobody could edit.
// This is the screen that fixes that, and it is new, which in this repo means
// it is not done until somebody has seen it: a screenshot has now caught raw
// translation keys, a header labelling the wrong thing, and a filter that
// emptied a list, each with every gate green.
//
// It was boarding-menu.spec.ts until Menu and Rates became one tab. Now in
// French as well: each card names its room types ("Suites · 11 kennels"),
// and the longest French label is what decides whether a card still fits.
//
// IT WAITS FOR A PRICE, not for the page. A previous shot in this directory
// went green over a loading skeleton because it waited for a word that also
// appears in the sidebar. The per-night label only exists once a rate card
// has rendered, so it cannot pass while the subject is absent.
//
// READ-ONLY. It opens the dialog to photograph it and closes it again; it
// never saves.
//
//   bunx playwright test --config=playwright.shots.config.ts boarding-rates
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const RATES = "/facility/dashboard/services/boarding/rates";

async function french(page: Page) {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

async function openRates(page: Page) {
  await page.goto(RATES);
  await expect(
    page.getByText(/per night|per day|par nuit|par jour/i).first(),
  ).toBeVisible({ timeout: 45_000 });
  await page.waitForTimeout(600);
}

test("the boarding rates, at 1440 and 599, in English and French", async ({
  page,
}) => {
  test.slow();
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);

  for (const lang of ["en", "fr"] as const) {
    if (lang === "fr") await french(page);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await openRates(page);
    await page.screenshot({ path: `${OUT}/boarding-rates-${lang}-1440.png` });

    await page.setViewportSize({ width: 599, height: 1000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${OUT}/boarding-rates-${lang}-599.png`,
      fullPage: true,
    });
  }
});

test("the rate dialog, with its unit and its room types", async ({ page }) => {
  test.slow();
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);

  for (const lang of ["en", "fr"] as const) {
    if (lang === "fr") await french(page);
    await openRates(page);

    // The first card's Edit — the dialog seeded from a real rate, which is
    // what shows whether the unit and the room types round-trip.
    await page
      .getByRole("button", { name: /^(edit|modifier)$/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByText(/charged per|facturé par/i)).toBeVisible();
    // Down to the room types, the section the client asked for. Found by its
    // number: the heading reads "3 · Lodging types", so an exact match on the
    // words finds nothing and waits out the test (it did, for 9 minutes).
    await dialog
      .getByRole("heading", { name: /^3 · / })
      .scrollIntoViewIfNeeded({ timeout: 10_000 });
    await page.waitForTimeout(500);
    await dialog.screenshot({
      path: `${OUT}/boarding-rates-dialog-${lang}.png`,
    });

    // Closed without saving. Nothing this spec does reaches the database.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});
