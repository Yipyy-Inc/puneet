import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The points ledger, and a voucher that can be spent once.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `src/data/loyalty-accounts`, `-transactions` and `-redemptions`: three
// hand-authored files keyed by `facilityId: 1`, discarded on reload. A balance
// lived on the account AND a list of transactions lived beside it, so the
// number and the history explaining it were maintained separately.
//
// ── THE ASSERTION THAT MATTERS IS THE SECOND CONSUME ──────────────────────
//
// `consumeRedemption()` spliced an in-memory array. A refresh brought the
// voucher back — and a voucher reaches a card: the checkout computes
// `netAmountDue = amountDue - voucher`, and the tax and the Clover total follow
// from it. So the same reward could come off bill after bill.
//
// `consume_loyalty_voucher` updates WHERE the row is still active, and raises
// when that matches nothing. The second call here must be refused. Everything
// else in this file is scaffolding for that line.
//
// ── AND THE BALANCE CANNOT BE SET BY HAND ─────────────────────────────────
//
// What this file can assert is that no ROUTE sets one: points only move by
// posting to the ledger, and the balance that comes back is the sum of it.
//
// The stronger claim — that PATCHing `points_balance` through PostgREST is
// refused by a trigger, so "we do not offer it" is not the only thing standing
// in the way — is not reachable from a Playwright client, which can only speak
// to this app's own routes. It was proved against production by the probe in
// the migration commit, and the trigger
// (`private.loyalty_balances_come_from_the_ledger`) is where it lives.
//
// ── HOW IT CLEANS UP, AND WHAT IT CANNOT ──────────────────────────────────
//
// It works on ONE account, on the demo facility, for a client that already
// exists — opened idempotently, so re-running reuses the same account rather
// than accumulating them. `afterAll` restores the points balance to whatever it
// was before the run, by posting a correcting entry.
//
// A correcting ENTRY, because a ledger cannot be un-appended. That is the whole
// point of it and not a limitation to work around: the rows this spec adds stay
// visible, which is exactly what a facility would see if a member of staff had
// made and then corrected the same mistake. Each run leaves a handful of them.
//
// There is deliberately no DELETE endpoint for an account. Removing one would
// destroy a customer's points history, and "the e2e suite needs it" is not a
// good enough reason to build a door that big.
// ============================================================================

const ACCOUNTSAPI = "/api/loyalty/accounts";
const TRANSACTIONS = "/api/loyalty/transactions";
const VOUCHERS = "/api/loyalty/vouchers";

type Page = import("@playwright/test").Page;

interface Account {
  id: string;
  clientId: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  creditBalance: number;
}

interface Voucher {
  id: string;
  status: string;
  rewardValue: number;
  pointsSpent: number;
}

/** A client that already exists at the demo facility, by the ref screens use. */
async function anyClientRef(page: Page): Promise<number> {
  const res = await page.request.get("/api/clients");
  expect(res.ok(), await res.text()).toBe(true);
  const list = (await res.json()) as { id?: number }[];
  const ref = list
    .map((c) => c.id)
    .find((v): v is number => typeof v === "number");
  expect(ref, "the demo facility has at least one client").toBeTruthy();
  return ref as number;
}

async function openAccount(page: Page, clientRef: number): Promise<Account> {
  const res = await page.request.post(ACCOUNTSAPI, { data: { clientRef } });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { account: Account }).account;
}

async function readAccount(page: Page, clientRef: number): Promise<Account> {
  const res = await page.request.get(`${ACCOUNTSAPI}?clientRef=${clientRef}`);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { accounts: Account[] }).accounts[0];
}

