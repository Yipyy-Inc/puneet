import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";

// ============================================================================
// Checkout takes a payment, reached the way staff reach it now: check the
// booking in, then Proceed to Checkout.
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

/** This client's bookings, not the facility's ~1,000: a full read can outlast a poll. */
/**
 * ONE booking, by its ref.
 *
 * This asked for the whole client's bookings and searched them, which is
 * narrower than asking for ALL bookings but still not the one row it is
 * holding a ref for — and this client is the one every money spec uses, so its
 * list is the fastest-growing in the facility.
 *
 * MEASURED 2026-09-17: an unbounded `GET /api/bookings` is 16,215-20,484 ms
 * over 1,499 rows against `?ref=<n>` at 1,194-1,367 ms. The poll below has a
 * 30-second budget and calls this repeatedly.
 */
async function readBooking(page: Page, ref: number) {
  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  const body = await res.text();
  let rows: unknown = null;
  try {
    rows = JSON.parse(body) as unknown;
  } catch {
    // Not JSON — the warning below carries the text.
  }
  if (!res.ok() || !Array.isArray(rows)) {
    // `undefined` rather than a throw, because the callers poll and a single
    // bad answer should be retried. But it is SAID: every call site used to
    // cast the body to an array and then `.find` on it, so a 500 arrived as
    // "TypeError: all.find is not a function" — naming neither the request nor
    // the status nor the message. That is how a statement timeout hid.
    console.warn(
      `GET /api/bookings?ref=${ref} -> ${res.status()} ${body.slice(0, 300)}`,
    );
    return undefined;
  }
  return (rows as BookingPayload[]).find((b) => b.id === ref);
}

/**
 * Open checkout the way staff reach it now: check the pet in on the daycare
 * floor (the attendance write — a direct status PATCH is refused for a
 * service that tracks arrival), then press "Check {pet} out", which is the till
 * while money is owed, through the care gate when care is unlogged.
 */
async function openCheckout(page: Page, ref: number, clientId: number) {
  const checkedIn = await page.request.post("/api/daycare/attendance", {
    data: { bookingRef: ref },
  });
  expect(checkedIn.ok(), await checkedIn.text()).toBe(true);
  await page.goto(`/facility/dashboard/clients/${clientId}/bookings/${ref}`);
  const proceed = page.getByRole("button", { name: /^check .+ out$/i }).first();
  await expect(proceed).toBeVisible({ timeout: 30_000 });
  await proceed.click();
  const gate = page.getByRole("alertdialog");
  const gated = await gate.waitFor({ state: "visible", timeout: 3_000 }).then(
    () => true,
    () => false,
  );
  if (gated)
    await gate.getByRole("button", { name: /continue anyway/i }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: /take payment/i });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

test.describe.configure({ mode: "serial" });

/**
 * The booking the settling test settled, for the two tests that follow it.
 *
 * They ran in serial mode and depended on it already — "the booking settled by
 * the previous test" was in the assertion message — but expressed that by
 * re-finding it: `GET /api/bookings?clientRef=${CLIENT_REF}`, then a `.find`
 * over the answer. That client is the one every money spec uses and it is up to
 * 1,049 bookings, so the read took long enough for POSTGRES to cancel it:
 *
 *   GET /api/bookings?clientRef=15 -> 500
 *   {"error":"canceling statement due to statement timeout"}
 *
 * which the old naked cast then reported as `TypeError: all.find is not a
 * function`. Carrying the ref makes the dependency explicit and turns a
 * thousand-row scan into a single-row read.
 */
