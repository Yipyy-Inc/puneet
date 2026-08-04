import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Collect Payment settles the bookings it lists.
//
// ── THE TWO BUGS THIS COVERS ───────────────────────────────────────────────
//
// 1. `onConfirm={() => {}}` on the client overview. The button opened a dialog,
//    you confirmed, and nothing was sent anywhere.
//
// 2. The dialog printed a receipt reading "PAYMENT COMPLETE · All N invoices
//    marked as paid" and toasted success BEFORE and REGARDLESS of any write.
//    Combined with (1), the receipt was the only thing that happened — a
//    customer could leave holding paper for money nobody recorded.
//
// The second is why these tests check the LEDGER after clicking, and why the
// last one asserts that a failure prints nothing.
//
// ── IT WRITES TO AN IMMUTABLE TABLE, SO IT REVERSES ───────────────────────
//
// `payments` has no delete policy (20260806220000, Decision 1). Cleanup
// records refunds and cancels.
// ============================================================================

const MARKER = "[e2e bulk-payment]";
const CLIENT_REF = 15;
const PET_REF = 1;
const AMOUNTS = [40, 25, 15];

interface BookingPayload {
  id: number;
  clientId: number;
  status?: string;
  paymentStatus?: string;
  amountPaid?: number;
  totalCost?: number;
  specialRequests?: string;
}

function bookingBody(total: number) {
  const day = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "daycare",
    startDate: day,
    endDate: day,
    checkInTime: "09:00",
    checkOutTime: "17:00",
    // `completed` so it counts toward the overdue banner — that is the
    // definition the bulk dialog is reached through (20260806780000).
    status: "completed",
    basePrice: total,
    discount: 0,
    totalCost: total,
    specialRequests: MARKER,
  };
}

async function mine(
  page: import("@playwright/test").Page,
): Promise<BookingPayload[]> {
  const res = await page.request.get("/api/bookings");
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as BookingPayload[];
  return all.filter((b) => b.specialRequests?.includes(MARKER));
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    let reversed = 0;
    let cancelled = 0;
    for (const b of await mine(page)) {
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

test.describe("collecting several payments at once", () => {
  test.slow(); // the overview page compiles on first hit — see client-balance.spec.ts

  test("the button settles every booking it listed", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    for (const amount of AMOUNTS) {
      const res = await page.request.post("/api/bookings", {
        data: bookingBody(amount),
      });
      expect(res.status(), await res.text()).toBe(201);
    }
    const owed = AMOUNTS.reduce((a, b) => a + b, 0);

    await page.goto(`/facility/dashboard/clients/${CLIENT_REF}/overview`);
    await expect(page.getByText(/no upcoming appointments/i)).toHaveCount(0, {
      timeout: 60_000,
    });

    // The receipt opens a popup. Swallow it so the run does not leave windows
    // behind, and so a receipt that should NOT appear can be detected.
    const popups: unknown[] = [];
    page.on("popup", (p) => {
      popups.push(p);
      void p.close();
    });

    await page.getByRole("button", { name: /collect payment/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: /continue/i }).click();
    await dialog.getByRole("button", { name: /confirm & charge/i }).click();

    // The ledger, not the toast. Every one of the three is settled, and the
    // amounts match — the RPC computed them, the screen did not send them.
    await expect
      .poll(
        async () => {
          const created = (await mine(page)).filter(
            (b) => b.status === "completed",
          );
          return created
            .map((b) => Number(b.amountPaid ?? 0))
            .sort((a, b) => a - b)
            .join(",");
        },
        { timeout: 25_000, message: "all three bookings settle" },
      )
      .toBe([...AMOUNTS].sort((a, b) => a - b).join(","));

    expect(popups.length, "one receipt, after the money").toBe(1);

    // The banner is the thing that sent us here, and it should now be gone.
    await expect
      .poll(
        async () => {
          const res = await page.request.get("/api/clients");
          const all = (await res.json()) as {
            id: number;
            outstandingBalance?: number;
          }[];
          return Number(
            all.find((c) => c.id === CLIENT_REF)?.outstandingBalance ?? -1,
          );
        },
        { timeout: 20_000, message: "the client's balance comes down" },
      )
      .toBeLessThan(owed);
  });

  test("a refused batch prints nothing and takes nothing", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/bookings", {
      data: bookingBody(33),
    });
    expect(res.status(), await res.text()).toBe(201);
    const created = (await res.json()) as BookingPayload;

    // A batch naming one real booking and one that does not exist. The route
    // refuses the WHOLE thing — the alternative is charging some of what the
    // operator selected and reporting success.
    const refused = await page.request.post("/api/payments/bulk", {
      data: { bookingRefs: [created.id, 99_999_999], method: "card" },
    });
    expect(refused.status()).toBe(404);
    expect(((await refused.json()) as { error?: string }).error).toContain(
      "99999999",
    );

    const after = (await mine(page)).find((b) => b.id === created.id);
    expect(
      Number(after?.amountPaid ?? -1),
      "nothing was taken from the real one",
    ).toBe(0);
  });

  test("a booking already settled is skipped, not charged twice", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/bookings", {
      data: bookingBody(28),
    });
    const created = (await res.json()) as BookingPayload;

    // Settle it on its own first.
    const first = await page.request.post("/api/payments/bulk", {
      data: { bookingRefs: [created.id], method: "terminal" },
    });
    expect(first.status(), await first.text()).toBe(201);
    expect((await first.json()).total).toBe(28);

    // Now ask again. It owes nothing, so it comes back absent rather than as a
    // second charge — and the caller can see the difference.
    const second = await page.request.post("/api/payments/bulk", {
      data: { bookingRefs: [created.id], method: "terminal" },
    });
    expect(second.status(), await second.text()).toBe(201);
    const body = (await second.json()) as {
      settled: unknown[];
      total: number;
    };
    expect(body.settled.length, "absent, not zero").toBe(0);
    expect(body.total).toBe(0);

    const after = (await mine(page)).find((b) => b.id === created.id);
    expect(Number(after?.amountPaid ?? -1), "charged once").toBe(28);
  });
});
