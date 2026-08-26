import { expect, test, type APIRequestContext } from "@playwright/test";

// ============================================================================
// Four addresses, four audiences.
//
//   yipyy.com, www          marketing
//   hq.yipyy.com            Yipyy's own staff — the platform portal
//   app.yipyy.com           facility staff, no facility named
//   <slug>.app.yipyy.com    that facility's staff
//   <slug>.yipyy.com        that facility's CUSTOMERS
//
// ── WHY A `Host` HEADER AND NOT A REAL HOSTNAME ───────────────────────────
//
// `*.yipyy.test` resolves nowhere, and Chromium refuses a Host override on
// fetch. Playwright's APIRequestContext is a Node client rather than a browser
// one, so it sends the header as given — verified before this file was written,
// by asserting that `Host: pawradise.yipyy.test` returns Pawradise's BRANDED
// sign-in page rather than Yipyy's generic one.
//
// ── WHAT THIS IS AND IS NOT ───────────────────────────────────────────────
//
// Routing. The host decides which portal is offered at which address; it
// decides nothing about authorisation. RLS scopes every row from the JWT, so a
// forged Host buys a wrong-looking page and no data. Nothing here should ever
// be cited as a reason something is safe.
// ============================================================================

const APEX = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase() ?? "";

/** A facility that exists in every environment this suite runs against. */
const SLUG = "pawradise";

const MARKETING = () => APEX;
const PLATFORM = () => `hq.${APEX}`;
const STAFF = () => `app.${APEX}`;
const FACILITY_STAFF = () => `${SLUG}.app.${APEX}`;
const FACILITY_CUSTOMER = () => `${SLUG}.${APEX}`;

