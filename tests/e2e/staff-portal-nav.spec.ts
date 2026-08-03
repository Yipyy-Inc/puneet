import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Staff-portal nav-parity — Z.1 acceptance (feedback #1/#2/#3).
//
// WHO THESE RUN AS, AND WHY IT CHANGED.
//
// They used to seed the `employee_staff_id` cookie and a
// `facility-rbac-state-v1` localStorage blob, then land in the shell as a MOCK
// staff member with hand-written permission overrides. Two things killed that:
// the shell now takes identity from the SESSION (a mock id has no account), and
// a signed-in viewer's permissions come from the DATABASE — `fromDb ?? legacy`
// in use-facility-rbac — so seeded localStorage overrides are ignored outright.
//
// They were skipped while `staff` enforcement rolled out. Removing the
// AUTH_ENFORCED flag would have made that skip permanent, quietly costing five
// acceptance tests, so they now sign in for real and drive permissions through
// the same /api/roles/overrides endpoint the Roles studio uses.
//
// TWO THINGS THAT ARE DELIBERATELY NOT OVERRIDES:
//
//   • the register gate is switched off through StaffHrConfig
//     (requireRegisterOpenOnLogin), which is facility configuration in
//     localStorage, not a permission. A manager holds open_close_register by
//     preset, so without this the full-screen "count the drawer" panel replaces
//     the sidebar and these tests read an element that is not there — which is
//     exactly how they failed once before, and it looked like a nav regression.
//
//   • the un-granted cases use accounts whose PRESETS already say so, rather
//     than overrides manufactured to make the point. Fewer writes, and nothing
//     to leak into the next spec.
// ============================================================================

const HR_KEY = "yipyy-staff-onboarding-v2";

const GROOMER_STAFF_ID = "fs-dev-groomer";
const CARETAKER_STAFF_ID = "fs-dev-caretaker";

/** Enter the employee portal as a real account, with the register gate off. */
async function enterPortalAs(
  context: BrowserContext,
  page: Page,
  email: string,
) {
  await context.addInitScript(
    ({ hrKey }) => {
      window.localStorage.setItem(
        hrKey,
        JSON.stringify({ config: { requireRegisterOpenOnLogin: false } }),
      );
    },
    { hrKey: HR_KEY },
  );
  await signIn(page, email);
  await page.goto("/employee");
}

/**
 * Set (or clear, with `setting: null`) a per-STAFF permission override as the
 * owner — the only account allowed to. Runs in its own context so it cannot
 * disturb the session of the page under test.
 */
async function setStaffOverride(
  browser: Browser,
  staffId: string,
  key: string,
  setting: { granted: boolean; scope: string } | null,
): Promise<number> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.put("/api/roles/overrides", {
      data: { kind: "staff", staffId, key, setting },
    });
    return res.status();
  } finally {
    await context.close();
  }
}

/** Visible sidebar nav item titles, in DOM order. */
async function sidebarItems(page: Page): Promise<string[]> {
  const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
  await expect(sidebar.getByRole("link").first()).toBeVisible({
    timeout: 60_000,
  });
  const texts = await sidebar.getByRole("link").allInnerTexts();
  return texts.map((t) => t.trim()).filter(Boolean);
}

const BESPOKE = [
  "Grooming Queue",
  "Full Calendar",
  "Boarding",
  "Daycare",
  "Kennel View",
  "Resources",
];

// ---------------------------------------------------------------------------

test.describe.configure({ mode: "serial" });

