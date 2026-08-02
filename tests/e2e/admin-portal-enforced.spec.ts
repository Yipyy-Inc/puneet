import { test, expect, type Page } from "@playwright/test";
import { PASSWORD } from "./_auth";

// ============================================================================
// The platform portal requires a real session.
//
// Until AUTH_ENFORCED=admin, /dashboard admitted ANYONE. The rule was
// `legacyRole !== "facility_admin"`, and an anonymous visitor has no
// `user_role` cookie at all — so no cookie meant "you are the platform
// super-admin". The most privileged surface in the product was the one with
// the weakest gate.
//
// These checks are about the gate's ROUTING. They are deliberately not the
// security claim: `redirect()` from a streaming layout is soft (HTTP 200 with
// NEXT_REDIRECT in the payload), so someone ignoring it still reaches the
// route handler. What stops them there is RLS, which is why the last check
// asks the API rather than the page.
// ============================================================================

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect
    .poll(async () => (await page.request.get("/api/permissions")).status(), {
      timeout: 30_000,
    })
    .toBe(200);
}

test.describe.configure({ mode: "serial" });

test.describe("admin portal enforcement", () => {
  test("a signed-out visitor is sent to sign in, not into the portal", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 30_000 });

    // The destination carries where they were going, so signing in lands them
    // there rather than dumping them at a default.
    expect(page.url()).toContain("next=%2Fdashboard");
    // And the portal's own chrome is absent — not merely covered by an overlay.
    await expect(
      page.getByRole("link", { name: "Facilities", exact: true }),
    ).toHaveCount(0);
  });

  test("the platform admin gets in", async ({ page }) => {
    await signIn(page, "admin@yipyy.dev");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    // Assert something only this portal renders, so "did not redirect" cannot
    // pass on an error page.
    await expect(
      page.locator('[data-slot="sidebar-inner"]').first(),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a facility owner is routed to their own portal, not refused blankly", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");
    await page.goto("/dashboard");

    // The redirect-loop trap from the earlier cutover: a fixed denial target
    // per portal sent people somewhere that denied them again. The destination
    // has to come from their own claims.
    await page.waitForURL(/\/facility\/dashboard/, { timeout: 30_000 });

    // And they STAY there. Asserting the redirect fired is not the same as
    // asserting it landed somewhere that admits them — an earlier version of
    // this cutover bounced between two portals that each denied the viewer,
    // and a test that only checked "did you leave?" passed throughout.
    await page.waitForTimeout(1500);
    expect(new URL(page.url()).pathname).toBe("/facility/dashboard");
  });

  test("the redirect is routing; RLS is the boundary", async ({ page }) => {
    // A facility owner who ignores the redirect and calls the platform API
    // directly still gets nothing, because the database filters on the JWT
    // rather than on where the browser ended up.
    await signIn(page, "owner@yipyy.dev");

    const response = await page.request.get("/api/permissions");
    const map = (await response.json()) as Record<string, string>;
    // An owner resolves their facility's permissions — not a platform admin's
    // blanket grant. 168/168 would mean the platform-admin branch fired.
    expect(map.manage_roles).toBe("anytime");

    const admin = await page.request.get("/api/roles/overrides");
    expect(admin.status()).toBe(200);
  });
});
