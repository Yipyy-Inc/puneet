import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The kennel class is the price.
//
// ── WHAT CHANGED ──────────────────────────────────────────────────────────
//
// The booking modal charged `boarding.basePrice` — one number per service —
// for every kennel, while the board beside it displayed the per-class rate the
// facility had set in `room_categories`. On the demo facility that was $45 a
// night against a board reading $125 for a Private Care Suite and $38 for a
// Condominium. Staff quoted what they could see; the till took the flat rate.
//
// `boardingBasePrice` in `@/lib/boarding-pricing` now prices by the class of
// the room each pet is assigned to.
//
// ── WHAT THIS FILE CAN AND CANNOT PROVE ───────────────────────────────────
//
// It proves the INPUTS to that calculation are sound, which is the half that
// is observable from outside the browser. It does NOT drive the booking wizard
// and therefore does not prove the arithmetic itself — `/api/bookings` accepts
// `basePrice` from the caller, so no request can be made to reveal what the
// modal computed. That needs a UI test through the wizard, and this comment is
// here so nobody reads a green run as more than it is.
//
// What it does catch is the way the fix silently stops applying: the fallback
// in `boardingNightlyRate` reverts to the flat service rate whenever a class
// carries no price of its own. A class created without one would put the old
// behaviour back for that kennel, with nothing on screen to say so.
// ============================================================================

interface Category {
  id: string;
  service: string;
  name: string;
  defaultBasePrice?: number;
}
interface Room {
  id: string;
  name: string;
  categoryId: string;
  active: boolean;
}

test.describe("boarding is priced by the kennel class", () => {
  test("every class a dog can be booked into carries a price", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.get("/api/boarding/rooms");
    expect(res.ok(), await res.text()).toBe(true);
    const { categories, rooms } = (await res.json()) as {
      categories: Category[];
      rooms: Room[];
    };

    expect(
      categories.length,
      "the facility has no kennel classes",
    ).toBeGreaterThan(0);

    // Only classes that actually hold a bookable room matter: an empty class
    // prices nothing, and demanding a rate for one would be noise.
    const classesInUse = new Set(
      rooms.filter((r) => r.active).map((r) => r.categoryId),
    );
    expect(classesInUse.size, "no active kennels").toBeGreaterThan(0);

    for (const category of categories) {
      if (!classesInUse.has(category.id)) continue;
      expect(
        category.defaultBasePrice,
        `${category.name} holds bookable kennels but has no nightly rate — a stay in one silently falls back to the flat service rate`,
      ).toBeGreaterThan(0);
    }
  });

  test("the rate the board shows is the class's own, not a service-wide one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.get("/api/boarding/rooms");
    const { categories, rooms } = (await res.json()) as {
      categories: Category[];
      rooms: Room[];
    };
    const byId = new Map(categories.map((c) => [c.id, c]));

    // Every active kennel resolves to a class with a rate. This is the number
    // the kennel board renders as `dailyRate`, and — after this change — the
    // number a stay in that kennel is charged per night.
    for (const room of rooms.filter((r) => r.active)) {
      const category = byId.get(room.categoryId);
      expect(category, `${room.name} belongs to no visible class`).toBeTruthy();
      expect(
        category!.defaultBasePrice,
        `${room.name} would be priced by the fallback, not by ${category!.name}`,
      ).toBeGreaterThan(0);
    }

    // And the classes genuinely differ, which is the whole point: if every
    // class charged the same, the flat rate would have been right all along
    // and this change would be moving numbers around for nothing.
    const rates = new Set(
      categories
        .filter((c) => classHasRooms(c.id, rooms))
        .map((c) => c.defaultBasePrice),
    );
    expect(
      rates.size,
      "every kennel class charges the same — the per-class model buys nothing here",
    ).toBeGreaterThan(1);
  });
});

function classHasRooms(categoryId: string, rooms: Room[]): boolean {
  return rooms.some((r) => r.active && r.categoryId === categoryId);
}
