import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The Process Payment button takes a payment.
//
// ── WHAT THIS PROVES THAT THE PREVIOUS SUITE COULD NOT ────────────────────
//
// booking-payment-ledger.spec.ts drives `/api/payments` directly, so it proves
// the ledger and the derivation. It says nothing about whether any BUTTON
// reaches them — and until this change none did. `ProcessPaymentModal` was
// mounted on three screens; two could not be opened at all, and the one that
// could closed itself and called `toast.success`.
//
// So this suite clicks. It opens the booking a customer would be standing at
// the counter for, takes the payment through the dialog, and then re-reads the
// booking through the API to show the money is actually there.
//
// ── IT WRITES TO AN IMMUTABLE TABLE, SO IT REVERSES ───────────────────────
//
// `payments` has no delete policy (20260806220000, Decision 1). Cleanup records
// a refund, which is what a business does.
// ============================================================================

const MARKER = "[e2e payment-screens]";
const CLIENT_REF = 15;
const PET_REF = 1;
const AMOUNT = 64;

interface BookingPayload {
  id: number;
  clientId: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  specialRequests?: string;
}

function bookingBody() {
  const day = new Date(Date.now() + 260 * 86_400_000)
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
    status: "confirmed",
    basePrice: AMOUNT,
    discount: 0,
    totalCost: AMOUNT,
    specialRequests: MARKER,
  };
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

      if ((b.amountPaid ?? 0) > 0) {
        const amount = b.amountPaid ?? 0;
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
        else console.log(`cleanup: refund on #${b.id} -> ${res.status()}`);
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

test.describe("the payment button reaches the ledger", () => {
  test("the bookings list shows a booking made through the API", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The list read `src/data/bookings` into useState until this change, so a
    // booking created through the API was invisible on it — which is the half
    // that makes the write half meaningful.
    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    await page.goto("/facility/dashboard/bookings");
    await expect(
      page.getByText(String(created.id), { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("taking the payment through the dialog moves the booking", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    await page.goto(
      `/facility/dashboard/clients/${created.clientId}/bookings/${created.id}`,
    );

    // The button that opens ProcessPaymentModal. Before this change it opened a
    // dialog whose Confirm closed it and toasted.
    const openPayment = page
      .getByRole("button", { name: /accept payment/i })
      .first();
    await expect(openPayment).toBeVisible({ timeout: 30_000 });
    await openPayment.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    // The dialog names the amount it is about to take.
    await expect(dialog).toContainText(`$${AMOUNT.toFixed(2)}`);

    await dialog
      .getByRole("button", { name: /confirm payment/i })
      .first()
      .click();

    // The proof is not the toast — it is the ledger. Re-read through the API,
    // where `paymentStatus` and `amountPaid` are derived from `payments`.
    await expect
      .poll(
        async () => {
          const all = (await (
            await page.request.get("/api/bookings")
          ).json()) as BookingPayload[];
          const after = all.find((b) => b.id === created.id);
          return `${after?.paymentStatus}/${Number(after?.amountPaid ?? -1)}`;
        },
        { timeout: 20_000, message: "the booking settles from the ledger" },
      )
      .toBe(`paid/${AMOUNT}`);
  });

  test("a settled booking stops offering to be paid", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    const paid = all.find(
      (b) => b.specialRequests?.includes(MARKER) && b.paymentStatus === "paid",
    );
    expect(paid, "the booking settled by the previous test").toBeTruthy();

    await page.goto(
      `/facility/dashboard/clients/${paid!.clientId}/bookings/${paid!.id}`,
    );
    // The card the button lives on has to be on screen first, or "not visible"
    // is just "not rendered yet" and this passes without checking anything.
    await expect(page.getByText(/total/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // `{!isPaid && ...}` — and `isPaid` now comes from the ledger rather than a
    // string somebody set. The guard in `useTakeBookingPayment` (balance <= 0
    // throws) sits behind this one; it is not reachable from here, which is why
    // this test asserts the button is GONE rather than pretending to click it.
    await expect(
      page.getByRole("button", { name: /accept payment/i }),
    ).toHaveCount(0);
  });

  test("a part-paid booking offers the balance, not the price", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    // A quarter of it, recorded straight to the ledger.
    const part = 16;
    const paid = await page.request.post("/api/payments", {
      data: {
        bookingRef: String(created.id),
        method: "cash",
        subtotal: part,
        tax: 0,
        tip: 0,
        storeCreditApplied: 0,
        packagePassApplied: 0,
        loyaltyDiscountApplied: 0,
        amountCharged: part,
        grandTotal: part,
        cashReceived: part,
        receiptChannels: [],
        creditNote: "",
      },
    });
    expect(paid.status(), await paid.text()).toBe(201);

    await page.goto(
      `/facility/dashboard/clients/${created.clientId}/bookings/${created.id}`,
    );
    await page
      .getByRole("button", { name: /accept payment/i })
      .first()
      .click();

    // The dialog used to say `booking.totalCost` — the PRICE — which is $64
    // here and would have taken the customer's money twice over. It names the
    // balance, and the same helper computes what the mutation charges.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(`$${(AMOUNT - part).toFixed(2)}`);
    await expect(dialog).toContainText(/already paid/i);

    await dialog
      .getByRole("button", { name: /confirm payment/i })
      .first()
      .click();

    await expect
      .poll(
        async () => {
          const all = (await (
            await page.request.get("/api/bookings")
          ).json()) as BookingPayload[];
          const after = all.find((b) => b.id === created.id);
          return `${after?.paymentStatus}/${Number(after?.amountPaid ?? -1)}`;
        },
        { timeout: 20_000, message: "the balance settles it exactly" },
      )
      .toBe(`paid/${AMOUNT}`);
  });
});
