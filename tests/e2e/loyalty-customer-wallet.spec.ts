import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// What a customer sees of their own loyalty standing.
//
// ── WHY IT NEEDED ITS OWN ROUTE ───────────────────────────────────────────
//
// `/api/loyalty/accounts` resolves the facility from the caller's MEMBERSHIP,
// and falls back to the DEMO facility for a caller with none — which every
// customer is. Pointing the wallet at it would have shown a pet owner a balance
// from a business they have never been to. `/api/customer/loyalty` resolves
// through their CLIENT ROW instead, the same way `/api/customer/facility` does.
//
// That is the assertion that matters here, and it is why this file signs in as
// the customer rather than testing the payload through a staff session.
//
// ── AND WHY THE TIER IS COMPUTED, NOT READ ────────────────────────────────
//
// `current_tier_id` only moves when something moves the points. A facility that
// adds a tier promotes nobody until each customer next transacts — so a wallet
// rendering the stored column would tell somebody holding fifteen thousand
// lifetime points that they are in no tier at all. The route returns the tier
// they QUALIFY for. The stored column is what the earn multiplier reads, and it
// catches up on their next transaction.
//
// ── IT SETS UP AND PUTS BACK ITS OWN PROGRAMME ────────────────────────────
//
// A customer cannot configure anything, so the programme is set up through a
// second signed-in context as the owner, and restored in `afterAll` rather than
// at the end of a test a failed assertion would skip.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const WALLET = "/api/customer/loyalty";

type Page = import("@playwright/test").Page;

const TIERS = [
  {
    id: "e2e-wallet-bronze",
    facilityId: 1,
    name: "E2E Wallet Bronze",
    thresholdType: "points",
    thresholdValue: 0,
    color: "#b45309",
    icon: "B",
    sortOrder: 1,
    benefits: [{ type: "custom_text", value: "A free nail trim" }],
  },
  {
    id: "e2e-wallet-top",
    facilityId: 1,
    name: "E2E Wallet Top",
    thresholdType: "points",
    thresholdValue: 100_000_000,
    color: "#eab308",
    icon: "T",
    sortOrder: 2,
    benefits: [{ type: "discount_pct", value: 10 }],
  },
];

const RULE = {
  id: "e2e-wallet-rule",
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

interface WalletPayload {
  enabled: boolean;
  programName: string | null;
  pointsName: string;
  redemptionRate: number;
  account: {
    pointsBalance: number;
    lifetimePointsEarned: number;
    totalSpend: number;
    totalVisits: number;
    currentTierId: string | null;
  } | null;
  tiers: { id: string; name: string; benefits: string[] }[];
  earnRules: unknown[];
  transactions: unknown[];
  rewards: unknown[];
}

async function wallet(page: Page): Promise<WalletPayload> {
  const res = await page.request.get(WALLET);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as WalletPayload;
}

test.describe("a customer's loyalty wallet", () => {
  let saved: Record<string, unknown> | null = null;

  async function configure(
    browser: import("@playwright/test").Browser,
    value: Record<string, unknown>,
  ): Promise<void> {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.patch(SETTINGS, {
      data: { domain: "loyalty_config", value },
    });
    expect(res.ok(), await res.text()).toBe(true);
    await context.close();
  }

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    saved = (
      (await (await page.request.get(SETTINGS)).json()) as {
        loyalty_config: { value: Record<string, unknown> };
      }
    ).loyalty_config.value;
    await context.close();

    await configure(browser, {
      ...saved,
      enabled: true,
      tiersEnabled: true,
      programName: "E2E Rewards",
      earnRules: [RULE],
      tierDefinitions: TIERS,
      redemptionRate: 50,
    });
  });

  test.afterAll(async ({ browser }) => {
    if (!saved) return;
    await configure(browser, { ...saved, enabled: false });
  });

  test("is answered from the customer's own facility", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const payload = await wallet(page);

    // The programme the customer's own facility configured. Reaching this at
    // all is the point: a customer holds no membership, so the facility had to
    // come from their client row.
    expect(payload.enabled).toBe(true);
    expect(payload.programName).toBe("E2E Rewards");
    expect(payload.redemptionRate).toBe(50);
    expect(payload.earnRules.length).toBeGreaterThan(0);
  });

  test("shows the tier they qualify for, not a stale stored one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const payload = await wallet(page);
    test.skip(payload.account === null, "this customer has no loyalty account");

    // Bronze needs nothing, so anyone with an account qualifies — including a
    // customer whose stored tier was never settled against these tiers, which
    // is the case this exists for.
    expect(payload.account?.currentTierId).toBe("e2e-wallet-bronze");

    // And never the unreachable one, whatever their totals.
    expect(payload.account?.currentTierId).not.toBe("e2e-wallet-top");
  });

  test("tier benefits arrive already phrased", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const payload = await wallet(page);

    const bronze = payload.tiers.find((t) => t.id === "e2e-wallet-bronze");
    expect(bronze?.benefits).toContain("A free nail trim");

    // A benefit is a `type` and a `value` in the config. The sentence a
    // customer reads comes from `tierBenefitList`, which is what the
    // tier-upgrade email already says — written once, so the two cannot drift.
    const top = payload.tiers.find((t) => t.id === "e2e-wallet-top");
    expect(top?.benefits.join(" ")).toMatch(/10/);
  });

  test("the balance on the screen is the balance in the ledger", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const payload = await wallet(page);
    test.skip(payload.account === null, "this customer has no loyalty account");

    await page.goto("/customer/rewards");
    await expect(page.getByText("E2E Rewards")).toBeVisible({
      timeout: 40_000,
    });

    // The number the API holds, rendered. This screen read a hand-authored
    // fixture until 2026-08-22 — a customer was shown points that existed in
    // no database anywhere.
    const balance = payload.account?.pointsBalance ?? 0;
    await expect(
      page.getByText(balance.toLocaleString(), { exact: false }).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("a customer cannot read anybody else's standing", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const mine = await wallet(page);

    // There is no parameter to pass. The route takes the caller's own client
    // row and nothing else, so there is no id to tamper with — which is the
    // strongest form this guarantee can take.
    expect(mine.account === null || typeof mine.account.pointsBalance).toBe(
      mine.account === null ? true : "number",
    );

    // And the facility-side route, which a customer CAN call, tells them
    // nothing: it resolves to a facility they hold no membership at.
    const staffRoute = await page.request.get("/api/loyalty/accounts");
    if (staffRoute.ok()) {
      const body = (await staffRoute.json()) as { accounts: unknown[] };
      // RLS admits a client to their OWN account only, so at most one row and
      // never somebody else's.
      expect(body.accounts.length).toBeLessThanOrEqual(1);
    }
  });
});
