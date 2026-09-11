import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The booking checkout says what happened, and only once it has happened.
//
// ── WHAT THIS PINS (2026-09-11) ─────────────────────────────────────────────
//
// The booking page's checkout handler was `void (async () => { … })()`: it
// returned before anything was charged, so the dialog said "Payment Complete —
// $X charged successfully" while the payment was in flight, and said it just
// the same when the payment was refused. And the dialog passed ONE amount with
// the facility's tax folded in, which the charge compared against the pre-tax
// balance — so at any facility that charges tax, every non-terminal checkout
// was refused as "more than is owed".
//
//   1. With GST switched on, a cash checkout charges price + tax, records the
//      tax APART, and the booking settles at its price.
//   2. A refused tender (a gift card that does not exist) keeps the dialog
//      open with the reason on screen, and nothing is recorded.
//   3. Cancelling with a cash refund gives the money back and cancels, in
//      that order, and the dialog closes only then.
//
// ── IT CHANGES THE FACILITY'S TAX, SO IT PUTS IT BACK ───────────────────────
//
// One Postgres, shared with CI. The tax setting is read first and written back
// in afterAll whatever happened; payments are append-only, so a booking this
// spec paid is refunded and cancelled, as booking-payment-screens does.
// ============================================================================

const MARKER = "[e2e checkout-truth]";
// Bob Smith: no membership. Client 15 holds a lapsed Gold membership that a
// discount would otherwise be measured against.
const CLIENT_REF = 16;
const PET_REF = 3;
const AMOUNT = 64;
const SETTINGS = "/api/facility/settings";
const GST = {
  id: "e2e-gst",
  name: "GST",
  rate: 0.05,
  appliesTo: "all",
  registrationNumber: "",
  description: "",
  isCompound: false,
  enabled: true,
};

interface BookingPayload {
  id: number;
  clientId: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  specialRequests?: string;
}

let originalTax: Record<string, unknown> | null = null;

function bookingBody(daysAhead: number) {
  const day = new Date(Date.now() + daysAhead * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    service: "daycare",
    startDate: day,
    endDate: day,
    checkInTime: "09:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: AMOUNT,
    discount: 0,
    totalCost: AMOUNT,
    specialRequests: MARKER,
  };
}

async function readTax(page: Page) {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as Record<
    string,
    { value: Record<string, unknown> } | undefined
  >;
  return body.tax_config?.value ?? null;
}

async function writeTax(page: Page, value: unknown) {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: "tax_config", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function findBooking(page: Page, id: number) {
  const all = (await (
    await page.request.get("/api/bookings")
  ).json()) as BookingPayload[];
  return all.find((b) => b.id === id);
}

async function openCheckout(page: Page, booking: BookingPayload) {
  await page.goto(
    `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
  );
  const open = page.getByRole("button", { name: /accept payment/i }).first();
  await expect(open).toBeVisible({ timeout: 30_000 });
  await open.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    if (originalTax) await writeTax(page, originalTax);

    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    for (const b of bookings ?? []) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled" && (b.amountPaid ?? 0) === 0) continue;
      const paid = b.amountPaid ?? 0;
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

test.describe("the booking checkout tells the truth", () => {
  test("with GST on, cash pays price + tax, the tax is recorded apart, and the booking settles", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    originalTax = await readTax(page);
    await writeTax(page, {
      ...(originalTax ?? {}),
      country: "CA",
      taxes: [GST],
      pricesIncludeTax: false,
    });

    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody(271) })
    ).json()) as BookingPayload;

    const dialog = await openCheckout(page, created);
    // $64 + 5% = $67.20, on the button the money moves from.
    await dialog.getByRole("button", { name: /charge \$67\.20/i }).click();
    await dialog
      .getByRole("button", { name: /confirm & charge \$67\.20/i })
      .click();
    await expect(dialog.getByText(/payment complete/i)).toBeVisible({
      timeout: 20_000,
    });

    // The booking settles at its PRICE: the tax is not counted as paid-for
    // supply, which is what "recorded apart" means in the ledger.
    await expect
      .poll(
        async () => {
          const after = await findBooking(page, created.id);
          return `${after?.paymentStatus}/${Number(after?.amountPaid ?? -1)}`;
        },
        { timeout: 20_000 },
      )
      .toBe(`paid/${AMOUNT}`);
    const payments = (await (
      await page.request.get(`/api/payments?bookingRef=${created.id}`)
    ).json()) as { amount: number }[];
    expect(payments.map((p) => p.amount)).toEqual([67.2]);

    // Back as it was, before the next test measures anything.
    if (originalTax) await writeTax(page, originalTax);
  });

  test("a refused tender keeps the dialog open, says why, and records nothing", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody(272) })
    ).json()) as BookingPayload;

    const dialog = await openCheckout(page, created);
    await dialog
      .getByRole("button", { name: /gift card/i })
      .first()
      .click();
    await dialog.getByLabel(/gift card code/i).fill("E2E-NO-SUCH-CARD");
    await dialog
      .getByRole("button", { name: /charge \$/i })
      .first()
      .click();
    await dialog.getByRole("button", { name: /confirm & charge \$/i }).click();

    // The reason, in the dialog — not "Payment Complete".
    await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByText(/payment complete/i)).toHaveCount(0);
    const after = await findBooking(page, created.id);
    expect(Number(after?.amountPaid ?? -1)).toBe(0);
  });

  test("cancelling with a cash refund gives the money back, then cancels", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody(273) })
    ).json()) as BookingPayload;
    // Part-paid: a refund used to be offered only on a FULLY paid booking.
    const paid = await page.request.post("/api/payments", {
      data: {
        bookingRef: String(created.id),
        method: "cash",
        subtotal: 20,
        tax: 0,
        tip: 0,
        storeCreditApplied: 0,
        packagePassApplied: 0,
        loyaltyDiscountApplied: 0,
        amountCharged: 20,
        grandTotal: 20,
        cashReceived: 20,
        receiptChannels: [],
        creditNote: "",
      },
    });
    expect(paid.status(), await paid.text()).toBe(201);

    await page.goto(
      `/facility/dashboard/clients/${created.clientId}/bookings/${created.id}`,
    );
    await page
      .getByRole("button", { name: /^cancel booking$/i })
      .first()
      .click({ timeout: 30_000 });
    // The confirmation no longer promises a message nobody sends.
    await expect(page.getByText(/not messaged from here/i)).toBeVisible();
    await page
      .getByRole("button", { name: /^cancel booking$/i })
      .last()
      .click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/reason for cancelling/i).fill(MARKER);
    await dialog.locator("#refund-cash").click();
    await dialog
      .getByRole("button", { name: /cancel and refund \$20\.00/i })
      .click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    await expect
      .poll(
        async () => {
          const after = await findBooking(page, created.id);
          return `${after?.status}/${Number(after?.amountPaid ?? -1)}`;
        },
        { timeout: 20_000 },
      )
      .toBe("cancelled/0");
  });
});
