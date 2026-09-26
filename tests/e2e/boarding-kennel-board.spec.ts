import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";

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

    // Narrowed and guarded, for the reason spelled out in
    // boarding-arrival.spec.ts's own teardown: the unbounded read times out
    // at this table's size, the cast turns `{error}` into "all is not
    // iterable", and the kennels stay held for whatever runs next.
    // Asked of the DATABASE by marker (`bookingsMarked`, the service role's
    // way in), not read out of a booking list: guarded, the list read still
    // timed out under load and cleaned nothing (debt map, 2026-09-25).
    const all = (await bookingsMarked(MARKER)).map((b) => ({
      id: b.ref,
      status: b.status,
      specialRequests: MARKER,
      amountPaid: b.amountPaid,
    }));

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

    // The kennel board is the whole page since 2026-09-14 — its Requests and
    // Eligibility tabs read fixtures and were removed — so there is no tab.
    await page.goto("/facility/dashboard/services/boarding/ops");

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

// ============================================================================
// A GUEST WHO MOVES KENNELS PART-WAY (split lodging).
//
// Moving a guest used to move the whole BOOKING: every night was rewritten to
// the new kennel, the ones already slept included, so a kennel somebody else
// had used earlier in the week refused a guest being moved into it today.
// `POST /api/boarding/stays/move` moves them from a night on, and the nights
// before stay where they were.
//
// M2 is the positive control for the kennel left behind: if the old stay kept
// its whole range, the second guest below would be refused a kennel that is
// empty from the move on.
// ============================================================================

interface StaysPayload {
  stays: { segment: number; roomId: string | null; roomName: string | null }[];
}

