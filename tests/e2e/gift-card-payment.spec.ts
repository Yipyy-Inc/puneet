import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A gift card pays for a booking: both ledgers move, or neither.
//
// ── WHY THIS IS A GATE SPEC ───────────────────────────────────────────────
//
// It is money. `redeem_gift_card` took money off a card and wrote nothing to
// `payments`, so a booking paid by gift card still owed its balance — and the
// till offered no gift card at all. `/api/payments/gift-card` calls
// `pay_booking_with_gift_card`, which redeems and records in one transaction
// (20260911003221). supabase/tests/gift-card-payment.sql asserts the function
// in a rolled-back transaction; this asserts the ROUTE, against a real booking:
//
//   - a part payment moves the booking's paid total AND the card's balance
//   - asking for more than the card holds is refused, and nothing moves —
//     re-read, not assumed
//   - asking for more than the booking owes is refused, and nothing moves
//   - a caretaker, who takes no payments, is refused
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// A card cannot be deleted (its ledger is the record) and a payment cannot be
// removed (append-only). So afterAll does what a business would: drains and
// cancels this run's cards, and cancels the booking. The booking keeps its
// payment, like every money spec here.
// ============================================================================

const MARKER = "[e2e gift-card-payment]";
const CODE_PREFIX = "E2E-GC-PAY-";
const CLIENT_REF = 15;
const PET_REF = 1;

interface Card {
  id: string;
  code: string;
  balance: number;
  effectiveStatus: string;
  status: string;
}

interface BookingPayload {
  id: number;
  status?: string;
  amountPaid?: number;
  specialRequests?: string;
}

function bookingBody() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "daycare",
    startDate: today,
    endDate: today,
    checkInTime: "08:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: 45,
    discount: 0,
    totalCost: 45,
    specialRequests: MARKER,
  };
}

async function cardBalance(page: Page, code: string): Promise<number> {
  const res = await page.request.get(
    `/api/gift-cards?code=${encodeURIComponent(code)}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const { cards } = (await res.json()) as { cards: Card[] };
  return cards[0]?.balance ?? NaN;
}

async function amountPaid(page: Page, ref: number): Promise<number> {
  const res = await page.request.get("/api/bookings");
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as BookingPayload[];
  return Number(all.find((b) => b.id === ref)?.amountPaid ?? NaN);
}

test.describe.configure({ mode: "serial" });

let code = "";
let bookingRef = 0;

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.get("/api/gift-cards");
    if (res.ok()) {
      const { cards } = (await res.json()) as { cards: Card[] };
      for (const card of cards) {
        if (!card.code.startsWith(CODE_PREFIX)) continue;
        if (card.effectiveStatus === "active" && card.balance > 0) {
          await page.request.post("/api/gift-cards/redeem", {
            data: {
              code: card.code,
              amount: card.balance,
              note: "E2E cleanup",
            },
          });
        }
        if (card.status !== "cancelled") {
          await page.request.patch(`/api/gift-cards/${card.id}`, {
            data: { status: "cancelled" },
          });
        }
      }
    }
    if (bookingRef) {
      await page.request.patch(`/api/bookings/${bookingRef}`, {
        data: { status: "cancelled" },
      });
    }
  } finally {
    await page.close();
  }
});

test.describe("paying a booking with a gift card", () => {
  test("signed out gets 401", async ({ request }) => {
    const res = await request.post("/api/payments/gift-card", {
      failOnStatusCode: false,
      data: { code: "X", bookingRef: 1, amount: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test("a part payment moves the booking and the card together", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const booking = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;
    bookingRef = booking.id;
    expect(bookingRef, "the booking was not created").toBeGreaterThan(0);

    code = `${CODE_PREFIX}${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    const issued = await page.request.post("/api/gift-cards", {
      data: { amount: 30, code, kind: "online" },
    });
    expect(issued.ok(), await issued.text()).toBe(true);

    const paid = await page.request.post("/api/payments/gift-card", {
      failOnStatusCode: false,
      data: { code, bookingRef, amount: 20 },
    });
    expect(paid.status(), await paid.text()).toBe(201);

    expect(await amountPaid(page, bookingRef)).toBe(20);
    expect(await cardBalance(page, code)).toBe(10);
  });

  test("more than the card holds is refused, and nothing moves", async ({
    page,
  }) => {
    test.skip(!code, "the payment above did not land");
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/payments/gift-card", {
      failOnStatusCode: false,
      data: { code, bookingRef, amount: 15 },
    });
    expect(res.status(), await res.text()).toBe(409);
    expect(await amountPaid(page, bookingRef)).toBe(20);
    expect(await cardBalance(page, code)).toBe(10);
  });

  test("more than the booking owes is refused, and nothing moves", async ({
    page,
  }) => {
    test.skip(!code, "the payment above did not land");
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/payments/gift-card", {
      failOnStatusCode: false,
      data: { code, bookingRef, amount: 30 },
    });
    expect(res.status(), await res.text()).toBe(422);
    expect(await amountPaid(page, bookingRef)).toBe(20);
    expect(await cardBalance(page, code)).toBe(10);
  });

  test("a caretaker cannot pay by gift card", async ({ page }) => {
    test.skip(!code, "the payment above did not land");
    await signIn(page, ACCOUNTS.caretaker);

    const res = await page.request.post("/api/payments/gift-card", {
      failOnStatusCode: false,
      data: { code, bookingRef, amount: 5 },
    });
    expect(res.status(), "a caretaker took a payment").not.toBe(201);
  });
});
