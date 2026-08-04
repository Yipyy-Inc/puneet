import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// What a client owes, and what they merely have booked.
//
// ── THE TWO NUMBERS THIS SEPARATES ────────────────────────────────────────
//
// The overview page used to compute one figure — every pending, non-cancelled
// booking, at FULL PRICE — and label it "unpaid invoices from finished
// appointments". Bookings months away were counted as debt, and a part-paid
// booking counted for its whole amount because `amountPaid` did not exist yet.
//
// `clients.outstanding_balance` is now derived from delivered bookings only
// (20260806780000), and the booked-but-not-delivered figure is stated on its
// own line, in grey rather than red. This suite proves a booking lands in the
// right one of the two.
//
// ── IT WRITES TO AN IMMUTABLE TABLE, SO IT REVERSES ───────────────────────
//
// Cleanup records a refund and cancels — `payments` has no delete policy
// (20260806220000, Decision 1).
// ============================================================================

const MARKER = "[e2e client-balance]";
const CLIENT_REF = 15;
const PET_REF = 1;
const DELIVERED = 77;
const BOOKED = 210;

interface BookingPayload {
  id: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  specialRequests?: string;
}

interface ClientPayload {
  id: number;
  outstandingBalance?: number;
}

function bookingBody(status: string, total: number, dayOffset: number) {
  const day = new Date(Date.now() + dayOffset * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "daycare",
    startDate: day,
    endDate: day,
    checkInTime: "09:00",
    checkOutTime: "17:00",
    status,
    basePrice: total,
    discount: 0,
    totalCost: total,
    specialRequests: MARKER,
  };
}

/**
 * The two figures as the OVERVIEW PAGE renders them.
 *
 * Read as a delta by every caller, never as an absolute: client 15 is a seeded
 * account with its own history, and asserting "the upcoming line says $210"
 * only passes on a database where they have nothing else booked. The first
 * version of this file did exactly that and read $1,595.
 */
async function readFigures(
  page: import("@playwright/test").Page,
): Promise<{ owed: number; booked: number }> {
  const read = async (pattern: RegExp): Promise<number> => {
    const line = page.getByText(pattern);
    if ((await line.count()) === 0) return 0;
    const text = (await line.first().textContent()) ?? "";
    const match = text.match(/\$([\d,]+(?:\.\d{2})?)/);
    return match ? Number(match[1].replace(/,/g, "")) : 0;
  };
  return {
    owed: await read(/Outstanding Balance:/i),
    booked: await read(/booked and not yet paid/i),
  };
}

/**
 * Open the overview and wait until BOTH figures have settled.
 *
 * The heading renders from the client query; the two money lines need the
 * BOOKINGS query, which arrives separately — and neither line is rendered at
 * all when its figure is zero. So "not there yet" and "genuinely zero" look
 * identical, and reading straight after the heading returned two zeroes.
 *
 * `waitForFunction` on the query cache would be reaching inside; polling until
 * two consecutive reads agree is enough and stays at the DOM.
 */
async function figuresOnScreen(
  page: import("@playwright/test").Page,
): Promise<{ owed: number; booked: number }> {
  await page.goto(`/facility/dashboard/clients/${CLIENT_REF}/overview`);
  await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible({
    timeout: 60_000,
  });

  // "Upcoming Appointments" renders its empty state until the bookings query
  // resolves, and this client always has some — so the ABSENCE of that empty
  // state is the signal that the list is real. Polling the figures themselves
  // for stability does not work: two consecutive reads of a line that has not
  // rendered yet both say zero and agree with each other.
  await expect(page.getByText(/no upcoming appointments/i)).toHaveCount(0, {
    timeout: 30_000,
  });

  return readFigures(page);
}

