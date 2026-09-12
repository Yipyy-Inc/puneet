import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A customer's training packages are the ones they own (2026-09-12).
//
// The training page's Packages tab and the dashboard's Training credits
// banner read `clientTrainingPackages`, a fixture that gave Alice a "Basic
// Obedience 6-Pack" and a "Private Coaching 10-Pack" she never bought, and
// "Renew package" toasted that her instructor had been notified. Both read
// /api/packages/owned now. This pins, through the screens:
//
//   1. The Packages tab shows exactly the active training packages the API
//      holds for her — its empty state when there are none — and never the
//      invented two.
//   2. The dashboard asks the API, and shows the banner only when she owns a
//      training package.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Read-only. A spec never sells a package: the pass ledger is append-only,
// and a sale cannot be taken back.
// ============================================================================

const OWNED = "/api/packages/owned";
const INVENTED = ["Basic Obedience 6-Pack", "Private Coaching 10-Pack"];

interface OwnedPackage {
  status: string;
  passes: { moduleId: string }[];
}

test.describe("a customer's training packages", () => {
  test("are the ones the customer owns, on the tab and the dashboard", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.customer);

    const res = await page.request.get(OWNED);
    expect(res.ok(), await res.text()).toBe(true);
    const training = ((await res.json()) as OwnedPackage[]).filter(
      (p) =>
        p.status === "active" &&
        p.passes.some((line) => line.moduleId === "training"),
    );

    await page.goto("/customer/training?tab=packages");
    if (training.length === 0) {
      await expect(page.getByText("No training packages yet")).toBeVisible({
        timeout: 30_000,
      });
    } else {
      await expect(
        page
          .getByRole("list", { name: "Your training packages" })
          .locator(":scope > li"),
      ).toHaveCount(training.length, { timeout: 30_000 });
    }
    for (const name of INVENTED) {
      await expect(page.getByText(name)).toHaveCount(0);
    }

    // Waiting on the banner's own request makes its absence below an answer,
    // rather than a page that had not finished loading.
    const asked = page.waitForResponse((r) => r.url().includes(OWNED), {
      timeout: 60_000,
    });
    await page.goto("/customer/dashboard");
    await asked;
    await expect(
      page.getByText("Training credits", { exact: true }),
    ).toHaveCount(training.length > 0 ? 1 : 0);
    for (const name of INVENTED) {
      await expect(page.getByText(name)).toHaveCount(0);
    }
  });
});
