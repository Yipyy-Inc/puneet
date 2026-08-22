import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Which tier a customer is in, and what it is worth.
//
// ── WHAT WAS MISSING ──────────────────────────────────────────────────────
//
// `current_tier_id` was a column somebody set by hand. A facility could define
// Bronze/Silver/Gold with thresholds, a customer could sail past every one of
// them, and nothing moved them — and because nothing did, the earn route passed
// a tier multiplier of 1, so every customer earned the base rate whatever the
// screen said their tier was.
//
// ── THE THINGS THIS PINS DOWN ─────────────────────────────────────────────
//
//   1. Crossing a threshold promotes the customer — from ANY path that moves
//      the points, not only from a booking. A tier that depended on how the
//      points arrived would be a different tier for the same customer.
//
//   2. Reaching a tier issues its one-time reward as a REAL voucher, at zero
//      points: it is something the facility gives, not something bought.
//
//   3. The highest QUALIFYING tier wins, not the highest defined.
//
//   4. Tiers switched off leave nobody IN one. A row still naming a tier the
//      facility no longer defines would disagree with every screen reading it,
//      which look the id up in the definitions and render "—" on a miss.
//
// ── AND ONE THING IT DELIBERATELY DOES NOT ────────────────────────────────
//
// Downgrades. `tierDowngradeEnabled` is off by default and a customer keeps the
// tier they earned; asserting the suppression needs a facility that opted in,
// which is a different configuration from the one every other test here runs
// against. The rule lives in `recalculateTier`, which this code calls rather
// than reimplements.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// The tiers this file defines exist only while it runs, so `afterAll` settles
// the tier away as well as restoring the programme — an account pointing at a
// tier nobody defines any more is a puzzle rather than a state. The points
// stay: a ledger cannot be un-appended.
//
// ── THE VOUCHER MUST NOT ───────────────────────────────────────────────────
//
// This comment used to say "and any voucher stay", on the same reasoning. That
// was wrong, and it cost real money for as long as it stood.
//
// A tier reward is a REAL `discount_fixed` voucher for $5 against the demo
// facility, and this file is in `test:e2e:ci` — so every push to `main` minted
// another one. By 2026-08-22 there were FIFTEEN, $75 of live discount sitting
// on two demo customers, waiting to come off somebody's bill. Nothing was
// wrong with any single run; the arithmetic was just never done.
//
// `loyalty-badges.spec.ts` had already reasoned this out one file over — "a
// stray active discount voucher on a demo account would come off somebody's
// real bill" — and arranged its probes to be worth nothing. This file did not
// apply the same thought to itself.
//
// The fix is NOT to delete the voucher, and not to weaken the assertion that
// earns it. `pointsSpent === 0` is this file's actual claim and it stays. The
// voucher is SPENT in `afterAll`, through the same `consume` route a checkout
// uses: a forward transition the model already sanctions, which leaves the row
// exactly where it is and merely stops it being spendable. Un-appending is
// still impossible, which was the true half of the original reasoning.
//
// `beforeAll` records which granted vouchers already existed, and the cleanup
// skips them. Without that baseline the sweep would spend every zero-point
// voucher on the facility — which on a demo facility is tidying up, and on a
// real one is spending a customer's reward for them. The first draft of this
// fix did exactly that, which is worth admitting: the careless version of a
// cleanup is a bigger bug than the leak it cleans.
//
// The FIFTEEN already out there predate the baseline, so this does not sweep
// them; they were cleared once, by hand, when this landed.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const ACCOUNTS_API = "/api/loyalty/accounts";
const TRANSACTIONS = "/api/loyalty/transactions";
const VOUCHERS = "/api/loyalty/vouchers";

type Page = import("@playwright/test").Page;

/** Thresholds are on POINTS — the one dimension this spec can move at will. */
const SILVER_AT = 30;

