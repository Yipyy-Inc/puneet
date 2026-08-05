import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Something added at the counter changes what is owed.
//
// ── WHY THIS IS AN HTTP TEST AND NOT ONLY A SQL ONE ───────────────────────
//
// supabase/tests/booking-line-items.sql proves the derivation and the
// permissions. What it cannot prove is that the app SENDS anything: the retail
// dialog used to push into a `useState<InvoiceLineItem[]>` that checkout
// cleared, so a bag of food existed until the tab was closed and never reached
// a bill.
//
// The shape that matters is the reopen: settle a booking, add $24 of food, and
// it owes $24 again — through the same endpoints the page calls.
//
// ── IT WRITES TO AN IMMUTABLE TABLE, SO IT REVERSES ───────────────────────
//
// Line items delete cleanly. Payments do not (20260806220000, Decision 1), so
// cleanup refunds and cancels.
// ============================================================================

const MARKER = "[e2e line-items]";
const CLIENT_REF = 15;
const PET_REF = 1;
const PRICE = 60;
const FOOD_UNIT = 12;
const FOOD_QTY = 2;

interface BookingPayload {
  id: number;
  clientId: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  amountDue?: number;
  extrasTotal?: number;
  totalCost?: number;
  specialRequests?: string;
}

function bookingBody() {
  const day = new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "daycare",
    startDate: day,
    endDate: day,
    checkInTime: "09:00",
    checkOutTime: "17:00",
    status: "completed",
    basePrice: PRICE,
    discount: 0,
    totalCost: PRICE,
    specialRequests: MARKER,
  };
}

async function readBooking(
  page: import("@playwright/test").Page,
  id: number,
): Promise<BookingPayload> {
  const res = await page.request.get("/api/bookings");
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as BookingPayload[];
  const found = all.find((b) => b.id === id);
  expect(found, `booking #${id} is readable`).toBeTruthy();
  return found!;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];

    let reversed = 0;
    let cancelled = 0;
    for (const b of all) {
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
  } finally {
    await page.close();
  }
});

test.describe("what gets added to a bill", () => {
  test("a settled booking reopens when something is added to it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    // Settle it first, so the reopen is unambiguous.
    const paid = await page.request.post("/api/payments", {
      data: {
        bookingRef: String(created.id),
        method: "cash",
        subtotal: PRICE,
        tax: 0,
        tip: 0,
        storeCreditApplied: 0,
        packagePassApplied: 0,
        loyaltyDiscountApplied: 0,
        amountCharged: PRICE,
        grandTotal: PRICE,
        cashReceived: PRICE,
        receiptChannels: [],
        creditNote: "",
      },
    });
    expect(paid.status(), await paid.text()).toBe(201);

    const settled = await readBooking(page, created.id);
    expect(settled.paymentStatus, "settled before anything is added").toBe(
      "paid",
    );
    expect(Number(settled.amountDue)).toBe(PRICE);

    const added = await page.request.post(
      `/api/bookings/${created.id}/line-items`,
      {
        data: {
          items: [
            {
              kind: "item",
              name: "Bag of food",
              unitPrice: FOOD_UNIT,
              quantity: FOOD_QTY,
            },
          ],
        },
      },
    );
    expect(added.status(), await added.text()).toBe(201);

    const extra = FOOD_UNIT * FOOD_QTY;
    const after = await readBooking(page, created.id);
    expect(Number(after.extrasTotal)).toBe(extra);
    expect(Number(after.amountDue)).toBe(PRICE + extra);
    expect(
      after.paymentStatus,
      "the bill grew, so it is not settled any more",
    ).toBe("pending");
    // The booking's own PRICE is untouched — extras are not a price change.
    expect(Number(after.totalCost)).toBe(PRICE);
  });

  test("the client is chased for it too", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.get("/api/clients");
    const clients = (await res.json()) as {
      id: number;
      outstandingBalance?: number;
    }[];
    const owed = Number(
      clients.find((c) => c.id === CLIENT_REF)?.outstandingBalance ?? 0,
    );
    // The booking above is `completed`, so its $24 of food is a delivered
    // unsettled balance — the definition `clients.outstanding_balance` uses.
    expect(owed).toBeGreaterThanOrEqual(FOOD_UNIT * FOOD_QTY);
  });

  test("added by mistake, taken back off", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    const added = await page.request.post(
      `/api/bookings/${created.id}/line-items`,
      {
        data: {
          items: [{ kind: "fee", name: "Wrong fee", unitPrice: 40 }],
        },
      },
    );
    expect(added.status(), await added.text()).toBe(201);
    const { items } = (await added.json()) as { items: { id: string }[] };
    expect(Number((await readBooking(page, created.id)).amountDue)).toBe(
      PRICE + 40,
    );

    const removed = await page.request.delete(
      `/api/bookings/${created.id}/line-items?id=${items[0].id}`,
    );
    expect(removed.status()).toBe(204);
    const after = await readBooking(page, created.id);
    expect(Number(after.amountDue)).toBe(PRICE);
    expect(Number(after.extrasTotal)).toBe(0);
  });

  test("a line cannot be removed through another booking", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const a = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;
    const b = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    const added = await page.request.post(`/api/bookings/${a.id}/line-items`, {
      data: { items: [{ kind: "item", name: "Chew", unitPrice: 9 }] },
    });
    const { items } = (await added.json()) as { items: { id: string }[] };

    // The id is real, the booking in the URL is not the one it belongs to.
    // Without scoping the delete to both, a line id alone would let a caller
    // change a bill they were not looking at.
    const wrong = await page.request.delete(
      `/api/bookings/${b.id}/line-items?id=${items[0].id}`,
    );
    expect(wrong.status()).toBe(403);
    expect(Number((await readBooking(page, a.id)).amountDue)).toBe(PRICE + 9);
  });
});
