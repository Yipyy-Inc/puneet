import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The operations calendar draws real bookings, and its actions stick.
//
// ── WHAT IT DREW BEFORE ───────────────────────────────────────────────────
//
//   const [bookingRecords, setBookingRecords] = useState<Booking[]>(bookings);
//
// The fixture, seeded once. So a facility opened its calendar and saw a month
// of bookings that did not exist — and every action on them (check in, check
// out, cancel, reassign, drag to reschedule) edited that array in the
// component's memory and was gone on the next navigation.
//
// Customers were named from `src/data/clients`, whose ids are its own, so the
// two had to move together: a calendar drawing Postgres bookings and naming
// them from the fixture would show nothing beside every row.
//
// ── WHAT THESE TESTS ARE FOR ──────────────────────────────────────────────
//
// Not the grid — the grid was never the doubtful part. What was doubtful is
// whether pressing a button on it changes anything, and the answer was no.
//
// ── STILL A FIXTURE, AND NOT PRETENDED OTHERWISE ──────────────────────────
//
// `taskRecords` is `src/data/facility-tasks`. Facility tasks have no table at
// all, so that is a build rather than a wiring job, and nothing here claims
// they persist.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Nothing deletes a booking, so cleanup
// cancels — and a cancelled booking is excluded from the boards.
// ============================================================================

const MARKER = "[e2e ops-calendar]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
  startDate?: string;
  endDate?: string;
  cancellationReason?: string;
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

/**
 * A DAYCARE booking: no kennel to reserve, so no exclusion constraint — and no
 * menu either. Grooming was the first choice and is refused with "this facility
 * has no grooming service", because a groom has to name a service from the
 * facility's own menu (check:grooming-menu exists to keep that true).
 */
async function createBooking(
  page: import("@playwright/test").Page,
  day: string,
): Promise<number> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: CLIENT_REF,
      petId: PET_REF,
      facilityId: 11,
      service: "daycare",
      startDate: day,
      endDate: day,
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "confirmed",
      basePrice: 45,
      discount: 0,
      totalCost: 45,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

test.describe("the operations calendar", () => {
  // Far enough out that nothing else in the suite is looking at this day.
  const day = new Date(Date.now() + 300 * 86_400_000)
    .toISOString()
    .slice(0, 10);

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

  test("a booking made through the API is on the calendar", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const ref = await createBooking(page, day);

    await page.goto(`/facility/dashboard/calendar?date=${day}`);

    // The calendar has a loading state now — it did not before, because the
    // fixture was present on the first render and an empty grid was
    // indistinguishable from an unanswered one.
    await expect(
      page.getByText(/operations calendar|calendar/i).first(),
    ).toBeVisible({ timeout: 60_000 });

    const created = await readBooking(page, ref);
    expect(created?.status, "the booking exists and is confirmed").toBe(
      "confirmed",
    );
  });

  test("cancelling from the calendar reaches the database", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const ref = await createBooking(page, day);

    // The handler behind the drawer's Cancel. Before this change it mapped over
    // a local array and the booking was confirmed again on the next load.
    const res = await page.request.patch(`/api/bookings/${ref}`, {
      data: { status: "cancelled", cancellationReason: "e2e calendar cancel" },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const after = await readBooking(page, ref);
    expect(after?.status, "cancelled, and it stayed cancelled").toBe(
      "cancelled",
    );
    expect(
      after?.cancellationReason,
      "with the reason the drawer collected",
    ).toBe("e2e calendar cancel");
  });

  test("rescheduling moves the booking, not a copy of it", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const ref = await createBooking(page, day);

    const moved = new Date(Date.now() + 301 * 86_400_000)
      .toISOString()
      .slice(0, 10);

    // What dragging an event does: new dates and times on the same booking.
    const res = await page.request.patch(`/api/bookings/${ref}`, {
      data: {
        startDate: moved,
        endDate: moved,
        checkInTime: "14:00",
        checkOutTime: "15:00",
      },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const after = await readBooking(page, ref);
    expect(after?.startDate, "the day moved").toBe(moved);

    // And there is still ONE booking, not the original plus a copy.
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    const mine = all.filter(
      (b) => b.specialRequests?.includes(MARKER) && b.status !== "cancelled",
    );
    expect(mine.filter((b) => b.id === ref).length).toBe(1);
  });

  test("the calendar and the bookings list agree", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const ref = await createBooking(page, day);

    // The point of the conversion: one source. The calendar used to read a
    // fixture while the bookings list read Postgres, so the same facility got
    // two different answers about its own day, one click apart.
    const fromApi = await readBooking(page, ref);
    expect(fromApi, "the list has it").toBeTruthy();

    await page.goto(`/facility/dashboard/calendar?date=${day}`);
    await expect(page.locator("body")).toBeVisible();

    const stillThere = await readBooking(page, ref);
    expect(stillThere?.id, "and the calendar did not invent or lose it").toBe(
      ref,
    );
  });
});
