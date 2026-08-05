import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The boarding check-in board, which used to be the daycare one.
//
// ── WHAT THE SCREEN WAS ───────────────────────────────────────────────────
//
// /services/boarding/check-in rendered <DaycareCheckInOutSection />. Once that
// board became real (20260806880000) it began posting to
// /api/daycare/attendance, which refuses a boarding booking with a 422 — so the
// boarding check-in page could not check anybody in at all. Before that it
// "worked" by moving a daycare fixture object around in local state.
//
// ── WHAT THIS SUITE IS FOR ────────────────────────────────────────────────
//
// Two rules the fixture had no way to express, and one it got backwards:
//
//   * A guest with no kennel cannot be checked in. There is no stay row to
//     stamp, and the refusal names the screen that fixes it.
//   * Undo runs backwards: "never arrived" is not one press from "collected".
//   * Reverting an arrival KEEPS the kennel. The daycare revert deletes its
//     row; this one must not, because this row is the room assignment.
//
// ── IT CLEANS UP THROUGH THE REAL MECHANISM ───────────────────────────────
//
// The stay first (`roomId: null` deletes it), then cancel. Cancelling only
// RELEASES a stay and leaves the row holding its kennel against a re-run.
// ============================================================================

const MARKER = "[e2e boarding-arrival]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
}

interface Guest {
  id: string;
  petNames: string[];
  ownerName: string;
  roomId: string | null;
  roomName: string | null;
  status: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  isOverdue: boolean;
  nights: number;
}

interface DayPayload {
  date: string;
  guests: Guest[];
}

interface RoomsPayload {
  rooms: { id: string; name: string; active: boolean }[];
  occupied: { roomId: string; bookingRef: number }[];
}

/** A boarding booking covering today, so the board's window sees it. */
function bookingBody(roomId?: string) {
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
    status: "confirmed",
    basePrice: 180,
    discount: 0,
    totalCost: 180,
    specialRequests: MARKER,
    ...(roomId ? { unitAssignment: roomId } : {}),
  };
}

/**
 * A booking, or a failure that says so.
 *
 * Every creation here is asserted. Taking `.json()` off an unchecked response
 * gives `{error: ...}` typed as a booking, and the undefined `id` that follows
 * produced a 422 from a completely different rule than the one under test.
 */
