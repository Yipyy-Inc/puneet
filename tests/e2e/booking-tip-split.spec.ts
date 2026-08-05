import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The tip split is recorded.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `<TipSplitModal onSave={() => {}} />`. The modal computed the split four
// ways, refused to submit unless the allocations balanced to the cent, said
// "Tip split saved", and threw the result away. The tip was real money —
// `payments.tip` — and who earned it was recorded nowhere.
//
// The staff it offered to split between were five hardcoded strings.
//
// ── WHAT THIS SUITE CHECKS ────────────────────────────────────────────────
//
//   * the split survives a reload, which `onSave={() => {}}` never could;
//   * you cannot allocate more than the tip that was collected;
//   * saving again REPLACES the split rather than adding to it;
//   * a staff member the facility does not employ is refused.
// ============================================================================

const MARKER = "[e2e tip-split]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
}

interface TipsPayload {
  tipCollected: number;
  method: string | null;
  allocations: { id: string; staffId: string; amount: number }[];
}

interface StaffPayload {
  id: string;
  rowId?: string;
  firstName: string;
  lastName: string;
  status: string;
}

const TIP = 24;

function bookingBody() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    // Daycare, not grooming: a groom must name a service (20260806560000) and
    // this suite is about tips, not about the grooming menu.
    service: "daycare",
    startDate: today,
    endDate: today,
    checkInTime: "08:00",
    checkOutTime: "17:00",
    status: "completed",
    basePrice: 80,
    discount: 0,
    totalCost: 80,
    specialRequests: MARKER,
  };
}

async function tips(
  page: import("@playwright/test").Page,
  ref: number,
): Promise<TipsPayload> {
  const res = await page.request.get(`/api/bookings/${ref}/tips`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as TipsPayload;
}

/**
 * Two real staff members, by their ROW ids.
 *
 * `id` on this payload is the legacy string ("fs-003"); `rowId` is the uuid the
 * foreign key needs. Sending the wrong one is a 422 from the database, which is
 * the point of it being a foreign key at all.
 */
async function twoStaff(
  page: import("@playwright/test").Page,
): Promise<string[]> {
  const res = await page.request.get("/api/staff");
  expect(res.ok(), await res.text()).toBe(true);
  const staff = (await res.json()) as StaffPayload[];
  const usable = staff.filter((s) => s.status === "active" && s.rowId);
  expect(usable.length, "at least two active staff").toBeGreaterThanOrEqual(2);
  return [usable[0].rowId!, usable[1].rowId!];
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    let cancelled = 0;
    for (const b of all) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled") continue;
      // Allocations cascade with the booking; cancelling is enough to take it
      // off every screen, and nothing here deletes bookings.
      const res = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
    }
    console.log(`cleanup: ${cancelled} booking(s) cancelled`);
  } finally {
    await page.close();
  }
});

test.describe("the tip split", () => {
  test.slow();

  let bookingRef = 0;
  let staffA = "";
  let staffB = "";

  test("a tip with nobody named yet", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    [staffA, staffB] = await twoStaff(page);

    const created = await page.request.post("/api/bookings", {
      data: bookingBody(),
    });
    expect(created.status(), await created.text()).toBe(201);
    bookingRef = ((await created.json()) as BookingPayload).id;

    // The money arrives first. This is the half that always worked.
    const paid = await page.request.post("/api/payments", {
      data: {
        bookingRef: String(bookingRef),
        method: "terminal",
        subtotal: 80,
        tax: 0,
        tip: TIP,
        storeCreditApplied: 0,
        packagePassApplied: 0,
        loyaltyDiscountApplied: 0,
        amountCharged: 80 + TIP,
        grandTotal: 80 + TIP,
        receiptChannels: [],
        creditNote: "",
      },
    });
    expect(paid.ok(), await paid.text()).toBe(true);

    const state = await tips(page, bookingRef);
    expect(state.tipCollected, "the ledger has the tip").toBeCloseTo(TIP, 2);
    expect(state.allocations, "and nobody is named yet").toHaveLength(0);
  });

  test("more than was collected is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.put(`/api/bookings/${bookingRef}/tips`, {
      data: {
        method: "equal",
        allocations: [{ staffId: staffA, amount: TIP + 100 }],
      },
    });
    // A conflict: the request is well formed and the state refuses it.
    expect(res.status(), await res.text()).toBe(409);
    expect(((await res.json()) as { error?: string }).error).toContain(
      "exceed the tips collected",
    );

    expect(
      (await tips(page, bookingRef)).allocations,
      "and nothing was written",
    ).toHaveLength(0);
  });

  test("a staff member this facility does not employ is refused", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.put(`/api/bookings/${bookingRef}/tips`, {
      data: {
        method: "equal",
        allocations: [
          { staffId: "00000000-0000-0000-0000-00000000dead", amount: 5 },
        ],
      },
    });
    expect(res.status(), await res.text()).toBe(422);
    expect((await tips(page, bookingRef)).allocations).toHaveLength(0);
  });

  test("the split is written, and survives a reload", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.put(`/api/bookings/${bookingRef}/tips`, {
      data: {
        method: "by_service",
        allocations: [
          { staffId: staffA, amount: 14 },
          { staffId: staffB, amount: 10 },
        ],
      },
    });
    expect(res.ok(), await res.text()).toBe(true);

    // The assertion `onSave={() => {}}` could never have passed: a second
    // request, from a fresh page, reading rows that outlived the modal.
    const state = await tips(page, bookingRef);
    expect(state.allocations).toHaveLength(2);
    expect(state.method).toBe("by_service");
    expect(
      state.allocations.reduce((sum, a) => sum + a.amount, 0),
      "and it adds up to the tip",
    ).toBeCloseTo(TIP, 2);
    expect(state.allocations.map((a) => a.staffId).sort()).toEqual(
      [staffA, staffB].sort(),
    );
  });

  test("saving again replaces the split rather than adding to it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The second groomer is taken off entirely.
    const res = await page.request.put(`/api/bookings/${bookingRef}/tips`, {
      data: {
        method: "custom_amount",
        allocations: [{ staffId: staffA, amount: TIP }],
      },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const state = await tips(page, bookingRef);
    expect(state.allocations, "one row, not three").toHaveLength(1);
    expect(state.allocations[0].staffId).toBe(staffA);
    expect(state.allocations[0].amount).toBeCloseTo(TIP, 2);
    expect(state.method).toBe("custom_amount");
  });

  test("the booking page shows the tip that was actually collected", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    await page.goto(
      `/facility/dashboard/clients/${CLIENT_REF}/bookings/${bookingRef}`,
    );
    // The modal's total used to be `invoice?.tipTotal ?? 0`, and before that
    // `?? 5` — a five-dollar tip conjured at render time. It is the ledger's
    // figure now, which is the same number the write path measures against.
    const state = await tips(page, bookingRef);
    expect(state.tipCollected).toBeCloseTo(TIP, 2);
  });
});
