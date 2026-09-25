import { test, expect, type Browser } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";

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
// The client the booked-into test uses, so the sweep reads only theirs.
const CLIENT_REF = 15;

interface Catalogue {
  categories: {
    id: string;
    name: string;
    service: string;
    sortOrder: number;
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

/**
 * Removes whatever a run of this file left behind. It runs BEFORE the tests as
 * well as after them: a run that is cancelled, or whose cleanup fails, leaves
 * the category behind, and the next run's first test then failed on its name
 * with a 409.
 */
async function sweep(browser: Browser, when: "before" | "after") {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);

    // STAYS FIRST. A room with any stay against it refuses to be deleted, and
    // cancelling a booking only RELEASES the stay — the row survives, so the
    // room stays undeletable and the next run would collide on the category id.
    // Clearing the assignment deletes the stay, which is exactly what
    // `roomId: null` is for.
    //
    // Found in the database, and only the bookings still holding one. This
    // read `?clientRef=15` — Alice, 1,496 bookings — which times out; on
    // 2026-09-25 it came back empty, one stay stayed in `cat-e2e-rooms-2`, the
    // room and then the category refused to go, and `boarding-services.sql`
    // failed on the leftover class and held the deploy behind it.
    for (const b of await bookingsMarked(MARKER, { holdingAStay: true })) {
      await page.request.put("/api/boarding/stays", {
        data: { bookingRef: b.ref, roomId: null },
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
    console.log(
      `cleanup (${when}): ${removed} room(s), ${categories} category(ies)`,
    );
  } finally {
    await page.close();
  }
}

test.beforeAll(async ({ browser }) => {
  await sweep(browser, "before");
});

test.afterAll(async ({ browser }) => {
  await sweep(browser, "after");
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
        clientId: CLIENT_REF,
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

  test("a class is dragged into place by keyboard, and the order is saved", async ({
    page,
  }) => {
    // The order kennel classes are offered in could only be set by creating
    // them in that order. Two classes of this file's own, created last so they
    // sit at the bottom: moving the second above the first renumbers those two
    // and none of the facility's real classes. The sweep removes both, by
    // the marker in their ids.
    await signIn(page, ACCOUNTS.owner);
    for (const [id, name] of [
      [`${CATEGORY}-order-a`, "E2E Order A"],
      [`${CATEGORY}-order-b`, "E2E Order B"],
    ]) {
      const res = await page.request.post(`${API}/categories`, {
        data: {
          id,
          name,
          service: "boarding",
          defaultCapacity: 1,
          visibleToClients: false,
          rules: [],
          unitCount: 0,
        },
      });
      expect(res.status(), await res.text()).toBe(201);
    }

    await page.goto("/facility/dashboard/services/boarding/rooms");
    const handle = page.getByRole("button", {
      name: "Move E2E Order B in the list",
    });
    await expect(handle).toBeVisible({ timeout: 45_000 });

    // dnd-kit's keyboard sensor: pick up, one place up, put down. Each step
    // waits for what a screen reader is told, which is also what makes the
    // steps land.
    await handle.focus();
    await page.keyboard.press("Space");
    const pickedUp = page.getByText("Picked up E2E Order B.");
    await expect(pickedUp).toBeAttached();
    // The list is measured AFTER the pick-up is announced, and an arrow
    // pressed before that moves nothing: the full suite failed here on
    // 2026-09-25, under load, with the pick-up still the last thing said. So
    // the arrow is pressed again only while the pick-up is still the last
    // thing said — a move that registered replaces it, so this can never
    // carry the class two places.
    const overA = page.getByText("E2E Order B is over E2E Order A.");
    await expect(async () => {
      if ((await pickedUp.count()) > 0) await page.keyboard.press("ArrowUp");
      await expect(overA).toBeAttached({ timeout: 1_500 });
    }).toPass({ timeout: 20_000 });
    await page.keyboard.press("Space");
    await expect(
      page.getByText("E2E Order B was dropped over E2E Order A."),
    ).toBeAttached();

    const orderOf = async () => {
      const catalogue = (await (
        await page.request.get(API)
      ).json()) as Catalogue;
      const find = (suffix: string) =>
        catalogue.categories.find((c) => c.id === `${CATEGORY}-order-${suffix}`)
          ?.sortOrder ?? Number.NaN;
      return find("b") < find("a") ? "b first" : "a first";
    };
    await expect.poll(orderOf, { timeout: 30_000 }).toBe("b first");
  });
});
