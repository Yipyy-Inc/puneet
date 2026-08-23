import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Gift cards: money the business owes, and whether the software knows it.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `src/data/gift-cards.ts` plus React state. `/facility/dashboard/gift-cards`
// had an Issue action and sixty-odd handlers, and every card it created lived
// for as long as the tab stayed open. A facility could take a customer's money,
// hand over a card, and hold NO record of the liability. Every other
// unconverted screen in this product loses a setting; that one lost money owed
// to somebody.
//
// ── THE ASSERTION THAT MATTERS IS THE OVERDRAFT ───────────────────────────
//
// A card is spent through a ledger entry, and the trigger that applies it holds
// a row lock, recomputes the balance and refuses to go below zero. Refusing is
// only half of it: this file also re-reads the card afterwards and asserts the
// balance did not move. A refusal that had already debited would be the worst
// version of this bug — an error message over money that had gone.
//
// ── WHAT IS PROVED HERE, AND WHAT IS PROVED IN SQL ────────────────────────
//
// A Playwright client speaks to this app's own routes, so it can only assert
// what a route does. Two claims are stronger than that and live in
// `supabase/tests/gift-cards.sql`, run by `bun run test:sql` in CI:
//
//   G2/G3  `balance` cannot be PATCHed through PostgREST and the ledger cannot
//          be rewritten — refused by trigger, not merely unoffered.
//   G10    a REAL code at another facility is INDISTINGUISHABLE from a code
//          nobody has. It needs two facilities and two identities, which this
//          session does not have. What is asserted here is the near half: an
//          invented code is refused, and the refusal names no card.
//
// ── CLEANUP: DRAINED, THEN CANCELLED ──────────────────────────────────────
//
// A gift card cannot be deleted — there is no DELETE policy, deliberately,
// because destroying the record of a liability is the failure this table
// exists to prevent. So `afterAll` does what a business would: redeems whatever
// is left down to zero and cancels the card, leaving nothing owed.
//
// Every card this file touches wears the `E2E-GC-` prefix, and cleanup sweeps
// ONLY those — including any left behind by a run that was cancelled mid-flight.
// The marker is not decoration: a sweep by "recently issued" or "zero points"
// would spend a real customer's card, which is exactly how `loyalty-tiers` came
// to be minting real $5 vouchers on every push before it was fixed.
//
// WHAT IT CANNOT CLEAN, AND WHY THAT IS RIGHT: two of these tests end with a
// card that is cancelled or expired, and neither can be drained — the database
// refuses to spend one, deliberately. So each run leaves a handful of cancelled
// cards, two of them still showing a balance. That is not residue to be tidied
// away: it is what a written-off card looks like, and a business reconciling
// its books needs to see what it wrote off. Nothing there is spendable.
// ============================================================================

const CARDS = "/api/gift-cards";
const REDEEM = "/api/gift-cards/redeem";

/** Every code this file creates starts here, and cleanup touches nothing else. */
const MARKER = "E2E-GC-";

type Page = import("@playwright/test").Page;

interface Card {
  id: string;
  code: string;
  balance: number;
  initialAmount: number;
  status: string;
  effectiveStatus: string;
  purchasedByClientRef: number | null;
}

interface LedgerEntry {
  kind: string;
  amount: number;
  balanceAfter: number;
}

/** Unique per run, so two runs cannot collide on the per-facility unique code. */
function freshCode(label: string): string {
  return `${MARKER}${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

async function issue(page: Page, body: Record<string, unknown>): Promise<Card> {
  const res = await page.request.post(CARDS, { data: body });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { card: Card }).card;
}

async function readByCode(page: Page, code: string): Promise<Card | null> {
  const res = await page.request.get(
    `${CARDS}?code=${encodeURIComponent(code)}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { cards: Card[] }).cards[0] ?? null;
}

async function ledgerOf(page: Page, id: string): Promise<LedgerEntry[]> {
  const res = await page.request.get(`${CARDS}/${id}`);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { transactions: LedgerEntry[] }).transactions;
}

