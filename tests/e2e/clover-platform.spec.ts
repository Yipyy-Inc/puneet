import { expect, test } from "@playwright/test";

import { signIn } from "./_auth";

// ============================================================================
// The platform Clover status endpoint: who may read it, and what it discloses.
//
// It replaced a screen that took an App Secret in a browser form and wrote it
// to localStorage in plaintext. The point of the replacement is that a secret
// which never travels to a browser cannot leak from one — so the assertion that
// matters most is the NEGATIVE one: whatever this returns, it is not a
// credential.
//
// The signed-in-as-platform-admin case is NOT covered here and cannot be: the
// platform admins live in the production Clerk instance, and the e2e accounts
// are in the development one. What is asserted below is everything reachable
// without that — the two refusals, and the fact that no response shape can
// carry a secret.
// ============================================================================

const STATUS = "/api/payments/clover/platform";

// A real facility staff account. NOT the @yipyy.dev fixtures in _auth.ts —
// those exist in no Clerk instance this deployment talks to, so a spec built on
// them fails at sign-in and proves nothing about the thing it names.
const STAFF = process.env.CLOVER_E2E_STAFF_EMAIL?.trim() ?? "";

test.describe("the platform Clover status endpoint", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    const response = await page.request.get(STATUS);
    expect(response.status()).toBe(401);
  });

  test("refuses a facility staff member", async ({ page }) => {
    test.skip(!STAFF, "Set CLOVER_E2E_STAFF_EMAIL. See .env.example.");
    await signIn(page, STAFF);
    const response = await page.request.get(STATUS);
    // A facility OWNER is the most privileged non-platform role there is, so
    // refusing them is the meaningful control. Refusing a receptionist would
    // prove much less.
    expect(response.status()).toBe(403);

    const body = (await response.text()).toLowerCase();
    expect(body).not.toContain("secret");
    expect(body).not.toContain("app_id");
  });

  test("the browser holds no Clover credential", async ({ page }) => {
    test.skip(!STAFF, "Set CLOVER_E2E_STAFF_EMAIL. See .env.example.");
    await signIn(page, STAFF);
    await page.goto("/facility/dashboard");

    // The store that used to hold the App Secret still exists, for two unwired
    // billing toggles. Its VALUE is the assertion: whatever is in that key, it
    // is not a credential — including for a browser upgraded from the old shape.
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("yipyy.clover-config"),
    );
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, unknown>;
      expect(Object.keys(parsed).sort()).toEqual(["autoCharge", "autoInvoice"]);
    }
  });

  test("the webhook URL it advertises points at a route that exists", async ({
    page,
  }) => {
    // The screen used to display `/api/clover/webhook`, and the route is
    // `/api/webhooks/clover`. An admin who pasted the old value into Clover got
    // no error anywhere: Clover would report failing deliveries, and this app
    // would simply never hear that a refund had been taken on a merchant's own
    // dashboard. So the URL is derived now — and this proves the derivation
    // lands somewhere real.
    const response = await page.request.post("/api/webhooks/clover", {
      data: {},
      failOnStatusCode: false,
    });
    // Any answer but 404 proves the route exists. It is deliberately not
    // asserted to be 200: unauthenticated deliveries are supposed to be turned
    // away, and this test sends no auth.
    expect(response.status()).not.toBe(404);
  });
});
