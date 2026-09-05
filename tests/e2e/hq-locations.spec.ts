import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A branch belongs to the business, not to a browser tab.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// /facility/hq/locations rendered three fictional Montreal branches from
// `src/data/locations.ts` — the same three for every business — and its
// "Add Location" wizard pushed the result into `added-locations-store.ts`, a
// module-level array whose own header said "Swap for a real create API when the
// backend lands". It died with the tab.
//
// Meanwhile `public.locations` had existed since 20260726120000, with RLS and
// with THREE tables pointing at it. The screen and the schema had never met.
//
// ── THE TEST THAT FOUND A BUG ─────────────────────────────────────────────
//
// T3. Promoting a second branch to primary has to demote the incumbent, and the
// first version of the migration made that IMPOSSIBLE: the trigger's own demote
// UPDATE re-entered the trigger and tripped the "a facility must have a
// primary" guard, because the promoted row is not written yet inside its own
// BEFORE trigger. Reading the SQL did not show it; driving it did. Fixed in
// 20260825101500 — and this test is why the fix is not going to regress.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// Every location this file creates is tracked by id and removed in `afterAll`.
// Order matters and is not obvious: the primary cannot be deleted while other
// locations exist, so the ORIGINAL primary is restored FIRST and only then are
// the probe branches removed. Failures are collected and asserted once at the
// end — an `expect` inside the loop would throw and leave the rest behind, the
// exact failure recorded in the debt map on 2026-08-24.
// ============================================================================

const API = "/api/locations";

type Page = import("@playwright/test").Page;

interface FacilityLocation {
  id: string;
  name: string;
  shortCode: string | null;
  status: "active" | "inactive" | "coming_soon";
  isPrimary: boolean;
  bookingCount: number;
}

/** Ids created by this file, newest first. */
const created: string[] = [];
/** The primary this facility had before the run. */
let originalPrimaryId: string | null = null;

async function listLocations(page: Page): Promise<FacilityLocation[]> {
  const res = await page.request.get(API);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as FacilityLocation[];
}

async function createLocation(
  page: Page,
  body: Record<string, unknown>,
): Promise<FacilityLocation> {
  const res = await page.request.post(API, { data: body });
  expect(res.status(), await res.text()).toBe(201);
  const location = (await res.json()) as FacilityLocation;
  created.unshift(location.id);
  return location;
}

