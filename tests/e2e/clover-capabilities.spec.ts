import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Asking Clover what this connection may do.
//
// ── WHY IT EXISTS ─────────────────────────────────────────────────────────
//
// Clover never reports an app's permissions back to the app: the OAuth token
// exchange returns two tokens and two expiries and nothing else. So when a card
// cannot be stored, the question "is the permission missing or is this a bug?"
// had no answer, and `payment_connections.scopes` had been an empty array since
// the column was created.
//
// The route probes and writes down what it proved. This spec covers WHO may ask
// and, most importantly, that it is a POST — because it performs five calls to
// Clover and a write to the connection, and a GET is prefetched by browsers,
// followed by crawlers and cached by proxies.
//
// ── WHAT IT DELIBERATELY DOES NOT ASSERT ──────────────────────────────────
//
// The verdicts themselves. Those depend on how the merchant's app is configured
// in Clover's dashboard TODAY — a fact outside this repository that can change
// without a commit. A spec that asserted "vaulting is permitted" would fail the
// day somebody unticked a box, and would be reporting that correctly while
// looking like a broken build. The verdicts are read by a person, on the
// screen, when they need them.
//
// Measured against the sandbox on 2026-08-27 for the record: merchant 200,
// pakms 200, charges 200, and the write probe 400 `email_invalid` — which is
// the shape that means PERMITTED, since Clover read the request and rejected it
// on its merits rather than refusing it outright.
// ============================================================================

const check = (page: Page): Promise<APIResponse> =>
  page.request.post("/api/payments/clover/capabilities", {
    failOnStatusCode: false,
  });

test.describe("the connection check", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    await page.context().clearCookies();
    expect((await check(page)).status()).toBe(401);
  });

  test("is not reachable by GET", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // It talks to Clover five times and writes `scopes`. A GET would be
    // prefetched on hover, followed by a crawler and cached by a proxy — none
    // of which should be able to drive a write probe against a merchant.
    const response = await page.request.get(
      "/api/payments/clover/capabilities",
      { failOnStatusCode: false },
    );
    expect(response.status()).toBe(405);
  });

  test("a groomer cannot check the merchant account", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    // The gate is `activeAdminFacility()` — admin ACCESS LEVEL, the same one
    // that guards connecting a merchant, because the report names which app
    // permissions are missing and where to fix them. That is a configuration
    // answer, not an operational one.
    expect((await check(page)).status()).toBe(403);
  });

  test("an owner gets a report, and it never claims more than it proved", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const response = await check(page);

    // 403 is a legitimate outcome here too: this account may administer more
    // than one facility, or none. What must never happen is a 500.
    expect([200, 403, 409]).toContain(response.status());
    if (response.status() !== 200) return;

    const report = (await response.json()) as {
      capabilities: { key: string; state: string }[];
      granted: string[];
    };

    expect(Array.isArray(report.capabilities)).toBe(true);

    // THE ASSERTION THAT MATTERS. Taking a payment cannot be proved without
    // taking one, so it must be reported as untested — never as working, and
    // never counted among the granted capabilities.
    const charge = report.capabilities.find((c) => c.key === "charge");
    expect(charge?.state, "taking a payment cannot be probed").toBe("untested");
    expect(report.granted).not.toContain("charge");

    // Every state is one of the four. A typo would render as neither green nor
    // red and would read as "fine".
    for (const capability of report.capabilities) {
      expect(
        ["ok", "missing", "unreachable", "untested"],
        `${capability.key} has an unknown state`,
      ).toContain(capability.state);
    }
  });
});
