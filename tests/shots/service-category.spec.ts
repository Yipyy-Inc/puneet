import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE CATEGORY FIELD — THE CONTROL THAT WAS MISSING.
//
// `useSaveDaycareServiceCategory` and `useSaveBoardingServiceCategory` existed,
// were scoped and tested, and NOTHING CALLED EITHER. So the Category select
// offered exactly one entry — "no category" — and a facility could group its
// menu only if a category already existed, which none ever could. Client
// feedback, 2026-09-24.
//
// It is photographed rather than asserted because the defect this catches is
// never a failing expectation: this session alone, a screenshot found raw
// translation keys, a header labelling the wrong thing, a filter that emptied a
// list, and two invisible palette names. Every gate was green over all five.
//
// WHAT TO LOOK FOR IN THE FILES:
//   · the "New" button sits BESIDE the select, not inside it as a value
//   · the input fills the row, so the row does not change width on click
//   · Save and Cancel both fit beside it at 599px
//
// THE FIRST TWO ARE READ-ONLY — they open the create state and back out with
// Escape. The THIRD writes, because there is no category on this facility to
// photograph otherwise; it marks what it makes, deletes it by completing the
// flow, and sweeps by API in a `finally` if it does not get that far. This
// database is shared with production, so that mattered more than the picture.
//
//   E2E_BASE_URL=http://localhost:3000 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light service-category
// ============================================================================

const OUT = "C:/tmp/pwv/shots";

const MENUS = [
  { slug: "boarding", path: "/facility/dashboard/services/boarding/menu" },
  { slug: "daycare", path: "/facility/dashboard/services/daycare/rates" },
] as const;

async function openDialog(page: Page, menu: (typeof MENUS)[number]) {
  await page.goto(menu.path);
  // The per-card Edit, which exists only once a service card has RENDERED —
  // the nav has no such button. A previous shot in this directory went green
  // over a loading skeleton by waiting for a word the sidebar also had, so the
  // anchor has to be something only the subject can produce.
  const edit = page.getByRole("button", { name: /^edit$/i }).first();
  await expect(edit).toBeVisible({ timeout: 45_000 });
  await edit.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  return dialog;
}

for (const menu of MENUS) {
  test(`${menu.slug}: the category field, resting and creating`, async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 1440, height: 1100 });
    await signIn(page, ACCOUNTS.owner);
    const dialog = await openDialog(page, menu);

    // The label, then the row it heads — scrolled into view because the dialog
    // body scrolls and Category sits below the fold on both menus.
    const label = dialog.getByText(/^category$/i).first();
    await label.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    const newButton = dialog.getByRole("button", { name: /^new$/i });
    await expect(newButton).toBeVisible();
    await dialog.screenshot({
      path: `${OUT}/category-${menu.slug}-resting.png`,
    });

    // Creating: the select is replaced by a name field with Save and Cancel.
    await newButton.click();
    const input = dialog.getByPlaceholder(/category name/i);
    await expect(input).toBeVisible();
    await input.fill("Puppy programmes");
    await page.waitForTimeout(400);
    await dialog.screenshot({
      path: `${OUT}/category-${menu.slug}-creating.png`,
    });

    // 599px is §6 rule 7's hard case — a tablet held by somebody standing up,
    // and where an input, a Save and a Cancel share one row.
    await page.setViewportSize({ width: 599, height: 1000 });
    await page.waitForTimeout(600);
    await label.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await dialog.screenshot({
      path: `${OUT}/category-${menu.slug}-creating-599.png`,
    });

    // Escape backs out of creating; a second closes the dialog. Nothing this
    // spec does reaches the database.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });
}

// ── The controls that fix a typo ───────────────────────────────────────────
//
// Unlike the two above, this one WRITES: there is no category on this facility
// to photograph otherwise, and an overflow menu with nothing selected is the
// state that already appears in `-resting`. It creates a marked category,
// photographs the three states, and the last screenshot IS the delete — so the
// flow cleans up by completing. `finally` sweeps by API if it does not.
const MARK = "[shot category]";
const BOARDING_CATEGORIES = "/api/boarding/service-categories";

/** Remove anything a previous run left. Called BEFORE writing as well as
 *  after: a run stopped between the create and the delete would otherwise
 *  leave a category whose name the next run collides with — the POST answers
 *  409 on a duplicate, so the failure would look like a broken screen. */
async function sweepMarked(page: Page): Promise<number> {
  const res = await page.request.get(BOARDING_CATEGORIES);
  const body: unknown = res.ok() ? await res.json() : null;
  // A cast is a claim: a 500 answers `{error}`, and `for...of` on that throws
  // inside the cleanup while the run still looks fine.
  const rows = Array.isArray(body)
    ? (body as { id: string; name: string }[])
    : [];
  let removed = 0;
  for (const c of rows) {
    if (!c.name.includes(MARK)) continue;
    const gone = await page.request.delete(`${BOARDING_CATEGORIES}/${c.id}`);
    if (gone.ok()) removed += 1;
  }
  return removed;
}

test("boarding: rename and remove, and what the confirmation promises", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);

  const healed = await sweepMarked(page);
  if (healed > 0)
    console.log(`sweep(before): ${healed} left by an earlier run`);

  const dialog = await openDialog(page, MENUS[0]);

  try {
    const label = dialog.getByText(/^category$/i).first();
    await label.scrollIntoViewIfNeeded();

    await dialog.getByRole("button", { name: /^new$/i }).click();
    const input = dialog.getByPlaceholder(/category name/i);
    await expect(input).toBeVisible();
    await input.fill(`${MARK} Puppy programmes`);
    await dialog.getByRole("button", { name: /^save$/i }).click();

    // Written, selected, and now carrying an overflow — the button only exists
    // once a REAL category is chosen, because "ungrouped" is the absence of a
    // row and has nothing to rename.
    const actions = dialog.getByRole("button", { name: /category actions/i });
    await expect(actions).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(400);
    await dialog.screenshot({ path: `${OUT}/category-selected.png` });

    await actions.click();
    await expect(page.getByRole("menuitem", { name: /rename/i })).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/category-actions-menu.png` });

    await page.getByRole("menuitem", { name: /remove/i }).click();
    const confirm = page.getByRole("alertdialog");
    await expect(confirm).toBeVisible();
    await page.waitForTimeout(300);
    await confirm.screenshot({ path: `${OUT}/category-remove-confirm.png` });

    // Confirming is the cleanup.
    await confirm.getByRole("button", { name: /^remove$/i }).click();
    await expect(actions).toBeHidden({ timeout: 15_000 });
  } finally {
    await sweepMarked(page);
  }
});
