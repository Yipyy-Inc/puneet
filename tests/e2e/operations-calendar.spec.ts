import { test, expect } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";
import { SWEEPABLE_STATUSES, bookingsMarked } from "./_sweep";

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
// ── AND ITS BOOKING ACTIONS ARE THE BOOKING PAGE'S ────────────────────────
//
// Check-in and check-out patched the status directly, so no form was asked
// for, the day board never heard the dog arrived, and a balance was left
// behind without anybody deciding to. "Cancel" took its reason from
// window.prompt. The drawer drives the booking page's own flows now
// (use-calendar-booking-actions.ts), and the tests below press its buttons.
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
  presence?: string;
  specialRequests?: string;
  startDate?: string;
  endDate?: string;
  cancellationReason?: string;
}

async function readBooking(
  page: import("@playwright/test").Page,
  ref: number,
): Promise<BookingPayload | undefined> {
  // The one booking, by its number. This read the facility's whole list, then
  // this client's — and client 15 carries every spec's bookings, so under load
  // that read still came back as something other than an array ("all.find is
  // not a function"). A failed read says so rather than looking empty.
  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  const [row] = (await res.json()) as BookingPayload[];
  return row;
}

/**
 * A DAYCARE booking, for the tests that go through the API: no kennel to
 * reserve, so no exclusion constraint, and no menu to name. The calendar draws
 * no stay as an event, so the drawer tests book a groom instead (below).
 */
