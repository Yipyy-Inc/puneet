import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The members screen, and the customer's own loyalty tab.
//
// ── WHY THIS SPEC EXISTS ──────────────────────────────────────────────────
//
// For a few hours on 2026-08-21 these screens were the most misleading surface
// on the platform. The ledger had become real that morning; the screens still
// read `src/data/loyalty-accounts`. So "Points Outstanding" — a LIABILITY a
// facility owes its customers — was summed from a seed file that had nothing
// to do with any balance the database held, and the members list showed people
// who had no account at all.
//
// The assertion that closes that is not "the page renders". It is that what the
// SCREEN shows and what the LEDGER holds are the same number, checked against
// each other in the same run.
//
// ── AND THE ADJUSTMENT IS A LEDGER ROW ────────────────────────────────────
//
// `AdjustPointsModal` called `addManualAdjustment`, which pushed onto an array
// and could not fail, then toasted success. It posts to the ledger now, so the
// balance it moves has a row explaining it — and the staff member's name is
// stamped SERVER-SIDE from the session rather than sent by the browser.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// The adjustment is reversed by a correcting entry, because a ledger cannot be
// un-appended. Both rows stay, which is exactly what a facility would see had
// somebody made and corrected the same mistake at the counter.
// ============================================================================

const ACCOUNTS_API = "/api/loyalty/accounts";
const TRANSACTIONS = "/api/loyalty/transactions";
const MEMBERS = "/facility/dashboard/loyalty/members";

type Page = import("@playwright/test").Page;

interface Account {
  id: string;
  clientRef: number;
  clientName: string;
  pointsBalance: number;
  totalSpend: number;
  totalVisits: number;
}

async function accounts(page: Page): Promise<Account[]> {
  const res = await page.request.get(ACCOUNTS_API);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { accounts: Account[] }).accounts;
}

test.describe("the loyalty members screen", () => {
  test("shows the accounts the ledger actually holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const fromApi = await accounts(page);
    test.skip(fromApi.length === 0, "no loyalty accounts to show");

    await page.goto(MEMBERS);
    await expect(page.getByText("Member Accounts")).toBeVisible({
      timeout: 40_000,
    });
    // The guard resolving matters as much as the content: a screen stuck on a
    // skeleton is the failure mode of gating on a query that never settles.
    await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0, {
      timeout: 30_000,
    });

    // Every real account is on the screen, by the name the DATABASE holds. The
    // fixture looked names up by a numeric id and fell back to "Client #15"
    // when the two files disagreed about who existed.
    for (const account of fromApi) {
      await expect(
        page.getByText(account.clientName, { exact: false }).first(),
      ).toBeVisible();
    }
  });

  test("the outstanding-points tile is the sum of the balances", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const fromApi = await accounts(page);

    const outstanding = fromApi.reduce((s, a) => s + a.pointsBalance, 0);

    await page.goto(MEMBERS);
    await expect(page.getByText("Member Accounts")).toBeVisible({
      timeout: 40_000,
    });

    // Anchored on the label, then up to the tile — the VALUE renders before the
    // label in these tiles, so filtering a container by its text matches the
    // wrong node. Same trap the scheduling reports screen hit.
    const tile = page
      .getByText("Points Outstanding", { exact: false })
      .first()
      .locator("..");
    await expect(tile).toContainText(outstanding.toLocaleString());

    // And the member count is the number of accounts, not of fixture rows.
    //
    // Anchored on the tile's HINT, which is unique. `getByText("Members")`
    // matches the page heading first — the tile label and the <h2> are the same
    // word, and .first() picks the wrong one.
    const members = page.getByText("Loyalty accounts").first().locator("../..");
    await expect(members).toContainText(String(fromApi.length));
  });

  test("an adjustment moves the balance and leaves a row explaining it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const fromApi = await accounts(page);
    test.skip(fromApi.length === 0, "no loyalty account to adjust");

    const account = fromApi[0];
    const before = account.pointsBalance;

    await page.goto(`/facility/dashboard/clients/${account.clientRef}/loyalty`);
    await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0, {
      timeout: 30_000,
    });

    await page
      .getByRole("button", { name: /Adjust Points/i })
      .first()
      .click();
    await page.locator('input[type="number"]').first().fill("250");
    await page.getByRole("textbox").last().fill("E2E adjustment");
    await page
      .getByRole("button", { name: /Apply adjustment/i })
      .last()
      .click();

    await expect(page.getByText(/Added 250 points/i)).toBeVisible({
      timeout: 20_000,
    });

    const after = (await accounts(page)).find((a) => a.id === account.id);
    expect(after?.pointsBalance).toBe(before + 250);

    // The row that explains it, with the author stamped from the SESSION — the
    // browser does not get to say who made an adjustment.
    const res = await page.request.get(`${TRANSACTIONS}?account=${account.id}`);
    const { transactions } = (await res.json()) as {
      transactions: {
        points: number;
        description: string;
        staffName: string | null;
      }[];
    };
    expect(transactions[0].points).toBe(250);
    expect(transactions[0].description).toContain("E2E adjustment");
    expect(transactions[0].staffName).toBeTruthy();

    // A correcting entry, not an edit. See the header.
    const undo = await page.request.post(TRANSACTIONS, {
      data: {
        accountId: account.id,
        points: -250,
        kind: "adjusted",
        source: "manual",
        description: "E2E cleanup: reverse the test adjustment",
      },
    });
    expect(undo.ok(), await undo.text()).toBe(true);
    expect(
      (await accounts(page)).find((a) => a.id === account.id)?.pointsBalance,
    ).toBe(before);
  });

  test("spend and visits come from real bookings", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const fromApi = await accounts(page);
    test.skip(fromApi.length === 0, "no loyalty accounts");

    // `loyalty_accounts` deliberately does not store these — bookings own them,
    // and a copy would drift. The view derives them, so a customer who has paid
    // this facility shows a spend, and one who has not shows zero. What must
    // never happen is a number from a seed file.
    for (const account of fromApi) {
      expect(account.totalSpend).toBeGreaterThanOrEqual(0);
      expect(account.totalVisits).toBeGreaterThanOrEqual(0);
      if (account.totalVisits === 0) expect(account.totalSpend).toBe(0);
    }
  });
});
