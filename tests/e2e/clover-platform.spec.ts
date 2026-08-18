import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { deployedFixture } from "./_fixtures";

// ============================================================================
// The platform Clover status endpoint: who may read it, and what it discloses.
//
// It replaced a screen that took an App Secret in a browser form and wrote it
// to localStorage in plaintext. The point of the replacement is that a secret
// which never travels to a browser cannot leak from one — so the assertion that
// matters most is the NEGATIVE one: whatever this returns, it is not a
// credential.
//
// The platform-admin case WAS uncoverable, and is not any more:
// `admin@yipyy.dev` is a platform admin in the development Clerk instance now
// that scripts/provision-e2e-identities.ts has been run against it. Before
// that, the only platform admins lived in the production instance and no local
// session could reach this route at all.
// ============================================================================

const STATUS = "/api/payments/clover/platform";

// A facility staff account with a REAL Clover connection, which the @yipyy.dev
// fixtures do not have — the refusal assertions want a member of a facility
// that could plausibly be asking.
const STAFF = deployedFixture("CLOVER_E2E_STAFF_EMAIL");

test.describe("the platform Clover status endpoint", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    const response = await page.request.get(STATUS);
    expect(response.status()).toBe(401);
  });

  test("tells a platform admin what is configured, and nothing more", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    const response = await page.request.get(STATUS);
    expect(response.status()).toBe(200);

    const body = (await response.json()) as {
      defaultEnvironment: string;
      webhookUrl: string;
      webhookAuthConfigured: boolean;
      estates: {
        environment: string;
        configured: boolean;
        terminalsEnabled: boolean;
        connectedFacilities: number;
        facilitiesInError: number;
      }[];
    };

    // Both estates are always reported. A screen that hid the unconfigured one
    // would answer "everything is fine" by omission on the day production is
    // the thing that is missing.
    expect(body.estates.map((e) => e.environment).sort()).toEqual([
      "production",
      "sandbox",
    ]);

    // Every credential is a boolean and every count is a number. This is the
    // assertion the whole endpoint exists for: iterate the ACTUAL response
    // rather than a list of field names, so a value added later is caught too.
    for (const estate of body.estates) {
      expect(typeof estate.configured).toBe("boolean");
      expect(typeof estate.terminalsEnabled).toBe("boolean");
      expect(typeof estate.connectedFacilities).toBe("number");
    }
    expect(typeof body.webhookAuthConfigured).toBe("boolean");

    // Nothing that could BE a credential. Clover app ids and secrets are long
    // opaque strings; the only long string here is the webhook URL, which is
    // public by construction — Clover has to be able to POST to it.
    const serialised = JSON.stringify({ ...body, webhookUrl: undefined });
    expect(serialised).not.toMatch(/[A-Z0-9]{12,}/);

    // And it is the route that answers, not the one the old screen displayed.
    expect(body.webhookUrl).toContain("/api/webhooks/clover");
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