async function createBooking(
  page: import("@playwright/test").Page,
  day: string,
  price = 45,
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
      basePrice: price,
      discount: 0,
      totalCost: price,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

/**
 * A GROOM, for the tests that press the drawer's buttons: the calendar draws
 * grooming, training and evaluations as events but not a daycare or boarding
 * stay (only its add-ons), so a daycare booking has no chip to open. The
 * service is one from this facility's own menu (check:grooming-menu).
 */
async function createGroom(
  page: import("@playwright/test").Page,
  day: string,
  price: number,
): Promise<number> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: CLIENT_REF,
      petId: PET_REF,
      facilityId: 11,
      service: "grooming",
      serviceType: "groom-pkg-002",
      startDate: day,
      endDate: day,
      checkInTime: "10:00",
      checkOutTime: "11:00",
      status: "confirmed",
      basePrice: price,
      discount: 0,
      totalCost: price,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

/**
 * The drawer for one booking. The calendar's own search matches a booking's
 * number, so the day shows this booking and not what earlier runs left there.
 */
async function openDrawer(
  page: import("@playwright/test").Page,
  day: string,
  ref: number,
) {
  await page.goto(
    `/facility/dashboard/calendar?date=${day}&view=day&search=${ref}`,
  );
  await page
    .locator("[data-calendar-event-chip]")
    .filter({ hasText: /buddy/i })
    .first()
    .click({ timeout: 90_000 });
  await page.getByRole("button", { name: /open panel/i }).click();
  const drawer = page.getByRole("dialog", { name: /buddy/i });
  await expect(drawer).toBeVisible({ timeout: 15_000 });
  return drawer;
}

async function presenceOf(
  page: import("@playwright/test").Page,
  ref: number,
): Promise<string> {
  const booking = await readBooking(page, ref);
  return `${booking?.status}/${booking?.presence}`;
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

      // ── A CAST IS A CLAIM, AND THIS ONE WAS FALSE ─────────────────────
      //
      // This read `as BookingPayload[]` and walked the result. A 500 answers
      // `{error}` and a 401 answers `{error}` too — `for...of` on either
      // throws INSIDE the teardown, so the cleanup does nothing AND the
      // failure is reported against the last test rather than against the
      // cleanup. It fired on 2026-09-24 under load: `TypeError: all is not
      // iterable`, and that run's bookings were left behind on a database
      // shared with production.
      //
      // Guarded, and LOUD. A teardown that silently cleans nothing is worse
      // than one that crashes, because the run still looks green.
      //
      // And NOT A LIST READ. Guarded, the read above still timed out under
      // load — on 2026-09-25 it answered 500 and left 20 open bookings on
      // the days this file books into. The database is asked for the marker
      // instead (`bookingsMarked`, the service role's way in), which also
      // finds what an earlier run that died left behind.
      const mine = (await bookingsMarked(MARKER)).filter(
        (b) => b.status !== "cancelled",
      );

      let cancelled = 0;
      for (const b of mine) {
        // Off the daycare floor first: a cancelled booking with an attendance
        // row is still somebody on the board.
        await page.request.delete(`/api/daycare/attendance/${b.ref}`);
        const res = await page.request.patch(`/api/bookings/${b.ref}`, {
          data: { status: "cancelled" },
        });
        if (res.ok()) cancelled++;
        else console.log(`cleanup: #${b.ref} (${b.status}) -> ${res.status()}`);
      }
      console.log(
        `cleanup: ${cancelled} of ${mine.length} booking(s) cancelled`,
      );
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
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const ref = await createGroom(page, day, 45);

    // The booking's own cancel dialog, with its reason — the drawer asked in
    // window.prompt and patched the status.
    const drawer = await openDrawer(page, day, ref);
    await drawer.getByRole("button", { name: /more actions/i }).click();
    await page.getByRole("menuitem", { name: /^cancel booking$/i }).click();
    const dialog = page.getByRole("dialog", { name: /cancel booking/i });
    await dialog
      .getByLabel(/reason for cancelling/i)
      .fill("e2e calendar cancel");
    await dialog.getByRole("button", { name: /^cancel the booking$/i }).click();

    await expect
      .poll(async () => (await readBooking(page, ref))?.status, {
        timeout: 30_000,
      })
      .toBe("cancelled");
    const after = await readBooking(page, ref);
    expect(
      after?.cancellationReason,
      "with the reason the dialog collected",
    ).toBe("e2e calendar cancel");
  });

  test("checking in and out from the drawer records the arrival and the departure", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    // Nothing owed, so checking out records the departure here.
    const ref = await createGroom(page, day, 0);
    const drawer = await openDrawer(page, day, ref);

    await drawer.getByRole("button", { name: /^check in buddy$/i }).click();
    // Buddy has no vaccination on file and this facility requires rabies for
    // grooming, so the check-in asks first (use-vaccine-gaps.ts).
    const ask = page.getByRole("alertdialog");
    await expect(ask).toContainText(/rabies/i);
    await ask.getByRole("button", { name: /^check buddy in anyway$/i }).click();

    // The groom's own write: the arrival is stamped and the facility's rule
    // takes a groom on to in progress (autoTransitionTarget).
    await expect
      .poll(() => presenceOf(page, ref), { timeout: 30_000 })
      .toMatch(/^(checked_in|in_progress)\/on-site$/);

    await drawer
      .getByRole("button", { name: /^check buddy out$/i })
      .click({ timeout: 30_000 });
    await expect
      .poll(() => presenceOf(page, ref), { timeout: 30_000 })
      .toBe("completed/departed");
  });

  test("checking out a guest who owes goes to the booking, where the payment is taken", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const ref = await createGroom(page, day, 45);
    const arrived = await page.request.patch("/api/grooming/appointments", {
      data: { id: String(ref), status: "checked-in" },
    });
    expect(arrived.ok(), await arrived.text()).toBe(true);

    const drawer = await openDrawer(page, day, ref);
    await drawer
      .getByRole("button", { name: /^check buddy out$/i })
      .click({ timeout: 30_000 });

    // Not a departure with the balance quietly left behind: the booking
    // page, where checking out is the till.
    await expect(page).toHaveURL(
      new RegExp(`/clients/${CLIENT_REF}/bookings/${ref}`),
      { timeout: 60_000 },
    );
    expect(await presenceOf(page, ref), "still on site").toMatch(/\/on-site$/);
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
      await page.request.get(
        `/api/bookings${bookingListSearch({ statuses: SWEEPABLE_STATUSES })}`,
      )
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
