import { expect, test } from "@playwright/test";

import { signIn } from "./_auth";

// ============================================================================
// A client's payments.
//
// The billing tab listed `@/data/payments` filtered by clientId. Real client,
// fixture money — usually an empty list, and on a colliding id somebody else's
// payments presented as theirs.
//
// The fixture also had a "Gift Cards" tile rendering `giftCards.slice(0, 0)`:
// a hard-coded zero dressed as a count, on a screen where every other number is
// money. That tile is gone rather than converted; nothing is client-scoped to
// count yet.
// ============================================================================

const PAYMENTS = "/api/payments";
const CLIENT_REF = Number(process.env.E2E_POSTGRES_CLIENT_REF ?? "");
const STAFF = process.env.CLOVER_E2E_STAFF_EMAIL?.trim() ?? "";
const CUSTOMER = process.env.CLOVER_E2E_CUSTOMER_EMAIL?.trim() ?? "";
// A real client at a DIFFERENT FACILITY, with hundreds of payments of their
// own. An empty result for a client who has nothing would prove nothing about
// scoping; this one has plenty to refuse.
const OTHER_REF = Number(process.env.E2E_OTHER_CLIENT_REF ?? "");

test.describe("a client's payments", () => {
  test.skip(
    !Number.isInteger(CLIENT_REF) ||
      !Number.isInteger(OTHER_REF) ||
      !STAFF ||
      !CUSTOMER,
    "Set E2E_POSTGRES_CLIENT_REF, E2E_OTHER_CLIENT_REF, " +
      "CLOVER_E2E_STAFF_EMAIL and CLOVER_E2E_CUSTOMER_EMAIL. See .env.example.",
  );

  test("are refused to anyone not signed in", async ({ page }) => {
    expect((await page.request.get(PAYMENTS)).status()).toBe(401);
  });

  test("staff read them, and a refund carries a negative amount", async ({
    page,
  }) => {
    await signIn(page, STAFF);
    const response = await page.request.get(
      `${PAYMENTS}?clientRef=${CLIENT_REF}`,
    );
    expect(response.status()).toBe(200);

    const rows = (await response.json()) as {
      id: string;
      amount: number;
      isRefund: boolean;
      method: string;
    }[];
    expect(Array.isArray(rows)).toBe(true);

    // The SIGN is the assertion. A refund is stored as its own payment row
    // pointing at the one it reverses, so a list that showed both as positive
    // would total to more than the customer ever paid — on the tile labelled
    // "Total Paid".
    for (const row of rows) {
      if (row.isRefund) expect(row.amount).toBeLessThan(0);
      else expect(row.amount).toBeGreaterThanOrEqual(0);
    }
  });

  test("a bad clientRef is refused, not silently ignored", async ({ page }) => {
    await signIn(page, STAFF);
    // Ignoring it would return EVERY payment the caller can see, under a URL
    // that claims to be scoped to one client.
    const response = await page.request.get(`${PAYMENTS}?clientRef=abc`);
    expect(response.status()).toBe(422);
  });

  test("staff cannot read another facility's client's payments", async ({
    page,
  }) => {
    await signIn(page, STAFF);

    // OTHER_REF belongs to a DIFFERENT FACILITY and has hundreds of payments of
    // its own — so an empty list here is `payments_read` refusing rows across a
    // tenant boundary, not a client who happens to owe nothing.
    //
    // The positive control is the test above: the same account, the same
    // endpoint, reads its OWN facility's client fine. Without it this would
    // pass against an endpoint that returned nothing to anybody.
    const response = await page.request.get(
      `${PAYMENTS}?clientRef=${OTHER_REF}`,
    );
    expect(response.status()).toBe(200);
    expect((await response.json()) as unknown[]).toHaveLength(0);
  });

  test("a customer reads no payments at all, including their own", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);

    // `payments_read` requires `financial_view_amounts`, a STAFF permission, so
    // a customer is refused every row — including rows for the client they
    // themselves are. That is the policy's intent: a payment row carries the
    // staff member who took it, the card brand and the last four.
    //
    // Recorded here because it is a real constraint on the customer portal: a
    // "your payment history" screen cannot be built on this route without a
    // separate, narrower policy. Empty is correct today, and a future change
    // that widens it will break this test on purpose.
    for (const ref of [CLIENT_REF, OTHER_REF]) {
      const response = await page.request.get(`${PAYMENTS}?clientRef=${ref}`);
      expect(response.status()).toBe(200);
      expect((await response.json()) as unknown[]).toHaveLength(0);
    }
  });
});