test.describe("gift cards", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.get(CARDS);
    if (res.ok()) {
      const { cards } = (await res.json()) as { cards: Card[] };
      for (const card of cards) {
        if (!card.code.startsWith(MARKER)) continue;

        // Drain first, and ONLY while the card can still be spent. Two of the
        // tests below deliberately leave a card cancelled or expired, and
        // `redeem_gift_card` refuses both — correctly. Posting the redemption
        // anyway and swallowing the error would make this loop look like it
        // zeroed every card when it cannot, which is the shape of a verifier
        // that reports success it never checked.
        const spendable = card.effectiveStatus === "active" && card.balance > 0;
        if (spendable) {
          const drained = await page.request.post(REDEEM, {
            data: {
              code: card.code,
              amount: card.balance,
              note: "E2E cleanup: drain",
            },
          });
          expect(drained.ok(), await drained.text()).toBe(true);
        }

        if (card.status !== "cancelled") {
          await page.request.patch(`${CARDS}/${card.id}`, {
            data: { status: "cancelled" },
          });
        }
      }
    }
    await context.close();
  });

  test("issuing a card creates the card and its opening entry together", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("issue");
    const card = await issue(page, { amount: 100, code, kind: "online" });

    expect(card.code).toBe(code);
    expect(card.balance).toBe(100);
    expect(card.initialAmount).toBe(100);
    expect(card.status).toBe("active");

    // The opening balance IS a ledger entry — there is no other way to put
    // money on a card, so the column and its explanation cannot drift apart.
    const ledger = await ledgerOf(page, card.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].kind).toBe("issued");
    expect(ledger[0].amount).toBe(100);
    expect(ledger[0].balanceAfter).toBe(100);
  });

  test("a balance is the sum of its ledger", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("spend");
    const card = await issue(page, { amount: 60, code });

    const res = await page.request.post(REDEEM, {
      data: { code, amount: 25, note: "E2E partial" },
    });
    expect(res.ok(), await res.text()).toBe(true);
    expect(((await res.json()) as { card: Card }).card.balance).toBe(35);

    const ledger = await ledgerOf(page, card.id);
    expect(ledger.map((e) => e.amount)).toEqual([60, -25]);
    expect(ledger[1].balanceAfter).toBe(35);
    expect(ledger.reduce((sum, e) => sum + e.amount, 0)).toBe(35);
  });

  test("an overdraft is refused AND takes nothing off the card", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("overdraft");
    const card = await issue(page, { amount: 20, code });

    const res = await page.request.post(REDEEM, {
      data: { code, amount: 50 },
    });
    expect(res.ok()).toBe(false);
    // 409: the request was well formed and the card simply does not hold it.
    expect(res.status()).toBe(409);

    // The half that matters. A refusal that had already debited would be an
    // error message over money that had gone.
    const after = await readByCode(page, code);
    expect(after?.balance).toBe(20);
    expect(await ledgerOf(page, card.id)).toHaveLength(1);
  });

  test("a code nobody has is refused, and the refusal names no card", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post(REDEEM, {
      data: { code: `${MARKER}NOT-A-REAL-CARD`, amount: 5 },
    });
    expect(res.status()).toBe(403);

    const { error } = (await res.json()) as { error: string };
    // The whole design of `redeem_gift_card` is that this sentence is also what
    // a real card at another facility gets. A gift card code is a bearer
    // instrument, so an answer separating "real, but not yours" from "not real"
    // is a way to search for real ones. G10 in gift-cards.sql proves the pair.
    expect(error).toContain("No gift card with that code");
    expect(error).not.toContain("facility");
    expect(error).not.toContain("permission");
  });

  test("a cancelled card cannot be spent", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("cancelled");
    const card = await issue(page, { amount: 40, code });

    const patched = await page.request.patch(`${CARDS}/${card.id}`, {
      data: { status: "cancelled" },
    });
    expect(patched.ok(), await patched.text()).toBe(true);

    const res = await page.request.post(REDEEM, { data: { code, amount: 10 } });
    expect(res.status()).toBe(403);
    expect(((await res.json()) as { error: string }).error).toContain(
      "cancelled",
    );

    // Cancelling is a decision, not arithmetic: the money is still on the row,
    // it simply cannot be spent. A business reconciling its books needs to see
    // what it wrote off.
    expect((await readByCode(page, code))?.balance).toBe(40);
  });

  test("an expired card reads expired and cannot be spent", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("expired");
    await issue(page, {
      amount: 30,
      code,
      expiresAt: "2020-01-01T00:00:00.000Z",
    });

    // Nothing sweeps expired cards, so the COLUMN still says active. The answer
    // the screen shows is computed on the server, against the same clock the
    // till will use — which is the point: whether a card still works must not
    // be a question about the browser's clock.
    const card = await readByCode(page, code);
    expect(card?.status).toBe("active");
    expect(card?.effectiveStatus).toBe("expired");

    const res = await page.request.post(REDEEM, { data: { code, amount: 5 } });
    expect(res.status()).toBe(403);
    expect(((await res.json()) as { error: string }).error).toContain(
      "expired",
    );
  });

  test("PATCH cannot move money", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("patch");
    const card = await issue(page, { amount: 15, code });

    const res = await page.request.patch(`${CARDS}/${card.id}`, {
      data: { balance: 9999, initialAmount: 9999, message: "E2E note" },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const after = (await res.json()) as { card: Card };
    // The message landed; the money did not. The route does not offer `balance`
    // and the trigger would refuse it anyway — G2 in gift-cards.sql proves the
    // second half, which a Playwright client cannot reach.
    expect(after.card.balance).toBe(15);
    expect(after.card.initialAmount).toBe(15);
    expect(await ledgerOf(page, card.id)).toHaveLength(1);
  });

  test("a groomer holds no gift cards and cannot issue one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    // `financial_manage_gift_cards` is held by accountant, admin, manager,
    // owner, reception and retail. A groomer sees an empty list because RLS
    // narrows the read, not because the route filtered anything.
    const list = await page.request.get(CARDS);
    expect(list.ok(), await list.text()).toBe(true);
    expect(((await list.json()) as { cards: Card[] }).cards).toEqual([]);

    const res = await page.request.post(CARDS, {
      data: { amount: 50, code: freshCode("groomer") },
    });
    expect(res.status()).toBe(403);
  });
});
