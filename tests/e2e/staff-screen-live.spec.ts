import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The staff SCREEN reads and writes Postgres.
//
// It used to do `useState(facilityStaff)` over the mock array: every edit
// survived until the next reload and then quietly wasn't there. That is worse
// than an error, because it looks like it worked.
//
// The check that matters is the RELOAD. Asserting that the name changed on
// screen proves only that React re-rendered — exactly what the old code did.
// Only a fresh page load distinguishes "saved" from "saved-looking".
//
// TO CONFIRM THIS FAILS WITHOUT THE FIX: point the page back at
// useState(facilityStaff). "an edit survives a reload" goes red.
// ============================================================================

const SUBJECT_NAME = "Dominic"; // fs-board-01, seeded

test.describe.configure({ mode: "serial" });

test.describe("the staff screen is live", () => {
  test("the roster comes from the database, not the mock array", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The dev accounts exist ONLY in Postgres — they are not in the mock
    // array. Seeing one on screen is proof of where the list came from.
    await page.goto("/facility/dashboard/staff");
    await expect(page.getByText("Dana", { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("an edit survives a reload", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const title = `QA ${Date.now() % 100000}`;

    // Written through the same route the screen uses, then read back through
    // the screen — which is the pair that was broken.
    const res = await page.request.patch("/api/staff/fs-board-01", {
      data: { jobTitle: title },
    });
    expect(res.status()).toBe(200);

    await page.goto("/facility/dashboard/staff");
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });

    // And again from cold, because the first visit could have been served by
    // an in-memory cache that the old code would also have satisfied.
    await page.reload();
    await expect(page.getByText(title, { exact: false }).first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("a groomer sees the roster but not the payroll tab", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/facility/dashboard/staff");

    // The roster is readable — colleagues have to be, for rotas.
    await expect(
      page.getByText(SUBJECT_NAME, { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 });

    // Now that the screen consumes the REDACTED response rather than the mock
    // array, the sensitive tail genuinely is not in the page.
    await page.getByText(SUBJECT_NAME, { exact: false }).first().click();
    await page.waitForTimeout(2500);

    const tabs = await page.getByRole("tab").allTextContents();
    expect(tabs.join(" ")).not.toMatch(/Payroll/i);
    expect(tabs.join(" ")).not.toMatch(/Access/i);
  });
});
