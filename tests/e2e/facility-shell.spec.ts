import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The facility shell — the sidebar and header on EVERY page of the portal.
//
// Both did this:
//
//   const facilityId = 11;
//   const facility = facilities.find((f) => f.id === facilityId);
//
// against `src/data/facilities.ts`. So every facility that ever signed in was
// greeted, on every page, by a business called "Example Pet Care Facility"
// wearing somebody else's logo — and the header went further, returning null
// when that fixture row was missing, which silently removed the whole "+ New"
// button for any facility not in the mock array.
//
// The nav carried four literal badge counts as well (Clients 3, Bookings 8,
// Tasks 2, Incidents 2) — the same four numbers for every facility, including
// one that opened yesterday with no clients at all.
// ============================================================================

const DASHBOARD = "/facility/dashboard";

// The name the fixture used. Asserted absent, because "shows the right name"
// and "no longer shows the wrong one" are different claims and the second is
// the regression.
const FIXTURE_NAME = "Example Pet Care Facility";

test.describe("the facility shell", () => {
  test("names the facility the database holds, not the fixture", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Named from the API FIRST, so the assertion is "the screen shows what the
    // database holds" rather than "the screen shows a string I hardcoded" —
    // which would pass just as well against the mock array.
    const profile = (await (
      await page.request.get("/api/facility/profile")
    ).json()) as { businessName: string };

    expect(
      profile.businessName.length,
      "the signed-in account's facility has a name",
    ).toBeGreaterThan(0);
    // If the database ever happened to hold the fixture's name, every
    // assertion below would pass against the bug.
    expect(profile.businessName).not.toBe(FIXTURE_NAME);

    await page.goto(DASHBOARD, { waitUntil: "commit" });

    await expect(page.getByText(profile.businessName).first()).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByText(FIXTURE_NAME)).toHaveCount(0);
  });

  // A facility the fixtures DO NOT contain. `ACCOUNTS.owner` above belongs to
  // the demo facility, whose legacy id is 11 — the one id that IS in the mock
  // array — so on the old code its sidebar was wrong by coincidence of name
  // rather than by lookup failure. This account proves the general case.
  const OTHER_OWNER = process.env.CLOVER_E2E_STAFF_EMAIL?.trim() ?? "";

  test("names a facility that is not in the fixtures at all", async ({
    page,
  }) => {
    test.skip(
      !OTHER_OWNER,
      "Set CLOVER_E2E_STAFF_EMAIL to an owner at a non-demo facility.",
    );
    await signIn(page, OTHER_OWNER);

    const profile = (await (
      await page.request.get("/api/facility/profile")
    ).json()) as { businessName: string };
    expect(profile.businessName.length).toBeGreaterThan(0);

    await page.goto(DASHBOARD, { waitUntil: "commit" });
    await expect(page.getByText(profile.businessName).first()).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByText(FIXTURE_NAME)).toHaveCount(0);

    // And the "+ New" button is still here. It used to require a row in the
    // facilities fixture as well as the permission — which never fired, since
    // both callers hardcode facilityId 11, but coupled the portal's most
    // prominent control to the presence of a mock row.
    await expect(page.locator("#facility-create-new-trigger")).toBeVisible({
      timeout: 90_000,
    });
  });

  test("shows no invented counts on the nav", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(DASHBOARD, { waitUntil: "commit" });

    // Scoped to the sidebar, and located by HREF rather than accessible name:
    // the link wraps an icon and a badge, so its computed name is not simply
    // "Clients" — an earlier version of this test looked for that and found
    // nothing, which would have passed as "no badge" for the wrong reason.
    const nav = page.locator('[data-slot="sidebar"]').first();
    const clients = nav
      .locator('a[href="/facility/dashboard/clients"]')
      .first();
    await expect(clients).toBeVisible({ timeout: 90_000 });

    // The badge rendered INSIDE the link, so a count shows up in its text.
    // Any digit here is an invented count: the four that used to be hardcoded
    // were 3, 8, 2 and 2, and none of them was ever measured.
    expect((await clients.innerText()).trim()).not.toMatch(/\d/);
  });
});