test.describe("Staff portal nav parity", () => {
  // Overrides are rows in a shared project, so they come out however the run
  // ends — the same lesson recorded in role-editor-writes.spec.ts, where one
  // leftover grant sent five unrelated specs red.
  test.afterAll(async ({ browser }) => {
    for (const [staffId, key] of [
      [GROOMER_STAFF_ID, "view_petcams"],
      [CARETAKER_STAFF_ID, "view_petcams"],
      [CARETAKER_STAFF_ID, "ops_incidents_view"],
    ] as const) {
      try {
        await setStaffOverride(browser, staffId, key, null);
      } catch {
        // Teardown must never turn a green run red.
      }
    }
  });

  // #1 — a manager's sidebar mirrors the facility sidebar.
  test("#1 Manager sidebar mirrors the facility sidebar (sequence + no bespoke items)", async ({
    page,
    context,
  }) => {
    await enterPortalAs(context, page, ACCOUNTS.manager);

    const items = await sidebarItems(page);

    // Same sections/order as the facility sidebar (a representative ordered
    // subsequence — these must appear, in this relative order).
    const expectedOrder = [
      "Dashboard",
      "Facility Calendar",
      "Occupancy Calendar",
      "Calling",
      "Inbox",
      "Grooming",
      "Training",
      "Retail / POS",
      "Customer",
      "Scheduling",
      "Daily Care",
      "Bookings",
      "Reports & Analytics",
      "Marketing",
    ];
    let cursor = -1;
    for (const label of expectedOrder) {
      const idx = items.indexOf(label, cursor + 1);
      expect(
        items,
        `"${label}" should appear after the previous item`,
      ).toContain(label);
      expect(idx, `"${label}" out of order`).toBeGreaterThan(cursor);
      cursor = idx;
    }

    // No bespoke staff-only items anywhere in the sidebar.
    const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
    for (const name of BESPOKE) {
      await expect(
        sidebar.getByRole("link", { name, exact: true }),
      ).toHaveCount(0);
    }
  });

  // #1 (cont.) — a nav item opens the REAL facility screen (grooming module).
  test("#1 Grooming opens the real facility grooming module (Check-In Board)", async ({
    page,
    context,
  }) => {
    await enterPortalAs(context, page, ACCOUNTS.manager);
    const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
    await expect(sidebar.getByRole("link").first()).toBeVisible({
      timeout: 60_000,
    });
    const grooming = sidebar.getByRole("link", {
      name: "Grooming",
      exact: true,
    });

    // Click until it takes, rather than assuming the first one did.
    //
    // Two things make a single click unreliable here, and neither is a bug in
    // the app. The link is visible before React has hydrated, so an early click
    // can land on markup with no handler yet; and the dev server compiles
    // /employee/grooming on first hit, which can outlast an ordinary timeout.
    // A one-shot click plus a long URL assertion fails as "navigation never
    // happened" — real-looking, and about nothing.
    await expect
      .poll(
        async () => {
          if (!/\/employee\/grooming/.test(page.url())) {
            await grooming.click({ timeout: 5_000 }).catch(() => {});
          }
          return page.url();
        },
        { timeout: 90_000 },
      )
      .toMatch(/\/employee\/grooming/);
    // The facility grooming module renders its Check-In board, NOT a bespoke
    // "Grooming Queue" screen.
    await expect(page.getByText("Grooming Queue", { exact: true })).toHaveCount(
      0,
    );
  });

  // #3 — building a position by toggling individual features on and off.
  //
  // The original hand-wrote all 33 nav permissions to construct a "Daycare
  // Attendant", then asserted a hardcoded sidebar. Against the database that is
  // 33 writes to make one point, and the expected list goes stale the moment a
  // preset changes — quietly, since a stale expectation fails loudly only if you
  // are lucky.
  //
  // This asserts the same claim RELATIVELY: take a real position, toggle exactly
  // two features, require the sidebar to differ by exactly those two. Cannot
  // drift, and a preset change cannot make it silently pass.
  test("#3 Toggling a feature adds or removes exactly its nav item", async ({
    page,
    context,
    browser,
  }) => {
    await enterPortalAs(context, page, ACCOUNTS.caretaker);
    const before = await sidebarItems(page);

    expect(before, "baseline: caretaker has no Live Pet Cams").not.toContain(
      "Live Pet Cams",
    );
    expect(before, "baseline: caretaker has Incidents").toContain("Incidents");

    expect(
      await setStaffOverride(browser, CARETAKER_STAFF_ID, "view_petcams", {
        granted: true,
        scope: "anytime",
      }),
    ).toBe(200);
    expect(
      await setStaffOverride(
        browser,
        CARETAKER_STAFF_ID,
        "ops_incidents_view",
        { granted: false, scope: "none" },
      ),
    ).toBe(200);

    const expected = before
      .filter((i) => i !== "Incidents")
      .concat("Live Pet Cams")
      .sort()
      .join("|");

    try {
      await page.reload();
      await expect
        .poll(async () => (await sidebarItems(page)).slice().sort().join("|"), {
          timeout: 30_000,
        })
        .toBe(expected);
    } finally {
      // Put the caretaker back HERE, not just in afterAll.
      //
      // The next test uses this same person as its "unaffected colleague", and
      // leaving `view_petcams` granted made that check assert the opposite of
      // what it read. Which is precisely the failure this suite already has a
      // written lesson about, in role-editor-writes.spec.ts — a test that grants
      // something owes the cleanup to the next test, not to the end of the file.
      // afterAll stays as the net for a run that dies before reaching here.
      await setStaffOverride(browser, CARETAKER_STAFF_ID, "view_petcams", null);
      await setStaffOverride(
        browser,
        CARETAKER_STAFF_ID,
        "ops_incidents_view",
        null,
      );
    }
  });

  // #3 (cont.) — a feature the position lacks is blocked by URL, not just hidden.
  test("#3 A feature the position lacks renders AccessRestricted", async ({
    page,
    context,
  }) => {
    // Marketing is absent from the caretaker preset, so this needs no override.
    await enterPortalAs(context, page, ACCOUNTS.caretaker);
    // `commit` rather than the default `load`: the dev server compiles
    // /employee/marketing on first hit, and waiting for every resource to
    // settle blew the whole test's 120s budget on a route that had already
    // answered. The assertion below does the real waiting.
    await page.goto("/employee/marketing", { waitUntil: "commit" });
    await expect(
      page.getByText(/don't have access to this section/i),
    ).toBeVisible({ timeout: 60_000 });
  });

  // #4 — an override lands on the PERSON, not on their role.
  //
  // The original compared two groomers, one of them overridden. The dev accounts
  // have one login per role, so this holds the role constant a different way: the
  // SAME person before and after, which answers "maybe it was their role all
  // along" more directly than two people ever could — then checks a colleague to
  // show the grant did not go facility-wide, and clears it to show it reverses.
  test("#4 An override moves the person it names, and nobody else", async ({
    page,
    context,
    browser,
  }) => {
    await enterPortalAs(context, page, ACCOUNTS.groomer);
    const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
    await expect(sidebar.getByRole("link").first()).toBeVisible({
      timeout: 60_000,
    });
    const petcams = sidebar.getByRole("link", {
      name: "Live Pet Cams",
      exact: true,
    });
    await expect(petcams).toHaveCount(0);

    expect(
      await setStaffOverride(browser, GROOMER_STAFF_ID, "view_petcams", {
        granted: true,
        scope: "anytime",
      }),
    ).toBe(200);

    await page.reload();
    await expect(petcams).toBeVisible({ timeout: 30_000 });

    // A colleague, while the grant is still in place, is untouched.
    const peerContext = await browser.newContext();
    const peer = await peerContext.newPage();
    try {
      await enterPortalAs(peerContext, peer, ACCOUNTS.caretaker);
      const peerSidebar = peer.locator('[data-slot="sidebar-inner"]').first();
      await expect(peerSidebar.getByRole("link").first()).toBeVisible({
        timeout: 60_000,
      });
      await expect(
        peerSidebar.getByRole("link", { name: "Live Pet Cams", exact: true }),
      ).toHaveCount(0);
    } finally {
      await peerContext.close();
    }

    // And clearing it puts the same person back.
    expect(
      await setStaffOverride(browser, GROOMER_STAFF_ID, "view_petcams", null),
    ).toBe(200);
    await page.reload();
    await expect(petcams).toHaveCount(0);
  });
});