const TIERS = [
  {
    id: "e2e-tier-bronze",
    facilityId: 1,
    name: "E2E Bronze",
    thresholdType: "points",
    thresholdValue: 0,
    color: "#b45309",
    icon: "B",
    sortOrder: 1,
    benefits: [],
  },
  {
    id: "e2e-tier-silver",
    facilityId: 1,
    name: "E2E Silver",
    thresholdType: "points",
    thresholdValue: SILVER_AT,
    color: "#94a3b8",
    icon: "S",
    sortOrder: 2,
    benefits: [
      {
        type: "bonus_points_multiplier",
        value: 2,
        description: "Double points",
      },
    ],
    tierUpReward: { type: "discount_fixed", value: 5 },
  },
  {
    id: "e2e-tier-unreachable",
    facilityId: 1,
    name: "E2E Unreachable",
    thresholdType: "points",
    thresholdValue: 100_000_000,
    color: "#eab308",
    icon: "U",
    sortOrder: 3,
    benefits: [],
  },
];

interface Account {
  id: string;
  clientRef: number;
  pointsBalance: number;
  lifetimePointsEarned: number;
  currentTierId: string | null;
}

async function readAccounts(page: Page): Promise<Account[]> {
  const res = await page.request.get(ACCOUNTS_API);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { accounts: Account[] }).accounts;
}

/**
 * Every spendable voucher the facility GAVE rather than sold.
 *
 * `pointsSpent === 0` is the same predicate the tier assertion uses: a tier
 * reward is given, not bought. A voucher somebody paid points for is never in
 * this list, so the cleanup cannot reach one.
 */
