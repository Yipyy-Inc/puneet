import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE TILL'S OTHER TWO BUTTONS: "Add fee" and "Use store credit".
//
// `retail-charge.spec.ts` and `retail-refund.spec.ts` between them cover who
// may take money and who may give it back, and both do it entirely through
// REFUSALS — nothing either asserts requires a sale to exist. So the two
// controls that actually put a line on a sale and take money off a ledger had
// no coverage at all, in a suite whose stated purpose is "the authorisation
// boundary, and money".
//
// Owed since the Supabase egress freeze of 2026-09-17, when adding it would
// have cost suite runs nobody could spend. Written 2026-09-23.
//
// ── WHAT EACH ONE IS ──────────────────────────────────────────────────────
//
// A FEE is a sale line with no `productId`: `record_retail_sale` skips the
// stock movement for it, and the add-to-booking path skips it too.
//
// STORE CREDIT is a tender that moves no money: `record_payment` is called
// with `amount_charged => 0` and `store_credit_applied => the amount`, and the
// debit lands on `store_credit_entries`. Two guards sit on the TABLE rather
// than in the function, because `authenticated` can insert into that table
// directly and both functions are SECURITY INVOKER (20260918083126): a payment
// needs an amount, and `store_credit_never_overdrawn` refuses a spend past the
// balance. Before that trigger a spend one cent over was accepted and the
// balance ended at −$40.01.
//
// The overdraw guard is the one most worth having here. It was proven on
// 2026-09-18 by `supabase/tests/till-trust-guards.sql`, which has to reach
// past a deferred constraint to observe it. This drives the shipped route
// instead, so the guard is asserted where a cashier would actually meet it.
//
// ── IT NEVER LEAVES MONEY BEHIND ──────────────────────────────────────────
//
// One Postgres, shared with CI. The sale here is tendered to STORE CREDIT, so
// `amount_charged` is 0 and no cash, card or e-transfer is ever recorded. The
// credit it spends is credit it issued itself, and `afterAll` READS THE
// BALANCE BACK and posts a correcting adjustment for any drift rather than
// trusting the arithmetic — the ledger is append-only by design, so a
// correction is the only cleanup there is, and it is what the screen's own
// "Return balance" action does.
//
// Its marker is deliberately NOT `[e2e store-credit]`. That string is owned by
// `store-credit.spec.ts` AND matched by `purge_e2e_store_credit()`, which sums
// only entries with no `payment_id` — and a till spend goes through
// `record_payment`, so it HAS one. Marking this spec's issues with that string
// would have the purge subtract the spend a second time and drive a real
// client's balance negative.
//
// ── ONE SALE PER RUN, AND WHY IT IS NOT PURGED ────────────────────────────
//
// `retail_sales` has no DELETE policy — read, insert and update only, like
// `bookings` — so a sale is a record, not scratch. The refusals below write
// nothing, and the one real sale is deliberately asked to prove three things
// at once rather than three sales proving one each.
//
// It is not purged, unlike bookings and store credit, and that is a choice:
// `/api/payments/retail/sales` derives the counter's sale list from `payments`
// rather than from `retail_sales`, and `payments` is append-only. Deleting the
// sale row would leave the payment behind and the list still showing it — so a
// purge would make the two surfaces disagree instead of cleaning either. One
// row a run, carrying MARKER, is the smaller wrong.
// ============================================================================

const MARKER = "[e2e retail-till]";
const CLIENT_REF = 15; // Alice Johnson, as store-credit.spec.ts uses

const FEE = 40;
const TAX = 6;
/** More than the sale, so the refusals below are refused on their merits. */
const FLOAT = 120;

interface Ledger {
  accounts: { clientRef: number; balance: number }[];
  entries: { amount: number; note: string }[];
}

interface SaleLine {
  productId?: string | null;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxable?: boolean;
}

/** What the till sends for one fee, tendered to store credit. */
function feeSale(amount: number, label: string, tax = 0) {
  const line: SaleLine = {
    name: `${MARKER} ${label}`,
    sku: "",
    quantity: 1,
    unitPrice: amount,
    total: amount,
    taxable: true,
  };
  return {
    items: [line],
    subtotal: amount,
    discount: 0,
    tax,
    tip: 0,
    total: amount + tax,
    tender: "store-credit",
    clientRef: CLIENT_REF,
    // `record_retail_sale` refuses a sale whose payments do not meet its
    // total, so the tender covers the tax as well.
    payments: [{ method: "store-credit", amount: amount + tax }],
    note: `${MARKER} ${label}`,
    cashierName: "e2e",
  };
}

async function ledger(page: Page): Promise<Ledger> {
  const res = await page.request.get("/api/store-credit");
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  // A cast is a claim: a 500 answers `{error}`, and reading `.accounts` off
  // that is `undefined`, which would read as a balance of zero.
  const l = (body ?? {}) as Partial<Ledger>;
  return {
    accounts: Array.isArray(l.accounts) ? l.accounts : [],
    entries: Array.isArray(l.entries) ? l.entries : [],
  };
}

async function balance(page: Page): Promise<number> {
  return (
    (await ledger(page)).accounts.find((a) => a.clientRef === CLIENT_REF)
      ?.balance ?? 0
  );
}

async function sell(page: Page, body: unknown) {
  return page.request.post("/api/retail/sales", {
    data: body,
    failOnStatusCode: false,
  });
}

