import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// WHAT A DISCOUNTED BOOKING COSTS.
//
// `bookings.amount_due` is GENERATED as
// `greatest(0, total_cost + extras_total - coalesce(discount, 0))`, so the
// database subtracts the discount itself. Until 2026-09-24 the booking form
// sent a `total_cost` that ALREADY had the discount off, and the discount was
// taken twice: a booking posted as `basePrice 100, discount 20, totalCost 80`
// came back owing $60 against a quote of $80. Measured, not inferred.
//
// Worse, a green gate pinned it — `booking-form-saves.spec.ts` asserted
// `totalCost === basePrice - discount`. This file pins the other side of the
// same relationship so the two cannot drift apart again.
//
// ── WHAT THIS FILE CANNOT PROVE ───────────────────────────────────────────
//
// `/api/bookings` accepts `basePrice`, `discount` and `totalCost` from the
// caller, so no request made here can reveal what the booking FORM computed.
// The same limitation `boarding-pricing.spec.ts` states about `basePrice`.
// What it proves is the contract every caller has to meet, and that the
// database honours it — which is where the money was going missing.
//
// ── IT PUTS THE FACILITY'S PRICING RULES BACK ────────────────────────────
//
// One Postgres, and CI writes to it. `pricing_rules` is read in `beforeAll`
// and written back in `afterAll` WHATEVER HAPPENED, and every booking made is
// cancelled — the shape `service-charges.spec.ts` uses, for the same reason.
// ============================================================================

const MARKER = "[e2e discount-rules]";
const SETTINGS = "/api/facility/settings";
const ALICE = { client: 15, pet: 1 };

interface BookingPayload {
  id: number;
  basePrice?: number;
  discount?: number;
  totalCost?: number;
  extrasTotal?: number;
  amountDue?: number;
  specialRequests?: string;
  status?: string;
}

/** The first and last day of next month, as YYYY-MM-DD. */
function nextMonthWindow(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;
  return { from: iso(first), to: iso(last) };
}

/** Live bookings carrying this file's marker, asked of the database. */
async function strays(page: Page): Promise<number[]> {
  const month = nextMonthWindow();
  const res = await page.request.get(
    `/api/bookings?clientRef=${ALICE.client}&from=${month.from}&to=${month.to}`,
  );
  if (!res.ok()) return [];
  const body: unknown = await res.json();
  if (!Array.isArray(body)) return [];
  return (body as BookingPayload[])
    .filter(
      (b) =>
        typeof b.specialRequests === "string" &&
        b.specialRequests.includes(MARKER) &&
        b.status !== "cancelled",
    )
    .map((b) => b.id);
}

let originalPricingRules: Record<string, unknown> | null = null;
const made: number[] = [];

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function readPricingRules(page: Page) {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as Record<
    string,
    { value: Record<string, unknown> } | undefined
  >;
  return body.pricing_rules?.value ?? null;
}

async function writePricingRules(page: Page, value: unknown) {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: "pricing_rules", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function book(
  page: Page,
  money: { basePrice: number; discount: number; totalCost: number },
  offset = 60,
): Promise<{ status: number; ref: number | null; body: string }> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE.client,
      petId: ALICE.pet,
      facilityId: 0,
      service: "boarding",
      startDate: day(offset),
      endDate: day(offset + 2),
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "confirmed",
      ...money,
      specialRequests: MARKER,
    },
    failOnStatusCode: false,
  });
  const body = await res.text();
  if (res.status() !== 201) return { status: res.status(), ref: null, body };
  const ref = (JSON.parse(body) as { id: number }).id;
  made.push(ref);
  return { status: 201, ref, body };
}

async function booking(
  page: Page,
  ref: number,
): Promise<BookingPayload | null> {
  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  if (!res.ok()) return null;
  const body: unknown = await res.json();
  return Array.isArray(body) ? ((body[0] as BookingPayload) ?? null) : null;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    originalPricingRules = await readPricingRules(page);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    if (originalPricingRules)
      await writePricingRules(page, originalPricingRules);
    // ── THE SWEEP IS NOT ALLOWED TO DEPEND ON THE TEST PASSING ───────
    //
    // `made` is filled by the tests themselves, so a test that fails
    // BETWEEN creating a booking and recording it leaves the booking
    // behind — which is exactly what happened on 2026-09-24: the wizard
    // test timed out waiting for its toast, two real bookings had already
    // been written, and nothing here knew about them. One Postgres, shared
    // with CI, so they had to be found by hand.
    //
    // Asking the database what carries the marker cannot go stale that
    // way. Alice's own list is big enough to hit the statement timeout
    // unscoped, so it is scoped to the window the wizard books into.
    for (const ref of await strays(page)) made.push(ref);

    let cancelled = 0;
    for (const ref of new Set(made)) {
      const res = await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
    }
    console.log(
      `cleanup: pricing rules restored, ${cancelled}/${new Set(made).size} booking(s) cancelled`,
    );
  } finally {
    await page.close();
  }
});

