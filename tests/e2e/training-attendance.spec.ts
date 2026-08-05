import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Training joins the building.
//
// ── WHAT WAS THERE ────────────────────────────────────────────────────────
//
// `/services/training/check-in` renders `ServiceCheckInBoard`, which reads
// `useUnifiedBookings`, which built its training rows from `trainingSessions`
// and `enrollments` — two module arrays fanned out into one row per attendee
// with a composite id (`sess-3:enr-12`) that referred to nothing in the
// database. Checking a dog in flipped a status in `useState` and was gone when
// the tab closed.
//
// `booking_presence` reported every training booking as `unknown` for the same
// reason: there was no table to ask.
//
// ── WHAT THIS SUITE CHECKS ────────────────────────────────────────────────
//
//   * the arrival outlives the tab, which `useState` never could;
//   * presence moves and the booking's LIFECYCLE does not;
//   * reverting deletes the record, as daycare does and boarding does not;
//   * a daycare booking cannot be checked in to training.
// ============================================================================

const MARKER = "[e2e training-attendance]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
  presence?: string;
}

interface Attendee {
  id: string;
  petName: string;
  ownerName: string;
  status: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  trainerName: string | null;
}

function bookingBody(service = "training") {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service,
    startDate: today,
    endDate: today,
    checkInTime: "17:00",
    checkOutTime: "18:00",
    status: "confirmed",
    basePrice: 60,
    discount: 0,
    totalCost: 60,
    specialRequests: MARKER,
  };
}

async function day(page: import("@playwright/test").Page): Promise<Attendee[]> {
  const res = await page.request.get("/api/training/attendance");
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { attendees: Attendee[] }).attendees;
}

async function createBooking(
  page: import("@playwright/test").Page,
  body: Record<string, unknown>,
): Promise<BookingPayload> {
  const res = await page.request.post("/api/bookings", { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as BookingPayload;
}

async function readBooking(
  page: import("@playwright/test").Page,
  ref: number,
): Promise<BookingPayload | undefined> {
  const all = (await (
    await page.request.get("/api/bookings")
  ).json()) as BookingPayload[];
  return all.find((b) => b.id === ref);
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    let cancelled = 0;
    for (const b of all) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled") continue;
      // The check-in first. Cancelling alone leaves the attendance row standing
      // and the dog reads "on-site" for ever — `booking_presence` found nine of
      // those left behind by the daycare suite before this pattern was fixed.
      await page.request.delete(`/api/training/attendance/${b.id}`);
      const res = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
    }
    console.log(`cleanup: ${cancelled} booking(s) cancelled`);
  } finally {
    await page.close();
  }
});

test.describe("training attendance", () => {
  test.slow();

  test("a booked session is on the day, and nobody has arrived", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await createBooking(page, bookingBody());
    const attendee = (await day(page)).find((a) => a.id === String(created.id));
    expect(attendee, "the booking is on today's sessions").toBeTruthy();
    expect(attendee!.status).toBe("scheduled");
    expect(attendee!.checkedInAt).toBeNull();
    // Through the join, not a copy taken at check-in.
    expect(attendee!.petName).not.toBe("");
    expect(attendee!.ownerName).not.toBe("");
  });

  test("checking in survives a reload, and twice does not move the time", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const scheduled = (await day(page)).find((a) => a.status === "scheduled");
    expect(scheduled, "a scheduled session").toBeTruthy();

    const first = await page.request.post("/api/training/attendance", {
      data: { bookingRef: Number(scheduled!.id) },
    });
    expect(first.status(), await first.text()).toBe(201);

    const arrived = (await day(page)).find((a) => a.id === scheduled!.id);
    expect(arrived!.status).toBe("checked-in");
    const at = arrived!.checkedInAt;
    expect(at).not.toBeNull();

    // Somebody making sure, not the dog arriving twice.
    const second = await page.request.post("/api/training/attendance", {
      data: { bookingRef: Number(scheduled!.id) },
    });
    expect(second.status(), await second.text()).toBe(201);
    expect(
      (await day(page)).find((a) => a.id === scheduled!.id)?.checkedInAt,
      "the arrival time did not move",
    ).toBe(at);

    // The whole point: the old board held this in `useState` over a module
    // array, so a reload put every dog back where the fixture said it was.
    await page.goto("/facility/dashboard/services/training/check-in");
    await page.reload();
    await expect
      .poll(
        async () =>
          (await day(page)).find((a) => a.id === scheduled!.id)?.status,
        { timeout: 20_000, message: "the arrival outlives the tab" },
      )
      .toBe("checked-in");
  });

  test("presence moves and the lifecycle does not", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const present = (await day(page)).find((a) => a.status === "checked-in");
    expect(present, "a dog in the class").toBeTruthy();

    // Training used to read `unknown` on every booking list — there was no
    // table to ask.
    const booking = await readBooking(page, Number(present!.id));
    expect(booking?.presence).toBe("on-site");
    expect(booking?.status, "the booking's own lifecycle is untouched").toBe(
      "confirmed",
    );
  });

  test("checking out stamps a time, and reopening clears it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const present = (await day(page)).find((a) => a.status === "checked-in");
    expect(present).toBeTruthy();

    const out = await page.request.patch(
      `/api/training/attendance/${present!.id}`,
      { data: { checkOut: true } },
    );
    expect(out.status(), await out.text()).toBe(204);

    const gone = (await day(page)).find((a) => a.id === present!.id);
    expect(gone!.status).toBe("checked-out");
    expect(gone!.checkedOutAt).not.toBeNull();

    const reopened = await page.request.patch(
      `/api/training/attendance/${present!.id}`,
      { data: { reopen: true } },
    );
    expect(reopened.status()).toBe(204);
    expect((await day(page)).find((a) => a.id === present!.id)?.status).toBe(
      "checked-in",
    );
  });

  test("a dog cannot be collected before it arrives", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await createBooking(page, bookingBody());
    // No attendance row at all: there is nothing to check out of.
    const res = await page.request.patch(
      `/api/training/attendance/${created.id}`,
      { data: { checkOut: true } },
    );
    expect(res.status(), "refused, not silently ignored").toBe(403);
  });

  test("reverting removes the record, not the booking", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await createBooking(page, bookingBody());
    await page.request.post("/api/training/attendance", {
      data: { bookingRef: created.id },
    });
    expect(
      (await day(page)).find((a) => a.id === String(created.id))?.status,
    ).toBe("checked-in");

    // Daycare deletes its row on a revert; boarding updates its own, because
    // there the row is also the kennel assignment. Training's row means only
    // "the dog arrived", so a mistaken one has nothing left to say.
    const reverted = await page.request.delete(
      `/api/training/attendance/${created.id}`,
    );
    expect(reverted.status()).toBe(204);

    const after = (await day(page)).find((a) => a.id === String(created.id));
    expect(after, "still on today's sessions").toBeTruthy();
    expect(after!.status).toBe("scheduled");
  });

  test("a daycare booking cannot be checked in to training", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const daycare = await createBooking(page, {
      ...bookingBody("daycare"),
      checkInTime: "08:00",
      checkOutTime: "17:00",
    });

    const res = await page.request.post("/api/training/attendance", {
      data: { bookingRef: daycare.id },
    });
    expect(res.status()).toBe(422);
    expect(((await res.json()) as { error?: string }).error).toContain(
      "not a training booking",
    );
  });
});
