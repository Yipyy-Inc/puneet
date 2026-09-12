import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The New Booking form saves what it was given — every day, every room, the
// deposit — or nothing at all.
//
// ── WHAT THIS PINS (2026-09-12) ─────────────────────────────────────────────
//
// The database holds one attendance and one room per booking. The form let
// staff pick several daycare days, or two dogs in two kennels, and saved ONE
// booking: the first day, the first kennel. It did not wait for the save, so a
// refusal arrived over a closed form. It had no field for special requests,
// and its "deposit collected" was a note on the booking with no payment.
//
//   1. Three daycare days are three bookings, each on its own day, with the
//      request's notes on every one, and the money adds back to the quote.
//   2. Two stays wanting the same kennel are refused together — the first is
//      not left behind.
//   3. A cash deposit taken with the booking is a PAYMENT on it.
//   4. Through the form itself: two days, a note, "Create booking" → two
//      bookings, both carrying the note.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
//
// Everything made here carries MARKER in its special requests, far in the
// future, and afterAll refunds and cancels it — payments are append-only, so a
// paid booking is refunded, as booking-checkout-truth does.
// ============================================================================

const MARKER = "[e2e booking-form]";
const BOB = { client: 16, pet: 3 }; // Bob Smith, Max
const ALICE = { client: 15, pets: [1, 51] }; // Alice Johnson, Buddy and Max

interface BookingPayload {
  id: number;
  clientId: number;
  service?: string;
  status?: string;
  startDate?: string;
  totalCost?: number;
  amountPaid?: number;
  specialRequests?: string;
  unitAssignment?: string;
  bookingGroup?: { id: string; part: number; of: number };
  groupRefs?: number[];
  depositRecorded?: number;
}

/** Day numbers of next month's first Tuesday and the Wednesday after it. */
function nextMonthTuesdayAndWednesday(): [number, number] {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 1, d);
    if (day.getDay() === 2) return [d, d + 1];
  }
  return [2, 3];
}

function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function allBookings(page: Page): Promise<BookingPayload[]> {
  const res = await page.request.get("/api/bookings");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as BookingPayload[];
}

/** This run's live bookings with the tag — earlier runs' are cancelled. */
async function marked(page: Page, tag: string) {
  return (await allBookings(page)).filter(
    (b) =>
      b.status !== "cancelled" &&
      b.specialRequests?.includes(`${MARKER} ${tag}`),
  );
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    for (const b of await allBookings(page)) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled" && (b.amountPaid ?? 0) === 0) continue;
      const paid = Number(b.amountPaid ?? 0);
      if (paid > 0) {
        await page.request.post("/api/payments", {
          data: {
            bookingRef: String(b.id),
            method: "cash",
            subtotal: -paid,
            tax: 0,
            tip: 0,
            storeCreditApplied: 0,
            packagePassApplied: 0,
            loyaltyDiscountApplied: 0,
            amountCharged: -paid,
            grandTotal: -paid,
            receiptChannels: [],
            creditNote: "e2e cleanup",
          },
        });
      }
      await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
    }
  } finally {
    await page.close();
  }
});

