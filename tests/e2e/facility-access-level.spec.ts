import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A facility membership is admin or staff, and the gates finally act on it.
//
// ── THE BEHAVIOUR CHANGE THIS FILE EXISTS FOR ─────────────────────────────
//
// `canAccessFacilityPortal` and `canAccessStaffPortal` in src/lib/auth/viewer.ts
// were BYTE-IDENTICAL: any active membership admitted you to /facility, and only
// the LANDING PATH differed. So the admin/staff distinction was a suggestion the
// app made on sign-in and nothing enforced afterwards — a groomer who typed the
// URL got the whole business.
//
// ADR 0005 made it an access level, and the facility gate now requires `admin`.
// These checks are the reason that is safe to enforce: the denied staff member
// must land somewhere they DO belong, not at a login screen and not in a loop.
//
// The loop is not hypothetical. guardPortal's own comment records one: a fixed
// per-portal fallback sent a customer from /facility to /dashboard, which denied
// them and sent them back. Routing by `landingPathFor(viewer)` is what makes
// that impossible, and test 1 is what proves it still is.
//
// ── ROUTING, NOT THE BOUNDARY ─────────────────────────────────────────────
//
// Every redirect here is SOFT — `redirect()` from a streaming layout is HTTP 200
// with NEXT_REDIRECT in the RSC payload, executed by the client router — so
// somebody ignoring it still reaches the route handler. What stops them there is
// RLS, proved in supabase/tests/facility-account-rls.sql. These tests are about
// where a browser ends up.
// ============================================================================

test.describe.configure({ mode: "serial" });

test.describe("the facility portal is the admin's", () => {
  for (const role of ["groomer", "reception", "caretaker"] as const) {
    test(`a ${role} is sent to their own portal, not into /facility`, async ({
      page,
    }) => {
      await signIn(page, ACCOUNTS[role]);
      await page.goto("/facility/dashboard");

      // Their landing path, computed from their own claims — NOT /sign-in, which
      // would be the answer to a different question, and not back to /facility.
      await page.waitForURL(/\/employee\/schedule/, { timeout: 30_000 });
      expect(page.url()).not.toContain("/sign-in");
      expect(page.url()).not.toContain("/facility");
    });
  }

  for (const role of ["owner", "manager"] as const) {
    test(`the ${role} still runs the business`, async ({ page }) => {
      await signIn(page, ACCOUNTS[role]);
      await page.goto("/facility/dashboard");

      // Not bounced. Asserted as "did not leave" rather than on any particular
      // widget, so a dashboard redesign does not fail an auth test.
      await page.waitForLoadState("domcontentloaded");
      await expect(page).toHaveURL(/\/facility\/dashboard/);
    });
  }

  test("a staff member cannot reach the facility's own account", async ({
    page,
  }) => {
    // The gate that was reading a client-writable cookie whose rule was
    // `role == null || role === "owner"` — so an ABSENT cookie meant yes, and
    // the subscription, the payment method and a full data export were open to
    // every member of every facility.
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/facility/account/subscription");

    await page.waitForURL(/\/employee\/schedule/, { timeout: 30_000 });
    // And none of the page's own content arrived on the way past.
    await expect(page.getByText(/current plan/i)).toHaveCount(0);
  });

  test("the owner can", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/account/subscription");

    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/facility\/account\/subscription/);
  });
});

test.describe("the retired groomer portal", () => {
  // ADR 0005 §4. `/groomer` was one page reading the src/data/grooming fixture,
  // for one of thirteen job titles. Retired with a next.config redirects entry
  // rather than an in-app redirect() page, because the bookmark people hold is
  // `/groomer/dashboard` and a page can only answer for the path it occupies.
  for (const path of [
    "/groomer",
    "/groomer/dashboard",
    "/groomer/dashboard/anything",
  ]) {
    test(`${path} redirects to the canonical staff shell`, async ({ page }) => {
      const response = await page.request.get(path, { maxRedirects: 0 });

      // 307, not 308: a permanent redirect is cached by the browser until it is
      // cleared, so a wrong one would be hardest to fix for whoever hit it first.
      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toBe("/employee/schedule");
    });
  }
});

test.describe("inviting somebody onto the platform team", () => {
  const BODY = {
    name: "Probe Invitee",
    email: "e2e.invite.probe@yipyy.invalid",
    role: "system_administrator",
  };

  test("an anonymous caller cannot send Yipyy-branded mail", async ({
    request,
  }) => {
    // This route had NO guard of any kind. Anyone who knew the path could make
    // Yipyy email an address of their choosing, from the domain that also
    // carries password resets.
    const response = await request.post("/api/admin/invite", { data: BODY });
    expect(response.status()).toBe(403);
  });

  test("running a facility is not running the platform", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.post("/api/admin/invite", {
      data: BODY,
    });
    expect(response.status()).toBe(403);
  });

  test("a forged invitation token opens nothing", async ({ page }) => {
    // Exactly the shape the OLD token had: base64url JSON, no signature, with a
    // `role` field the holder could edit. The page decoded it and believed it.
    const forged = Buffer.from(
      JSON.stringify({
        id: 1,
        name: "Attacker",
        email: "attacker@yipyy.invalid",
        role: "system_administrator",
        department: "x",
        issuedAt: Date.now(),
        expiresAt: Date.now() + 9e8,
        nonce: "x",
      }),
    ).toString("base64url");

    await page.goto(`/setup/${forged}`);
    await expect(
      page.getByText(/invitation link is invalid or has expired/i),
    ).toBeVisible();
    // The address from the payload is nowhere on the page.
    await expect(page.getByText("attacker@yipyy.invalid")).toHaveCount(0);

    const response = await page.request.post("/api/admin/setup", {
      data: {
        token: forged,
        firstName: "A",
        lastName: "B",
        password: "x".repeat(12),
      },
    });
    expect(response.status()).toBe(400);
  });
});
