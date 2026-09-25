import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";

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
  basePrice?: number;
  discount?: number;
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

function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function allBookings(page: Page, search = ""): Promise<BookingPayload[]> {
  const res = await page.request.get(`/api/bookings${search}`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as BookingPayload[];
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
async function bookingByRef(page: Page, ref: number) {
  return (await allBookings(page, `?ref=${ref}`)).find((b) => b.id === ref);
}

/**
 * This run's live bookings with the tag — earlier runs' are cancelled.
 *
 * The CALLER names the slice, because this file books for two different
 * people: the API tests are BOB's, and the one that drives the form books
 * ALICE's Buddy. Scoping this helper to one of them found none of the other's.
 *
 * Why it is scoped at all — measured 2026-09-17: the facility holds 1,499
 * bookings and an unbounded `GET /api/bookings` takes 16-20 seconds. Worse,
 * a whole-client read is not always enough either. Bob has 395 and comes back
 * fine; ALICE is up to 1,056 and `?clientRef=15` answers
 *
 *   500 {"error":"canceling statement due to statement timeout"}
 *
 * — Postgres cancelling the statement, not the network. So Alice is asked for
 * with a DATE WINDOW as well. The suite's cleanup cancels rather than deletes,
 * so both numbers only ever go up.
 */
async function marked(page: Page, tag: string, search: string) {
  return (await allBookings(page, search)).filter(
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
    // A refused refund used to be ignored, and every paid booking it left
    // behind was walked again on the next run — 88 of them by 2026-09-14.
    // Each answer is read now, and the run fails naming what it left.
    const refused: string[] = [];
    // BOTH clients: the API tests book Bob, the form test books Alice, and a
    // sweep that reads one of them leaves the other's paid bookings behind —
    // which is the exact debt the counter below exists to stop accumulating.
    //
    // By marker, in the database, which is both at once. Reading their lists
    // stopped working: Bob's 902 bookings time out whole, and on 2026-09-25
    // the `expect` inside `allBookings` threw here and left six behind.
    for (const b of await bookingsMarked(MARKER)) {
      const paid = b.amountPaid;
      if (paid > 0) {
        const refund = await page.request.post("/api/payments", {
          data: {
            bookingRef: String(b.ref),
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
          refused.push(`refund ${b.ref}: ${await refund.text()}`);
        }
      }
      if (b.status === "cancelled") continue;
      await page.request.patch(`/api/bookings/${b.ref}`, {
        data: { status: "cancelled" },
      });
    }
    expect(refused, "cleanup left paid bookings behind").toEqual([]);
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

    // The three refs are in hand — `refs` is what the route takes for exactly
    // this, so ask for those and nothing else.
    const made = await allBookings(
      page,
      `?refs=${(first.groupRefs ?? []).join(",")}`,
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
    // Counted by marker in the database, for whichever client holds them.
    // This read BOB's list while the stays below are ALICE's, so it counted
    // zero on both sides and could not have seen a half-written request; and
    // Bob's 902 bookings now time out as a list anyway (2026-09-25).
    const clashes = async () =>
      (await bookingsMarked(`${MARKER} clash`)).filter(
        (b) => b.status !== "cancelled",
      ).length;
    const before = await clashes();
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
    expect(await clashes()).toBe(before);
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
        const after = await bookingByRef(page, created.id);
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
    // WHICH SERVICE. Nothing was chosen here until 2026-09-23 — the price
    // came from whichever active rate was cheapest for the hours, so the
    // facility's menu was decoration. Create stays DISABLED until a service
    // is picked, which is the rate gap doing its job rather than a bug.
    await dialog
      .getByRole("button", { name: /full day/i })
      .first()
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

    // ── TWO MINUTES, AND IT IS NOT PADDING ────────────────────────────
    //
    // At 30 seconds this failed on 2026-09-23 with the button still
    // reading "Saving…" — and the two bookings had in fact been written,
    // correctly, by the time anyone looked. The form posts one request per
    // day against a facility holding ~1,500 bookings, so the save is
    // genuinely slow rather than stuck.
    //
    // This spec is in the push gate. A gate that fails on a slow save is a
    // gate people learn to re-run, which is worse than not having one: the
    // assertion is unchanged, only the patience is. `test.slow()` does not
    // scale an explicit timeout, which is why this has to be written out.
    await expect(page.getByText(/2 bookings created/i)).toBeVisible({
      timeout: 120_000,
    });
    await expect(dialog).toBeHidden();
    // Alice, and only next month: her list alone is big enough to be cancelled
    // by the statement timeout (see the note on `marked`).
    const month = nextMonthWindow();
    const made = await marked(
      page,
      "form",
      `?clientRef=${ALICE.client}&from=${month.from}&to=${month.to}`,
    );
    expect(made).toHaveLength(2);
    expect(made.every((b) => b.service === "daycare")).toBe(true);
    expect(new Set(made.map((b) => b.startDate)).size).toBe(2);
    // The price is saved WITHOUT tax. The form added a tax it took from the
    // mobile-grooming settings in localStorage — Québec 14.975% by default,
    // for every facility and every service — into totalCost, and checkout
    // then added the facility's own tax on top. Tax is charged at payment,
    // from the facility's tax settings, and nowhere else.
    // ── AND `total_cost` IS GROSS OF THE DISCOUNT ──────────────────────
    //
    // This read `basePrice - discount` until 2026-09-23, which stated the
    // WRONG convention: `bookings.amount_due` is GENERATED as
    // `greatest(0, total_cost + extras_total - discount)`, so a net
    // `total_cost` has the discount taken off twice. Measured that day, a
    // booking posted as `basePrice 100, discount 20, totalCost 80` came back
    // owing $60 against a quote of $80.
    //
    // It did NOT catch that, and it could not have: every booking this file
    // posts carries `discount: 0`, where the two formulas agree. So the old
    // line documented a convention it never exercised — which is its own kind
    // of hazard, because the next person reads it as settled.
    //
    // `discount-rules.spec.ts` is what actually exercises a non-zero
    // discount. This stays because the relationship is worth stating where
    // the form's own output is being checked.
    for (const b of made) {
      expect(b.totalCost, JSON.stringify(b)).toBeCloseTo(b.basePrice ?? 0, 2);
    }
  });
});
