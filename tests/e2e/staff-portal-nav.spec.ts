import { test, expect, type BrowserContext, type Page } from "@playwright/test";

// ============================================================================
// Staff-portal nav-parity — Z.1 acceptance smoke (feedback #1/#2/#3).
//
// The employee shell resolves the acting viewer from the `employee_staff_id`
// cookie (src/app/employee/(shell)/layout.tsx), and the RBAC provider reads
// per-staff / preset overrides from the `facility-rbac-state-v1` localStorage
// key (src/hooks/use-facility-rbac.tsx). So a test can "sign in as X, with
// features toggled" purely by seeding a cookie + that localStorage entry — the
// same state the /employee/select picker and the Roles studio write at runtime.
// No network stubs: the real app, real resolver, real sidebar.
// ============================================================================

const STORAGE_KEY = "facility-rbac-state-v1";

// The nav-feature permission keys (src/lib/nav/facility-nav.ts), minus the
// always-on `view_dashboard` (Dashboard is the home and can't be toggled off).
const NAV_KEYS = [
  "view_all_calendars",
  "view_occupancy_calendar",
  "calling_view",
  "messages_view_inbox",
  "view_grooming_queue",
  "view_training_queue",
  "retail_pos_access",
  "marketing_manage_automations",
  "ops_smart_insights",
  "view_client_list",
  "scheduling_view_all",
  "boarding_daily_care_log",
  "view_bookings",
  "view_estimates",
  "ops_manage_tasks",
  "manage_booking_calendar",
  "view_evaluations",
  "view_staff",
  "view_inventory",
  "view_services",
  "view_petcams",
  "financial_take_payment",
  "settings_billing",
  "financial_manage_gift_cards",
  "ops_view_reports",
  "marketing_view",
  "marketing_manage_loyalty",
  "marketing_view_analytics",
  "marketing_manage_reviews",
  "ops_incidents_view",
  "view_waivers",
  "view_intake_forms",
  "settings_general",
] as const;

const GRANT = { granted: true, scope: "anytime" as const };
const REVOKE = { granted: false, scope: "none" as const };

type Overrides = Record<string, { granted: boolean; scope: string }>;

/** Seed the cookie + RBAC localStorage BEFORE any app JS runs, then land in the
 *  employee shell as `staffId` with `overrides` applied to that staff. */
async function signInAs(
  context: BrowserContext,
  page: Page,
  staffId: string,
  overrides: Overrides = {},
) {
  await context.addCookies([
    {
      name: "employee_staff_id",
      value: staffId,
      url: "http://localhost:3000",
    },
  ]);
  await context.addInitScript(
    ({ key, id, ov }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          viewerId: id,
          presetOverrides: {},
          staffOverrides: { [id]: ov },
        }),
      );
    },
    { key: STORAGE_KEY, id: staffId, ov: overrides },
  );
  await page.goto("/employee");
}

/** Visible sidebar nav item titles, in DOM order. */
async function sidebarItems(page: Page): Promise<string[]> {
  const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
  await expect(sidebar.getByRole("link").first()).toBeVisible();
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

test.describe("Staff portal nav parity", () => {
  // #1 — Manager Nathalie's sidebar mirrors the facility sidebar.
  test("#1 Manager sidebar mirrors the facility sidebar (sequence + no bespoke items)", async ({
    page,
    context,
  }) => {
    await signInAs(context, page, "fs-mgr-01"); // Nathalie, primaryRole manager

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
    await signInAs(context, page, "fs-mgr-01");
    const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
    await sidebar.getByRole("link", { name: "Grooming", exact: true }).click();
    await expect(page).toHaveURL(/\/employee\/grooming/);
    // The facility grooming module renders its Check-In board, NOT a bespoke
    // "Grooming Queue" screen.
    await expect(page.getByText("Grooming Queue", { exact: true })).toHaveCount(
      0,
    );
  });

  // #3 — build a "Daycare Attendant" position by toggling features on/off.
  test("#3 A built position shows exactly its features; restricted URLs are blocked", async ({
    page,
    context,
  }) => {
    const TARGET = [
      "boarding_daily_care_log", // Daily Care
      "view_occupancy_calendar", // Occupancy Calendar
      "view_bookings", // Bookings
      "view_client_list", // Customer
      "messages_view_inbox", // Inbox
      "ops_manage_tasks", // Tasks
    ];
    const overrides: Overrides = {};
    for (const key of NAV_KEYS)
      overrides[key] = TARGET.includes(key) ? GRANT : REVOKE;

    await signInAs(context, page, "fs-groom-08", overrides); // any staff; overrides define the position

    // Sidebar shows EXACTLY those features (+ the always-on Dashboard home).
    const expected = [
      "Dashboard",
      "Occupancy Calendar",
      "Inbox",
      "Customer",
      "Daily Care",
      "Bookings",
      "Tasks",
    ];
    await expect
      .poll(async () => (await sidebarItems(page)).slice().sort().join("|"))
      .toBe(expected.slice().sort().join("|"));

    // A revoked feature's URL renders AccessRestricted (marketing is OFF).
    await page.goto("/employee/marketing");
    await expect(
      page.getByText(/don't have access to this section/i),
    ).toBeVisible();
  });

  // #4 — an individual override appears for only that person. Two isolated
  // contexts (one per test) so each starts from clean cookie + storage state.
  test("#4 Individual override grants Live Pet Cams to that staff member", async ({
    page,
    context,
  }) => {
    await signInAs(context, page, "fs-groom-01", { view_petcams: GRANT }); // Olivia
    const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
    await expect(
      sidebar.getByRole("link", { name: "Live Pet Cams", exact: true }),
    ).toBeVisible();
  });

  test("#4 A peer without the override does NOT see Live Pet Cams", async ({
    page,
    context,
  }) => {
    await signInAs(context, page, "fs-groom-02"); // Julien — same role, no override
    const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
    await expect(sidebar.getByRole("link").first()).toBeVisible();
    await expect(
      sidebar.getByRole("link", { name: "Live Pet Cams", exact: true }),
    ).toHaveCount(0);
  });
});
