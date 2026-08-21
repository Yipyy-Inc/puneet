import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A facility's loyalty programme.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
//     const storageKey = (facilityId: number) => `loyalty-program-${facilityId}`;
//     window.localStorage.setItem(storageKey(facilityId), JSON.stringify(next));
//
// Per browser, and under a facility id that was the constant `1` at every call
// site. So an owner set their tiers, watched them stick, and every other member
// of staff, every other device and every customer went on seeing the seed file
// — while a second facility on the same browser read the first one's programme.
//
// ── SO THE ASSERTION THAT MATTERS IS THE SECOND BROWSER ───────────────────
//
// Not that a save round-trips: localStorage did that perfectly. The test that
// the old implementation could not have passed is the one where a DIFFERENT
// person, in a DIFFERENT browser, reads what the owner just saved. That is the
// same line facility-settings.spec.ts draws, for the same reason.
//
// ── AND A FULL RELOAD, FOR THE OTHER BUG ──────────────────────────────────
//
// The provider used to seed itself with `useState(() => loadConfig())`. Against
// a request rather than localStorage, that initialiser runs before the answer
// can arrive and latches onto the empty fallback — so a facility with a
// programme opens the screen, sees none, and Save writes that over it. That bug
// has been found three times in a fortnight, so the reload here is deliberate:
// a fresh navigation is the only state in which it shows.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// Everything is written to the DEMO facility — the `@yipyy.dev` accounts are
// all on "Yipyy Demo Facility". `afterAll` clears the programme back to off and
// empty, which is what an unconfigured facility computes anyway. The settings
// route has no DELETE, so one row is left where there were none. Recorded here
// rather than pretended away.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const LOYALTY = "/facility/dashboard/loyalty";
const PROGRAM_NAME = "E2E Rewards Programme";

type Page = import("@playwright/test").Page;

interface LoyaltyState {
  value: {
    enabled: boolean;
    programName?: string;
    tiers: unknown[];
    badges?: unknown[];
    earnRules?: unknown[];
  };
  configured: boolean;
}

async function readProgram(page: Page): Promise<LoyaltyState> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as { loyalty_config: LoyaltyState };
  return body.loyalty_config;
}

/** Off and empty — what the facility had before this spec ran. */
async function clearProgram(page: Page): Promise<void> {
  const res = await page.request.patch(SETTINGS, {
    data: {
      domain: "loyalty_config",
      value: {
        enabled: false,
        pointsEarning: {
          id: "default",
          method: "per_dollar",
          perDollar: { enabled: false, basePoints: 1 },
        },
        earnRules: [],
        pointsExpiration: { enabled: false, expirationType: "none" },
        pointsExpiryEnabled: false,
        tiers: [],
        tierDefinitions: [],
        tiersEnabled: true,
        tierDowngradeEnabled: false,
        discountSelectionStrategy: "highest_value",
        redemptionRate: 100,
        rewardTypes: [],
        badges: [],
        pointsScope: { enabled: false, scope: "both" },
        discountStacking: { enabled: false, stackingBehavior: "no_stacking" },
        settings: { pointsName: "points", pointsValue: 0.01 },
        createdAt: "1970-01-01T00:00:00.000Z",
        updatedAt: "1970-01-01T00:00:00.000Z",
      },
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

test.describe("a facility's loyalty programme", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    await clearProgram(page);
    await context.close();
  });

  test("an unset programme is off and empty, not the fixture's", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await clearProgram(page);

    const program = await readProgram(page);

    // The fixture ships a fully-populated four-tier scheme with badges and a
    // referral bonus. Inheriting it would have every facility on the platform
    // owing customers points against a programme a seed file invented — points
    // are a liability, and one nobody agreed to is not a default.
    expect(program.value.enabled).toBe(false);
    expect(program.value.tiers).toHaveLength(0);
    expect(program.value.badges ?? []).toHaveLength(0);
    expect(program.value.earnRules ?? []).toHaveLength(0);
  });

  test("a programme survives a full reload of the screen", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await clearProgram(page);

    await page.goto(LOYALTY);
    const name = page.getByPlaceholder(/rewards/i).first();
    await expect(name).toBeVisible({ timeout: 25_000 });
    await name.fill(PROGRAM_NAME);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Program details saved")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("switch", { name: "Enable loyalty program" }).click();
    await expect(page.getByText("Loyalty program enabled")).toBeVisible({
      timeout: 15_000,
    });

    // A fresh navigation, so the settings query starts from nothing — the exact
    // condition a seeded initialiser latches in.
    await page.goto(LOYALTY);
    await expect(page.getByPlaceholder(/rewards/i).first()).toHaveValue(
      PROGRAM_NAME,
      { timeout: 25_000 },
    );
    await expect(
      page.getByRole("switch", { name: "Enable loyalty program" }),
    ).toBeChecked();
  });

  test("a programme reaches a different person in a different browser", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await clearProgram(page);

    await page.goto(LOYALTY);
    const name = page.getByPlaceholder(/rewards/i).first();
    await expect(name).toBeVisible({ timeout: 25_000 });
    await name.fill(PROGRAM_NAME);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Program details saved")).toBeVisible({
      timeout: 15_000,
    });

    // Its own storage, its own everything, and a different account. The old
    // implementation could not have passed this line.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, ACCOUNTS.manager);
    await otherPage.goto(LOYALTY);
    await expect(otherPage.getByPlaceholder(/rewards/i).first()).toHaveValue(
      PROGRAM_NAME,
      { timeout: 25_000 },
    );
    await other.close();
  });

  test("every tab renders from the stored programme", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Each of these used to seed a draft from the config in a `useState`
    // initialiser. Loading them proves the gate resolves rather than leaving a
    // permanent skeleton — the failure mode of guarding on a query that never
    // settles.
    for (const tab of [
      "badges",
      "rewards",
      "tiers",
      "earn-rules",
      "advanced",
    ]) {
      await page.goto(`${LOYALTY}/${tab}`);
      await expect(page.locator("h1, h2").first()).toBeVisible({
        timeout: 25_000,
      });
      await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0, {
        timeout: 25_000,
      });
    }
  });

  test("a staff member without manage_settings cannot change it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.caretaker);

    const res = await page.request.patch(SETTINGS, {
      data: { domain: "loyalty_config", value: { enabled: true } },
    });

    // RLS is the boundary, not the screen. A caretaker holds no
    // `manage_settings`, and the route must say so rather than quietly
    // affecting zero rows.
    expect(res.ok()).toBe(false);
  });
});