test.describe("the New Booking form saves all of it, or none of it", () => {
  test("three daycare days are three bookings, each on its own day", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const days = [401, 403, 405].map(isoDaysAhead);
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: BOB.client,
        petId: BOB.pet,
        facilityId: 0,
        service: "daycare",
        startDate: days[0],
        endDate: days[0],
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 100,
        discount: 0,
        totalCost: 100,
        specialRequests: `${MARKER} days`,
        daycareSelectedDates: days,
        parts: days.map((day, i) => ({
          petIds: [BOB.pet],
          startDate: day,
          endDate: day,
          checkInTime: "08:00",
          checkOutTime: "17:00",
          basePrice: i === 0 ? 33.34 : 33.33,
          discount: 0,
          totalCost: i === 0 ? 33.34 : 33.33,
        })),
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const first = (await res.json()) as BookingPayload;
    expect(first.groupRefs).toHaveLength(3);

    const made = (await allBookings(page)).filter((b) =>
      first.groupRefs?.includes(b.id),
    );
    expect(made.map((b) => b.startDate).sort()).toEqual(days);
    // Each day claims only itself, and knows its place in the request.
    expect(made.every((b) => b.bookingGroup?.of === 3)).toBe(true);
    const cents = made.reduce(
      (sum, b) => sum + Math.round(Number(b.totalCost) * 100),
      0,
    );
    expect(cents).toBe(10000);
  });

  test("two stays wanting one kennel are refused together", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const start = isoDaysAhead(410);
    const end = isoDaysAhead(413);
    const before = (await marked(page, "clash")).length;
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pets,
        facilityId: 0,
        service: "boarding",
        startDate: start,
        endDate: end,
        checkInTime: "15:00",
        checkOutTime: "11:00",
        status: "confirmed",
        basePrice: 200,
        discount: 0,
        totalCost: 200,
        specialRequests: `${MARKER} clash`,
        parts: ALICE.pets.map((petId) => ({
          petIds: [petId],
          startDate: start,
          endDate: end,
          checkInTime: "15:00",
          checkOutTime: "11:00",
          basePrice: 100,
          discount: 0,
          totalCost: 100,
          unitAssignment: "room-c-06",
        })),
      },
    });
    expect(res.status(), await res.text()).toBe(409);
    // The first stay — written before the second was refused — is not there.
    expect((await marked(page, "clash")).length).toBe(before);
  });

  test("a cash deposit taken with the booking is a payment on it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const day = isoDaysAhead(420);
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: BOB.client,
        petId: BOB.pet,
        facilityId: 0,
        service: "daycare",
        startDate: day,
        endDate: day,
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 64,
        discount: 0,
        totalCost: 64,
        specialRequests: `${MARKER} deposit`,
        initialDeposit: { amount: 20, method: "cash", ruleLabel: "e2e" },
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const created = (await res.json()) as BookingPayload;
    expect(created.depositRecorded).toBe(20);

    // The booking counts the deposit as paid supply, and the ledger has it.
    await expect
      .poll(async () => {
        const after = (await allBookings(page)).find(
          (b) => b.id === created.id,
        );
        return Number(after?.amountPaid ?? -1);
      })
      .toBe(20);
    const payments = (await (
      await page.request.get(`/api/payments?bookingRef=${created.id}`)
    ).json()) as { amount: number }[];
    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBeGreaterThanOrEqual(20);
  });

  test("through the form: two days and a note make two bookings with the note", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    // Alice's Buddy: a dog with a valid evaluation, so daycare is open to him.
    await page.goto(`/facility/dashboard/clients/${ALICE.client}`);
    await page
      .getByRole("button", { name: /^book$/i })
      .first()
      .click({ timeout: 30_000 });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByText("Buddy", { exact: true }).first().click();
    await dialog.getByRole("button", { name: /^next$/i }).click();
    await dialog
      .getByText(/daycare/i)
      .first()
      .click();
    await dialog.getByRole("button", { name: /^next$/i }).click();

    // Two open days next month — the facility is closed at weekends.
    await dialog
      .locator("button:has(svg.lucide-chevron-right)")
      .first()
      .click();
    const [first, second] = nextMonthTuesdayAndWednesday();
    await dialog
      .getByRole("button", { name: String(first), exact: true })
      .click();
    await dialog
      .getByRole("button", { name: String(second), exact: true })
      .click();
    await dialog.getByRole("button", { name: /^next$/i }).click();

    // A play area Buddy is allowed in: the first one that takes a click.
    await dialog
      .locator("div.group.bg-card.rounded-2xl.cursor-pointer")
      .first()
      .click();
    // Add-ons, feeding, medication — and a package offer, if one applies.
    const create = dialog.getByRole("button", { name: /^create booking$/i });
    for (let i = 0; i < 6 && !(await create.isVisible()); i += 1) {
      await dialog.getByRole("button", { name: /^(next|skip)$/i }).click();
    }

    await dialog.getByLabel(/special requests/i).fill(`${MARKER} form`);
    await create.click();

    await expect(page.getByText(/2 bookings created/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(dialog).toBeHidden();
    const made = await marked(page, "form");
    expect(made).toHaveLength(2);
    expect(made.every((b) => b.service === "daycare")).toBe(true);
    expect(new Set(made.map((b) => b.startDate)).size).toBe(2);
  });
});