let settledRef: number | null = null;

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // Found by marker in the database. This read `?clientRef=15`, which is
    // Alice — 1,496 bookings, 1,471 of them earlier runs — and it answered a
    // statement timeout. The shape check turned that into an empty list, so
    // the cleanup reported "0 refund(s), 0 cancellation(s)" and left the run's
    // paid bookings standing (2026-09-25). See `bookingsMarked`.
    let reversed = 0;
    let cancelled = 0;
    for (const b of await bookingsMarked(MARKER)) {
      if (b.amountPaid > 0) {
        const amount = b.amountPaid;
        const res = await page.request.post("/api/payments", {
          data: {
            bookingRef: String(b.ref),
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
        else console.log(`cleanup: refund on #${b.ref} -> ${res.status()}`);
      }
      if (b.status === "cancelled") continue;
      const cancel = await page.request.patch(`/api/bookings/${b.ref}`, {
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
    // SEARCHED FOR, not expected on page one. The list is newest-date first,
    // and every test booking that took money stays forever (payments are
    // append-only, so the purge cannot remove it) — by 2026-09-12 nineteen of
    // them sat further in the future than this one and pushed it off the
    // first page. Its number is what makes it this booking; search by it.
    await page
      .getByPlaceholder(/search by booking number/i)
      .first()
      .fill(String(created.id), { timeout: 30_000 });
    await expect(
      page.getByText(String(created.id), { exact: false }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("taking the payment through the dialog moves the booking", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);

    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    const dialog = await openCheckout(page, created.id, created.clientId);
    // The dialog names the amount it is about to take.
    await expect(dialog).toContainText(`$${AMOUNT.toFixed(2)}`);

    // ── TAKING MONEY IS TWO PRESSES, AND THE TEST HAS TO MAKE BOTH ────────
    //
    // `PaymentCheckoutFlow` arms on the first press ("Charge $X") and
    // charges on the second ("Confirm and charge $X"), which is deliberate: the
    // button that moves real money is not the one under a cursor that was
    // already heading there.
    //
    // This spec looked for `/confirm payment/i`, a label from the dialog this
    // flow REPLACED, and so it clicked nothing and timed out waiting. It runs
    // in neither `test:e2e:gate` nor `test:e2e:ci`, so nothing executed it and
    // the rot was invisible. Matching on `/charge/i` now — the word both
    // presses share and the one that actually describes what happens.
    const charge = dialog.getByRole("button", { name: /charge \$/i }).first();
    await expect(charge).toBeVisible();
    await charge.click();
    // Same locator, second press: the label changes, the button does not.
    await expect(
      dialog.getByRole("button", { name: /confirm and charge \$/i }),
    ).toBeVisible();
    await dialog
      .getByRole("button", { name: /confirm and charge \$/i })
      .first()
      .click();

    // The proof is not the toast — it is the ledger. Re-read through the API,
    // where `paymentStatus` and `amountPaid` are derived from `payments`.
    await expect
      .poll(
        async () => {
          const after = await readBooking(page, created.id);
          return `${after?.paymentStatus}/${Number(after?.amountPaid ?? -1)}`;
        },
        { timeout: 30_000, message: "the booking settles from the ledger" },
      )
      .toBe(`paid/${AMOUNT}`);

    // The next test is about THIS booking. Saying so is what lets it ask for
    // one row instead of searching a client's entire history for it.
    settledRef = created.id;
  });

  test("a settled booking stops offering to be paid", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    expect(settledRef, "the previous test settled a booking").toBeTruthy();
    const paid = await readBooking(page, settledRef!);
    expect(paid?.paymentStatus, "that booking is settled").toBe("paid");

    await page.goto(
      `/facility/dashboard/clients/${paid!.clientId}/bookings/${paid!.id}`,
    );
    // The card the button lives on has to be on screen first, or "not visible"
    // is just "not rendered yet" and this passes without checking anything.
    await expect(page.getByText(/total/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // A settled booking offers no checkout: the action bar has no primary action
    // once the ledger says paid, and Pay by card needs a balance.
    await expect(
      page.getByRole("button", { name: /^check .+ out$|^take payment$/i }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: /pay by card/i })).toHaveCount(
      0,
    );
  });

  test("a part-paid booking offers the balance, not the price", async ({
    page,
  }) => {
    test.slow();
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

    // The dialog used to say `booking.totalCost` — the PRICE — which is $64
    // here and would have taken the customer's money twice over. It names the
    // balance, and the same helper computes what the mutation charges.
    const dialog = await openCheckout(page, created.id, created.clientId);
    await expect(dialog).toContainText(`$${(AMOUNT - part).toFixed(2)}`);
    await expect(dialog).toContainText(/already paid/i);

    // Two presses, as above — and here the SECOND one is the assertion that
    // matters: its label carries the figure, so `Confirm and charge $48.00`
    // proves the button about to move money names the balance and not the
    // price. That is the whole point of this test.
    await dialog
      .getByRole("button", { name: /charge \$/i })
      .first()
      .click();
    await dialog
      .getByRole("button", {
        name: `Confirm and charge $${(AMOUNT - part).toFixed(2)}`,
      })
      .click();

    await expect
      .poll(
        async () => {
          const after = await readBooking(page, created.id);
          return `${after?.paymentStatus}/${Number(after?.amountPaid ?? -1)}`;
        },
        { timeout: 30_000, message: "the balance settles it exactly" },
      )
      .toBe(`paid/${AMOUNT}`);
  });
});