/** One request, no redirect following, so the hop itself can be asserted. */
async function hit(request: APIRequestContext, host: string, path: string) {
  const response = await request.get(path, {
    headers: { Host: host },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  return {
    status: response.status(),
    location: response.headers()["location"] ?? "",
  };
}

/** The hostname a Location points at, ignoring scheme and port. */
const hostOf = (location: string): string =>
  location ? new URL(location).hostname : "";

test.describe("addresses and the audiences they serve", () => {
  test.beforeAll(() => {
    // Not a skip. Without the apex every hostname below is nonsense and the
    // assertions would be measuring the wrong deployment.
    expect(APEX, "NEXT_PUBLIC_APP_DOMAIN must be set for this spec").not.toBe(
      "",
    );
  });

  // ── The half that holds on every deployment ─────────────────────────────

  test("every address can be signed in at", async ({ request }) => {
    // Each audience signs in on its OWN host, so /sign-in must never be moved.
    // If this ever redirects, somebody has locked an audience out of the only
    // door it has.
    for (const host of [
      MARKETING(),
      PLATFORM(),
      STAFF(),
      FACILITY_STAFF(),
      FACILITY_CUSTOMER(),
    ]) {
      const { status } = await hit(request, host, "/sign-in");
      expect(status, `${host}/sign-in`).toBe(200);
    }
  });

  test("an API call is never redirected, whatever the host", async ({
    request,
  }) => {
    // A machine caller does not follow a redirect the way a browser does — a
    // 307 here turns an authenticated POST into a silent no-op.
    for (const host of [PLATFORM(), FACILITY_CUSTOMER(), FACILITY_STAFF()]) {
      const { status } = await hit(request, host, "/api/permissions");
      expect(status, `${host}/api/permissions`).not.toBe(307);
      expect(status).not.toBe(308);
    }
  });

  test("a facility's own branding follows BOTH of its addresses", async ({
    request,
  }) => {
    // The customer host and the staff host name the same business, so
    // `x-facility-slug` has to be stamped from either parent. This is what
    // proves the proxy resolves a slug on both, rather than only on the one it
    // was originally written for.
    for (const host of [FACILITY_STAFF(), FACILITY_CUSTOMER()]) {
      const response = await request.get("/sign-in", {
        headers: { Host: host },
        failOnStatusCode: false,
      });
      expect(await response.text(), `${host} should be branded`).toContain(
        "Pawradise",
      );
    }
  });

  test("the apex serves marketing, and only at /", async ({ request }) => {
    const root = await request.get("/", {
      headers: { Host: MARKETING() },
      failOnStatusCode: false,
    });
    expect(await root.text()).toContain("Join the Waitlist");

    // Every other path on the apex still serves the app, which is what keeps
    // links sent before the split working.
    const deep = await hit(request, MARKETING(), "/sign-in");
    expect(deep.status).toBe(200);
  });

  // ── Portal ↔ host, which needs the session cookie to span hosts ─────────

  test.describe("each portal is served at its own address", () => {
    // ── WHY THIS BLOCK SKIPS IN CI, AND WHERE IT DOES RUN ─────────────────
    //
    // The proxy only moves somebody between hosts when WORKOS_COOKIE_DOMAIN is
    // a leading-dot domain, because a host-only cookie means crossing hosts
    // signs them out.
    //
    // Setting that variable in CI is the obvious way to exercise these
    // assertions and it breaks the ENTIRE suite: AuthKit would then set the
    // session cookie for `.yipyy.test`, a browser visiting
    // http://localhost:3000 rejects a cookie for a domain it is not under, and
    // every sign-in ends in `/api/permissions -> 401`. Measured on 2026-08-26 —
    // one run spent forty minutes retrying before the cause was found.
    //
    // So these run where the app is genuinely served on split hosts:
    //
    //   locally   WORKOS_COOKIE_DOMAIN=.yipyy.test bun run start --port 3100
    //             E2E_BASE_URL=http://localhost:3100 bunx playwright test host-routing
    //   deployed  E2E_BASE_URL=https://yipyy.com bunx playwright test host-routing
    //
    // The tests ABOVE this block need no cookie and do run on every push:
    // sign-in reachable on every host, /api never redirected, branding on both
    // of a facility's addresses, and marketing at the apex. Those are the ones
    // that catch a hostname being decoded wrongly, which is the likeliest
    // regression.
    test.skip(
      !(process.env.WORKOS_COOKIE_DOMAIN ?? "").trim().startsWith("."),
      "Cross-host redirects need WORKOS_COOKIE_DOMAIN to span hosts; see the " +
        "note above for how to run these locally or against a deployment.",
    );

    test("the platform portal belongs to hq", async ({ request }) => {
      for (const host of [MARKETING(), STAFF(), FACILITY_CUSTOMER()]) {
        const { status, location } = await hit(request, host, "/dashboard");
        expect(status, `${host}/dashboard`).toBe(307);
        expect(hostOf(location)).toBe(PLATFORM());
      }
      // And stays put once it is there.
      expect((await hit(request, PLATFORM(), "/dashboard")).status).toBe(200);
    });

    test("a facility's staff portal belongs to its app host", async ({
      request,
    }) => {
      const { status, location } = await hit(
        request,
        FACILITY_CUSTOMER(),
        "/facility/dashboard",
      );
      expect(status).toBe(307);
      expect(hostOf(location)).toBe(FACILITY_STAFF());

      expect(
        (await hit(request, FACILITY_STAFF(), "/facility/dashboard")).status,
      ).toBe(200);
    });

    test("a facility's customer portal belongs to its own host", async ({
      request,
    }) => {
      const { status, location } = await hit(
        request,
        FACILITY_STAFF(),
        "/customer/dashboard",
      );
      expect(status).toBe(307);
      expect(hostOf(location)).toBe(FACILITY_CUSTOMER());

      expect(
        (await hit(request, FACILITY_CUSTOMER(), "/customer/dashboard")).status,
      ).toBe(200);
    });

    test("the path and query survive the hop", async ({ request }) => {
      // A visitor following an old link is going somewhere specific. Dropping
      // the path would land them on a dashboard instead, and dropping the query
      // would lose the `?next=` a portal gate had just built.
      const { location } = await hit(
        request,
        FACILITY_CUSTOMER(),
        "/facility/dashboard/bookings?status=confirmed",
      );
      const url = new URL(location);
      expect(url.hostname).toBe(FACILITY_STAFF());
      expect(url.pathname).toBe("/facility/dashboard/bookings");
      expect(url.searchParams.get("status")).toBe("confirmed");
    });

    test("a host that names no facility cannot guess one", async ({
      request,
    }) => {
      // `/customer/*` on bare app.yipyy.com names no business. Redirecting
      // would mean inventing one, which could send somebody to a stranger's
      // portal — so it falls through and lets the identity gate decide.
      const { status } = await hit(request, STAFF(), "/customer/dashboard");
      expect(status).not.toBe(307);
    });
  });
});
