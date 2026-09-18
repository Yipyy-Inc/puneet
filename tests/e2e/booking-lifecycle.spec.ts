import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A booking's lifecycle, by the people who move it.
//
// Round 1 of bookings (2026-09-18) made one truth of arrival: every check-in
// and check-out goes through the service's attendance write, and the database
// mirrors it into the booking's status (20260918151018). The booking page and
// the calendar offer what the stage allows, to whoever may do it
// (booking-lifecycle.ts). These pin that from four chairs:
//
//   caretaker  checks pets in and out, holds no edit_bookings — and the status
//              still follows, which is the whole point of the mirror's pass
//   reception  runs the booking page end to end
//   accountant takes money, never moves a pet
//
// Reception and the accountant are staff, not facility admins, so they open
// a booking where they actually work: /employee/bookings/[ref], the same page
// inside the employee shell. /facility/dashboard sends them to their schedule.
// Reception also holds open_close_register, so the shell asks them to count
// the drawer before anything else; the reception test switches that off for
// its own run and puts back what it found.
//   anyone     cannot check a REQUEST in, by the button or by the route
//
// Test data: client 15's Buddy at the e2e facility, on a day far enough out
// that no board looks at it. Cleanup takes each pet off the floor and cancels.
// ============================================================================

const MARKER = "[e2e booking-lifecycle]";
const CLIENT_REF = 15;
const PET_REF = 1;
const day = new Date(Date.now() + 320 * 86_400_000).toISOString().slice(0, 10);
/** Every booking this spec made, for the cleanup — not a read of the list. */
const created: number[] = [];

interface BookingRow {
  id: number;
  status?: string;
  presence?: string;
  specialRequests?: string;
}

async function book(
  page: Page,
  options: { price?: number; status?: string } = {},
): Promise<number> {
  const price = options.price ?? 0;
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
      status: options.status ?? "confirmed",
      basePrice: price,
      discount: 0,
      totalCost: price,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const ref = ((await res.json()) as { id: number }).id;
  created.push(ref);
  return ref;
}

async function read(page: Page, ref: number): Promise<BookingRow> {
  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  const [row] = (await res.json()) as BookingRow[];
  return row;
}

async function stateOf(page: Page, ref: number): Promise<string> {
  const row = await read(page, ref);
  return `${row.status}/${row.presence}`;
}

/** The number as the page prints it: formatBookingRef, "#" + 10000 + id. */
const shown = (ref: number) => new RegExp(`#${10000 + ref}$`);

/**
 * The facility-wide "count the drawer on sign-in" setting, as the owner.
 * Returns what it was, for the caller to put back.
 */
