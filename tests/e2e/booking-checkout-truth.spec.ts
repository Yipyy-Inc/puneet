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

/**
 * Every booking the session can see.
 *
 * A read that answers with an error is retried twice, then fails naming the
 * status and body. It used to be cast straight to an array, so a 500 under
 * load surfaced as "all.find is not a function" — and in the cleanup, as a
 * crash that left the run's paid bookings behind.
 */
async function listBookings(
  page: Page,
  search = "",
): Promise<BookingPayload[]> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await page.request.get(`/api/bookings${search}`);
    const body = await res.text();
    if (res.ok()) {
      const parsed = JSON.parse(body) as unknown;
      if (Array.isArray(parsed)) return parsed as BookingPayload[];
    }
    last = `${res.status()} ${body.slice(0, 300)}`;
    await page.waitForTimeout(2_000);
  }
  throw new Error(`GET /api/bookings did not return a list: ${last}`);
}

/**
 * ONE booking, asked for by ref — not found by reading every booking there is.
 *
 * MEASURED 2026-09-17, as the owner against the e2e facility: an unbounded
 * `GET /api/bookings` takes 16,215-20,484 ms and returns 1,499 rows, while the
 * same read as `?ref=<n>` takes 1,194-1,367 ms. Fifteen times. The route pages
 * PostgREST in 1000-row chunks, so the unbounded read is two sequential round
 * trips plus the mapping of every row, and the suite's own cleanup CANCELS its
 * bookings rather than deleting them, so that number grows with every run.
 *
 * It matters most here because this is called inside `expect.poll(...)` with a
 * 20-second budget: one iteration of the poll cost MORE than the whole budget,
 * so the poll could not reliably complete a single cycle. That is why this
 * spec failed intermittently and read as a regression in whatever change
 * happened to be in the tree.
 *
 * The assertion is unchanged — it still asks the API what the booking looks
 * like now. It just stops asking about 1,498 other bookings first.
 */
async function findBooking(page: Page, id: number) {
  return (await listBookings(page, `?ref=${id}`)).find((b) => b.id === id);
}

async function openCheckout(page: Page, booking: BookingPayload) {
  await page.goto(
    `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
  );
  const open = page.getByRole("button", { name: /take payment/i }).first();
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

    // Every booking this file creates is CLIENT_REF's, and the unbounded read
    // is the 16-20s one that Postgres kills for a busier client (see the note
    // on findBooking). Teardown is not exempt: listBookings asserts res.ok(),
    // so a 500 here fails the run after the assertions all passed.
    const bookings = await listBookings(page, `?clientRef=${CLIENT_REF}`);
    // A refused refund used to be ignored, and every paid booking it left
    // behind was walked again on the next run — 88 of them by 2026-09-14.
    // Each answer is read now, and the run fails naming what it left.
    const refused: string[] = [];
    for (const b of bookings ?? []) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled" && (b.amountPaid ?? 0) === 0) continue;
      const paid = b.amountPaid ?? 0;
      if (paid > 0) {
        const refund = await page.request.post("/api/payments", {
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
            // payments_cash_shape: a cash row says what changed hands.
            cashReceived: -paid,
            receiptChannels: [],
            creditNote: "e2e cleanup",
          },
        });
        if (!refund.ok()) {
          refused.push(`refund ${b.id}: ${await refund.text()}`);
        }
      }
      await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
    }
    expect(refused, "cleanup left paid bookings behind").toEqual([]);
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
      .getByRole("button", { name: /confirm and charge \$67\.20/i })
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
    await dialog.getByRole("button", { name: /confirm and charge \$/i }).click();

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
    // One step since 2026-09-18: the cancel dialog IS the confirmation — it
    // asks for the reason and the refund, and says what it will not do.
    await page
      .getByRole("button", { name: /^cancel booking$/i })
      .first()
      .click({ timeout: 30_000 });

    const dialog = page.getByRole("dialog");
    // It no longer promises a message nobody sends.
    await expect(dialog.getByText(/not messaged from here/i)).toBeVisible();
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

  test("a tip the booking carries starts a tender that takes tips, and cash only reminds", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    // A booking carrying a $10 tip: the owner's pledge from the pre-arrival
    // form lands in the same column (yipyy_go_pledge_tip).
    const created = (await (
      await page.request.post("/api/bookings", {
        data: { ...bookingBody(274), tipAmount: 10 },
      })
    ).json()) as BookingPayload;

    const dialog = await openCheckout(page, created);
    // Cash is the default tender. It never adds the tip; it says the booking
    // carries one.
    await expect(dialog.getByText(/carries a \$10\.00 tip/)).toBeVisible();
    const cashLabel = await dialog
      .getByRole("button", { name: /^charge \$/i })
      .first()
      .textContent();
    const cash = Number(
      /\$([\d,]+\.\d\d)/.exec(cashLabel ?? "")?.[1]?.replace(/,/g, ""),
    );
    expect(cash).toBeGreaterThan(0);

    // A tender that takes a tip here starts at the booking's tip.
    await dialog.getByRole("button", { name: /e-transfer/i }).click();
    await expect(dialog.getByText(/already added below/)).toBeVisible();
    await expect(
      dialog
        .getByRole("button", {
          name: new RegExp(
            `^charge \\$${(cash + 10).toFixed(2)}`,
            "i",
          ),
        })
        .first(),
    ).toBeVisible();

    // Nothing was taken by looking: the booking is still unpaid.
    await page.keyboard.press("Escape");
    const after = await findBooking(page, created.id);
    expect(Number(after?.amountPaid ?? -1)).toBe(0);
  });
});
