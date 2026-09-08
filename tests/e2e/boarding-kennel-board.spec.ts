import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The Kennels board shows a booked guest, and moving one reaches the database.
//
// ── WHAT WAS MISSING FOR FOUR CHANGES ─────────────────────────────────────
//
// `PUT /api/boarding/stays` and `assign_boarding_room` were built, tested end
// to end, and had NO CALLER. boarding-occupancy.spec.ts drives the endpoint
// directly; nothing in the app could. The only assignment surface operated on
// pre-booking requests, so a kennel was chosen once at booking time and could
// never be changed from a screen.
//
// So this suite asserts the two things that file cannot: the guest is NAMED on
// a board (which needed the occupancy read to carry who, not just which
// booking), and a move made from the app lands in the ledger.
//
// ── IT CLEANS UP THROUGH THE REAL MECHANISM ───────────────────────────────
//
// `roomId: null` deletes the stay. Cancelling only RELEASES it and leaves the
// row — the trap rooms-admin.spec.ts fell into.
// ============================================================================

const MARKER = "[e2e kennel-board]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
}

interface RoomsPayload {
  rooms: { id: string; name: string; active: boolean; categoryId: string }[];
  occupied: {
    roomId: string;
    bookingRef: number;
    petNames: string[];
    clientName: string;
    petType: string;
  }[];
}

/** A boarding booking covering today, so the board's "today" window sees it. */
function bookingBody(roomId: string) {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 2);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "boarding",
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "checked_in",
    basePrice: 180,
    discount: 0,
    totalCost: 180,
    specialRequests: MARKER,
    unitAssignment: roomId,
  };
}

/**
 * The board.
 *
 * `window` asks the endpoint about a span of DATES rather than about this
 * instant, which is what any question about moving a multi-day stay actually
 * needs. Its own comment: "Default window is 'right now' … A booking flow asks
 * about its own dates."
 *
 * Left optional because the rendering tests genuinely do mean "now" — that is
 * what the board shows — and only the move needs the stay's span.
 */
async function rooms(
  page: import("@playwright/test").Page,
  window?: { startDate: string; endDate: string },
): Promise<RoomsPayload> {
  const query = window ? `?from=${window.startDate}&to=${window.endDate}` : "";
  const res = await page.request.get(`/api/boarding/rooms${query}`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as RoomsPayload;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];

    let cleared = 0;
    let cancelled = 0;
    for (const b of all) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      // Dealt with on a previous run — clearing a stay that is already gone
      // still succeeds, so without this the counts below grow every run and
      // stop describing anything.
      if (b.status === "cancelled") continue;

      // The stay first: cancelling only releases it, and a released row still
      // holds the kennel against a re-run.
      const clear = await page.request.put("/api/boarding/stays", {
        data: { bookingRef: b.id, roomId: null },
      });
      if (clear.ok()) cleared++;
      const cancel = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (cancel.ok()) cancelled++;
    }
    console.log(`cleanup: ${cleared} stay(s) cleared, ${cancelled} cancelled`);
  } finally {
    await page.close();
  }
});