async function setRegisterGate(page: Page, required: boolean) {
  const before = await page.request.get("/api/staff-onboarding/hr-config");
  const was = before.ok()
    ? ((await before.json()) as { requireRegisterOpenOnLogin?: boolean })
        .requireRegisterOpenOnLogin
    : undefined;
  const res = await page.request.put("/api/staff-onboarding/hr-config", {
    data: { requireRegisterOpenOnLogin: required },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return was;
}

test.describe("a booking's lifecycle", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      let cancelled = 0;
      for (const ref of created) {
        // Off the daycare floor first: a cancelled booking with an attendance
        // row is still somebody on the board.
        await page.request.delete(`/api/daycare/attendance/${ref}`);
        const cancel = await page.request.patch(`/api/bookings/${ref}`, {
          data: { status: "cancelled" },
        });
        if (cancel.ok()) cancelled++;
      }
      console.log(`cleanup: ${cancelled} booking(s) cancelled`);
    } finally {
      await page.close();
    }
  });

  test("a caretaker's check-in and check-out move the booking, though they cannot edit it", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const ref = await book(page);

    await signIn(page, ACCOUNTS.caretaker);
    const arrived = await page.request.post("/api/daycare/attendance", {
      data: { bookingRef: ref, formOverrideReason: "e2e lifecycle" },
    });
    expect(arrived.status(), await arrived.text()).toBe(201);
    // The mirror's own update passes the integrity trigger for somebody who
    // holds no edit_bookings — before it, the status stayed "confirmed".
    await expect
      .poll(() => stateOf(page, ref), { timeout: 20_000 })
      .toBe("checked_in/on-site");

    // A caretaker holds no cancel_bookings, and the route says so.
    const cancel = await page.request.patch(`/api/bookings/${ref}`, {
      data: { status: "cancelled" },
    });
    expect(cancel.status(), await cancel.text()).toBe(403);

    const departed = await page.request.patch(
      `/api/daycare/attendance/${ref}`,
      {
        data: { checkOut: true },
      },
    );
    expect(departed.status(), await departed.text()).toBe(204);
    await expect
      .poll(() => stateOf(page, ref), { timeout: 20_000 })
      .toBe("completed/departed");
  });

  test("reception checks a guest in and out from the booking page", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    // Nothing owed, so checking out records the departure rather than
    // opening the till.
    const ref = await book(page, { price: 0 });
    const gate = await setRegisterGate(page, false);

    try {
      await signIn(page, ACCOUNTS.reception);
      await page.goto(`/employee/bookings/${ref}`);
      await expect(page.getByRole("heading", { name: shown(ref) })).toBeVisible(
        { timeout: 60_000 },
      );
      await page
        .getByRole("button", { name: /^check in buddy$/i })
        .click({ timeout: 30_000 });
      // Buddy has no vaccination on file; the check-in asks first.
      const ask = page.getByRole("alertdialog");
      await expect(ask).toContainText(/rabies/i);
      await ask
        .getByRole("button", { name: /^check buddy in anyway$/i })
        .click();
      await expect
        .poll(() => stateOf(page, ref), { timeout: 30_000 })
        .toBe("checked_in/on-site");

      await page
        .getByRole("button", { name: /^check buddy out$/i })
        .click({ timeout: 30_000 });
      await expect
        .poll(() => stateOf(page, ref), { timeout: 30_000 })
        .toBe("completed/departed");
    } finally {
      if (gate !== false) {
        await signIn(page, ACCOUNTS.owner);
        await setRegisterGate(page, gate ?? true);
      }
    }
  });

  test("the accountant takes money but is not offered a check-in", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const ref = await book(page, { price: 45 });

    await signIn(page, ACCOUNTS.accountant);
    await page.goto(`/employee/bookings/${ref}`);
    // The page has loaded when the booking's number is on it.
    await expect(page.getByRole("heading", { name: shown(ref) })).toBeVisible({
      timeout: 60_000,
    });
    // No arrival permission, so no arrival button — and money owed with
    // take_payment, so a way to take it: a prepayment, or the deposit when a
    // deposit rule of the facility's applies.
    await expect(
      page.getByRole("button", { name: /^check in buddy$/i }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("button", { name: /take a prepayment|charge the deposit/i })
        .first(),
    ).toBeVisible();

    // And the route agrees: an arrival from somebody who may not move pets
    // is refused.
    const arrived = await page.request.post("/api/daycare/attendance", {
      data: { bookingRef: ref, formOverrideReason: "e2e lifecycle" },
    });
    expect(arrived.status()).toBeGreaterThanOrEqual(400);
    expect(await stateOf(page, ref)).toBe("confirmed/expected");
  });

  test("a request cannot be checked in, by the page or by the route", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const ref = await book(page, { status: "request_submitted" });

    await page.goto(
      `/facility/dashboard/clients/${CLIENT_REF}/bookings/${ref}`,
    );
    // A request is reviewed, not checked in.
    await expect(
      page.getByRole("button", { name: /review and approve/i }).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByRole("button", { name: /^check in buddy$/i }),
    ).toHaveCount(0);

    // The arrival guard (20260918151018): a request is not arrivable, and a
    // status write to checked_in on a tracked service goes through the
    // attendance write instead.
    const arrived = await page.request.post("/api/daycare/attendance", {
      data: { bookingRef: ref, formOverrideReason: "e2e lifecycle" },
    });
    expect(arrived.status(), await arrived.text()).toBe(422);
    const patched = await page.request.patch(`/api/bookings/${ref}`, {
      data: { status: "checked_in" },
    });
    expect(patched.status(), await patched.text()).toBe(422);
    expect((await read(page, ref)).status).toBe("request_submitted");
  });
});