test.describe("HQ locations", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    const locations = await listLocations(page);
    originalPrimaryId = locations.find((l) => l.isPrimary)?.id ?? null;
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    const failures: string[] = [];

    // Restore the incumbent FIRST. A probe branch that is still primary cannot
    // be deleted while the original exists, so the order is load-bearing.
    if (originalPrimaryId) {
      const res = await page.request.patch(`${API}/${originalPrimaryId}`, {
        data: { isPrimary: true },
      });
      if (!res.ok()) {
        failures.push(`restore primary: ${res.status()} ${await res.text()}`);
      }
    }

    for (const id of created) {
      const res = await page.request.delete(`${API}/${id}`);
      // 404 would mean somebody else removed it; 204 is the expected answer.
      if (res.status() !== 204) {
        failures.push(`delete ${id}: ${res.status()} ${await res.text()}`);
      }
    }

    await context.close();
    expect(
      failures,
      `teardown left rows behind:\n${failures.join("\n")}`,
    ).toHaveLength(0);
  });

  test("the business has locations, and exactly one is primary", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const locations = await listLocations(page);

    expect(locations.length).toBeGreaterThan(0);
    expect(locations.filter((l) => l.isPrimary)).toHaveLength(1);
    // Primary first — the list is ordered so the default branch leads.
    expect(locations[0].isPrimary).toBe(true);
  });

  test("a branch created in one browser is there in another", async ({
    browser,
  }) => {
    const first = await browser.newContext();
    const firstPage = await first.newPage();
    await signIn(firstPage, ACCOUNTS.owner);

    const name = `[e2e] Branch ${Date.now()}`;
    const location = await createLocation(firstPage, {
      name,
      status: "active",
      address: {
        street: "1 Probe Road",
        city: "Laval",
        state: "QC",
        zipCode: "H7N 1A1",
        country: "Canada",
      },
      phone: "514 555 0142",
    });
    await first.close();

    // A SEPARATE context — its own storage, its own everything. This is the
    // assertion a module-level array could never have passed.
    const second = await browser.newContext();
    const secondPage = await second.newPage();
    await signIn(secondPage, ACCOUNTS.owner);
    const seen = await listLocations(secondPage);
    await second.close();

    const found = seen.find((l) => l.id === location.id);
    expect(found, "the branch was not there in a second browser").toBeTruthy();
    expect(found?.name).toBe(name);
  });

  test("promoting a branch demotes the incumbent", async ({ page }) => {
    // The regression test for the bug in 20260825095825 — see the header.
    await signIn(page, ACCOUNTS.owner);

    const before = await listLocations(page);
    const incumbent = before.find((l) => l.isPrimary);
    expect(incumbent, "no primary to demote").toBeTruthy();

    const challenger = await createLocation(page, {
      name: `[e2e] Challenger ${Date.now()}`,
      status: "active",
    });
    expect(challenger.isPrimary).toBe(false);

    const res = await page.request.patch(`${API}/${challenger.id}`, {
      data: { isPrimary: true },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const after = await listLocations(page);
    const primaries = after.filter((l) => l.isPrimary);
    expect(primaries, "there must be exactly one primary").toHaveLength(1);
    expect(primaries[0].id).toBe(challenger.id);
    expect(after.find((l) => l.id === incumbent!.id)?.isPrimary).toBe(false);

    // Put it back so the rest of the file starts where it expected to.
    const restore = await page.request.patch(`${API}/${incumbent!.id}`, {
      data: { isPrimary: true },
    });
    expect(restore.ok(), await restore.text()).toBe(true);
  });

  test("the last primary cannot simply be cleared", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const locations = await listLocations(page);
    const primary = locations.find((l) => l.isPrimary);
    expect(primary).toBeTruthy();

    const res = await page.request.patch(`${API}/${primary!.id}`, {
      data: { isPrimary: false },
    });
    expect(res.ok(), "the last primary was cleared").toBe(false);
    expect(res.status()).toBe(409);

    // Positive control: the row is untouched, so the refusal was a refusal and
    // not a route that fails for every patch.
    const after = await listLocations(page);
    expect(after.find((l) => l.id === primary!.id)?.isPrimary).toBe(true);
  });

  test("two branches cannot share a short code", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const code = `E${Date.now().toString().slice(-6)}`;

    await createLocation(page, { name: `[e2e] Code A`, shortCode: code });

    const res = await page.request.post(API, {
      data: { name: `[e2e] Code B`, shortCode: code.toLowerCase() },
    });
    expect(res.status(), await res.text()).toBe(409);
  });

  test("a branch that has traded cannot be removed", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const locations = await listLocations(page);
    const withHistory = locations.find((l) => l.bookingCount > 0);

    // A facility with no bookings at all cannot exercise this. Skip honestly
    // rather than pass on an absence — a deny-assertion against nothing is not
    // a deny-assertion.
    test.skip(
      !withHistory,
      "no location has bookings against it in this environment",
    );

    const res = await page.request.delete(`${API}/${withHistory!.id}`);
    expect(res.status(), await res.text()).toBe(409);
    const body = (await res.json()) as { error?: string };
    expect(body.error ?? "").toMatch(/booking/i);

    // And it is still there.
    const after = await listLocations(page);
    expect(after.some((l) => l.id === withHistory!.id)).toBe(true);
  });

  test("a groomer cannot add or change a branch", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    // Positive control first: a groomer CAN read the list, so a refusal below
    // is about the write and not about being unable to see anything.
    const list = await page.request.get(API);
    expect(list.ok(), await list.text()).toBe(true);
    const seen = (await list.json()) as FacilityLocation[];
    expect(seen.length).toBeGreaterThan(0);

    const post = await page.request.post(API, {
      data: { name: "[e2e] groomer branch" },
    });
    expect(post.ok(), "a groomer created a location").toBe(false);

    const patch = await page.request.patch(`${API}/${seen[0].id}`, {
      data: { name: "[e2e] groomer rename" },
    });
    expect(patch.ok(), "a groomer renamed a location").toBe(false);
  });

  test("the screen shows the branches the business holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const locations = await listLocations(page);
    const primary = locations.find((l) => l.isPrimary)!;

    await page.goto("/facility/hq/locations");
    await expect(
      page.getByRole("heading", { name: "Locations", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(primary.name).first()).toBeVisible({
      timeout: 15_000,
    });

    // And the detail screen points at the real editors rather than imitating
    // them, which is what the four fixture tabs used to do.
    await page.goto(`/facility/hq/locations/${primary.id}`);
    await expect(
      page.getByRole("link", { name: /Services and prices/ }),
    ).toBeVisible({ timeout: 15_000 });

    // Three links, not one. There used to be a single entry called "Opening
    // hours, tax and booking rules" — one link naming three unrelated things,
    // because all three lived in the same 8.2-screen "Business" section and one
    // link was the best that could be offered. They have their own addresses
    // now, so this asserts three true destinations instead of one vague one.
    for (const name of [
      /Opening hours and closures/,
      /Booking rules/,
      /Tax rates/,
    ]) {
      await expect(page.getByRole("link", { name })).toBeVisible();
    }
  });
});
