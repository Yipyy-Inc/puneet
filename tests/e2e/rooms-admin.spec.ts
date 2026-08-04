import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The Rooms page edits the rooms bookings actually use.
//
// ── WHAT THIS PROVES THAT THE OLD PAGE COULD FAKE ─────────────────────────
//
// `useRooms` persisted to localStorage. A save "worked" — the list updated, a
// reload in the same browser still showed it — while no booking could ever be
// placed in the room, because `create_booking` resolves `facility_rooms` in
// Postgres.
//
// So a same-browser reload proves nothing. These tests check a save from a
// SECOND, CLEAN browser context, which localStorage cannot satisfy, and then
// book into the new room to show the booking path agrees.
//
// ── IT WRITES, AND CLEANS UP ──────────────────────────────────────────────
//
// Rooms and categories are fully reversible: DELETE exists for both, and the
// database refuses to remove either while anything depends on it — which the
// cleanup relies on rather than works around.
// ============================================================================

const API = "/api/rooms";
const MARKER = "e2e-rooms";
const CATEGORY = `cat-${MARKER}`;

interface Catalogue {
  categories: {
    id: string;
    name: string;
    service: string;
    defaultCapacity: number;
    defaultBasePrice?: number;
    visibleToClients: boolean;
    rules: unknown[];
  }[];
  rooms: {
    id: string;
    categoryId: string;
    name: string;
    active: boolean;
    capacity?: number;
    staffNotes?: string;
  }[];
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);

    // STAYS FIRST. A room with any stay against it refuses to be deleted, and
    // cancelling a booking only RELEASES the stay — the row survives, so the
    // room stays undeletable and the next run would collide on the category id.
    // Clearing the assignment deletes the stay, which is exactly what
    // `roomId: null` is for.
    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as { id: number; specialRequests?: string }[] | null;
    for (const b of bookings ?? []) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      await page.request.put("/api/boarding/stays", {
        data: { bookingRef: b.id, roomId: null },
      });
    }

    const catalogue = (await (await page.request.get(API)).json()) as Catalogue;

    // Rooms next: a category with rooms in it refuses to go, by design.
    let removed = 0;
    for (const room of catalogue.rooms.filter((r) =>
      r.categoryId.includes(MARKER),
    )) {
      const res = await page.request.delete(
        `${API}/units/${encodeURIComponent(room.id)}`,
      );
      if (res.ok()) removed++;
      else console.log(`cleanup: room ${room.id} -> ${res.status()}`);
    }

    let categories = 0;
    for (const cat of catalogue.categories.filter((c) =>
      c.id.includes(MARKER),
    )) {
      const res = await page.request.delete(
        `${API}/categories/${encodeURIComponent(cat.id)}`,
      );
      if (res.ok()) categories++;
      else console.log(`cleanup: category ${cat.id} -> ${res.status()}`);
    }
    console.log(`cleanup: ${removed} room(s), ${categories} category(ies)`);
  } finally {
    await page.close();
  }
});

test.describe("the rooms page writes to the database", () => {
  test("a category and its units are created together", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post(`${API}/categories`, {
      data: {
        id: CATEGORY,
        name: "E2E Kennels",
        service: "boarding",
        defaultCapacity: 2,
        defaultBasePrice: 42,
        visibleToClients: true,
        rules: [
          {
            id: "rule-e2e",
            type: "max_weight",
            value: 50,
            clientMessage: "Up to 50 lbs.",
            enabled: true,
          },
        ],
        unitCount: 3,
      },
    });
    expect(res.status(), await res.text()).toBe(201);

    const catalogue = (await (await page.request.get(API)).json()) as Catalogue;
    const category = catalogue.categories.find((c) => c.id === CATEGORY);
    expect(category, "the category is in the catalogue").toBeTruthy();
    expect(category?.defaultCapacity).toBe(2);
    expect(category?.defaultBasePrice).toBe(42);
    // The rules the old model had nowhere to keep, round-tripped through jsonb.
    expect(category?.rules.length).toBe(1);

    const units = catalogue.rooms.filter((r) => r.categoryId === CATEGORY);
    expect(units.length, "three units were created with it").toBe(3);
    // NULL capacity: the unit defers to its category rather than copying it.
    expect(units[0]?.capacity).toBeUndefined();
  });

  test("the save survives a different browser, which localStorage could not", async ({
    browser,
  }) => {
    // A CLEAN context — no localStorage from the run above. This is the whole
    // assertion: the old provider would have shown an empty catalogue here.
    const fresh = await browser.newContext();
    const page = await fresh.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const catalogue = (await (
        await page.request.get(API)
      ).json()) as Catalogue;

      expect(
        catalogue.categories.some((c) => c.id === CATEGORY),
        "the category created in another browser is here",
      ).toBe(true);
    } finally {
      await fresh.close();
    }
  });

  test("a room can be renamed and deactivated", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = (await (await page.request.get(API)).json()) as Catalogue;
    const unit = before.rooms.find((r) => r.categoryId === CATEGORY);
    expect(unit).toBeTruthy();

    const res = await page.request.patch(
      `${API}/units/${encodeURIComponent(unit!.id)}`,
      { data: { name: "E2E Renamed", active: false } },
    );
    expect(res.status()).toBe(204);

    const after = (await (await page.request.get(API)).json()) as Catalogue;
    const updated = after.rooms.find((r) => r.id === unit!.id);
    expect(updated?.name).toBe("E2E Renamed");
    expect(updated?.active).toBe(false);
  });

  test("a category with rooms in it will not be deleted", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // The localStorage version removed the category AND every room in it,
    // silently. One of those rooms can have a guest in it tonight.
    const res = await page.request.delete(
      `${API}/categories/${encodeURIComponent(CATEGORY)}`,
    );
    expect(res.status()).toBe(409);
    expect(((await res.json()) as { error?: string }).error).toContain(
      "still has 3 rooms",
    );

    // And it is still there.
    const catalogue = (await (await page.request.get(API)).json()) as Catalogue;
    expect(catalogue.categories.some((c) => c.id === CATEGORY)).toBe(true);
  });

  test("a room created here can be booked into", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const catalogue = (await (await page.request.get(API)).json()) as Catalogue;
    const room = catalogue.rooms.find(
      (r) => r.categoryId === CATEGORY && r.active,
    );
    expect(room, "an active e2e room exists").toBeTruthy();

    // The payoff. Before this change the booking flow read rooms from
    // localStorage while create_booking resolved Postgres — a room added on
    // the Rooms page could never be booked into.
    const day = new Date(Date.now() + 240 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const end = new Date(Date.now() + 242 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const booking = await page.request.post("/api/bookings", {
      data: {
        clientId: 15,
        petId: 1,
        facilityId: 11,
        service: "boarding",
        startDate: day,
        endDate: end,
        checkInTime: "14:00",
        checkOutTime: "11:00",
        status: "confirmed",
        basePrice: 42,
        discount: 0,
        totalCost: 42,
        paymentStatus: "pending",
        specialRequests: `[${MARKER}]`,
        unitAssignment: room!.id,
      },
    });
    expect(booking.status(), await booking.text()).toBe(201);

    const created = (await booking.json()) as { id: number };
    // Cancel it here rather than in afterAll: the room cannot be deleted while
    // a stay references it, and cancelling only RELEASES the stay — so the
    // room is deliberately left behind for the cleanup to report on.
    await page.request.patch(`/api/bookings/${created.id}`, {
      data: { status: "cancelled" },
    });
  });
});
