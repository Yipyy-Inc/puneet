import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A badge is earned once, from facts the server can see.
//
// ── WHAT WAS MISSING ──────────────────────────────────────────────────────
//
// Badge DEFINITIONS were real from 2026-08-21 — a facility writes them in the
// Badges wizard and they live in `facility_settings.loyalty_config`. Nothing
// awarded one. The earned records were eleven hand-authored rows for
// `facilityId: 1`, and the only code that created another pushed onto an
// in-memory array inside a fixture engine no server has ever run.
//
// ── WHAT THIS FILE PINS DOWN ──────────────────────────────────────────────
//
//   1. A badge is awarded ONCE. Its reward is money — points, credit, a
//      discount off a real bill — and a second award is a second reward.
//      Refused by a unique index, not by a read-then-write two callers race
//      straight past.
//
//   2. A badge is awarded from REAL facts. An unreachable threshold does not
//      unlock, and a reachable one does — measured against paid visits and
//      money that arrived, not against a fixture.
//
//   3. Three of the seven conditions can never fire, and that is deliberate.
//      Referrals and reviews are recorded nowhere, and consecutive months are
//      not tracked. They report zero rather than a guess, because a guess here
//      would award a real reward for something nobody can show happened.
//
//   4. The CUSTOMER sees it — in their own wallet, from their own client row.
//
// ── WHAT IT LEAVES BEHIND, AND WHY THAT IS RIGHT ──────────────────────────
//
// The programme is restored in `afterAll`. The award rows are NOT deleted, and
// cannot be: `loyalty_badge_awards` has no DELETE policy, deliberately — a
// badge somebody earned is not a row an application gets to rewrite. Once the
// programme is put back, these badge ids are in nobody's configuration, so no
// screen names them; they are inert history, exactly like the ledger entries
// `loyalty-earning.spec.ts` leaves for the same reason.
//
// Which is why every probe badge here is worth NOTHING except one, and that one
// pays POINTS — an append-only ledger entry — rather than a voucher. A stray
// active discount voucher on a demo account would come off somebody's real bill
// later, and a test must not leave money on the table.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const ACCOUNTS_API = "/api/loyalty/accounts";
const TRANSACTIONS = "/api/loyalty/transactions";
const BADGES = "/api/loyalty/badges";
const WALLET = "/api/customer/loyalty";

type Page = import("@playwright/test").Page;

/** Reachable by anybody with a single paid visit. Pays nothing. */
const FIRST = {
  id: "__e2e_badge_first",
  name: "E2E First Visit",
  description: "Completed their first booking",
  icon: "star",
  criteria: { type: "first_booking", threshold: 1 },
  enabled: true,
};

/** Reachable, and pays POINTS — the one reward this file issues. */
const PAYING = {
  id: "__e2e_badge_paying",
  name: "E2E Paying Badge",
  description: "Completed their first booking",
  icon: "trophy",
  criteria: { type: "first_booking", threshold: 1 },
  reward: { type: "points", value: 5 },
  enabled: true,
};

/** Nobody reaches this. */
const UNREACHABLE = {
  id: "__e2e_badge_unreachable",
  name: "E2E Unreachable",
  description: "Spent a fortune",
  icon: "gem",
  criteria: { type: "total_spent", threshold: 100_000_000 },
  enabled: true,
};

/** Recorded nowhere, so it can never unlock however the customer behaves. */
const UNMEASURABLE = {
  id: "__e2e_badge_referrals",
  name: "E2E Referrals",
  description: "Referred a friend",
  icon: "award",
  criteria: { type: "referrals", threshold: 1 },
  enabled: true,
};

const PROBE_IDS = [FIRST.id, PAYING.id, UNREACHABLE.id, UNMEASURABLE.id];

interface AwardsPayload {
  awards: { memberId: string; badgeId: string; earnedAt: string }[];
  spend: { memberId: string; date: string; amount: number }[];
}

interface Account {
  id: string;
  clientRef: number;
  pointsBalance: number;
  totalVisits: number;
}

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

async function accounts(page: Page): Promise<Account[]> {
  const res = await page.request.get(ACCOUNTS_API);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { accounts: Account[] }).accounts;
}

async function awards(page: Page): Promise<AwardsPayload> {
  const res = await page.request.get(BADGES);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as AwardsPayload;
}

/**
 * Nudge an account so the server settles its badges.
 *
 * A one-point adjustment, because the badge conditions here are about VISITS
 * and SPEND — neither of which this moves. What it does is give the server an
 * occasion to evaluate, which is the same occasion a checkout gives it.
 */
