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

  test("the roster is the database's answer, not a fixture's", async ({
    page,
  }) => {
    // /dashboard/user-management read src/data/admin-users.ts plus a
    // localStorage overlay, so a real invitation appeared to do nothing there
    // and five invented people appeared to be colleagues. It reads
    // platform_memberships + platform_invitations now.
    await signIn(page, ACCOUNTS.admin);

    const response = await page.request.get("/api/admin/team");
    expect(response.status()).toBe(200);

    const { team } = (await response.json()) as {
      team: { kind: string; email: string; role: string; status: string }[];
    };

    // The caller is on the team they are reading, which is the cheapest proof
    // that these are real rows: a fixture could not know who asked.
    const self = team.find((row) => row.email === ACCOUNTS.admin);
    expect(
      self,
      "the signed-in admin appears in their own roster",
    ).toBeTruthy();
    expect(self?.status).toBe("active");
    expect(self?.kind).toBe("member");

    // Every role is one public.platform_role actually has. The console's five
    // job-flavoured labels are mapped server-side and must never reach here.
    for (const row of team) {
      expect(["superadmin", "support", "billing", "readonly"]).toContain(
        row.role,
      );
    }
  });

  test("and the screen shows those rows, not five invented people", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    await page.goto("/dashboard/user-management");

    await expect(
      page.getByRole("heading", { name: "Platform team" }),
    ).toBeVisible();

    // The signed-in admin's own address, rendered by the table.
    await expect(page.getByText(ACCOUNTS.admin).first()).toBeVisible({
      timeout: 30_000,
    });

    // And nobody from src/data/admin-users.ts. These names were the roster.
    for (const invented of ["Sarah", "Michael", "Emily"]) {
      await expect(page.getByText(invented, { exact: false })).toHaveCount(0);
    }
  });

  test("the header greets the person signed in, not a literal", async ({
    page,
  }) => {
    // Reported from the running app: the dropdown read "Super Admin /
    // admin@yipyy.com" above a session belonging to somebody else entirely.
    // Both were string literals in UserProfileSheet, and the avatar said "SA"
    // whoever you were.
    await signIn(page, ACCOUNTS.admin);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Account menu" }).click();

    await expect(page.getByText(ACCOUNTS.admin)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("admin@yipyy.com")).toHaveCount(0);

    // ── AND THE OLD ROLE SWITCHER IS GONE ───────────────────────────────
    //
    // Eight job titles read from src/data/facility-staff, each seating you as
    // that person by writing a cookie. /groomer is a retired portal and the
    // employee shell takes its identity from the session now, so every one of
    // these was a door that no longer opens.
    for (const stale of [
      "Daycare Attendant",
      "Boarding / Back of House",
      "Sanitation",
      "Reception / Front Desk",
    ]) {
      await expect(page.getByText(stale, { exact: false })).toHaveCount(0);
    }
  });

  test("the roster is refused to everyone else", async ({ page, request }) => {
    expect((await request.get("/api/admin/team")).status()).toBe(403);

    await signIn(page, ACCOUNTS.owner);
    expect((await page.request.get("/api/admin/team")).status()).toBe(403);
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
