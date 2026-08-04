import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A kennel holds one booking at a time, over real HTTP.
//
// supabase/tests/boarding-occupancy.sql proves the CONSTRAINT (K1–K8, one
// transaction, rolled back). It cannot prove the ROUTE passes the room along,
// maps the refusal to something a person can act on, or that the modal's
// `unitAssignment` reaches it at all — and that last one is the actual bug:
// every boarding row in this database has `details->>'unitAssignment'` = null,
// because the room was React state with no table to land in.
//
// ── WHY THIS FILE WRITES, AND HOW IT CLEANS UP ────────────────────────────
//
// It must write: a room conflict cannot be observed without a first booking to
// conflict with. Bookings are cancelled in afterAll, which also RELEASES the
// kennel — that is what `released_at` and the sync trigger are for, so the
// cleanup exercises the mechanism as well as tidying up.
//
// Cancelled rather than deleted because `bookings` has no delete policy, by
// design. That does mean cancelled rows accumulate; 79 of them from an earlier
// suite were cleared by hand on 2026-08-06. Keep the count here small.
// ============================================================================

/** Alice Johnson — the seeded client behind customer@yipyy.dev. */
const CUSTOMER_CLIENT_REF = 15;
const OWN_PET_REF = 1; // Buddy
/** Seeded into boarding_rooms for facility 11 by 20260806600000. */
const ROOM = "R-STD-01";
const OTHER_ROOM = "R-STD-02";

const MARKER = "[e2e boarding-occupancy]";

/** Far enough out that the seeded demo stays cannot collide with these. */
function nights(offsetDays: number, length = 2) {
  const start = new Date(Date.now() + offsetDays * 86_400_000);
  const end = new Date(start.getTime() + length * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function stayBody(overrides: Record<string, unknown> = {}) {
  return {
    clientId: CUSTOMER_CLIENT_REF,
    petId: OWN_PET_REF,
    facilityId: 11,
    service: "boarding",
    ...nights(60),
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "confirmed",
    basePrice: 100,
    discount: 0,
    totalCost: 100,
    paymentStatus: "pending",
    specialRequests: MARKER,
    unitAssignment: ROOM,
    ...overrides,
  };
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as {
      id: number;
      specialRequests?: string;
      status: string;
    }[];

    const mine = bookings.filter(
      (b) => b.specialRequests?.includes(MARKER) && b.status !== "cancelled",
    );

    let cancelled = 0;
    for (const b of mine) {
      const res = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
      else console.log(`cleanup: id ${b.id} -> ${res.status()}`);
    }
    console.log(`cleanup: ${cancelled}/${mine.length} stay(s) cancelled`);
  } finally {
    await page.close();
  }
});

test.describe("boarding occupancy", () => {
  // This used to assert only the 201, which passed WITH THE FIX DISABLED —
  // a created booking says nothing about whether its room was recorded.
  // Confirmed at the time by removing `p_boarding` from the route: this stayed
  // green while the double-booking test dropped from 409 to 201.
  //
  // Now that /api/boarding/rooms exists it can ask directly, so it does.
  test("a kennel assignment reaches the database", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const body = stayBody();
    const res = await page.request.post("/api/bookings", { data: body });
    expect(res.status(), await res.text()).toBe(201);

    const rooms = (await (
      await page.request.get(
        `/api/boarding/rooms?from=${body.startDate}&to=${body.endDate}`,
      )
    ).json()) as { occupied: { roomId: string }[] };

    expect(
      rooms.occupied.some((o) => o.roomId === ROOM),
      "the room reads occupied for the nights just booked",
    ).toBe(true);
  });

  test("the same kennel on the same nights is refused with a sentence", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = (await (await page.request.get("/api/bookings")).json()) as
      | unknown[]
      | null;

    const res = await page.request.post("/api/bookings", {
      data: stayBody(),
    });

    // 409, not 201 and not a 500 naming a constraint.
    expect(res.status()).toBe(409);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain("already booked");
    // The raw Postgres message would name `boarding_stay_no_double_booking`.
    expect(body.error).not.toContain("constraint");

    // And the refusal left nothing behind — the whole reason this is one RPC.
    const after = (await (await page.request.get("/api/bookings")).json()) as
      | unknown[]
      | null;
    expect((after ?? []).length).toBe((before ?? []).length);
  });

  test("another kennel on the same nights is fine", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // The positive control for the test above. Without it, a route that
    // refused every boarding booking would look exactly as correct.
    const res = await page.request.post("/api/bookings", {
      data: stayBody({ unitAssignment: OTHER_ROOM }),
    });
    expect(res.status(), await res.text()).toBe(201);
  });

  test("a room this facility does not have is refused as a bad request", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/bookings", {
      data: stayBody({ unitAssignment: "R-NOPE-99", ...nights(90) }),
    });

    // 422 — the room does not exist, which is a malformed request rather than
    // a conflict with another guest.
    expect(res.status()).toBe(422);
  });
});

