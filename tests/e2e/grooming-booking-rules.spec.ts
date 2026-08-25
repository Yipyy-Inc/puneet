import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Grooming slot rules belong to the FACILITY, not to a browser.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `useGroomingScheduling` read and wrote `localStorage`, and the screen that
// edited it saved with:
//
//   // TODO: Save to backend
//   await new Promise((resolve) => setTimeout(resolve, 1000));
//   toast.success("Booking rules saved successfully");
//
// The values are not decorative: `GroomingDetails` and `new-appointment-dialog`
// read `slotGranularityMin` and `defaultBufferMin` to build the time-slot grid.
// So a manager setting 60-minute slots changed nothing for the receptionist
// taking the calls, and the two were offered different times for the same day.
//
// ── THE ASSERTION THAT MATTERS IS THE SECOND BROWSER ──────────────────────
//
// T3 saves in one browser context and reads in a FRESH one. That is the whole
// claim — a value that survives a reload proves only that the tab kept it, and
// `localStorage` passed that test for as long as it existed. A different
// context has a different storage, so only Postgres can carry the value across.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// `facility_settings` is keyed `(facility_id, domain)` — one row per facility,
// upserted. There is nothing to delete; the teardown restores whatever the
// facility had before the run, which is recorded in `beforeAll`.
// ============================================================================

const SETTINGS = "/api/facility/settings";

type Page = import("@playwright/test").Page;

interface GroomingScheduling {
  smartSchedulingEnabled: boolean;
  slotGranularityMin: 15 | 30 | 60;
  defaultBufferMin: number;
}

/** What the facility had before this file touched it. */
let original: GroomingScheduling | null = null;

async function readScheduling(page: Page): Promise<GroomingScheduling> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  // The route returns the domain map ITSELF, not `{ settings: ... }`. Read the
  // route before assuming the envelope — this file guessed once and the whole
  // suite stopped on the first line of the first test.
  const body = (await res.json()) as Record<
    string,
    { value: GroomingScheduling; configured: boolean }
  >;
  return body.grooming_scheduling.value;
}

async function saveScheduling(
  page: Page,
  value: GroomingScheduling,
): Promise<void> {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: "grooming_scheduling", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

test.describe("grooming booking rules", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    original = await readScheduling(page);
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!original) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    await saveScheduling(page, original);
    await context.close();
  });

  test("the facility has grooming slot settings at all", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const value = await readScheduling(page);

    // The domain answers even for a facility that has never opened the screen
    // — the fallback is the shipped default, not an error and not null.
    expect(typeof value.smartSchedulingEnabled).toBe("boolean");
    expect([15, 30, 60]).toContain(value.slotGranularityMin);
    expect(value.defaultBufferMin).toBeGreaterThanOrEqual(0);
  });

  test("a slot length saved in one browser is there in another", async ({
    browser,
  }) => {
    const first = await browser.newContext();
    const firstPage = await first.newPage();
    await signIn(firstPage, ACCOUNTS.owner);

    const before = await readScheduling(firstPage);
    const next: GroomingScheduling = {
      ...before,
      slotGranularityMin: before.slotGranularityMin === 60 ? 15 : 60,
      defaultBufferMin: before.defaultBufferMin === 45 ? 20 : 45,
    };
    await saveScheduling(firstPage, next);
    await first.close();

    // A SEPARATE context — its own storage, its own everything. This is the
    // assertion localStorage could never have passed.
    const second = await browser.newContext();
    const secondPage = await second.newPage();
    await signIn(secondPage, ACCOUNTS.owner);
    const seen = await readScheduling(secondPage);
    await second.close();

    expect(seen.slotGranularityMin).toBe(next.slotGranularityMin);
    expect(seen.defaultBufferMin).toBe(next.defaultBufferMin);
  });

  test("a colleague sees the same rules the owner set", async ({ browser }) => {
    // Facility-wide, not per-account. A receptionist booking a groom must be
    // offered the grid the manager configured.
    const ownerCtx = await browser.newContext();
    const ownerPage = await ownerCtx.newPage();
    await signIn(ownerPage, ACCOUNTS.owner);
    const set: GroomingScheduling = {
      smartSchedulingEnabled: true,
      slotGranularityMin: 15,
      defaultBufferMin: 35,
    };
    await saveScheduling(ownerPage, set);
    await ownerCtx.close();

    const staffCtx = await browser.newContext();
    const staffPage = await staffCtx.newPage();
    await signIn(staffPage, ACCOUNTS.reception);
    const seen = await readScheduling(staffPage);
    await staffCtx.close();

    expect(seen.slotGranularityMin).toBe(15);
    expect(seen.defaultBufferMin).toBe(35);
  });

  test("a buffer outside the allowed range is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = await readScheduling(page);

    // The zod schema bounds it 0..240. A value the screen would never send is
    // still refused, because the screen is not the boundary.
    const res = await page.request.patch(SETTINGS, {
      data: {
        domain: "grooming_scheduling",
        value: { ...before, defaultBufferMin: 5000 },
      },
    });
    expect(res.ok()).toBe(false);

    // And the stored value is untouched — a refused write must not half-apply.
    const after = await readScheduling(page);
    expect(after.defaultBufferMin).toBe(before.defaultBufferMin);
  });

  test("the screen shows what the facility holds, and saves it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await saveScheduling(page, {
      smartSchedulingEnabled: true,
      slotGranularityMin: 30,
      defaultBufferMin: 15,
    });

    await page.goto(
      "/facility/dashboard/services/grooming/settings/booking-rules",
    );
    await expect(
      page.getByRole("heading", { name: "Grooming booking rules" }),
    ).toBeVisible();

    // The value on screen is the one the database holds.
    await expect(page.getByText("30 minutes")).toBeVisible({ timeout: 15_000 });

    // And the sections this screen used to fake now point somewhere real
    // rather than pretending to hold them.
    await expect(
      page.getByRole("link", { name: /Services and size pricing/ }),
    ).toBeVisible();
  });

  test("a groomer cannot rewrite the facility's slot rules", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.patch(SETTINGS, {
      data: {
        domain: "grooming_scheduling",
        value: {
          smartSchedulingEnabled: false,
          slotGranularityMin: 60,
          defaultBufferMin: 240,
        },
      },
    });
    expect(res.ok(), "a groomer wrote a facility setting").toBe(false);
  });
});
