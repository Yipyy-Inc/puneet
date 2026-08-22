import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The redemption log is the facility's own rewards.
//
// ── WHAT IT READ BEFORE ───────────────────────────────────────────────────
//
// `src/data/loyalty-redemptions` — hand-authored rows keyed by `facilityId: 1`.
// Every facility on the platform saw the same log, none of it had happened, and
// a voucher a facility really issued appeared nowhere in it.
//
// ── THE ONE THAT WOULD HAVE STAYED WRONG ──────────────────────────────────
//
// Nothing flips a voucher to `expired`. There is no scheduler here, so a reward
// whose `expires_at` has passed sits at `active` in its own column while
// `consume_loyalty_voucher` refuses to spend it — two answers to one question,
// and the screen was showing the wrong one. Its "Expired" tile could only ever
// read zero, and dead rewards were counted as outstanding liability.
//
// The route derives `effectiveStatus` against the DATABASE's clock. That is the
// assertion this file exists for, and it needs a voucher that has really
// expired — so it issues one, at zero points, dated yesterday.
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// That voucher. There is no way to delete one through the API and there should
// not be: a reward a facility issued is not a row an application gets to erase.
// It is safe to leave precisely because it is already expired and cost nothing
// — it can never come off anybody's bill. A test must not leave a LIVE discount
// on a demo account, which is why this one is dated into the past.
// ============================================================================

const VOUCHERS = "/api/loyalty/vouchers";
const ACCOUNTS_API = "/api/loyalty/accounts";
const SCREEN = "/facility/dashboard/loyalty/redemptions";

type Page = import("@playwright/test").Page;

interface Voucher {
  id: string;
  accountId: string;
  rewardType: string;
  rewardValue: number;
  status: string;
  effectiveStatus: string;
  pointsSpent: number;
  expiresAt: string | null;
  clientRef: number | null;
  clientName: string | null;
  usedOnBookingRef: number | null;
}

async function vouchers(page: Page, query = ""): Promise<Voucher[]> {
  const res = await page.request.get(`${VOUCHERS}${query}`);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { vouchers: Voucher[] }).vouchers;
}

/** Yesterday, so the voucher is expired the moment it exists. */
function yesterday(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

test.describe("the redemption log", () => {
  test("is the facility's own rewards, with a customer on every row", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const accountsRes = await page.request.get(ACCOUNTS_API);
    expect(accountsRes.ok(), await accountsRes.text()).toBe(true);
    const { accounts } = (await accountsRes.json()) as {
      accounts: { id: string; clientRef: number }[];
    };
    const known = new Map(accounts.map((a) => [a.id, a.clientRef]));

    const rows = await vouchers(page, "?withCustomer=1");
    test.skip(rows.length === 0, "this facility has issued no rewards");

    for (const row of rows) {
      // Every reward belongs to an account at THIS facility. The fixture it
      // replaced was keyed by a numeric id matching no row here.
      expect(known.has(row.accountId)).toBe(true);
      // And names the customer, because a log of uuids is one nobody can act
      // on. `clientRef` must be the account's own — not a coincidence.
      expect(row.clientRef).toBe(known.get(row.accountId));
      expect(row.clientName).toBeTruthy();
    }
  });

  test("the customer lookup is opt-in, so the checkout does not pay for it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const plain = await vouchers(page);
    test.skip(plain.length === 0, "this facility has issued no rewards");

    // The checkout asks this route on every render of a booking it might
    // discount, and has the customer in front of it already. Two extra lookups
    // per call for a name nobody reads is the cost this guards.
    for (const row of plain) {
      expect(row.clientRef).toBeNull();
      expect(row.clientName).toBeNull();
    }
  });

  test("a reward past its expiry reads as expired, not as active", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const accountsRes = await page.request.get(ACCOUNTS_API);
    const { accounts } = (await accountsRes.json()) as {
      accounts: { id: string }[];
    };
    test.skip(accounts.length === 0, "no loyalty account to issue against");
    const accountId = accounts[0].id;

    // Zero points: this must not take anything off a real balance. Dated
    // yesterday, so it is dead on arrival — see the banner.
    const issued = await page.request.post(VOUCHERS, {
      data: {
        accountId,
        rewardType: "discount_fixed",
        rewardValue: 1,
        points: 0,
        expiresAt: yesterday(),
        description: "E2E expired-reward probe",
      },
    });
    expect(issued.ok(), await issued.text()).toBe(true);
    const { voucher } = (await issued.json()) as { voucher: Voucher };

    const row = (await vouchers(page)).find((v) => v.id === voucher.id);
    expect(row).toBeDefined();

    // ── THE LINE THIS FILE EXISTS FOR ─────────────────────────────────────
    //
    // The STORED status is still `active` — nothing flipped it, and nothing
    // will. What the screen shows is the derived one.
    expect(row?.status).toBe("active");
    expect(row?.effectiveStatus).toBe("expired");

    // And the database agrees: it is not spendable.
    const spendable = await vouchers(page, "?spendable=1");
    expect(spendable.some((v) => v.id === voucher.id)).toBe(false);
  });

  test("the screen renders the rewards the API holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const rows = await vouchers(page, "?withCustomer=1");

    await page.goto(SCREEN);
    // `getByText`, not `getByRole("heading")` — shadcn's `CardTitle` is a
    // `div`, so nothing on this card carries a heading role.
    await expect(page.getByText("Redemption Log")).toBeVisible({
      timeout: 40_000,
    });

    // The count in the card's own subtitle is the count the API returned.
    await expect(
      page.getByText(
        `${rows.length} reward${rows.length === 1 ? "" : "s"} issued at this facility`,
      ),
    ).toBeVisible({ timeout: 20_000 });

    test.skip(rows.length === 0, "nothing issued, so nothing to render");

    // A real customer's name, from a real account — not "Client #14".
    const name = rows.find((r) => r.clientName)?.clientName;
    if (name) {
      await expect(page.getByText(name).first()).toBeVisible({
        timeout: 20_000,
      });
    }
  });

  test("a caretaker cannot read the log", async ({ page }) => {
    await signIn(page, ACCOUNTS.caretaker);

    // RLS is the boundary. `loyalty_vouchers_read` wants `marketing_view` or
    // `take_payment`; a caretaker holds neither, so the list comes back empty
    // rather than refused — the same shape every loyalty read here takes.
    const res = await page.request.get(`${VOUCHERS}?withCustomer=1`);
    if (res.ok()) {
      const body = (await res.json()) as { vouchers: Voucher[] };
      expect(body.vouchers.length).toBe(0);
    } else {
      expect(res.status()).toBeGreaterThanOrEqual(400);
    }
  });
});