// ============================================================================
// The read path: /api/boarding/rooms
//
// This is what lets the assignment board show the same rooms the constraint
// judges, and what gives the first test above something to assert directly
// rather than through a conflict.
// ============================================================================

interface RoomsPayload {
  rooms: {
    id: string;
    name: string;
    typeId: string;
    capacity: number;
    allowsShared: boolean;
    allowedPetTypes: string[];
    restrictions: string[];
  }[];
  occupied: {
    roomId: string;
    bookingRef: number;
    from: string;
    to: string;
    isOverride: boolean;
  }[];
}

test.describe("the kennel list comes from the facility", () => {
  test("the rooms are the seeded ones, in the shape the board expects", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.get("/api/boarding/rooms");
    expect(res.status()).toBe(200);
    const payload = (await res.json()) as RoomsPayload;

    // Six, not the fixture's `boardingCapacity.total` of 30 — the number that
    // matched no room list and was rendered as "X of 30 kennels occupied".
    expect(payload.rooms.length).toBe(6);

    const std = payload.rooms.find((r) => r.id === "R-STD-01");
    expect(std, "R-STD-01 is on the list").toBeTruthy();
    expect(std?.typeId).toBe("standard");
    expect(std?.capacity).toBe(1);
    expect(std?.allowsShared).toBe(false);
    expect(std?.allowedPetTypes).toEqual(["dog"]);

    // The Deluxe rooms are the only ones that may hold more than one pet, and
    // the constraint that says so lives in the database.
    const dlx = payload.rooms.find((r) => r.id === "R-DLX-01");
    expect(dlx?.capacity).toBe(2);
    expect(dlx?.allowsShared).toBe(true);
  });

  test("occupancy is derived from the stays, per window", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const when = nights(120);
    const created = await page.request.post("/api/bookings", {
      data: stayBody({ ...when, unitAssignment: "R-VIP-01" }),
    });
    expect(created.status(), await created.text()).toBe(201);

    // The window the stay covers: the kennel reads occupied.
    const during = (await (
      await page.request.get(
        `/api/boarding/rooms?from=${when.startDate}&to=${when.endDate}`,
      )
    ).json()) as RoomsPayload;
    const held = during.occupied.find((o) => o.roomId === "R-VIP-01");
    expect(held, "the VIP suite reads occupied for its own dates").toBeTruthy();
    expect(held?.isOverride).toBe(false);

    // A window nowhere near it: free. This is the assertion that would fail if
    // the route ignored the dates and returned every stay it could see.
    const elsewhere = nights(300);
    const after = (await (
      await page.request.get(
        `/api/boarding/rooms?from=${elsewhere.startDate}&to=${elsewhere.endDate}`,
      )
    ).json()) as RoomsPayload;
    expect(after.occupied.some((o) => o.roomId === "R-VIP-01")).toBe(false);
  });

  test("the boarding page counts the kennels it actually has", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/services/boarding");

    // Six seeded rooms. The old card read "X of 30 kennels occupied" from
    // `boardingCapacity.total` — a number no room list produced.
    await expect(page.getByText(/of 6 kennels occupied/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/of 30 kennels occupied/i)).toHaveCount(0);

    // Per-type tiles come from the room types that exist. "Premium" and
    // "Luxury" were hardcoded headings for types no room had.
    await expect(page.getByText(/cat suite \//i)).toBeVisible();
    await expect(page.getByText(/premium \//i)).toHaveCount(0);
  });

  // ── Moving a guest, over HTTP ────────────────────────────────────────────
  //
  // supabase/tests/boarding-occupancy.sql covers the RPC (A1–A4). This checks
  // the route around it: the status codes, and that `roomId: null` really does
  // free the kennel rather than merely answering 200.
  test("a guest can be placed, moved and cleared", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const when = nights(150);
    const created = await page.request.post("/api/bookings", {
      data: stayBody({ ...when, unitAssignment: undefined }),
    });
    expect(created.status(), await created.text()).toBe(201);
    const booking = (await created.json()) as { id: number };

    const occupiedIn = async () => {
      const payload = (await (
        await page.request.get(
          `/api/boarding/rooms?from=${when.startDate}&to=${when.endDate}`,
        )
      ).json()) as RoomsPayload;
      return payload.occupied.map((o) => o.roomId);
    };

    // Created with no room, so nothing is held yet.
    expect(await occupiedIn()).not.toContain(ROOM);

    const placed = await page.request.put("/api/boarding/stays", {
      data: { bookingRef: booking.id, roomId: ROOM },
    });
    expect(placed.status(), await placed.text()).toBe(200);
    expect(await occupiedIn()).toContain(ROOM);

    const moved = await page.request.put("/api/boarding/stays", {
      data: { bookingRef: booking.id, roomId: OTHER_ROOM },
    });
    expect(moved.status()).toBe(200);
    const afterMove = await occupiedIn();
    expect(afterMove).toContain(OTHER_ROOM);
    // The kennel they left is free again — the assertion that would fail if
    // the move inserted a second stay instead of updating the one.
    expect(afterMove).not.toContain(ROOM);

    const cleared = await page.request.put("/api/boarding/stays", {
      data: { bookingRef: booking.id, roomId: null },
    });
    expect(cleared.status()).toBe(200);
    expect(await occupiedIn()).not.toContain(OTHER_ROOM);
  });

  test("moving a guest into a taken kennel is a 409, and they keep theirs", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const when = nights(180);
    const first = await page.request.post("/api/bookings", {
      data: stayBody({ ...when, unitAssignment: ROOM }),
    });
    expect(first.status()).toBe(201);

    const second = await page.request.post("/api/bookings", {
      data: stayBody({ ...when, unitAssignment: OTHER_ROOM }),
    });
    expect(second.status()).toBe(201);
    const mover = (await second.json()) as { id: number };

    const res = await page.request.put("/api/boarding/stays", {
      data: { bookingRef: mover.id, roomId: ROOM },
    });
    expect(res.status()).toBe(409);
    expect(((await res.json()) as { error?: string }).error).toContain(
      "already taken",
    );

    // Still in the room they had. A failed move must not also evict them.
    const payload = (await (
      await page.request.get(
        `/api/boarding/rooms?from=${when.startDate}&to=${when.endDate}`,
      )
    ).json()) as RoomsPayload;
    expect(payload.occupied.map((o) => o.roomId)).toContain(OTHER_ROOM);
  });

  test("a body with no room at all is a 422, not a silent clear", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // `undefined` and `null` mean different things: missing is a malformed
    // request, null is "clear the assignment". Sending nothing must not be
    // read as the second.
    const res = await page.request.put("/api/boarding/stays", {
      data: { bookingRef: 1 },
    });
    expect(res.status()).toBe(422);
  });

  test("signed out gets 401, not an empty room list", async ({ browser }) => {
    // A fresh context: an empty list would read as "this facility has no
    // kennels" rather than "you are not signed in".
    const anon = await browser.newContext();
    const page = await anon.newPage();
    try {
      const res = await page.request.get("/api/boarding/rooms");
      expect(res.status()).toBe(401);
    } finally {
      await anon.close();
    }
  });
});
