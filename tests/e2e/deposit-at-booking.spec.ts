import { test, expect, type Browser, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { cancelBookingsMarked } from "./_sweep";

// ============================================================================
// THE DEPOSIT STAFF TAKE AT BOOKING — WHO MAY, AND HOW MUCH (2026-10-02).
//
// Confirm offers staff "Charge Visa •••• 4242", "Send payment link", cash,
// or later. The amount is never the screen's: `POST /api/bookings/[ref]/
// deposit` computes it from the facility's deposit rules and what is already
// paid, spread over the request's parts, and charges the client's own saved
// card or sends a link per part. This file pins the boundary — the part that
// can be wrong without any card being involved:
//
// D1  Signed out: 401.
// D2  A customer cannot take a payment, even on their own booking: 403.
// D3  Nor can staff without "take payments" — a groomer: 403.
// D4  A body that is neither a charge nor a link: 422.
// D5  A booking no rule asks a deposit of: 409, and nothing recorded.
// D6  With a rule on, a card that is not the client's is refused before
//     anything reaches the processor: 409, and nothing recorded.
//
// A real charge needs a Clover-connected card, as the clover-* specs do; the
// shares and keys are unit-tested (tests/unit/deposit-shares.test.ts).
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// Nothing: its bookings carry MARKER and are cancelled, and the deposit rules
// are written back exactly as they were read.
// ============================================================================

const MARKER = "[e2e deposit-at-booking]";
const BOB = { client: 16, pet: 3 }; // Bob Smith, Max
const SETTINGS = "/api/facility/settings";

test.describe.configure({ mode: "serial" });

let depositRulesBefore: unknown = null;
let small = 0; // a $64 booking: no rule asks a deposit of it
let large = 0; // a $300 booking: the 25% rule, once it is on

function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function book(page: Page, price: number, tag: string): Promise<number> {
  const day = isoDaysAhead(430);
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
      specialRequests: `${MARKER} ${tag}`,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { id: number }).id;
}

async function deposit(page: Page, ref: number, body: unknown) {
  return page.request.post(`/api/bookings/${ref}/deposit`, { data: body });
}

async function paidOn(page: Page, ref: number): Promise<number> {
  const res = await page.request.get(`/api/payments?bookingRef=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  const rows: unknown = await res.json();
  return Array.isArray(rows) ? rows.length : -1;
}

async function restoreRules(browser: Browser) {
  if (depositRulesBefore === null) return;
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await page.request.patch(SETTINGS, {
      data: { domain: "deposit_rules", value: depositRulesBefore },
    });
  } finally {
    await page.close();
  }
}

test.beforeAll(async ({ browser }) => {
  await cancelBookingsMarked(browser, MARKER, "before");
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.get(SETTINGS);
    expect(res.ok(), await res.text()).toBe(true);
    const all = (await res.json()) as Record<string, { value?: unknown }>;
    depositRulesBefore = all.deposit_rules?.value ?? null;
    small = await book(page, 64, "small");
    large = await book(page, 300, "large");
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  try {
    await restoreRules(browser);
  } finally {
    await cancelBookingsMarked(browser, MARKER, "after");
  }
});

test("D1 a signed-out caller is refused", async ({ request }) => {
  const res = await request.post(`/api/bookings/${small}/deposit`, {
    data: { action: "link", channel: "email" },
  });
  expect(res.status()).toBe(401);
});

test("D2 a customer cannot take a payment", async ({ page }) => {
  await signIn(page, ACCOUNTS.customer);
  const res = await deposit(page, small, { action: "link", channel: "email" });
  expect(res.status()).toBe(403);
});

test("D3 staff without the permission cannot either", async ({ page }) => {
  await signIn(page, ACCOUNTS.groomer);
  const res = await deposit(page, small, { action: "link", channel: "email" });
  expect(res.status()).toBe(403);
});

test("D4 neither a charge nor a link is refused", async ({ page }) => {
  await signIn(page, ACCOUNTS.owner);
  for (const body of [
    {},
    { action: "charge" },
    { action: "charge", savedCardId: "not-a-uuid" },
    { action: "link", channel: "pigeon" },
    { action: "refund", amount: 20 },
  ]) {
    const res = await deposit(page, small, body);
    expect(res.status(), JSON.stringify(body)).toBe(422);
  }
});

test("D5 no rule asks a deposit: nothing is due, nothing recorded", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const res = await deposit(page, small, {
    action: "charge",
    savedCardId: crypto.randomUUID(),
  });
  expect(res.status(), await res.text()).toBe(409);
  expect(((await res.json()) as { error: string }).error).toMatch(
    /no deposit is due/i,
  );
  expect(await paidOn(page, small)).toBe(0);
});

test("D6 a card that is not the client's is refused before any charge", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  // The facility's own "over $200 — 25%" rule, switched on for this test.
  const rules = depositRulesBefore as {
    rules?: Array<Record<string, unknown>>;
  } | null;
  expect(rules?.rules?.length, "the facility has deposit rules").toBeTruthy();
  const on = await page.request.patch(SETTINGS, {
    data: {
      domain: "deposit_rules",
      value: {
        ...rules,
        rules: rules!.rules!.map((rule) =>
          rule.scope === "booking_value"
            ? { ...rule, enabled: true, amountType: "percentage", amount: 25 }
            : rule,
        ),
      },
    },
  });
  expect(on.ok(), await on.text()).toBe(true);

  const res = await deposit(page, large, {
    action: "charge",
    savedCardId: crypto.randomUUID(),
  });
  expect(res.status(), await res.text()).toBe(409);
  const body = (await res.json()) as { code?: string; chargedCents?: number };
  expect(body.code).toBe("no_card");
  expect(body.chargedCents).toBe(0);
  expect(await paidOn(page, large)).toBe(0);
});
