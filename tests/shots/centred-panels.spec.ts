import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// THE PANELS THAT USED TO SLIDE IN FROM THE EDGE.
//
// Thirty of them moved to the centre on 2026-09-24, on the client's
// instruction. Two kept sliding, deliberately: `ui/sidebar` and
// `EmployeeBottomNav` are the MOBILE NAVIGATION, and a nav that opens in the
// middle of the screen is not consistency, it is a broken menu.
//
// ── WHY THIS IS PHOTOGRAPHED AND NOT ASSERTED ─────────────────────────────
//
// A side sheet is full-height by definition; a centred dialog is capped. Every
// panel that put a header, a scrolling body and a footer in a flex column was
// relying on the viewport to BE the column. Typecheck cannot see any of that —
// the failure is a footer pushed off the bottom, or a body that will not
// scroll, and both render perfectly valid HTML.
//
// Two files proved it. `pre-session-briefing-panel` had no inner scroll region
// at all (the CONTAINER was the scroller), and the conversion's own rule —
// container hidden, body `min-h-0` — would have clipped a 1,458-line briefing
// with no way to reach the bottom. `ClientContextPanel` scrolls its reminder
// history with `h-full`, which resolves to `auto` inside a content-height
// dialog and therefore scrolls nothing. Both are in the sample below for that
// reason: they are the two that were actually wrong.
//
// ── WHAT COVERS THE OTHER TWENTY-NINE ─────────────────────────────────────
//
// This photographs ONE, deliberately: the add-on categories panel is the one
// the client pointed at, and it is the shape most likely to break — a flex
// column with a scrolling list AND a form pinned underneath it. The rest are
// covered by `bun run test:e2e:ci`, which drives the gift-card, loyalty,
// messaging, daily-care and booking panels for real: a footer gone off the
// bottom of the window fails there, on a click that misses.
//
// Two earlier tests here hunted for an opener, failed to find one, and PASSED
// while printing "nothing measured". They were deleted rather than left,
// because a check that goes green having checked nothing is worse than no
// check — it gets counted.
//
// READ-ONLY. The panel is opened and closed; nothing here saves.
//
//   E2E_BASE_URL=http://localhost:3000 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light centred-panels
// ============================================================================

const OUT = "C:/tmp/pwv/shots";

/** A centred dialog sits in the middle; a sheet is pinned to an edge. The
 *  measurement is the point of the errand, so it is taken rather than assumed:
 *  a panel still glued to the right would show a left edge past mid-screen. */
async function measure(page: Page, name: string) {
  const box = await page.getByRole("dialog").first().boundingBox();
  if (!box) throw new Error(`${name}: the dialog has no box`);
  const view = page.viewportSize();
  if (!view) throw new Error("no viewport");
  const centre = box.x + box.width / 2;
  const drift = Math.abs(centre - view.width / 2);
  console.log(
    `${name.padEnd(30)} x=${Math.round(box.x)} w=${Math.round(box.width)} ` +
      `h=${Math.round(box.height)} centre-drift=${Math.round(drift)}px ` +
      `bottom=${Math.round(box.y + box.height)}/${view.height}`,
  );
  // Generous: a dialog may carry its own offset. A SHEET would be hundreds out.
  expect(drift, `${name} is not centred`).toBeLessThan(60);
  // A panel taller than the window is one whose footer nobody can reach.
  expect(
    Math.round(box.y + box.height),
    `${name} runs past the bottom of the window`,
  ).toBeLessThanOrEqual(view.height + 2);
}

test("the add-on categories panel, the one the client pointed at", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, ACCOUNTS.owner);

  await page.goto("/facility/dashboard/services/daycare/rates");
  await page.getByRole("tab", { name: /add-ons/i }).click();

  const open = page.getByRole("button", { name: /categor/i }).first();
  await expect(open).toBeVisible({ timeout: 45_000 });
  await open.click();

  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600);
  await measure(page, "add-on categories");
  await page.screenshot({ path: `${OUT}/centred-addon-categories.png` });
  await page.keyboard.press("Escape");
});