async function balanceOfClient(
  page: import("@playwright/test").Page,
): Promise<number> {
  const res = await page.request.get("/api/clients");
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as ClientPayload[];
  const client = all.find((c) => c.id === CLIENT_REF);
  expect(client, `client ${CLIENT_REF} is readable`).toBeTruthy();
  return Number(client!.outstandingBalance ?? -1);
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[] | null;

    let reversed = 0;
    let cancelled = 0;
    for (const b of bookings ?? []) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled" && (b.amountPaid ?? 0) === 0) continue;

      const amount = b.amountPaid ?? 0;
      if (amount > 0) {
        const res = await page.request.post("/api/payments", {
          data: {
            bookingRef: String(b.id),
            method: "new-card",
            subtotal: -amount,
            tax: 0,
            tip: 0,
            storeCreditApplied: 0,
            packagePassApplied: 0,
            loyaltyDiscountApplied: 0,
            amountCharged: -amount,
            grandTotal: -amount,
            receiptChannels: [],
            creditNote: "e2e cleanup",
          },
        });
        if (res.ok()) reversed++;
      }
      const cancel = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (cancel.ok()) cancelled++;
    }
    console.log(`cleanup: ${reversed} refund(s), ${cancelled} cancellation(s)`);

    // The balance has to come back to where it started, or the next run's
    // arithmetic is off by whatever this one left behind.
    console.log(`cleanup: client balance now $${await balanceOfClient(page)}`);
  } finally {
    await page.close();
  }
});

test.describe("what a client owes", () => {
  // The overview page is 918 lines with a long import list, and the dev server
  // compiles it on first hit — 22s measured, and the default 120s budget went
  // to it plus sign-in on a cold run. This is compile time, not slow auth.
  test.slow();

  test("a booking still to come lands on the other line", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = await figuresOnScreen(page);

    // $210 confirmed, six months out. Under the old rule this went straight
    // into "Outstanding Balance" and the red banner.
    const res = await page.request.post("/api/bookings", {
      data: bookingBody("confirmed", BOOKED, 180),
    });
    expect(res.status(), await res.text()).toBe(201);

    const after = await figuresOnScreen(page);
    expect(after.owed, "booked is not owed").toBe(before.owed);
    expect(after.booked, "and it shows up as booked").toBe(
      before.booked + BOOKED,
    );
  });

  test("a delivered booking is a debt, in red", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = await figuresOnScreen(page);
    const apiBefore = await balanceOfClient(page);

    const res = await page.request.post("/api/bookings", {
      data: bookingBody("completed", DELIVERED, -3),
    });
    expect(res.status(), await res.text()).toBe(201);

    // The database and the screen have to agree, so both are checked.
    expect(await balanceOfClient(page)).toBe(apiBefore + DELIVERED);

    const after = await figuresOnScreen(page);
    expect(after.owed).toBe(before.owed + DELIVERED);
    // Delivering a past visit says nothing about a booking in six months.
    expect(after.booked, "the upcoming figure is untouched").toBe(
      before.booked,
    );
  });

  test("paying it clears the debt without touching what is booked", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    const delivered = all.find(
      (b) =>
        b.specialRequests?.includes(MARKER) &&
        b.status === "completed" &&
        (b.amountPaid ?? 0) === 0,
    );
    expect(delivered, "the completed unpaid booking").toBeTruthy();

    const before = await balanceOfClient(page);
    const paid = await page.request.post("/api/payments", {
      data: {
        bookingRef: String(delivered!.id),
        method: "cash",
        subtotal: DELIVERED,
        tax: 0,
        tip: 0,
        storeCreditApplied: 0,
        packagePassApplied: 0,
        loyaltyDiscountApplied: 0,
        amountCharged: DELIVERED,
        grandTotal: DELIVERED,
        cashReceived: DELIVERED,
        receiptChannels: [],
        creditNote: "",
      },
    });
    expect(paid.status(), await paid.text()).toBe(201);

    expect(await balanceOfClient(page)).toBe(before - DELIVERED);

    // And the screen agrees, with the upcoming figure unmoved — settling a past
    // visit is not a statement about a booking in six months.
    const onScreen = await figuresOnScreen(page);
    expect(onScreen.owed).toBe(before - DELIVERED);
    expect(onScreen.booked).toBeGreaterThanOrEqual(BOOKED);
  });
});