async function createBooking(
  page: import("@playwright/test").Page,
  body: Record<string, unknown>,
): Promise<BookingPayload> {
  const res = await page.request.post("/api/bookings", { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as BookingPayload;
}

async function day(page: import("@playwright/test").Page): Promise<DayPayload> {
  const res = await page.request.get("/api/boarding/attendance");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as DayPayload;
}

async function freeRoom(
  page: import("@playwright/test").Page,
): Promise<string> {
  const res = await page.request.get("/api/boarding/rooms");
  expect(res.ok(), await res.text()).toBe(true);
  const payload = (await res.json()) as RoomsPayload;
  const room = payload.rooms.find(
    (r) =>
      r.active &&
      !r.id.includes("e2e") &&
      !payload.occupied.some((o) => o.roomId === r.id),
  );
  expect(room, "a free kennel").toBeTruthy();
  return room!.id;
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
      if (b.status === "cancelled") continue;
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

test.describe("the boarding arrivals board", () => {
  test.slow();

  test("a guest with no kennel cannot be checked in, and is told where to go", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Booked, no kennel — a real state: 20260806600000 decided an unassigned
    // boarding booking has no stay row at all.
    const created = await createBooking(page, bookingBody());

    const guest = (await day(page)).guests.find(
      (g) => g.id === String(created.id),
    );
    expect(guest, "the booking is on today's board").toBeTruthy();
    expect(guest!.status).toBe("scheduled");
    expect(guest!.roomId, "and has no kennel").toBeNull();

    const res = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: created.id },
    });
    // A conflict, not a permissions problem: the state is wrong, and it is
    // fixable one screen away.
    expect(res.status(), await res.text()).toBe(409);
    expect(((await res.json()) as { error?: string }).error).toContain(
      "no kennel",
    );

    const after = (await day(page)).guests.find(
      (g) => g.id === String(created.id),
    );
    expect(after!.status, "still only booked").toBe("scheduled");
  });

  test("with a kennel it checks in, and twice does not move the time", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const room = await freeRoom(page);
    const created = await createBooking(page, bookingBody(room));

    const first = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: created.id },
    });
    expect(first.status(), await first.text()).toBe(201);

    const arrived = (await day(page)).guests.find(
      (g) => g.id === String(created.id),
    );
    expect(arrived!.status).toBe("checked-in");
    expect(arrived!.checkedInAt).not.toBeNull();
    expect(arrived!.roomName, "the kennel comes back named").not.toBeNull();
    const at = arrived!.checkedInAt;

    // Somebody making sure, not the guest arriving again.
    const second = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: created.id },
    });
    expect(second.status(), await second.text()).toBe(201);
    const again = (await day(page)).guests.find(
      (g) => g.id === String(created.id),
    );
    expect(again!.checkedInAt, "the arrival time did not move").toBe(at);
  });

  test("checking out stamps a time, and undo runs backwards", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const present = (await day(page)).guests.find(
      (g) => g.status === "checked-in",
    );
    expect(present, "a guest on site").toBeTruthy();

    const out = await page.request.patch(
      `/api/boarding/attendance/${present!.id}`,
      { data: { checkOut: true } },
    );
    expect(out.status(), await out.text()).toBe(204);

    const gone = (await day(page)).guests.find((g) => g.id === present!.id);
    expect(gone!.status).toBe("checked-out");
    expect(gone!.checkedOutAt).not.toBeNull();

    // "Never arrived" is not one press away from "collected": that would erase
    // a departure and an arrival together, on nights the kennel was occupied.
    const tooFar = await page.request.delete(
      `/api/boarding/attendance/${present!.id}`,
    );
    expect(tooFar.status(), "refused, in words").toBe(422);
    expect(((await tooFar.json()) as { error?: string }).error).toContain(
      "Reopen",
    );

    // Reopen, then revert. That order is allowed.
    const reopened = await page.request.patch(
      `/api/boarding/attendance/${present!.id}`,
      { data: { reopen: true } },
    );
    expect(reopened.status()).toBe(204);
    const back = (await day(page)).guests.find((g) => g.id === present!.id);
    expect(back!.status).toBe("checked-in");
    expect(back!.checkedOutAt).toBeNull();
  });

  test("reverting an arrival keeps the kennel, unlike the daycare revert", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const present = (await day(page)).guests.find(
      (g) => g.status === "checked-in",
    );
    expect(present, "a guest on site").toBeTruthy();
    const heldKennel = present!.roomId;
    expect(heldKennel).not.toBeNull();

    const reverted = await page.request.delete(
      `/api/boarding/attendance/${present!.id}`,
    );
    expect(reverted.status(), await reverted.text()).toBe(204);

    const after = (await day(page)).guests.find((g) => g.id === present!.id);
    expect(after!.status, "back to booked").toBe("scheduled");
    expect(after!.checkedInAt).toBeNull();
    // The daycare revert DELETES its row. This row is the room assignment, so
    // deleting it would give the kennel away as a side effect of fixing a
    // mistyped arrival.
    expect(after!.roomId, "and the kennel is still theirs").toBe(heldKennel);
  });

  test("a daycare booking is not a boarding arrival", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const today = new Date().toISOString().slice(0, 10);
    // The times matter: the boarding body checks out at 11:00 the next morning,
    // and reusing that on a single day would end the booking before it starts
    // (`bookings_ends_after_start`). The first version of this test did exactly
    // that, and the 422 it asserted came from the creation failing rather than
    // from the rule under test.
    const daycare = await createBooking(page, {
      ...bookingBody(),
      service: "daycare",
      startDate: today,
      endDate: today,
      checkInTime: "08:00",
      checkOutTime: "17:00",
    });

    const res = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: daycare.id },
    });
    expect(res.status()).toBe(422);
    expect(((await res.json()) as { error?: string }).error).toContain(
      "not a boarding booking",
    );
  });

  test("the board survives a reload, which the fixture could not", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const room = await freeRoom(page);
    const created = await createBooking(page, bookingBody(room));

    await page.goto("/facility/dashboard/services/boarding/check-in");
    await expect(
      page.getByRole("heading", { name: /boarding check-in/i }),
      "the boarding board, not the daycare one",
    ).toBeVisible({ timeout: 60_000 });

    const guest = (await day(page)).guests.find(
      (g) => g.id === String(created.id),
    );
    await expect(
      page.getByText(guest!.petNames[0], { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 });

    const res = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: created.id },
    });
    expect(res.status(), await res.text()).toBe(201);

    await page.reload();
    await expect
      .poll(
        async () =>
          (await day(page)).guests.find((g) => g.id === String(created.id))
            ?.status,
        { timeout: 20_000, message: "the arrival outlives the tab" },
      )
      .toBe("checked-in");
    await expect(
      page.getByText(guest!.petNames[0], { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a guest past their departure is surfaced, not quietly dropped", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const room = await freeRoom(page);
    // Booked out YESTERDAY: this booking overlaps neither today's arrivals nor
    // today's departures. The fixture board could never reach this state — its
    // dates were static, so nothing ever became late.
    const start = new Date();
    start.setDate(start.getDate() - 4);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    const created = await createBooking(page, {
      ...bookingBody(room),
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });

    const checkedIn = await page.request.post("/api/boarding/attendance", {
      data: { bookingRef: created.id },
    });
    expect(checkedIn.status(), await checkedIn.text()).toBe(201);

    const guest = (await day(page)).guests.find(
      (g) => g.id === String(created.id),
    );
    expect(
      guest,
      "still on the board although the dates have passed",
    ).toBeTruthy();
    expect(guest!.status).toBe("checked-in");
    expect(guest!.isOverdue, "and flagged as overdue").toBe(true);

    await page.goto("/facility/dashboard/services/boarding/check-in");
    await expect(
      page.getByText(/still on site past their booked departure/i),
    ).toBeVisible({ timeout: 60_000 });
  });
});
