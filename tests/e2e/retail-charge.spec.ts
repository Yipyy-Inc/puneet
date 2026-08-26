import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The counter's card reader answers to the right people, and to nobody else.
//
// ── WHY THIS SPEC TAKES NO MONEY ──────────────────────────────────────────
//
// `/api/payments/retail/charge` reaches a live Clover merchant. Every case
// below is REFUSED before anything is contacted — no token, no permission, a
// malformed tender, an amount past the cap — so the suite can run on every push
// without spending anything or needing hardware.
//
// The one thing it cannot assert is a successful sale: that needs a real card
// on a real terminal, and the two paths it would exercise (`chargeOnTerminal`,
// `chargeCard`) are the same ones the booking specs already drive.
//
// ── AND WHY IT IS WORTH RUNNING ANYWAY ────────────────────────────────────
//
// This route exists because retail used to charge through a simulator. The
// thing most likely to go wrong with its replacement is not the charge — it is
// the gate in front of it: who may call it, and whether the facility comes from
// the session rather than the request. That is exactly what is asserted here.
// ============================================================================

const charge = (page: Page, body: unknown): Promise<APIResponse> =>
  page.request.post("/api/payments/retail/charge", { data: body });

/** Valid in every respect except that it will never be allowed to run. */
const wellFormed = {
  subtotalCents: 1234,
  taxCents: 0,
  tipCents: 0,
  clientRef: null,
  source: "clv_definitely_not_a_real_token",
  lines: [{ name: "Bag of food", unitPriceCents: 1234, quantity: 1 }],
};

test.describe("the retail charge route", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    await page.context().clearCookies();
    const response = await charge(page, wellFormed);
    expect(response.status()).toBe(401);
  });

  test("refuses a groomer, who may not take payments", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await charge(page, wellFormed);
    // 403 and nothing else: a groomer must not learn whether the merchant is
    // connected, which a 503 would tell them.
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toMatch(/not allowed/i);
  });

  test("refuses a raw card number, however well formed", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await charge(page, {
      ...wellFormed,
      source: "4111111111111111",
    });
    // The refusal that keeps a PAN out of the logs and this server out of PCI
    // scope. It must come BEFORE the permission check is even interesting.
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(/not a payment token/i);
  });

  test("refuses a request that names both tenders, or neither", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const both = await charge(page, {
      ...wellFormed,
      deviceSerial: "C046UG51931348",
    });
    expect(both.status()).toBe(400);
    expect((await both.json()).error).toMatch(/either/i);

    const neither = await charge(page, {
      subtotalCents: 1234,
      lines: [],
    });
    expect(neither.status()).toBe(400);
  });

  test("refuses an amount outside what a till can ring up", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Zero is not a sale.
    expect(
      (await charge(page, { ...wellFormed, subtotalCents: 0 })).status(),
    ).toBe(400);

    // And a typo is not a five-figure charge. The cap is the honest half of
    // taking the amount from the request at all — see the route's header.
    expect(
      (await charge(page, { ...wellFormed, subtotalCents: 900_000 })).status(),
    ).toBe(400);
  });

  test("never lets the caller choose the facility", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    // A body naming another business would let a member of one facility charge
    // through another's merchant. The field is not read at all, so this is
    // refused on the token instead — the point is that naming it changes
    // nothing about which merchant would have been used.
    const response = await charge(page, {
      ...wellFormed,
      source: "4111111111111111",
      facilityId: "00000000-0000-0000-0000-000000000000",
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(/not a payment token/i);
  });
});

// ============================================================================
// The keys that let a browser mount Clover's card fields.
//
// Until 2026-08-26 the retail checkout collected a raw card number into React
// state and then refused to charge it, because sending a PAN to our own server
// would put this deployment inside PCI scope. It mounts Clover's hosted iframes
// now, and this route is what tells the browser which merchant to mount them
// against.
//
// `publicApiKey` is Clover's browser-side key by design — it tokenises a card
// and cannot charge one. The gate is not about its secrecy: an open route here
// would tell anybody which businesses have a live merchant account.
// ============================================================================

test.describe("the card-field config route", () => {
  const config = (page: Page): Promise<APIResponse> =>
    page.request.get("/api/payments/clover/checkout-config");

  test("refuses anyone who is not signed in", async ({ page }) => {
    await page.context().clearCookies();
    expect((await config(page)).status()).toBe(401);
  });

  test("refuses a groomer, who may not take payments", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await config(page);
    expect(response.status()).toBe(403);
    // And says nothing about whether this facility can take cards at all.
    expect(await response.text()).not.toContain("publicApiKey");
  });

  test("refuses, without leaking a key, when there is no merchant", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await config(page);

    // This facility has no connected Clover account, so the honest answer is a
    // refusal — and the screen shows "typed cards are unavailable" rather than
    // four boxes that would never tokenise.
    expect(response.status()).toBe(503);

    const body = await response.text();
    expect(body).not.toContain("publicApiKey");
    expect(body).not.toContain("merchantId");
  });
});
