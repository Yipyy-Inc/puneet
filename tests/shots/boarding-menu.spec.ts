import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE BOARDING MENU EDITOR.
//
// The routes existed from Phase 6 and nothing rendered them, so a facility's
// menu was whatever the migration had carried — ten rows nobody could edit.
// This is the screen that fixes that, and it is new, which in this repo means
// it is not done until somebody has seen it: a screenshot has now caught raw
// translation keys, a header labelling the wrong thing, and a filter that
// emptied a list, each with every gate green.
//
// IT WAITS FOR A PRICE, not for the page. A previous shot in this directory
// went green over a loading skeleton because it waited for a word that also
// appears in the sidebar. The per-night label only exists once a service card
// has rendered, so it cannot pass while the subject is absent.
//
// READ-ONLY. It opens the dialog to photograph it and closes it again; it
// never saves, because this database is shared with production.
//
//   bunx playwright test --config=playwright.shots.config.ts boarding-menu
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const MENU = "/facility/dashboard/services/boarding/menu";

async function openMenu(page: Page) {
  await page.goto(MENU);
  await expect(page.getByText(/per night|per day/i).first()).toBeVisible({
    timeout: 45_000,
  });
  await page.waitForTimeout(600);
}

test("the boarding menu, at desktop", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);
  await openMenu(page);

  await page.screenshot({ path: `${OUT}/boarding-menu-1440.png` });
});

test("the boarding menu, at 599px", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);
  await openMenu(page);

  await page.setViewportSize({ width: 599, height: 1000 });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `${OUT}/boarding-menu-599.png`,
    fullPage: true,
  });
});

test("the service dialog, with its unit and lodging types", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);
  await openMenu(page);

  // The first card's Edit — the dialog seeded from a real service, which is
  // what shows whether the unit and the lodging restriction round-trip.
  await page
    .getByRole("button", { name: /^edit$/i })
    .first()
    .click();

  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("dialog").getByText(/charged per/i),
  ).toBeVisible();
  await page.waitForTimeout(500);

  await page
    .getByRole("dialog")
    .screenshot({ path: `${OUT}/boarding-menu-dialog.png` });

  // Closed without saving. Nothing this spec does reaches the database.
  await page.keyboard.press("Escape");
});