async function staysOf(page: import("@playwright/test").Page, ref: number) {
  const res = await page.request.get(`/api/boarding/stays?bookingRef=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as StaysPayload).stays;
}

/** Today in this machine's calendar, which is the one the board uses. */
function localToday(): string {
  return dayFromToday(0);
}

/** A day in this machine's calendar, `offset` days from today. */
function dayFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

test.describe("a guest who moves kennels part-way", () => {
  test.slow();

  let bookingRef = 0;
  let origin = { id: "", name: "" };
  let target = { id: "", name: "" };
  let third = { id: "", name: "" };

  test("M1 a move from tonight keeps the nights already slept", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const board = await rooms(page, bookingBody(""));
    const free = board.rooms.filter(
      (r) =>
        r.active &&
        !r.id.includes("e2e") &&
        !board.occupied.some((o) => o.roomId === r.id),
    );
    expect(
      free.length,
      "three kennels free for the whole stay",
    ).toBeGreaterThanOrEqual(3);
    [origin, target, third] = free;

    const res = await page.request.post("/api/bookings", {
      data: bookingBody(origin.id),
    });
    expect(res.status(), await res.text()).toBe(201);
    bookingRef = ((await res.json()) as BookingPayload).id;

    const moved = await page.request.post("/api/boarding/stays/move", {
      data: { bookingRef, from: localToday(), roomId: target.id },
    });
    expect(moved.ok(), await moved.text()).toBe(true);

    const stays = await staysOf(page, bookingRef);
    expect(
      stays.map((s) => s.roomId),
      "the old kennel first, then the new one",
    ).toEqual([origin.id, target.id]);
  });

  test("M2 the kennel left behind is free from the move", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    expect(bookingRef, "M1 moved a guest").toBeGreaterThan(0);

    const today = localToday();
    const later = new Date(`${today}T12:00:00`);
    later.setDate(later.getDate() + 2);
    const res = await page.request.post("/api/bookings", {
      data: {
        ...bookingBody(origin.id),
        startDate: today,
        endDate: later.toISOString().slice(0, 10),
        status: "confirmed",
      },
    });
    expect(
      res.status(),
      `a guest arriving the day of the move gets the old kennel: ${await res.text()}`,
    ).toBe(201);
  });

  test("M3 the booking page lists both kennels and makes a move", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    expect(bookingRef, "M1 moved a guest").toBeGreaterThan(0);

    await page.goto(
      `/facility/dashboard/clients/${CLIENT_REF}/bookings/${bookingRef}`,
    );
    const card = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText(/^kennels$/i) });
    await expect(card.getByText(origin.name)).toBeVisible({ timeout: 60_000 });
    await expect(card.getByText(target.name)).toBeVisible();

    await card.getByRole("button", { name: /^move /i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("New kennel", { exact: true }).click();
    // "Kennel 3 · Suites": the name, then its type — and "Kennel 3" must not
    // pick "Kennel 30", so the name is matched whole.
    const escaped = third.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await page
      .getByRole("option", { name: new RegExp(`^${escaped}( ·|$)`) })
      .click();
    await dialog.getByRole("button", { name: /^move /i }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    await expect
      .poll(
        async () => (await staysOf(page, bookingRef)).map((s) => s.roomId),
        {
          timeout: 30_000,
          message: "the move is in the database",
        },
      )
      .toEqual([origin.id, third.id]);
    await expect(card.getByText(third.name)).toBeVisible();
  });

  test("M4 one kennel for the whole booking merges it back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    expect(bookingRef, "M1 moved a guest").toBeGreaterThan(0);

    const merged = await page.request.put("/api/boarding/stays", {
      data: { bookingRef, roomId: target.id },
    });
    expect(merged.ok(), await merged.text()).toBe(true);
    expect((await staysOf(page, bookingRef)).map((s) => s.roomId)).toEqual([
      target.id,
    ]);
  });

  // ── PLANNED WITH THE BOOKING, AND AN EARLY CHECK-OUT ────────────────────
  //
  // M5–M6: a booking can be MADE across two kennels, all or nothing — a taken
  // later kennel refuses the booking itself. M7: leaving before a planned
  // move used to be refused ("change the move first"); the kennel booked for
  // later now lets go.

  /** Kennels free across a window, clear of today's board. */
  async function freeFor(
    page: import("@playwright/test").Page,
    window: { startDate: string; endDate: string },
  ) {
    const board = await rooms(page, window);
    return board.rooms.filter(
      (r) =>
        r.active &&
        !r.id.includes("e2e") &&
        !board.occupied.some((o) => o.roomId === r.id),
    );
  }

  test("M5 a booking made with its kennel change holds both kennels", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const window = { startDate: dayFromToday(30), endDate: dayFromToday(34) };
    const [first, second] = await freeFor(page, window);
    expect(first && second, "two kennels free").toBeTruthy();

    const res = await page.request.post("/api/bookings", {
      data: {
        ...bookingBody(first!.id),
        ...window,
        status: "confirmed",
        kennelMoves: [{ from: dayFromToday(32), roomId: second!.id }],
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const ref = ((await res.json()) as BookingPayload).id;
    expect((await staysOf(page, ref)).map((s) => s.roomId)).toEqual([
      first!.id,
      second!.id,
    ]);
  });

  test("M6 a later kennel already taken refuses the booking itself", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const window = { startDate: dayFromToday(40), endDate: dayFromToday(44) };
    const [first, second] = await freeFor(page, window);
    expect(first && second, "two kennels free").toBeTruthy();

    const blocker = await page.request.post("/api/bookings", {
      data: {
        ...bookingBody(second!.id),
        startDate: dayFromToday(42),
        endDate: dayFromToday(43),
        status: "confirmed",
      },
    });
    expect(blocker.status(), await blocker.text()).toBe(201);

    const refusedMarker = `${MARKER} refused-M6`;
    const res = await page.request.post("/api/bookings", {
      data: {
        ...bookingBody(first!.id),
        ...window,
        status: "confirmed",
        specialRequests: refusedMarker,
        kennelMoves: [{ from: dayFromToday(42), roomId: second!.id }],
      },
    });
    expect(res.status(), await res.text()).toBe(409);
    expect(
      await bookingsMarked(refusedMarker),
      "nothing of the refused booking was left behind",
    ).toEqual([]);
  });

  test("M7 an early check-out before the move lets the later kennel go", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const window = bookingBody("");
    const [first, second] = await freeFor(page, window);
    expect(first && second, "two kennels free").toBeTruthy();

    const res = await page.request.post("/api/bookings", {
      data: {
        ...bookingBody(first!.id),
        kennelMoves: [{ from: dayFromToday(1), roomId: second!.id }],
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const ref = ((await res.json()) as BookingPayload).id;
    expect((await staysOf(page, ref)).length).toBe(2);

    // What the booking page's early check-out writes first: the stay ends
    // the day the guest left.
    const shortened = await page.request.patch(`/api/bookings/${ref}`, {
      data: { endDate: localToday() },
    });
    expect(shortened.ok(), await shortened.text()).toBe(true);
    expect((await staysOf(page, ref)).map((s) => s.roomId)).toEqual([
      first!.id,
    ]);
  });
});
