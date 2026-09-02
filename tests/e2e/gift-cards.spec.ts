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
const TO_CREDIT = "/api/gift-cards/to-credit";

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

/** A customer's store-credit balance, from the ledger that owns the sum. */
async function creditBalance(page: Page, clientRef: number): Promise<number> {
  const res = await page.request.get(
    `/api/store-credit?clientRef=${clientRef}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const { accounts } = (await res.json()) as {
    accounts: { clientRef: number; balance: number }[];
  };
  return accounts.find((a) => a.clientRef === clientRef)?.balance ?? 0;
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

  test("an adjustment puts money back, and needs a reason", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("adjust");
    const card = await issue(page, { amount: 20, code });

    // Take it to zero, then correct the overcharge — the shape this exists for.
    await page.request.post(REDEEM, { data: { code, amount: 20 } });

    const noReason = await page.request.post(`${CARDS}/${card.id}/adjust`, {
      data: { amount: 15, reason: "   " },
    });
    expect(noReason.status()).toBe(400);

    const applied = await page.request.post(`${CARDS}/${card.id}/adjust`, {
      data: { amount: 15, reason: "E2E: overcharged at the till" },
    });
    expect(applied.ok(), await applied.text()).toBe(true);
    expect(((await applied.json()) as { card: Card }).card.balance).toBe(15);

    // Spent to zero and then topped up reads as live again — status follows the
    // arithmetic, which is what somebody handed the card back expects.
    const after = await readByCode(page, code);
    expect(after?.status).toBe("active");

    const ledger = await ledgerOf(page, card.id);
    expect(ledger.map((e) => e.amount)).toEqual([20, -20, 15]);
    expect(ledger.reduce((sum, e) => sum + e.amount, 0)).toBe(15);
  });

  test("an adjustment cannot overdraw the card either", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("adjust-over");
    const card = await issue(page, { amount: 10, code });

    const res = await page.request.post(`${CARDS}/${card.id}/adjust`, {
      data: { amount: -50, reason: "E2E: too much" },
    });
    expect(res.status()).toBe(409);

    // Same half that matters as the redemption overdraft: refused, and nothing
    // taken. The guard is the applying trigger, under the row lock.
    expect((await readByCode(page, code))?.balance).toBe(10);
    expect(await ledgerOf(page, card.id)).toHaveLength(1);
  });

  test("the screen shows the cards the database holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const code = freshCode("screen");
    await issue(page, { amount: 45, code });

    await page.goto("/facility/dashboard/gift-cards");
    await page.getByRole("tab", { name: "All Cards" }).click();

    // The table masks the number to its last four, which is the whole point of
    // the column — so that is what is asserted, not the full code.
    const masked = `****${code.slice(-4)}`;
    await expect(page.getByText(masked).first()).toBeVisible({
      timeout: 15_000,
    });

    // This button was DISABLED for part of 2026-08-23, while the cards were real
    // rows and their destination was not. It is on again because the destination
    // turned out to exist: `store_credit_entries`, the ledger the till already
    // spends from. What makes it safe is asserted properly by the two transfer
    // tests below, not by it being clickable.
    await expect(
      page.getByRole("button", { name: /redeem to credit/i }),
    ).toBeEnabled();
  });

  test("selling a card through the wizard records it", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/gift-cards");

    // `exact` matters: the overview tab has a "Sell Digital / Send branded…"
    // shortcut card whose accessible name starts the same way.
    await page
      .getByRole("button", { name: "Sell Digital", exact: true })
      .click();

    // Step 1 — amount. Step 2 — a recipient. Step 3 — issue.
    await page.getByRole("button", { name: "$25", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    // Typed straight into the recipient field rather than picked from the
    // customer search: the search sets a MATCHED customer, and this test is
    // about issuing a card, not about the picker.
    await page
      .getByPlaceholder("jane@example.com")
      .fill(`e2e-wizard-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Issue Card" }).click();

    // The CODE is generated by the database, so the success screen is the only
    // place the counter can read it — and it is what proves a row exists rather
    // than a modal having advanced. What this replaced waited 1,400ms and
    // showed this same screen over nothing.
    await expect(page.getByText("Gift card issued!")).toBeVisible({
      timeout: 20_000,
    });
    const shown = await page
      .locator("p.font-mono")
      .first()
      .textContent({ timeout: 10_000 });
    expect(shown?.trim()).toBeTruthy();

    await page.getByRole("button", { name: "Done" }).click();

    // And it is really there, read back through the API as a separate request.
    const card = await readByCode(page, (shown ?? "").trim());
    expect(card?.balance).toBe(25);
    expect(card?.status).toBe("active");

    // Cleaned up here rather than by the afterAll sweep: the database picked
    // this code, so it does not wear the E2E marker and the sweep cannot see it.
    await page.request.post(REDEEM, {
      data: { code: card!.code, amount: 25, note: "E2E cleanup: drain" },
    });
    await page.request.patch(`${CARDS}/${card!.id}`, {
      data: { status: "cancelled" },
    });
  });

  test("a valid card is redeemable at the counter", async ({ page }) => {
    // ── THE BUTTON, NOT THE ROUTE ────────────────────────────────────────
    //
    // "handing a card in moves its value onto the customer's credit", below,
    // posts to /api/gift-cards/to-credit and has always passed. It could not
    // have caught this: the defect was in the modal, BEFORE any request.
    //
    // `RedeemGiftCardModal` derived the card's origin location with
    // `deriveLocationId(card.id)` — a hash into one of three fixture location
    // slugs — and fed it to `canRedeemGiftCard`, which compares it to the
    // till's location. `crossLocationGiftCards` defaults to false, and a slug
    // can never equal a real location uuid, so every card read as "purchased
    // somewhere else". `cardValid` went false and Continue died.
    //
    // MEASURED on a real $40 card before the fix: status Active, "$40.00
    // available", Continue disabled, and nothing on screen saying why — the
    // banner that would have explained it was gated on `isMultiLocation`,
    // which is false for every facility here.
    //
    // So the assertion is the ENABLED button on a card the screen has already
    // agreed is good. It fails against the old code and passes against
    // 80d9b0ae.
    await signIn(page, ACCOUNTS.owner);

    // ── THE CARD HAS TO BE ONE THE BUG COULD REACH ───────────────────────
    //
    // `deriveLocationId` was `parseInt(id)` % 3 into a slug array, and a uuid
    // beginning with a LETTER parses to NaN — index NaN is `undefined`, the
    // origin reads falsy, and the cross-location check short-circuits to
    // allowed. So the defect only ever reached cards whose id begins with a
    // digit: MEASURED across this facility's 2,248 cards, 59.9% of them.
    //
    // Issuing one card and hoping would make this test a coin flip as a
    // control — it passed against the reintroduced bug on its first attempt,
    // which is how this was found. So issue until the id qualifies. Ten
    // attempts fail once in about 10,000 runs.
    let code = "";
    for (let attempt = 0; attempt < 10; attempt += 1) {
      code = freshCode("counter");
      const card = await issue(page, { amount: 40, code, kind: "online" });
      if (/^[0-9]/.test(card.id)) break;
      // Not qualifying: drain and cancel it here rather than leaving the sweep
      // a card this test never used.
      await page.request.post(REDEEM, {
        data: { code, amount: 40, note: "E2E cleanup: drain" },
      });
      await page.request.patch(`${CARDS}/${card.id}`, {
        data: { status: "cancelled" },
      });
      code = "";
    }
    expect(code, "no card with a digit-leading id in ten tries").not.toBe("");

    await page.goto("/facility/dashboard/gift-cards");
    const dialog = page.getByRole("dialog");

    // WAIT FOR THE CARDS FIRST, and not as politeness. The modal searches the
    // list the PAGE holds, not the API, so opening it before that list arrives
    // answers "No gift card found with that code" for a card that plainly
    // exists — which is how this test failed on its first run. A counter
    // scanning quickly after a page load can see the same thing; that is worth
    // knowing, but it is not the defect under test, so the test waits rather
    // than asserting the race.
    await expect(page.getByText(/Total issued: [1-9]/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "Redeem to Credit" }).click();

    // Step 1 — who receives the balance.
    await page
      .getByPlaceholder("Search by name, email, or phone…")
      .fill("Alice");
    await dialog
      .getByRole("button", { name: /Alice Johnson/ })
      .first()
      .click({ timeout: 20_000 });
    await dialog.getByRole("button", { name: "Continue" }).click();

    // Step 2 — the card itself. Enter submits; the search button is an icon.
    const scan = page.getByPlaceholder("Scan or type the card number");
    await scan.fill(code);
    await scan.press("Enter");

    // The screen agrees the card is good…
    await expect(dialog.getByText("Active")).toBeVisible({ timeout: 20_000 });
    await expect(dialog.getByText("$40.00")).toBeVisible();

    // …so the counter can act on it. This is the whole point of the test: a
    // card the modal itself calls Active must not have a dead button, and if
    // anything ever does refuse one, the refusal has to be on screen.
    await expect(
      dialog.getByRole("button", { name: "Continue" }),
      "a card shown as Active with a balance must be redeemable",
    ).toBeEnabled();
    await expect(dialog).not.toContainText("purchased at a different location");
  });

  test("handing a card in moves its value onto the customer's credit", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // A real client at this facility, by the ref every screen uses.
    const clientsRes = await page.request.get("/api/clients");
    expect(clientsRes.ok(), await clientsRes.text()).toBe(true);
    const clientRef = ((await clientsRes.json()) as { id?: number }[])
      .map((c) => c.id)
      .find((v): v is number => typeof v === "number");
    expect(clientRef, "the facility has at least one client").toBeTruthy();

    const before = await creditBalance(page, clientRef as number);

    const code = freshCode("to-credit");
    await issue(page, { amount: 70, code });

    const res = await page.request.post(TO_CREDIT, {
      data: { code, amount: 45, clientRef },
    });
    expect(res.ok(), await res.text()).toBe(true);
    const moved = (await res.json()) as {
      creditBalance: number;
      amount: number;
    };

    // BOTH ledgers, and the sum of them. The business owed 70 on the card;
    // afterwards it owes 25 on the card and 45 more on the account. Nothing was
    // created and nothing vanished — which is what makes this a transfer rather
    // than a payout, and why it needs no `process_refund`.
    const card = await readByCode(page, code);
    expect(card?.balance).toBe(25);
    expect(moved.creditBalance).toBeCloseTo(before + 45, 2);
    expect(card!.balance + moved.amount).toBe(70);

    // And the credit says where it came from, rather than reading as a gift.
    const ledger = await page.request.get(
      `/api/store-credit?clientRef=${clientRef}`,
    );
    expect(ledger.ok(), await ledger.text()).toBe(true);
    const { entries } = (await ledger.json()) as {
      entries: { amount: number; reason: string; note: string }[];
    };
    const fromCard = entries.filter(
      (e) => e.reason === "gift_card" && e.note.includes(code),
    );
    expect(fromCard).toHaveLength(1);
    expect(fromCard[0].amount).toBe(45);
  });

  test("a transfer that overdraws moves NEITHER ledger", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const clientsRes = await page.request.get("/api/clients");
    const clientRef = ((await clientsRes.json()) as { id?: number }[])
      .map((c) => c.id)
      .find((v): v is number => typeof v === "number") as number;

    const code = freshCode("to-credit-over");
    const card = await issue(page, { amount: 10, code });
    const before = await creditBalance(page, clientRef);

    const res = await page.request.post(TO_CREDIT, {
      data: { code, amount: 500, clientRef },
    });
    expect(res.status()).toBe(409);

    // The half that matters. A transfer that debited the card and then failed
    // to credit — or credited without debiting — is exactly what doing both in
    // one transaction exists to prevent.
    expect((await readByCode(page, code))?.balance).toBe(10);
    expect(await creditBalance(page, clientRef)).toBeCloseTo(before, 2);
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
