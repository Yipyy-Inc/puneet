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
  // A PRECONDITION, NOT A PROOF, and the difference is worth stating because
  // this test passes whether or not the room was recorded.
  //
  // Confirmed by removing `p_boarding` from the route and re-running: this
  // still went green on its 201 while the double-booking test dropped to 201
  // as well. There is no boarding read endpoint yet, so the only
  // HTTP-observable evidence that the kennel was stored is the CONFLICT the
  // next test provokes. That test is the assertion; this one just puts a guest
  // in the room.
  test("a stay can be created with a kennel", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/bookings", {
      data: stayBody(),
    });
    expect(res.status(), await res.text()).toBe(201);
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
