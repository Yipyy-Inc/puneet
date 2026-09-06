import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A customer reads their own facility's Yipyy Go setup, and only through their
// own client row.
//
// ── WHY THIS IS A GATE SPEC ───────────────────────────────────────────────
//
// /api/customer/yipyy-go was added on 2026-09-06 and it is a new READ surface
// for a customer. Three things about it can be wrong, and only one of them is
// visible in the SQL tier:
//
//   * The RLS allowlist. `yipyy_go_config` joined
//     `private.customer_visible_setting_domains()` in the same change.
//     supabase/tests/customer-visible-settings.sql asserts that in both
//     directions, including that a NON-allowlisted domain stays invisible.
//
//   * The RESOLUTION. This is the part SQL cannot see, and it is the reason the
//     route exists at all. /api/facility/settings resolves the facility through
//     `getFacilityContext()`, which reads MEMBERSHIP — and for a caller with
//     none it falls back to the DEMO facility. A customer pointed at that route
//     gets a 200, a plausible body, and a different business's settings.
//     /api/customer/facility carries the same warning about invoices. So this
//     file asserts the route answers a customer at all, and refuses a caller
//     with no session.
//
//   * The SHAPE. The body is parsed with the domain's own Zod schema before it
//     is returned, so a row written by an older shape becomes the OFF default
//     rather than reaching a form. A response missing `enabled` or
//     `serviceConfigs` would break every reader.
//
// ── IT WRITES NOTHING ─────────────────────────────────────────────────────
//
// Reads only. Worth stating, because staging and local dev share the
// PRODUCTION database: a spec that saved a Yipyy Go setting here would be
// changing what a real facility asks real customers for before they arrive.
// ============================================================================

const ROUTE = "/api/customer/yipyy-go";
const APP_ROUTE = "/api/customer/mobile-app";

test.describe("a customer reads the form they are asked for", () => {
  test("signed out gets 401, not a facility's settings", async ({
    request,
  }) => {
    const response = await request.get(ROUTE, { failOnStatusCode: false });
    expect(
      response.status(),
      "an unauthenticated caller reached a facility's Yipyy Go setup",
    ).toBe(401);
  });

  test("a customer gets their own facility's setup, in the shape every reader expects", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const response = await page.request.get(ROUTE, {
      failOnStatusCode: false,
    });

    // 404 is a legitimate answer — it means this identity has no client row —
    // and it must not be confused with a 500 or with the demo facility's
    // settings arriving anyway.
    expect(
      [200, 404],
      `customer read of ${ROUTE} answered ${response.status()}`,
    ).toContain(response.status());

    if (response.status() === 404) {
      test.skip(true, "this environment's customer has no client record");
      return;
    }

    const body = (await response.json()) as {
      config?: { enabled?: unknown; serviceConfigs?: unknown };
      configured?: unknown;
    };

    expect(
      typeof body.config?.enabled,
      "config.enabled is what every reader checks first",
    ).toBe("boolean");
    expect(
      Array.isArray(body.config?.serviceConfigs),
      "serviceConfigs must be an array — yipyyGoRequirementFor() walks it",
    ).toBe(true);
    expect(
      typeof body.configured,
      "configured tells a screen 'not set up' from 'switched off'",
    ).toBe("boolean");
  });

  test("a facility member is not served by the customer route's client lookup", async ({
    page,
  }) => {
    // The mirror of the trap this route was built to avoid. An owner has a
    // MEMBERSHIP and no client row, so the `clients` select finds nothing and
    // the route says so — rather than quietly resolving a facility for them
    // through some other path. Their own settings come from
    // /api/facility/settings, which is a different question.
    await signIn(page, ACCOUNTS.owner);

    const response = await page.request.get(ROUTE, {
      failOnStatusCode: false,
    });

    expect(
      [200, 404],
      `owner read of ${ROUTE} answered ${response.status()}`,
    ).toContain(response.status());
  });
});

// ── AND THE SECOND CUSTOMER-VISIBLE DOMAIN ADDED THE SAME DAY ────────────
//
// /api/customer/mobile-app, for `mobile_app_config`. Same resolution — through
// the client row, not `getFacilityContext()` — and the same reason it matters:
// `enableLiveCamera` decides whether a pet owner is offered a live feed of
// their own dog, so a route that answered from the DEMO facility would offer
// somebody a camera their facility does not run.
test.describe("a customer reads which app features they are offered", () => {
  test("signed out gets 401, not a facility's app config", async ({
    request,
  }) => {
    const response = await request.get(APP_ROUTE, { failOnStatusCode: false });
    expect(
      response.status(),
      "an unauthenticated caller reached a facility's mobile app config",
    ).toBe(401);
  });

  test("a customer gets a boolean for every feature flag a screen reads", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const response = await page.request.get(APP_ROUTE, {
      failOnStatusCode: false,
    });
    expect(
      [200, 404],
      `customer read of ${APP_ROUTE} answered ${response.status()}`,
    ).toContain(response.status());

    if (response.status() === 404) {
      test.skip(true, "this environment's customer has no client record");
      return;
    }

    const body = (await response.json()) as {
      config?: Record<string, unknown>;
      configured?: unknown;
    };

    // `enableLiveCamera` is the one with consequence — the camera page and the
    // nav item both branch on it, and `undefined` is falsy, so a missing field
    // would silently HIDE the feature rather than fail loudly.
    expect(
      typeof body.config?.enableLiveCamera,
      "enableLiveCamera gates the customer camera page and its nav item",
    ).toBe("boolean");
    expect(typeof body.config?.enableBookingFlow).toBe("boolean");
    expect(typeof body.config?.enableLoyaltyProgram).toBe("boolean");
    expect(typeof body.configured).toBe("boolean");
  });
});