test.describe("the loyalty ledger", () => {
  let clientRef = 0;
  /** The balance before this file touched anything. */
  let openingBalance = 0;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    clientRef = await anyClientRef(page);
    const account = await openAccount(page, clientRef);
    openingBalance = account.pointsBalance;
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);

    const account = await readAccount(page, clientRef).catch(() => null);
    if (account) {
      const drift = account.pointsBalance - openingBalance;
      if (drift !== 0) {
        // A correcting entry, not an edit. See the header.
        await page.request.post(TRANSACTIONS, {
          data: {
            accountId: account.id,
            points: -drift,
            kind: "adjusted",
            source: "manual",
            description: "E2E cleanup: restore the opening balance",
          },
        });
      }
    }
    await context.close();
  });

  test("opening an account twice returns the same one", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const first = await openAccount(page, clientRef);
    const second = await page.request.post(ACCOUNTSAPI, {
      data: { clientRef },
    });
    expect(second.ok()).toBe(true);
    const body = (await second.json()) as {
      account: Account;
      created: boolean;
    };

    // A customer can be enrolled from the members screen, a checkout or a
    // booking. None of them should have to check first, and none of them should
    // be able to create a second account for the same person.
    expect(body.account.id).toBe(first.id);
    expect(body.created).toBe(false);
  });

  test("a balance is the sum of its ledger, and nothing else", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const account = await openAccount(page, clientRef);
    const before = await readAccount(page, clientRef);

    const earn = await page.request.post(TRANSACTIONS, {
      data: {
        accountId: account.id,
        points: 500,
        kind: "earned",
        source: "manual",
        description: "E2E earn",
      },
    });
    expect(earn.ok(), await earn.text()).toBe(true);

    const after = await readAccount(page, clientRef);
    expect(after.pointsBalance).toBe(before.pointsBalance + 500);
    expect(after.lifetimePointsEarned).toBe(before.lifetimePointsEarned + 500);
    expect(after.lifetimePointsRedeemed).toBe(before.lifetimePointsRedeemed);

    // Put it back, so the rest of the file starts from a known place.
    const correct = await page.request.post(TRANSACTIONS, {
      data: {
        accountId: account.id,
        points: -500,
        kind: "adjusted",
        source: "manual",
        description: "E2E correction",
      },
    });
    expect(correct.ok(), await correct.text()).toBe(true);
    expect((await readAccount(page, clientRef)).pointsBalance).toBe(
      before.pointsBalance,
    );
  });

  test("an account cannot be overdrawn", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const account = await openAccount(page, clientRef);
    const before = await readAccount(page, clientRef);

    const res = await page.request.post(TRANSACTIONS, {
      data: {
        accountId: account.id,
        points: -(before.pointsBalance + 1_000),
        kind: "redeemed",
        source: "manual",
        description: "E2E overdraft",
      },
    });

    expect(res.ok()).toBe(false);
    // The refusal names the balance and what was asked for, rather than a
    // constraint. A person reads this.
    expect((await res.text()).toLowerCase()).toContain("points");
    expect((await readAccount(page, clientRef)).pointsBalance).toBe(
      before.pointsBalance,
    );
  });

  test("a voucher can be spent once, and the second attempt is refused", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const account = await openAccount(page, clientRef);

    await page.request.post(TRANSACTIONS, {
      data: {
        accountId: account.id,
        points: 400,
        kind: "earned",
        source: "manual",
        description: "E2E voucher funding",
      },
    });
    const funded = await readAccount(page, clientRef);

    const issued = await page.request.post(VOUCHERS, {
      data: {
        accountId: account.id,
        rewardType: "discount_pct",
        rewardValue: 10,
        points: 400,
        description: "E2E 10% off",
      },
    });
    expect(issued.ok(), await issued.text()).toBe(true);
    const voucher = ((await issued.json()) as { voucher: Voucher }).voucher;
    expect(voucher.status).toBe("active");

    // The points went at the same moment the voucher arrived.
    expect((await readAccount(page, clientRef)).pointsBalance).toBe(
      funded.pointsBalance - 400,
    );

    const first = await page.request.post(`${VOUCHERS}/${voucher.id}/consume`, {
      data: {},
    });
    expect(first.ok(), await first.text()).toBe(true);
    expect(
      ((await first.json()) as { voucher: { status: string } }).voucher.status,
    ).toBe("used");

    // ── THE LINE THIS FILE EXISTS FOR ───────────────────────────────────
    const second = await page.request.post(
      `${VOUCHERS}/${voucher.id}/consume`,
      { data: {} },
    );
    expect(second.status()).toBe(409);
    expect((await second.text()).toLowerCase()).toContain("already been used");
  });

  test("a reward comes back when the payment it was spent on fails", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const account = await openAccount(page, clientRef);

    await page.request.post(TRANSACTIONS, {
      data: {
        accountId: account.id,
        points: 200,
        kind: "earned",
        source: "manual",
        description: "E2E release funding",
      },
    });

    const issued = await page.request.post(VOUCHERS, {
      data: {
        accountId: account.id,
        rewardType: "discount_fixed",
        rewardValue: 5,
        points: 200,
        description: "E2E $5 off",
      },
    });
    expect(issued.ok(), await issued.text()).toBe(true);
    const voucher = ((await issued.json()) as { voucher: Voucher }).voucher;

    // Checkout spends the reward BEFORE it charges, so a charge that then
    // fails leaves it spent for nothing. This is the undo for that window.
    const spent = await page.request.post(`${VOUCHERS}/${voucher.id}/consume`, {
      data: {},
    });
    expect(spent.ok(), await spent.text()).toBe(true);

    const released = await page.request.post(
      `${VOUCHERS}/${voucher.id}/release`,
      { data: {} },
    );
    expect(released.ok(), await released.text()).toBe(true);
    expect(
      ((await released.json()) as { voucher: { status: string } }).voucher
        .status,
    ).toBe("active");

    // And it is spendable again, which is the whole point — a customer whose
    // card was declined must not lose the reward they were holding.
    const again = await page.request.post(`${VOUCHERS}/${voucher.id}/consume`, {
      data: {},
    });
    expect(again.ok(), await again.text()).toBe(true);

    // Releasing twice is not an error: the second call finds it already active
    // and says so rather than failing a cleanup path.
    await page.request.post(`${VOUCHERS}/${voucher.id}/release`, { data: {} });
    const twice = await page.request.post(`${VOUCHERS}/${voucher.id}/release`, {
      data: {},
    });
    expect(twice.ok(), await twice.text()).toBe(true);

    // Leave it spent, so it is not offered to any later checkout.
    await page.request.post(`${VOUCHERS}/${voucher.id}/consume`, { data: {} });
  });

  test("a spendable voucher list excludes one that has been used", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const account = await openAccount(page, clientRef);

    const res = await page.request.get(
      `${VOUCHERS}?spendable=1&account=${account.id}`,
    );
    expect(res.ok(), await res.text()).toBe(true);
    const { vouchers } = (await res.json()) as { vouchers: Voucher[] };

    // Whatever else is there, nothing spent may be offered to a checkout.
    expect(vouchers.every((v) => v.status === "active")).toBe(true);
  });

  test("a caretaker can neither award points nor issue a reward", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const account = await openAccount(page, clientRef);

    await signIn(page, ACCOUNTS.caretaker);

    // RLS is the boundary, not the screen. A caretaker holds no
    // `marketing_manage_loyalty`.
    const posted = await page.request.post(TRANSACTIONS, {
      data: {
        accountId: account.id,
        points: 10_000,
        kind: "earned",
        source: "manual",
        description: "E2E caretaker award",
      },
    });
    expect(posted.ok()).toBe(false);

    const issued = await page.request.post(VOUCHERS, {
      data: {
        accountId: account.id,
        rewardType: "discount_fixed",
        rewardValue: 50,
        points: 0,
      },
    });
    expect(issued.ok()).toBe(false);
  });
});