let opening = 0;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    opening = await balance(page);
    const res = await page.request.post("/api/store-credit", {
      data: {
        clientRef: CLIENT_REF,
        amount: FLOAT,
        reason: "adjustment",
        note: `${MARKER} float`,
      },
    });
    expect(res.ok(), await res.text()).toBe(true);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // MEASURED, not assumed. The arithmetic says the balance should be back
    // where it started; this asks the ledger and corrects the difference, so a
    // run that failed halfway still hands the client's balance back.
    const drift = Math.round(((await balance(page)) - opening) * 100) / 100;
    if (Math.abs(drift) > 0.005) {
      const res = await page.request.post("/api/store-credit", {
        data: {
          clientRef: CLIENT_REF,
          amount: -drift,
          reason: "adjustment",
          note: `${MARKER} cleanup`,
        },
      });
      console.log(`cleanup: balancing entry of ${-drift} → ${res.status()}`);
    } else {
      console.log("cleanup: the balance is back where it started");
    }
  } finally {
    await page.close();
  }
});

test.describe("the till's fee line and its store-credit tender", () => {
  test("a fee is a line with no product, its tax rides with the sale, and credit pays for it", async ({
    page,
  }) => {
    // ── WHAT THIS CANNOT PROVE, AND WHERE THAT LIVES ──────────────────────
    //
    // WHETHER a fee is taxed is decided by the TILL, in a client-side reduce:
    // `addFeeToCart` pushes the line as `itemType: "product"` with NO
    // `productId`, and the tax pass exempts a line only when a real product
    // says it is exempt — so a fee, having no product to speak for it, is
    // taxed. That is deliberate: an untaxed fee under-collects tax, which is
    // the more expensive mistake to find later.
    //
    // `record_retail_sale` takes `p_tax` from the caller, so no request made
    // here can reveal what the till computed — the same limitation
    // `discount-rules.spec.ts` states about the booking form. What this pins
    // is the half the SERVER owns, and it is one real transaction rather than
    // three, because every sale rung here is a row that cannot be deleted.
    await signIn(page, ACCOUNTS.owner);

    const before = await balance(page);
    const res = await sell(page, feeSale(FEE, "late collection", TAX));
    expect(res.status(), await res.text()).toBe(201);

    const list = await page.request.get("/api/retail/sales");
    expect(list.ok(), await list.text()).toBe(true);
    const listed: unknown = await list.json();
    const rows = Array.isArray(listed)
      ? (listed as {
          taxTotal?: number;
          total?: number;
          items?: { productId?: string; productName?: string }[];
        }[])
      : [];
    const mine = rows.find((r) =>
      r.items?.some((i) => i.productName?.includes("late collection")),
    );
    expect(mine, "the sale is readable back").toBeTruthy();

    // 1. A FEE NAMES NO PRODUCT — which is what makes the stock movement and
    //    the add-to-booking path skip it.
    const line = (mine?.items ?? [])[0];
    expect(line?.productId, "a fee names no product").toBeUndefined();

    // 2. THE TAX REACHES THE SALE rather than being dropped on the way.
    expect(mine?.taxTotal, "the tax is on the sale").toBeCloseTo(TAX, 2);
    expect(mine?.total, `${FEE} + ${TAX}`).toBeCloseTo(FEE + TAX, 2);

    // 3. STORE CREDIT PAID FOR IT, through `record_payment` — `amount_charged`
    //    is 0, so no money changed hands and the ledger is the only thing that
    //    moved. It moved by exactly the total, not by the subtotal.
    expect(await balance(page), `${before} − ${FEE + TAX}`).toBeCloseTo(
      before - (FEE + TAX),
      2,
    );
  });

  test("a payment of nothing is refused, and the ledger does not move", async ({
    page,
  }) => {
    // `A payment needs an amount.` — errcode 22023, raised by
    // `record_retail_sale` before it reaches `record_payment`. The till's own
    // guard for this is client-side, and an EMPTY amount slipped past it on
    // 2026-09-17 and recorded the whole total as credit whatever the balance.
    await signIn(page, ACCOUNTS.owner);

    const before = await balance(page);
    const body = feeSale(30, "nothing tendered");
    body.payments = [{ method: "store-credit", amount: 0 }];

    const res = await sell(page, body);
    expect(res.status(), await res.text()).toBeGreaterThanOrEqual(400);
    expect(await balance(page), "nothing moved").toBeCloseTo(before, 2);
  });

  test("a spend past the balance is refused, and not a penny moves", async ({
    page,
  }) => {
    // `store_credit_never_overdrawn` (20260918083126). It sits on the TABLE,
    // not in the function, because `authenticated` can insert into
    // `store_credit_entries` directly and `record_payment` is SECURITY
    // INVOKER — a check inside the function would be a fence with a gate
    // beside it.
    await signIn(page, ACCOUNTS.owner);

    const before = await balance(page);
    const res = await sell(page, feeSale(before + 500, "overdraft"));
    expect(res.status(), await res.text()).toBeGreaterThanOrEqual(400);
    expect(await balance(page), "not a penny moved").toBeCloseTo(before, 2);
  });

  test("a groomer cannot ring one up", async ({ page }) => {
    // Who may sell is RLS on `retail_sales`, not a check in the route — the
    // route only asks whether anybody is signed in at all.
    await signIn(page, ACCOUNTS.groomer);
    const res = await sell(page, feeSale(10, "not yours to ring"));
    expect(res.status(), await res.text()).toBeGreaterThanOrEqual(400);
  });

  test("a signed-out caller cannot ring one up", async ({ page }) => {
    await page.context().clearCookies();
    const res = await sell(page, feeSale(10, "signed out"));
    expect(res.status()).toBe(401);
  });
});