async function nudge(page: Page, accountId: string): Promise<void> {
  const res = await page.request.post(TRANSACTIONS, {
    data: {
      accountId,
      kind: "adjusted",
      points: 1,
      description: "E2E badge settle nudge",
      source: "manual",
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

test.describe("a badge is earned once, and kept", () => {
  let saved: Record<string, unknown> | null = null;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    saved = await programme(page);
    await setProgramme(page, {
      ...saved,
      enabled: true,
      programName: "E2E Badges",
      badges: [FIRST, PAYING, UNREACHABLE, UNMEASURABLE],
    });
    await context.close();
  });

  // In `afterAll`, not at the end of a test: a failed assertion skips a trailing
  // line and would leave the demo facility's programme switched on with four
  // probe badges in it for every spec that runs after this one.
  test.afterAll(async ({ browser }) => {
    if (!saved) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, { ...saved, enabled: false });
    await context.close();
  });

  test("a reachable badge is awarded, an unreachable one is not", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const withVisits = (await accounts(page)).find((a) => a.totalVisits > 0);
    test.skip(withVisits === undefined, "no account with a paid visit");
    const account = withVisits as Account;

    await nudge(page, account.id);

    const held = (await awards(page)).awards
      .filter((a) => a.memberId === account.id)
      .map((a) => a.badgeId);

    // Reachable: they have at least one paid visit.
    expect(held).toContain(FIRST.id);

    // Not reachable, and never will be.
    expect(held).not.toContain(UNREACHABLE.id);

    // ── THE THREE THAT CANNOT FIRE ──────────────────────────────────────
    //
    // No referral is recorded against an account anywhere and there is no
    // reviews table. The badge is offered by the wizard and reports honest
    // zero progress; it does not quietly unlock on an estimate.
    expect(held).not.toContain(UNMEASURABLE.id);
  });

  test("a second settle does not award it again", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const withVisits = (await accounts(page)).find((a) => a.totalVisits > 0);
    test.skip(withVisits === undefined, "no account with a paid visit");
    const account = withVisits as Account;

    await nudge(page, account.id);

    const before = (await awards(page)).awards.filter(
      (a) => a.memberId === account.id && PROBE_IDS.includes(a.badgeId),
    );
    const balanceBefore = (await accounts(page)).find(
      (a) => a.id === account.id,
    )?.pointsBalance;

    // ── THE LINE THIS FILE EXISTS FOR ─────────────────────────────────────
    await nudge(page, account.id);

    const after = (await awards(page)).awards.filter(
      (a) => a.memberId === account.id && PROBE_IDS.includes(a.badgeId),
    );

    expect(after.length).toBe(before.length);
    // Same rows, same timestamps. A re-award would move `earnedAt`.
    expect(after.map((a) => `${a.badgeId}@${a.earnedAt}`).sort()).toEqual(
      before.map((a) => `${a.badgeId}@${a.earnedAt}`).sort(),
    );

    // And the paying badge paid ONCE. The nudge itself adds one point; five
    // more would mean the reward was issued a second time.
    const balanceAfter = (await accounts(page)).find(
      (a) => a.id === account.id,
    )?.pointsBalance;
    expect(balanceAfter).toBe((balanceBefore ?? 0) + 1);
  });

  test("a badge that pays points actually pays them", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const withVisits = (await accounts(page)).find((a) => a.totalVisits > 0);
    test.skip(withVisits === undefined, "no account with a paid visit");
    const account = withVisits as Account;

    await nudge(page, account.id);

    const held = (await awards(page)).awards
      .filter((a) => a.memberId === account.id)
      .map((a) => a.badgeId);

    // The award row is the record; the ledger entry is the money. Both, or the
    // badge is a picture of a reward.
    expect(held).toContain(PAYING.id);

    const txns = await page.request.get(
      `${TRANSACTIONS}?account=${encodeURIComponent(account.id)}`,
    );
    expect(txns.ok(), await txns.text()).toBe(true);
    const { transactions } = (await txns.json()) as {
      transactions: { description: string; points: number }[];
    };
    const paid = transactions.filter((t) =>
      t.description.includes(PAYING.name),
    );
    expect(paid.length).toBe(1);
    expect(paid[0].points).toBe(5);
  });

  test("the report counts real awards, not a fixture", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const payload = await awards(page);

    // Every award names an account at this facility. The fixture it replaced
    // was keyed by a numeric customer id belonging to no row here.
    const ids = new Set((await accounts(page)).map((a) => a.id));
    for (const award of payload.awards) {
      expect(ids.has(award.memberId)).toBe(true);
    }

    // And the spend the report measures uplift against belongs to earners.
    const earners = new Set(payload.awards.map((a) => a.memberId));
    for (const row of payload.spend) {
      expect(earners.has(row.memberId)).toBe(true);
      expect(row.amount).toBeGreaterThan(0);
    }
  });

  test("a caretaker cannot award a badge", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const withVisits = (await accounts(page)).find((a) => a.totalVisits > 0);
    test.skip(withVisits === undefined, "no account with a paid visit");
    const accountId = (withVisits as Account).id;

    await signIn(page, ACCOUNTS.caretaker);

    // RLS is the boundary, not the route. A caretaker holds no
    // `marketing_manage_loyalty`, so the adjustment that would settle badges is
    // refused before it reaches the evaluation.
    const res = await page.request.post(TRANSACTIONS, {
      data: {
        accountId,
        kind: "adjusted",
        points: 1,
        description: "E2E caretaker attempt",
        source: "manual",
      },
    });
    expect(res.ok()).toBe(false);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("the customer sees their own badges", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.get(WALLET);
    expect(res.ok(), await res.text()).toBe(true);
    const wallet = (await res.json()) as {
      enabled: boolean;
      badges: {
        id: string;
        conditionText: string;
        earnedAt: string | null;
        progress: { met: boolean; measurable: boolean; label: string };
      }[];
    };

    expect(wallet.enabled).toBe(true);

    // The facility's badges, not eleven rows from a file. Read through their
    // own CLIENT row — a customer holds no membership, so reaching this at all
    // is the point.
    const byId = new Map(wallet.badges.map((b) => [b.id, b]));
    expect(byId.has(FIRST.id)).toBe(true);

    // Phrased by the server, once, so the gallery and the report cannot drift.
    expect(byId.get(FIRST.id)?.conditionText).toBeTruthy();

    // Unreachable stays unreached whatever they have spent.
    expect(byId.get(UNREACHABLE.id)?.earnedAt).toBeNull();
    expect(byId.get(UNREACHABLE.id)?.progress.met).toBe(false);

    // And the one nothing records shows honest zero progress rather than an
    // estimate. A referral is not recorded against an account anywhere, so it
    // sits at 0 of 1 forever — visible, and true.
    expect(byId.get(UNMEASURABLE.id)?.earnedAt).toBeNull();
    expect(byId.get(UNMEASURABLE.id)?.progress.met).toBe(false);
  });
});
