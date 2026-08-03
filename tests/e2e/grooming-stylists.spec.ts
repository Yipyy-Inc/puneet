import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The groomer roster, over real HTTP.
//
// The SQL suite proves the tables behave. This proves the join does: `Stylist`
// is assembled from two rows in two tables, and every field below comes from
// one side or the other.
//
// ── WHY A GROOMER SESSION, NOT JUST AN OWNER ──────────────────────────────
//
// The first read policy required `view_services`, which a groomer does not
// hold, so the roster came back empty for exactly the person the grooming
// board is for. An owner-only test would have stayed green through that. The
// groomer case is the point of this file.
//
// Read-only throughout: nothing here writes, so it leaves the demo facility
// as it found it.
// ============================================================================

const API = "/api/grooming/stylists";

interface Payload {
  stylists: {
    id: string;
    staffId?: string;
    name: string;
    email: string;
    status: string;
    rating: number;
    totalAppointments: number;
    specializations: string[];
    capacity: { skillLevel: string; maxDailyAppointments: number };
    visibleOnline: boolean;
  }[];
  availability: {
    id: string;
    stylistId: string;
    stylistName: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
}

test.describe("the groomer roster", () => {
  test("a groomer profile is assembled from staff and the grooming profile", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const response = await page.request.get(API);
    expect(response.status()).toBe(200);
    const { stylists, availability } = (await response.json()) as Payload;

    expect(stylists.length).toBeGreaterThan(0);

    for (const stylist of stylists) {
      // From `staff`: a groomer with no name means the join silently missed.
      expect(stylist.name.trim(), `${stylist.id} has a name`).not.toBe("");
      expect(stylist.staffId, `${stylist.id} links to staff`).toBeTruthy();

      // From the profile.
      expect(["basic", "standard", "premium", "platinum"]).toContain(
        stylist.capacity.skillLevel,
      );
      expect(stylist.capacity.maxDailyAppointments).toBeGreaterThan(0);

      // Derived, and deliberately empty: nothing in this database rates a
      // groomer, so a non-zero rating would mean a number came from nowhere.
      expect(stylist.rating).toBe(0);
      expect(stylist.totalAppointments).toBeGreaterThanOrEqual(0);

      expect(["active", "inactive", "on-leave"]).toContain(stylist.status);
    }

    // Hours resolve to groomers that exist in the same payload.
    const ids = new Set(stylists.map((s) => s.id));
    for (const slot of availability) {
      expect(ids.has(slot.stylistId)).toBe(true);
      expect(slot.startTime).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.endTime).toMatch(/^\d{2}:\d{2}$/);
      expect(slot.endTime > slot.startTime).toBe(true);
      expect(slot.dayOfWeek).toBeGreaterThanOrEqual(0);
      expect(slot.dayOfWeek).toBeLessThanOrEqual(6);
      // The name travels with the slot; it comes from the staff row.
      const owner = stylists.find((s) => s.id === slot.stylistId)!;
      expect(slot.stylistName).toBe(owner.name);
    }
  });

  test("a groomer who is not employed reads inactive, whatever the profile says", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { stylists } = (await (
      await page.request.get(API)
    ).json()) as Payload;

    // The seeded roster carries exactly this case: a stylist flagged on leave
    // whose staff record says they are no longer active. Employment wins.
    const inactive = stylists.filter((s) => s.status === "inactive");
    expect(
      inactive.length,
      "the seed includes a groomer whose staff record is not active",
    ).toBeGreaterThan(0);

    // And the rest are genuinely working.
    const working = stylists.filter((s) => s.status !== "inactive");
    expect(working.length).toBeGreaterThan(0);
  });

  test("a groomer can read the roster the board is built from", async ({
    page,
  }) => {
    // The regression this file exists for. A groomer holds no `view_services`;
    // under the first policy this returned an empty list and the grooming
    // board rendered no columns for the person standing at it.
    await signIn(page, ACCOUNTS.groomer);

    const response = await page.request.get(API);
    expect(response.status()).toBe(200);
    const { stylists, availability } = (await response.json()) as Payload;

    expect(stylists.length, "a groomer sees the roster").toBeGreaterThan(0);
    expect(availability.length, "and the hours").toBeGreaterThan(0);
  });

  test("a customer sees only groomers published to the booking flow", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const response = await page.request.get(API);
    expect(response.status()).toBe(200);
    const { stylists } = (await response.json()) as Payload;

    // Every groomer that comes back is one the facility chose to publish.
    // Nothing in the seed is published yet, so this is currently an empty
    // list -- asserted as a scope, not as a count, so it stays true once a
    // facility ticks the box.
    for (const stylist of stylists) {
      expect(stylist.visibleOnline).toBe(true);
    }

    const staff = (await (await page.request.get(API)).json()) as Payload;
    expect(staff.stylists.length).toBeLessThanOrEqual(5);
  });
});

// ============================================================================
// The screens, not just the payload.
// ============================================================================

test.describe("the roster on screen", () => {
  test("the grooming board renders groomer columns by name", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/services/grooming");

    // Names come from `staff`; a column headed by a blank would mean the join
    // returned a profile with no person attached.
    await expect(page.getByText("Jessica Martinez").first()).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByText("Sophie Laurent").first()).toBeVisible();
  });

  test("the stylists admin page lists groomers with and without a profile", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/services/grooming/stylists");

    // With a profile: seeded, and its specialisations come from the profile row.
    await expect(page.getByText("Marcus Thompson").first()).toBeVisible({
      timeout: 45_000,
    });

    // The page builds its list from the STAFF roster, so groomers who have no
    // grooming profile appear too -- three of them at this facility. That is
    // the split the API route deliberately does not paper over.
    await expect(page.getByText("Olivia Beaumont").first()).toBeVisible();
  });
});