test.describe("the kennels board", () => {
  test.slow(); // the ops page compiles on first hit

  test("a booked guest is named on the board, not just their booking", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The window, for the same reason as the move below: this books four days
    // and an unqualified read only answers for today.
    const board = await rooms(page, bookingBody(""));
    const free = board.rooms.find(
      (r) =>
        r.active &&
        !r.id.includes("e2e") &&
        !board.occupied.some((o) => o.roomId === r.id),
    );
    expect(free, "a kennel free for the whole stay").toBeTruthy();

    const res = await page.request.post("/api/bookings", {
      data: bookingBody(free!.id),
    });
    expect(res.status(), await res.text()).toBe(201);
    const created = (await res.json()) as BookingPayload;

    // The occupancy read had to learn WHO. Before this change it carried
    // `{roomId, bookingRef, from, to, isOverride}` — enough to grey out a
    // square, not enough to draw a board an operator can use.
    const entry = (await rooms(page)).occupied.find(
      (o) => o.bookingRef === created.id,
    );
    expect(entry, "the stay is in the occupancy read").toBeTruthy();
    expect(entry!.petNames.length, "the guest has a name").toBeGreaterThan(0);
    expect(entry!.clientName, "and an owner").not.toBe("");

    await page.goto("/facility/dashboard/services/boarding/ops");
    await page.getByRole("tab", { name: /kennels/i }).click();

    // The pet's name, on screen, in the kennel it is in.
    await expect(
      page.getByText(entry!.petNames[0], { exact: false }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(`#${created.id}`).first()).toBeVisible();
  });

  test("moving a guest from the board reaches the database", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // ── ASK ABOUT THE DATES, NOT ABOUT THIS INSTANT ───────────────────────
    //
    // An unqualified read answers "who is in a kennel right now", which is the
    // right question for the board and the wrong one for a stay that runs four
    // days. A kennel empty at this moment can have somebody arriving tomorrow,
    // and the write is refused with "already taken for these dates".
    const stayWindow = bookingBody("");
    const board = await rooms(page, stayWindow);

    const [origin, target] = board.rooms.filter(
      (r) =>
        r.active &&
        !r.id.includes("e2e") &&
        !board.occupied.some((o) => o.roomId === r.id),
    );
    expect(
      origin && target,
      "two kennels free for the whole stay",
    ).toBeTruthy();

    // Its OWN guest. This used to take `occupied.find(o => o.petNames.length)`
    // — the first dog on the board — and the board is production, so every run
    // reassigned a real customer's kennel and left it reassigned.
    const res = await page.request.post("/api/bookings", {
      data: bookingBody(origin!.id),
    });
    expect(res.status(), await res.text()).toBe(201);
    const created = (await res.json()) as BookingPayload;

    const mine = (await rooms(page)).occupied.find(
      (o) => o.bookingRef === created.id,
    );
    expect(mine, "the stay is on the board before it is moved").toBeTruthy();

    // The board drags; this drives the same mutation the drag calls. The drag
    // itself is HTML5 dataTransfer, which Playwright cannot synthesise
    // reliably — so the assertion is on the WRITE, and the previous test is
    // what proves the board renders the guest.
    const moved = await page.request.put("/api/boarding/stays", {
      data: { bookingRef: mine!.bookingRef, roomId: target!.id },
    });
    expect(moved.ok(), await moved.text()).toBe(true);

    const after = await rooms(page);
    const now = after.occupied.find((o) => o.bookingRef === mine!.bookingRef);
    expect(now?.roomId, "the guest is in the new kennel").toBe(target!.id);
    expect(
      after.occupied.some(
        (o) => o.roomId === mine!.roomId && o.bookingRef === mine!.bookingRef,
      ),
      "and not in the old one",
    ).toBe(false);
  });

  test("a kennel that is already taken is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = await rooms(page);
    const mine = before.occupied.find((o) => o.petNames.length > 0);
    expect(mine).toBeTruthy();

    const free = before.rooms.find(
      (r) =>
        r.active &&
        r.id !== mine!.roomId &&
        !before.occupied.some((o) => o.roomId === r.id),
    );
    expect(free, "a free kennel for the second guest").toBeTruthy();

    // A second guest, overlapping the same nights.
    const other = (await (
      await page.request.post("/api/bookings", {
        data: bookingBody(free!.id),
      })
    ).json()) as BookingPayload;

    // Now try to put the second one where the first already is. The board
    // greys this out; the exclusion constraint is what actually refuses it.
    const clash = await page.request.put("/api/boarding/stays", {
      data: { bookingRef: other.id, roomId: mine!.roomId },
    });
    expect(clash.status(), "the constraint, surfaced as a 409").toBe(409);

    const after = await rooms(page);
    expect(
      after.occupied.find((o) => o.bookingRef === other.id)?.roomId,
      "the second guest keeps the kennel they had",
    ).toBe(free!.id);
    expect(
      after.occupied.find((o) => o.bookingRef === mine!.bookingRef)?.roomId,
      "and the first is undisturbed",
    ).toBe(mine!.roomId);
  });
});
