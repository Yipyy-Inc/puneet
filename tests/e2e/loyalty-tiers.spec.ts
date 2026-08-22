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
// tier nobody defines any more is a puzzle rather than a state. The points and
// any voucher stay: a ledger cannot be un-appended.
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