test.describe("what a discounted booking costs", () => {
  test("a GROSS total_cost is discounted exactly once", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const { status, ref, body } = await book(page, {
      basePrice: 100,
      discount: 20,
      totalCost: 100, // gross — the price before the discount
    });
    expect(status, body).toBe(201);

    const after = await booking(page, ref!);
    expect(after?.totalCost, "stored as sent").toBe(100);
    expect(after?.discount).toBe(20);
    // THE ASSERTION. 100 − 20, not 100 − 20 − 20.
    expect(after?.amountDue, "the discount comes off once").toBe(80);
  });

  test("the customer owes nothing rather than a negative amount", async ({
    page,
  }) => {
    // `amount_due` is clamped with `greatest(0, …)`. A discount equal to the
    // whole price settles the bill; it never becomes money owed back.
    await signIn(page, ACCOUNTS.owner);
    const { status, ref, body } = await book(
      page,
      { basePrice: 60, discount: 60, totalCost: 60 },
      63,
    );
    expect(status, body).toBe(201);
    expect((await booking(page, ref!))?.amountDue).toBe(0);
  });

  test("a discount larger than the price is refused, not clamped away", async ({
    page,
  }) => {
    // `bookings_discount_within_price`. Worth pinning because narrowing
    // `best_only` on 2026-09-24 made a bigger `discountTotal` reachable, so
    // this constraint went from theoretical to something a real booking can
    // hit — and it should surface as a refusal, not a silent adjustment.
    await signIn(page, ACCOUNTS.owner);
    const { status, ref } = await book(
      page,
      { basePrice: 40, discount: 150, totalCost: 40 },
      66,
    );
    expect(ref, "nothing was created").toBeNull();
    expect(status).toBeGreaterThanOrEqual(400);
  });

  test("a discount and a service charge on one booking both land", async ({
    page,
  }) => {
    // The two features meeting. The fee ADDS through `extras_total`, the
    // discount SUBTRACTS, and `amount_due` is the whole sentence:
    // 200 + 15 − 30 = 185.
    await signIn(page, ACCOUNTS.owner);
    await writePricingRules(page, {
      ...(originalPricingRules ?? {}),
      customFees: [
        {
          id: "e2e-disc-fee",
          name: `${MARKER} Cleaning`,
          amount: 15,
          feeType: "flat",
          scope: "per_booking",
          autoApply: "at_checkout",
          applicableServices: ["all"],
          isActive: true,
        },
      ],
    });

    const { status, ref, body } = await book(
      page,
      { basePrice: 200, discount: 30, totalCost: 200 },
      69,
    );
    expect(status, body).toBe(201);

    const after = await booking(page, ref!);
    expect(after?.totalCost, "the service, gross").toBe(200);
    expect(after?.extrasTotal, "the fee is an extra, not the price").toBe(15);
    expect(after?.amountDue, "200 + 15 − 30").toBe(185);
  });
});

// ============================================================================
// THE WRITER'S HALF — the only test that asks the FORM what a discount costs.
//
// Everything above posts `discount` and `totalCost` itself, so none of it can
// reveal what `BookingModal` computed. This one authors a real rule, drives
// the real wizard, and reads back what the wizard chose to send.
//
// It fires a MULTI-NIGHT rule on DAYCARE, which looks odd and is deliberate:
// `sessionUnits` is the number of daycare days, so a two-day booking of ONE
// pet crosses a `minNights: 2` threshold. A multi-pet rule would have needed a
// second dog, a second play-area assignment and four bookings instead of two —
// more of the wizard to drive for the same one assertion.
//
// The two days are next month's SECOND Tuesday and Wednesday, because
// `booking-form-saves.spec.ts` books Alice's Buddy into the FIRST ones.
// ============================================================================

