import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A booking earns its points.
//
// ── THE THING THAT WAS MISSING ────────────────────────────────────────────
//
// The earn RULES became real on 2026-08-21 and the LEDGER became real the same
// day, and nothing read one to write the other. A facility could configure
// "1 point per dollar", a customer could spend $200, and their balance stayed
// where it was. Points arrived only when somebody typed them in.
//
// ── WHAT THIS FILE ACTUALLY PINS DOWN ─────────────────────────────────────
//
// Three things, in order of how much they would cost to get wrong:
//
//   1. A booking earns ONCE. A checkout is retried — a missed toast, a refresh,
//      a blip between the charge and the award — and the second award must not
//      double a customer's balance. It is refused by a unique index rather than
//      by a read-then-write, which two callers race straight past.
//
//   2. Points follow money that ARRIVED. An unpaid booking earns nothing, so a
//      quote nobody settled never becomes a liability.
//
//   3. A programme that is OFF earns nothing, so a facility that has not opted
//      in does not silently accrue points it never agreed to owe.
//
// ── IT SETS UP AND PUTS BACK ITS OWN PROGRAMME ────────────────────────────
//
// The demo facility's programme is off and empty, which is the right resting
// state and what the other loyalty specs assume. This file switches it on with
// one rule, does its work, and puts it back — including on failure, via
// `afterAll` rather than a trailing line that a failed assertion would skip.
//
// The points it awards STAY. A ledger cannot be un-appended; that is the point
// of one. They are visible on the account like any other earning.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const EARN = "/api/loyalty/earn";
const ACCOUNTS_API = "/api/loyalty/accounts";

type Page = import("@playwright/test").Page;

interface EarnResult {
  awarded: boolean;
  alreadyEarned: boolean;
  points: number;
  reasons: string[];
}

const RULE = {
  id: "e2e-earn-rule",
  facilityId: 1,
  name: "E2E 1 point per dollar",
  enabled: true,
  status: "active",
  triggerType: "spend_amount",
  rewardType: "points",
  rewardValue: 1,
  appliesToServiceTypes: null,
  scheduleType: "always",
};

async function programme(page: Page): Promise<Record<string, unknown>> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as {
    loyalty_config: { value: Record<string, unknown> };
  };
  return body.loyalty_config.value;
}

async function setProgramme(
  page: Page,
  value: Record<string, unknown>,
): Promise<void> {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: "loyalty_config", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function earn(page: Page, bookingRef: number): Promise<EarnResult> {
  const res = await page.request.post(EARN, { data: { bookingRef } });
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as EarnResult;
}

/** A booking at the demo facility that has been PAID. */
async function paidBookingRef(page: Page): Promise<number | null> {
  const res = await page.request.get("/api/bookings?limit=200");
  if (!res.ok()) return null;
  const body = (await res.json()) as
    | { bookings?: { id: number; amountPaid?: number }[] }
    | { id: number; amountPaid?: number }[];
  const list = Array.isArray(body) ? body : (body.bookings ?? []);
  return list.find((b) => (b.amountPaid ?? 0) > 0)?.id ?? null;
}

test.describe("a booking earns its points", () => {
  let saved: Record<string, unknown> | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    saved = await programme(page);
    await context.close();
  });

  // In `afterAll`, not at the end of a test: a failed assertion would skip a
  // trailing line and leave the demo facility's programme switched on for every
  // spec that runs after this one.
  test.afterAll(async ({ browser }) => {
    if (!saved) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, { ...saved, enabled: false });
    await context.close();
  });

  test("a programme that is off earns nothing", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, { ...saved, enabled: false, earnRules: [RULE] });

    const ref = await paidBookingRef(page);
    test.skip(ref === null, "no paid booking to award against");

    const result = await earn(page, ref as number);
    expect(result.awarded).toBe(false);
    expect(result.points).toBe(0);
  });

  test("points follow money that arrived, not a quote", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, { ...saved, enabled: true, earnRules: [RULE] });

    // An unpaid booking. `amount_paid` is what the rule is measured against, so
    // a booking nobody has settled has spent nothing.
    const res = await page.request.get("/api/bookings?limit=200");
    test.skip(!res.ok(), "cannot list bookings");
    const body = (await res.json()) as
      | { bookings?: { id: number; amountPaid?: number }[] }
      | { id: number; amountPaid?: number }[];
    const list = Array.isArray(body) ? body : (body.bookings ?? []);
    const unpaid = list.find((b) => (b.amountPaid ?? 0) === 0);
    test.skip(unpaid === undefined, "no unpaid booking");

    const result = await earn(page, (unpaid as { id: number }).id);
    expect(result.awarded).toBe(false);
    expect(result.points).toBe(0);
  });

  test("a paid booking earns once, and a retry does not double it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, { ...saved, enabled: true, earnRules: [RULE] });

    const ref = await paidBookingRef(page);
    test.skip(ref === null, "no paid booking to award against");

    // The first award may already have happened — this booking has been paid,
    // and the checkout awards on payment. Both paths are legitimate; what must
    // hold is that after this call the booking has earned exactly once.
    const first = await earn(page, ref as number);
    expect(first.awarded || first.alreadyEarned).toBe(true);

    const accountsRes = await page.request.get(ACCOUNTS_API);
    const { accounts } = (await accountsRes.json()) as {
      accounts: { id: string; pointsBalance: number }[];
    };
    const balances = new Map(accounts.map((a) => [a.id, a.pointsBalance]));

    // ── THE LINE THIS FILE EXISTS FOR ───────────────────────────────────
    const second = await earn(page, ref as number);
    expect(second.awarded).toBe(false);
    expect(second.alreadyEarned).toBe(true);
    expect(second.points).toBe(0);

    const afterRes = await page.request.get(ACCOUNTS_API);
    const after = (await afterRes.json()) as {
      accounts: { id: string; pointsBalance: number }[];
    };
    // Not one balance moved. A doubled award is the failure this guards.
    for (const account of after.accounts) {
      if (balances.has(account.id)) {
        expect(account.pointsBalance).toBe(balances.get(account.id));
      }
    }
  });

  test("a caretaker cannot award points through it", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, { ...saved, enabled: true, earnRules: [RULE] });
    const ref = await paidBookingRef(page);
    test.skip(ref === null, "no paid booking");

    await signIn(page, ACCOUNTS.caretaker);
    const res = await page.request.post(EARN, { data: { bookingRef: ref } });

    // RLS is the boundary. A caretaker holds no `marketing_manage_loyalty`, so
    // the INSERT is refused — either outright, or because they cannot see the
    // booking to begin with.
    if (res.ok()) {
      const body = (await res.json()) as EarnResult;
      expect(body.awarded).toBe(false);
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
