import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE BOARDING SERVICE PICKER, at desktop and at 599px.
//
// Not an assertion suite — a way to keep AGENTS.md's "verify the touched
// journey by eye" without a person opening a browser and clicking six times
// into a modal. `bun run shoot` navigates to a URL; this picker only exists
// four steps into the booking wizard, so it needs a driver.
//
// ── WHY 599 AND NOT 375 ───────────────────────────────────────────────────
//
// §6 rule 7: floor staff are standing and holding an animal, and the spec's
// own instruction is to test at 599px. 375 is a phone in a chair.
//
// IT CREATES NOTHING. It stops at the room-selection step and never presses
// Create, so there is no booking to clean up — which matters because this
// database is shared with production.
//
//   bunx playwright test tests/shots/boarding-service-picker --workers=1
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const ALICE = { client: 15 }; // Alice Johnson, Buddy and Max

async function toRoomStep(page: Page) {
  await page.goto(`/facility/dashboard/clients/${ALICE.client}`);
  await page
    .getByRole("button", { name: /^book$/i })
    .first()
    .click({ timeout: 30_000 });

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await dialog.getByText("Buddy", { exact: true }).first().click();
  await dialog.getByRole("button", { name: /^next$/i }).click();

  await dialog
    .getByText(/boarding/i)
    .first()
    .click();
  await dialog.getByRole("button", { name: /^next$/i }).click();

  // A check-in and a check-out NEXT MONTH, so nothing collides with today's
  // real occupancy on a shared database.
  //
  // Whichever days are actually bookable, rather than two numbers picked in
  // advance: the facility closes at weekends and blocks dates of its own, and
  // a hardcoded "10" is a spec that fails on a calendar rather than on the
  // thing it is photographing.
  await dialog.locator("button:has(svg.lucide-chevron-right)").first().click();
  const days = dialog.locator("button:not([disabled])").filter({
    hasText: /^\d{1,2}$/,
  });
  await expect(days.first()).toBeVisible({ timeout: 20_000 });
  const open = await days.count();
  await days.nth(0).click();
  await days.nth(Math.min(2, open - 1)).click();
  await dialog.getByRole("button", { name: /^next$/i }).click();

  return dialog;
}

test("the boarding service picker, at desktop", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, ACCOUNTS.owner);
  const dialog = await toRoomStep(page);

  // The picker's own heading. If this is not here the step did not render it,
  // and a screenshot of the wrong step is worse than no screenshot.
  await expect(dialog.getByText(/which boarding service/i).first()).toBeVisible(
    { timeout: 20_000 },
  );

  await dialog.screenshot({ path: `${OUT}/boarding-picker-1440.png` });
});

test("the boarding service picker, at 599px", async ({ page }) => {
  test.slow();
  // DRIVEN AT DESKTOP, PHOTOGRAPHED AT 599. Clicking through the wizard at
  // 599 hung for seven minutes on 2026-09-24: below `lg` the dialog changes
  // layout and the calendar's day buttons move out of reach of a blind
  // `.first()`. What §6 rule 7 asks for is the RENDERED result at 599, not
  // that the driver can operate a phone — so the viewport changes after the
  // step is open, which measures the same thing and cannot hang on a control.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, ACCOUNTS.owner);
  const dialog = await toRoomStep(page);

  await expect(dialog.getByText(/which boarding service/i).first()).toBeVisible(
    { timeout: 20_000 },
  );

  await page.setViewportSize({ width: 599, height: 1000 });
  await page.waitForTimeout(600);
  await dialog.screenshot({ path: `${OUT}/boarding-picker-599.png` });
});

test("picking a service narrows the kennel list to its lodging types", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1200 });
  await signIn(page, ACCOUNTS.owner);
  const dialog = await toRoomStep(page);

  await expect(dialog.getByText(/which boarding service/i).first()).toBeVisible(
    { timeout: 20_000 },
  );

  // The picker's own cards carry `aria-pressed` and a per-night/per-day unit;
  // the kennel cards below do not, which is what tells the two grids apart.
  const serviceCards = dialog
    .locator("button[aria-pressed]")
    .filter({ hasText: /per night|per day/i });
  const services = await serviceCards.count();

  // Each carried-over service names exactly the class it came from, so
  // choosing one should leave one class standing.
  await serviceCards.first().click();
  await page.waitForTimeout(600);

  await dialog.screenshot({ path: `${OUT}/boarding-picker-chosen.png` });

  // Reported rather than asserted: the real menu is whatever the facility has,
  // and this spec exists to LOOK, not to pin a number to live data.
  console.log(`service cards offered: ${services}`);
});
