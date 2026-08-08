import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./_auth";

// ============================================================================
// Paying a booking by card, through Clover's real sandbox.
//
// ── WHY THIS ONE SKIPS ITSELF ─────────────────────────────────────────────
//
// Every other spec runs against fixtures a script can create. This one cannot:
// it needs a facility that has completed Clover's OAuth flow against a sandbox
// merchant, which is a person clicking through Clover's dashboard, once. There
// is no way to provision that, so the spec reads the fixture out of the
// environment and skips when it is absent.
//
// Skipping beats failing here. A spec that is permanently red because the
// machine lacks a merchant account teaches everyone to read red as noise, and
// that is how a real regression gets waved through.
//
// ── IT PUTS A REAL CARD THROUGH, AND TAKES NO MONEY ───────────────────────
//
// 4264 2815 1111 7771 is Clover's documented decline card. The charge is
// genuinely attempted — SDK, iframes, tokenisation, /v1/charges — and Clover
// refuses it, so nothing is captured and no ledger row is written. That is what
// makes this safe to run repeatedly, and it is also the case worth asserting:
// the approval path is proven by the ledger, but a decline is only ever visible
// as a sentence on a screen.
//
// It caught two real defects on its first run. The card fields never mounted at
// all, because mount() takes a CSS selector and was being handed the node; and
// a declined card came back as a 500, because the decline was classified on an
// `error.type` that Clover does not send.
// ============================================================================

const BOOKING_REF = Number(process.env.CLOVER_E2E_BOOKING_REF ?? "");
const CUSTOMER = process.env.CLOVER_E2E_CUSTOMER_EMAIL?.trim() ?? "";

/** Clover's documented decline Visa. Approved cards are NOT used here. */
const DECLINE_CARD = "4264281511117771";

const FIELDS = [
  "clover-card-number",
  "clover-card-date",
  "clover-card-cvv",
  "clover-card-postal",
] as const;

/**
 * Clover's hosted fields listen to KEYSTROKES, not to value assignment.
 * `fill()` sets the value without them and createToken() then reports "Card
 * number is required" — which looks like a broken payment form and is actually
 * a broken test.
 */
async function typeInto(page: Page, id: string, value: string) {
  const input = page.frameLocator(`#${id} iframe`).locator("input");
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.click();
  await input.pressSequentially(value, { delay: 30 });
}

test.describe("paying a booking by card", () => {
  test.skip(
    !Number.isInteger(BOOKING_REF) || BOOKING_REF <= 0 || !CUSTOMER,
    "Set CLOVER_E2E_BOOKING_REF and CLOVER_E2E_CUSTOMER_EMAIL to an unpaid " +
      "booking at a Clover-connected facility and the customer it belongs to. " +
      "See .env.example.",
  );

  test("the customer sees the balance and Clover's card fields", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    await page.goto(`/pay/${BOOKING_REF}`);

    // The customer is NOT a member of this facility. That the booking resolves
    // at all is `bookings_read` admitting them through own_client_ids().
    await expect(
      page.getByText(`Balance on booking #${BOOKING_REF}`),
    ).toBeVisible();

    // The card fields are Clover's, on Clover's origin, inside divs we own.
    for (const id of FIELDS) {
      await expect(page.locator(`#${id} iframe`)).toHaveCount(1, {
        timeout: 30_000,
      });
    }

    // A tip moves the button and nothing else — the amount itself is the
    // server's and is never sent from here.
    const pay = page.getByRole("button", { name: /^Pay \$/ });
    const before = await pay.textContent();
    await page.getByRole("button", { name: /^20%/ }).click();
    await expect(pay).not.toHaveText(before ?? "");
    await page.getByRole("button", { name: "None" }).click();
    await expect(pay).toHaveText(before ?? "");
  });

  test("a declined card is reported as a decline, not as a breakage", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    await page.goto(`/pay/${BOOKING_REF}`);

    await typeInto(page, "clover-card-number", DECLINE_CARD);
    await typeInto(page, "clover-card-date", "1227");
    await typeInto(page, "clover-card-cvv", "123");
    await typeInto(page, "clover-card-postal", "H2X1Y4");

    await page.getByRole("button", { name: /^Pay \$/ }).click();

    // Our sentence, not Clover's. Theirs comes back in the MERCHANT's locale
    // ("REFUSÉE : aucune raison fournie.") and says nothing anyone can act on;
    // it is kept on the payment intent for whoever reconciles.
    await expect(page.locator('p[role="alert"]')).toContainText(/declined/i, {
      timeout: 60_000,
    });

    // And the balance is still owed — a decline must not settle anything.
    await expect(
      page.getByText(`Balance on booking #${BOOKING_REF}`),
    ).toBeVisible();
  });
});
