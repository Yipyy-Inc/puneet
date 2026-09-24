import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE LODGING VIEW'S OCCUPANCY HEADERS.
//
// Phase 7 changed two numbers on this screen and nothing else:
//
//   · the per-date column, from a bare "60%" to MoéGo's "3/5 (60%)";
//   · the per-type header, which now counts an AREA in PETS rather than in
//     rooms and says so.
//
// Neither is the kind of change a test suite can judge. A screenshot caught
// two real defects in Phase 6 that 1081 unit tests had passed over.
//
// ── IT WAITS FOR THE NUMBER, NOT FOR THE PAGE ─────────────────────────────
//
// The first version waited for /occupancy/i and photographed a LOADING
// SKELETON: the match was the sidebar's own "Occupancy Calendar" nav item, so
// the test went green over an empty grid. Waiting for the `X/Y (%)` pattern
// itself is the only anchor that cannot pass while the thing being
// photographed is absent — if the format regresses, the shot fails rather
// than quietly capturing the old one.
//
// IT IS READ-ONLY. It navigates and photographs; it never drags a bar, never
// blocks a room and never creates a booking — this database is shared with
// production.
//
//   bunx playwright test --config=playwright.shots.config.ts lodging-occupancy
// ============================================================================

const OUT = "C:/tmp/pwv/shots";

/** MoéGo's format, and the whole reason this spec exists. */
const X_OF_Y = /\d+\/\d+\s*\(\d+%\)/;

async function openLodgingView(page: Page) {
  await page.goto("/facility/dashboard/kennel-view");
  // The grid renders behind a query; this is the first thing that proves it
  // arrived AND that it arrived in the new format.
  await expect(page.getByText(X_OF_Y).first()).toBeVisible({
    timeout: 45_000,
  });
  // One settle pass so bars finish positioning before the shutter.
  await page.waitForTimeout(800);
}

test("the lodging view's occupancy headers, at desktop", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await signIn(page, ACCOUNTS.owner);
  await openLodgingView(page);

  await page.screenshot({ path: `${OUT}/lodging-occupancy-1600.png` });
});

test("the lodging view's occupancy headers, at 599px", async ({ page }) => {
  test.slow();
  // Driven at desktop and photographed at 599: below `lg` this board scrolls
  // its grid horizontally by design (§6 rule 6 exempts a calendar), and
  // clicking through at phone width hung a Phase 6 spec for seven minutes.
  await page.setViewportSize({ width: 1600, height: 1000 });
  await signIn(page, ACCOUNTS.owner);
  await openLodgingView(page);

  await page.setViewportSize({ width: 599, height: 1000 });
  await page.waitForTimeout(1200);
  // FULL PAGE, because the grid — the only thing this spec changed — sits
  // below the fold once the metric tiles stack to one column. A viewport shot
  // at 599 photographs the tiles and proves nothing about the headers.
  await page.screenshot({
    path: `${OUT}/lodging-occupancy-599.png`,
    fullPage: true,
  });
});