async function grantedVouchers(
  page: Page,
): Promise<{ id: string; pointsSpent: number }[]> {
  const found: { id: string; pointsSpent: number }[] = [];
  for (const account of await readAccounts(page)) {
    const res = await page.request.get(
      `${VOUCHERS}?spendable=1&account=${account.id}`,
    );
    if (!res.ok()) continue;
    const { vouchers } = (await res.json()) as {
      vouchers: { id: string; pointsSpent: number }[];
    };
    found.push(...vouchers.filter((v) => v.pointsSpent === 0));
  }
  return found;
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

/** Move the balance and put it straight back, leaving only the side effects. */
async function nudge(
  page: Page,
  accountId: string,
  points: number,
  why: string,
): Promise<void> {
  const res = await page.request.post(TRANSACTIONS, {
    data: {
      accountId,
      points,
      kind: "adjusted",
      source: "manual",
      description: why,
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

test.describe("loyalty tiers", () => {
  let saved: Record<string, unknown> | null = null;
  /**
   * Granted vouchers that were spendable BEFORE this file ran.
   *
   * The cleanup below consumes what the promotions gave away, and this is what
   * keeps it from consuming anything else. Without it the sweep would spend
   * every zero-point voucher on the facility — including a reward a real
   * facility gave a real customer, which is somebody's money and not this
   * file's to spend. Clean up what you caused, never what you found.
   */
  const preExisting = new Set<string>();

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.get(SETTINGS);
    saved = (
      (await res.json()) as {
        loyalty_config: { value: Record<string, unknown> };
      }
    ).loyalty_config.value;

    for (const voucher of await grantedVouchers(page)) {
      preExisting.add(voucher.id);
    }
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!saved) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);

    // Tiers off, then one nudge per tiered account so `settleTier` clears it.
    // Writing the column directly would be quicker and would skip the code
    // that is supposed to be able to do it — which is exactly how the first
    // version of this cleanup silently did nothing at all.
    await setProgramme(page, {
      ...saved,
      enabled: true,
      tiersEnabled: false,
      tierDefinitions: [],
    });
    for (const account of await readAccounts(page)) {
      if (account.currentTierId?.startsWith("e2e-tier-")) {
        await nudge(page, account.id, 1, "E2E cleanup: settle the tier away");
        await nudge(page, account.id, -1, "E2E cleanup: restore the balance");
      }
    }

    // ── SPEND WHAT THE PROMOTION GAVE AWAY ────────────────────────────
    //
    // Every tier crossing above issued a real $5 voucher. Consuming it is the
    // only sanctioned way to make it unspendable — there is no cancel route,
    // and `loyalty_vouchers` has no DELETE policy on purpose.
    //
    // `preExisting` is the whole safety of this: only vouchers that appeared
    // WHILE this file ran are spent. Best effort per voucher — one already
    // used answers with an error, and a cleanup that threw here would mask the
    // test result that actually matters.
    for (const voucher of await grantedVouchers(page)) {
      if (preExisting.has(voucher.id)) continue;
      await page.request
        .post(`${VOUCHERS}/${voucher.id}/consume`, { data: {} })
        .catch(() => {});
    }

    await setProgramme(page, { ...saved, enabled: false });
    await context.close();
  });

  test("crossing a threshold promotes the customer, from any path", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, {
      ...saved,
      enabled: true,
      tiersEnabled: true,
      tierDefinitions: TIERS,
    });

    const accounts = await readAccounts(page);
    test.skip(accounts.length === 0, "no loyalty account");
    const account = accounts[0];

    // A STAFF ADJUSTMENT, deliberately — not a booking. Promotion must not
    // depend on how the points arrived.
    await nudge(page, account.id, SILVER_AT + 20, "E2E tier promotion");

    const after = (await readAccounts(page)).find((a) => a.id === account.id);
    expect(after?.currentTierId).toBe("e2e-tier-silver");

    // And not the unreachable one, however high the balance climbs: the highest
    // QUALIFYING tier wins, not the highest defined.
    expect(after?.currentTierId).not.toBe("e2e-tier-unreachable");

    await nudge(
      page,
      account.id,
      -(SILVER_AT + 20),
      "E2E cleanup: restore the balance",
    );
  });

  test("reaching a tier issues its reward, and it costs nothing", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, {
      ...saved,
      enabled: true,
      tiersEnabled: true,
      tierDefinitions: TIERS,
    });

    const accounts = await readAccounts(page);
    test.skip(accounts.length === 0, "no loyalty account");
    const account = accounts[0];

    const res = await page.request.get(`${VOUCHERS}?account=${account.id}`);
    expect(res.ok(), await res.text()).toBe(true);
    const { vouchers } = (await res.json()) as {
      vouchers: {
        rewardType: string;
        rewardValue: number;
        pointsSpent: number;
      }[];
    };

    // The tier reward from the promotion above. `pointsSpent: 0` is the whole
    // claim: a tier reward is given, not bought, and a customer whose balance
    // paid for it would have been charged for reaching a milestone.
    const granted = vouchers.filter((v) => v.pointsSpent === 0);
    expect(granted.length).toBeGreaterThan(0);
    expect(
      granted.some(
        (v) => v.rewardType === "discount_fixed" && v.rewardValue === 5,
      ),
    ).toBe(true);
  });

  test("a manual adjustment is never multiplied by a tier", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, {
      ...saved,
      enabled: true,
      tiersEnabled: true,
      tierDefinitions: TIERS,
    });

    const accounts = await readAccounts(page);
    test.skip(accounts.length === 0, "no loyalty account");
    const account = accounts[0];
    const before = account.lifetimePointsEarned;

    // The figure a person typed. A tier boosting it would award points nobody
    // entered — the multiplier belongs to the RULES engine, not to the ledger.
    await nudge(page, account.id, 10, "E2E base rate");

    const after = (await readAccounts(page)).find((a) => a.id === account.id);
    expect(after?.lifetimePointsEarned).toBe(before + 10);

    await nudge(page, account.id, -10, "E2E cleanup: restore the balance");
  });

  test("tiers switched off move nobody, up or down", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await setProgramme(page, {
      ...saved,
      enabled: true,
      tiersEnabled: false,
      tierDefinitions: TIERS,
    });

    const accounts = await readAccounts(page);
    test.skip(accounts.length === 0, "no loyalty account");
    const account = accounts[0];

    await nudge(page, account.id, SILVER_AT + 100, "E2E tiers-off probe");

    const after = (await readAccounts(page)).find((a) => a.id === account.id);

    // ── NOBODY IS PROMOTED, AND NOBODY IS LEFT POINTING AT A GHOST ──────
    //
    // The first draft of this asserted the stored tier was left UNCHANGED,
    // because that is what `recalculateTier` does with nothing to resolve
    // against. It passed — and the cleanup written on the same belief then
    // failed to clear anything, leaving two accounts naming tiers no facility
    // defined. The test agreed with the code and both were wrong.
    //
    // `settleTier` clears it now. Nothing is lost: the threshold dimensions
    // only increase, so turning tiers back on restores the same tier on the
    // customer's next settle.
    expect(after?.currentTierId).toBeNull();

    await nudge(
      page,
      account.id,
      -(SILVER_AT + 100),
      "E2E cleanup: restore the balance",
    );
  });
});
