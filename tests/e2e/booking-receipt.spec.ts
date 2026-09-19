import { test, expect, type Page } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A SETTLED BOOKING'S RECEIPT CAN BE EMAILED — AND ONLY A SETTLED ONE.
//
// The booking page could print an invoice but had no way to email a receipt:
// the checkout's email and text buttons were toasts, removed rather than kept
// as promises. POST /api/bookings/[ref]/receipt now builds the receipt from the
// payment ledger and emails it; a booking still owing is refused, and so is a
// customer. The address is Resend's own test inbox, so no real person is
// emailed by a test run.
//
// Bookings are Bob Smith's (client 16, Max), far ahead; afterAll refunds what
// was paid and cancels them — payments are append-only.
// ============================================================================

const MARKER = "[e2e booking-receipt]";
const BOB = { client: 16, pet: 3 };
const TEST_INBOX = "delivered@resend.dev";
const made: Array<{ ref: number; paid: number }> = [];

interface BookingPayload {
  id: number;
  paymentStatus?: string;
}

async function booking(page: Page, days: number, price: number) {
  const day = new Date(Date.now() + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
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
      basePrice: price,
      discount: 0,
      totalCost: price,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const ref = ((await res.json()) as BookingPayload).id;
  made.push({ ref, paid: 0 });
  return ref;
}

async function payCash(page: Page, ref: number, amount: number) {
  const res = await page.request.post("/api/payments", {
    data: {
      bookingRef: String(ref),
      method: "cash",
      subtotal: amount,
      tax: 0,
      tip: 0,
      storeCreditApplied: 0,
      packagePassApplied: 0,
      loyaltyDiscountApplied: 0,
      amountCharged: amount,
      grandTotal: amount,
      cashReceived: amount,
      receiptChannels: [],
      creditNote: "",
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const entry = made.find((m) => m.ref === ref);
  if (entry) entry.paid += amount;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const refused: string[] = [];
    for (const { ref, paid } of made) {
      if (paid > 0) {
        const refund = await page.request.post("/api/payments", {
          data: {
            bookingRef: String(ref),
            method: "cash",
            subtotal: -paid,
            tax: 0,
            tip: 0,
            storeCreditApplied: 0,
            packagePassApplied: 0,
            loyaltyDiscountApplied: 0,
            amountCharged: -paid,
            grandTotal: -paid,
            cashReceived: -paid,
            receiptChannels: [],
            creditNote: "e2e cleanup",
          },
        });
        if (!refund.ok()) refused.push(`refund ${ref}: ${await refund.text()}`);
      }
      const cancel = await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
      if (!cancel.ok()) refused.push(`cancel ${ref}: ${await cancel.text()}`);
    }
    expect(refused, "cleanup left bookings behind").toEqual([]);
  } finally {
    await page.close();
  }
});

test("a paid booking's receipt is emailed; an unpaid one is refused", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);

  const unpaid = await booking(page, 490, 30);
  const refusedUnpaid = await page.request.post(
    `/api/bookings/${unpaid}/receipt`,
    { data: { to: TEST_INBOX } },
  );
  expect(refusedUnpaid.status()).toBe(409);
  expect(((await refusedUnpaid.json()) as { reason?: string }).reason).toBe(
    "not_settled",
  );

  const paid = await booking(page, 491, 30);
  await payCash(page, paid, 30);
  const [settled] = (await (
    await page.request.get(`/api/bookings${bookingListSearch({ ref: paid })}`)
  ).json()) as BookingPayload[];
  expect(settled?.paymentStatus).toBe("paid");

  const res = await page.request.post(`/api/bookings/${paid}/receipt`, {
    data: { to: TEST_INBOX },
  });
  expect(res.status(), await res.text()).toBe(200);
  const result = (await res.json()) as {
    sent: boolean;
    detail?: string;
    to: string;
  };
  expect(result.to).toBe(TEST_INBOX);
  // Sent when an email service is configured; otherwise it says so, and says
  // why — never "sent" for an email that did not go.
  if (!result.sent) expect(result.detail).toBeTruthy();

  // The page offers it for the paid booking, under More.
  await page.goto(`/facility/dashboard/clients/${BOB.client}/bookings/${paid}`);
  await page
    .getByRole("button", { name: /^more actions$/i })
    .click({ timeout: 60_000 });
  await expect(
    page.getByRole("menuitem", { name: /email the receipt/i }),
  ).toBeVisible();
});

test("a customer does not send the facility's receipts", async ({ page }) => {
  const paid = made.find((m) => m.paid > 0);
  test.skip(!paid, "needs the paid booking from the test above");
  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.post(`/api/bookings/${paid!.ref}/receipt`, {
    data: { to: TEST_INBOX },
  });
  expect(res.status()).toBe(403);
});
