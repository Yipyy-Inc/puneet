import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Prepaid credit is store credit — one ledger, not two.
//
// ── THE DEFECT ────────────────────────────────────────────────────────────
//
// /facility/services/memberships kept `prepaidCredits`: a fixture list in
// `useState` whose "Add credits" dialog took a TYPED-IN CUSTOMER NAME and
// invented an id to hang it on (`cust-${Date.now()}`). Meanwhile the till
// spends `store_credit_entries` — `record_payment` deducts from it and a
// refund to credit writes into it.
//
// So a facility could issue $200 to a customer who did not exist, watch the
// screen show the balance, and the customer's real balance — the only one
// anything honours — never moved.
//
// ── WHAT THIS SUITE CHECKS ────────────────────────────────────────────────
//
//   * credit issued on this screen lands on the ledger the till reads;
//   * the balance is a SUM, so returning credit nets it off rather than
//     deleting the row it came from;
//   * an entry of zero is refused, and so is a customer who does not exist.
//
// ── IT WAS IN NO SUITE UNTIL 2026-09-23 ──────────────────────────────────
//
// Written, complete, passing, and run by nothing — for the same reason
// `booking-payment-ledger` and `booking-payment-screens` sat unrun until
// 2026-08-25, and the day those were finally put in a suite they caught a
// checkout asking $64 on a booking that already had $16 paid. AGENTS.md has
// carried the line since: a spec in no suite is not coverage, it is a file.
//
// Putting this one in the gate found two things, neither of them in the code
// it tests. See the comment on the second test for the hazard in the spec
// itself, and `GET /api/store-credit` for the unbounded read that was 22 days
// from reporting the wrong balance.
// ============================================================================

const CLIENT_REF = 15;

interface Account {
  clientRef: number;
  clientName: string;
  balance: number;
  totalIssued: number;
  totalSpent: number;
  entryCount: number;
}

interface Entry {
  id: string;
  clientRef: number;
  amount: number;
  reason: string;
  note: string;
}

interface Ledger {
  accounts: Account[];
  entries: Entry[];
}

async function ledger(page: import("@playwright/test").Page): Promise<Ledger> {
  const res = await page.request.get("/api/store-credit");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Ledger;
}

function balanceOf(l: Ledger, ref: number): number {
  return l.accounts.find((a) => a.clientRef === ref)?.balance ?? 0;
}

const NOTE = "[e2e store-credit]";

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // The ledger is APPEND-ONLY — there is no delete policy, deliberately — so
    // cleanup is a balancing entry rather than a removal. That is the same
    // thing the "Return balance" action does, and the reason it exists.
    const before = await ledger(page);
    const outstanding = before.entries
      .filter((e) => e.note.includes(NOTE))
      .reduce((sum, e) => sum + e.amount, 0);
    if (Math.abs(outstanding) > 0.005) {
      const res = await page.request.post("/api/store-credit", {
        data: {
          clientRef: CLIENT_REF,
          amount: -outstanding,
          reason: "adjustment",
          note: `${NOTE} cleanup`,
        },
      });
      console.log(
        `cleanup: balancing entry of ${-outstanding} → ${res.status()}`,
      );
    } else {
      console.log("cleanup: nothing outstanding");
    }
  } finally {
    await page.close();
  }
});

test.describe("store credit", () => {
  test.slow();

  test("credit issued on the memberships screen lands on the ledger", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = balanceOf(await ledger(page), CLIENT_REF);

    const res = await page.request.post("/api/store-credit", {
      data: { clientRef: CLIENT_REF, amount: 40, note: NOTE },
    });
    expect(res.status(), await res.text()).toBe(201);

    const after = await ledger(page);
    // A DELTA, not an absolute: client 15 has its own history, and refunds to
    // store credit from other suites land here too.
    expect(balanceOf(after, CLIENT_REF) - before).toBeCloseTo(40, 2);

    const account = after.accounts.find((a) => a.clientRef === CLIENT_REF);
    expect(
      account?.clientName,
      "a real customer, not a typed-in name",
    ).toBeTruthy();
    expect(
      account!.totalIssued,
      "and the totals are sums over the same entries",
    ).toBeGreaterThanOrEqual(40);
  });

  test("returning what was issued nets it off rather than deleting", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // ── IT RETURNS ITS OWN $40, NOT THE CUSTOMER'S BALANCE ────────────────
    //
    // This read the whole balance and posted the negative of it, so the
    // assertion could be `≈ 0`. That is a nicer-looking number and a far
    // worse test: client 15 held 595 entries and $25,695 when this spec was
    // first put into a suite, so the run zeroed a real ledger and depended on
    // `afterAll` to put it back. Any run that died in between — a timeout, a
    // cancelled CI job — left a customer on $0.
    //
    // The property being tested is that a return is a balancing ENTRY and not
    // a deletion, and returning $40 proves that exactly as well as returning
    // $25,735 does. Nothing is given up; the blast radius is.
    const ISSUED = 40; // what the first test put in
    const before = balanceOf(await ledger(page), CLIENT_REF);
    expect(
      before,
      "the first test's credit is there to return",
    ).toBeGreaterThanOrEqual(ISSUED);
    const entriesBefore = (await ledger(page)).entries.length;

    const res = await page.request.post("/api/store-credit", {
      data: {
        clientRef: CLIENT_REF,
        amount: -ISSUED,
        reason: "adjustment",
        note: `${NOTE} returned`,
      },
    });
    expect(res.status(), await res.text()).toBe(201);

    const after = await ledger(page);
    // Back where it started — the sum moved by exactly what was returned.
    expect(balanceOf(after, CLIENT_REF)).toBeCloseTo(before - ISSUED, 2);
    // And the history GREW. The old screen's "Remove" deleted the row.
    expect(after.entries.length).toBe(entriesBefore + 1);
  });

  test("an entry of zero is not a movement", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post("/api/store-credit", {
      data: { clientRef: CLIENT_REF, amount: 0, note: NOTE },
    });
    expect(res.status()).toBe(422);
  });

  test("a customer who does not exist cannot be given credit", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The old dialog's whole failure mode: a name with no customer behind it.
    const res = await page.request.post("/api/store-credit", {
      data: { clientRef: 99999999, amount: 25, note: NOTE },
    });
    expect(res.status(), await res.text()).toBe(404);
  });

  test("the screen shows the ledger, not a fixture", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const marker = `${NOTE} on screen`;
    const created = await page.request.post("/api/store-credit", {
      data: { clientRef: CLIENT_REF, amount: 12.5, note: marker },
    });
    expect(created.status(), await created.text()).toBe(201);

    const account = (await ledger(page)).accounts.find(
      (a) => a.clientRef === CLIENT_REF,
    );
    expect(account).toBeTruthy();

    await page.goto("/facility/services/memberships");
    await page.getByRole("tab", { name: /credits/i }).click();

    // The customer's real name, from `clients` — the fixture list had four
    // invented ones and none of them was a customer of this facility.
    await expect(
      page.getByText(account!.clientName, { exact: false }).first(),
    ).toBeVisible({ timeout: 60_000 });
  });
});
