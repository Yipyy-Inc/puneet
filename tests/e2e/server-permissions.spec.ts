import { test, expect, type Page } from "@playwright/test";
import { PASSWORD } from "./_auth";

// ============================================================================
// The SERVER renders the right permissions, not owner defaults.
//
// The facility portal used to resolve permissions only in the browser, against
// a mock staff roster. The server had no map, so server-rendered HTML was
// effectively OWNER-shaped for everybody: a groomer's first paint carried
// controls they do not have, replaced a frame later once the real map arrived.
//
// These checks read the RAW SERVER RESPONSE rather than the settled page. That
// distinction is the whole test — by the time Playwright can query the DOM,
// hydration has already corrected the mistake, so a normal locator assertion
// would have passed throughout the entire bug.
//
// "Add new staff" is the marker: gated on `manage_staff`, which owners and
// managers hold and groomers do not (src/app/facility/dashboard/staff/page.tsx).
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: remove <PermissionsHydration> from
// src/app/facility/layout.tsx. The groomer check should go red.
// ============================================================================

const STAFF_PAGE = "/facility/dashboard/staff";
const OWNER_ONLY = "Add new staff";

const FACILITY_ENFORCED = (() => {
  const raw = process.env.AUTH_ENFORCED?.trim();
  return raw === "true" || (raw?.split(",") ?? []).includes("facility");
})();

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

/** The HTML the server sent, before React has touched it. */
async function serverHtml(page: Page, path: string): Promise<string> {
  const res = await page.request.get(path);
  expect(res.status()).toBe(200);
  return res.text();
}

test.describe.configure({ mode: "serial" });

test.describe("server-rendered permissions", () => {
  test("a groomer's first paint carries no manage_staff controls", async ({
    page,
  }) => {
    await signIn(page, "groomer@yipyy.dev");

    const html = await serverHtml(page, STAFF_PAGE);
    // Sanity: we fetched the staff page and not a redirect or a shell, so the
    // absence below means "withheld" rather than "nothing rendered".
    expect(html).toContain("Manage departments");
    expect(html).not.toContain(OWNER_ONLY);
  });

  test("an owner's first paint carries them", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    const html = await serverHtml(page, STAFF_PAGE);
    // The other half: proves the server is reading real permissions rather
    // than having simply stopped rendering the control for everyone.
    expect(html).toContain(OWNER_ONLY);
  });

  // NO DOM-SAMPLING TEST HERE, DELIBERATELY.
  //
  // The obvious next check — load the page, count the button early and again
  // late, assert it was never there — was written, and it PASSED with the fix
  // removed. Even at `waitUntil: "commit"` the first queryable DOM is already
  // past hydration, so the flash is over before Playwright can look. It would
  // have sat here reading like coverage while catching nothing.
  //
  // The raw-HTML checks above are the real observation: they read what the
  // server sent, which is the only place the mistake was ever visible.

  test("signed out still renders the legacy fallback", async ({ page }) => {
    // Most of the app is browsed signed-out until AUTH_ENFORCED flips, and
    // blanking every guarded control would look like a bug rather than a
    // policy. `null` permissions must keep the old client-side cascade.
    //
    // Only meaningful where the facility portal is OPEN. With enforcement on
    // (this repo's .env.local) a signed-out request never reaches the staff
    // page at all — it gets the redirect shell — so the check would fail while
    // describing nothing.
    test.skip(
      FACILITY_ENFORCED,
      "AUTH_ENFORCED includes 'facility' — signed-out never reaches this page.",
    );

    const res = await page.request.get(STAFF_PAGE);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain(OWNER_ONLY);
  });
});