/** Next month's second Tuesday, and the Wednesday after it. */
function nextMonthSecondTuesdayAndWednesday(): [number, number] {
  const now = new Date();
  let seen = 0;
  for (let d = 1; d <= 21; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 1, d);
    if (day.getDay() === 2) {
      seen += 1;
      if (seen === 2) return [d, d + 1];
    }
  }
  return [9, 10];
}

test.describe("what the booking FORM writes for a discounted booking", () => {
  test("a rule the facility authored reaches the bill, exactly once", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);

    // $10 off two or more daycare days. Flat, so the assertion does not
    // depend on what this facility charges for a day.
    await writePricingRules(page, {
      ...(originalPricingRules ?? {}),
      multiNightDiscounts: [
        {
          id: "e2e-disc-nights",
          name: `${MARKER} Two days`,
          minNights: 2,
          maxNights: null,
          discountPercent: 0,
          discountMode: "flat",
          discountAmount: 10,
          applicableServices: ["daycare"],
          isActive: true,
        },
      ],
    });

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

    await dialog
      .locator("button:has(svg.lucide-chevron-right)")
      .first()
      .click();
    const [first, second] = nextMonthSecondTuesdayAndWednesday();
    await dialog
      .getByRole("button", { name: String(first), exact: true })
      .click();
    await dialog
      .getByRole("button", { name: String(second), exact: true })
      .click();
    await dialog.getByRole("button", { name: /^next$/i }).click();

    await dialog
      .locator("div.group.bg-card.rounded-2xl.cursor-pointer")
      .first()
      .click();
    const create = dialog.getByRole("button", { name: /^create booking$/i });
    for (let i = 0; i < 6 && !(await create.isVisible()); i += 1) {
      await dialog.getByRole("button", { name: /^(next|skip)$/i }).click();
    }

    await dialog.getByLabel(/special requests/i).fill(`${MARKER} wizard`);
    await create.click();

    // TWO MINUTES, and measured rather than guessed: at 30 seconds this
    // failed with the button still reading "Saving…" while the two
    // bookings had in fact been written. The form posts one request per
    // day and this facility holds ~1,500 bookings.
    await expect(page.getByText(/2 bookings created/i)).toBeVisible({
      timeout: 120_000,
    });
    await expect(dialog).toBeHidden();

    // Alice alone, and only next month: her whole list is big enough to be
    // cancelled by the statement timeout.
    const month = nextMonthWindow();
    const res = await page.request.get(
      `/api/bookings?clientRef=${ALICE.client}&from=${month.from}&to=${month.to}`,
    );
    expect(res.ok(), await res.text()).toBe(true);
    const body: unknown = await res.json();
    const made2 = (
      Array.isArray(body) ? (body as BookingPayload[]) : []
    ).filter(
      (b) =>
        typeof b.specialRequests === "string" &&
        b.specialRequests.includes(`${MARKER} wizard`) &&
        b.status !== "cancelled",
    );
    for (const b of made2) made.push(b.id); // cancelled by afterAll

    expect(made2, "two days, two bookings").toHaveLength(2);

    const sum = (pick: (b: BookingPayload) => number) =>
      Math.round(made2.reduce((s, b) => s + pick(b), 0) * 100) / 100;
    const total = sum((b) => b.totalCost ?? 0);
    const base = sum((b) => b.basePrice ?? 0);
    const discount = sum((b) => b.discount ?? 0);
    const due = sum((b) => b.amountDue ?? 0);
    const detail = JSON.stringify(made2);

    // THE POINT OF THE FILE. The wizard chose all four of these numbers.
    expect(discount, "the rule fired at all").toBeCloseTo(10, 2);
    expect(
      total,
      "total_cost is GROSS — the price before the discount",
    ).toBeCloseTo(base, 2);
    // Before 2026-09-24 the form sent `total_cost` NET, so this was base − 10
    // and `amount_due` came back at base − 20.
    expect(due, detail).toBeCloseTo(base - 10, 2);

    // And per booking, because `amount_due` is generated a ROW at a time: the
    // discount is shared across the two days, never repeated onto each.
    for (const b of made2) {
      expect(b.discount, detail).toBeCloseTo(5, 2);
      expect(b.amountDue, detail).toBeCloseTo(
        (b.totalCost ?? 0) - (b.discount ?? 0),
        2,
      );
    }
  });
});
