import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_auth";

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

/** The HTML the server sent, before React has touched it. */
async function serverHtml(page: Page, path: string): Promise<string> {
  const res = await page.request.get(path);
  expect(res.status()).toBe(200);
  return res.text();
}

test.describe.configure({ mode: "serial" });

test.describe("server-rendered permissions", () => {
  test("a groomer never reaches the staff page to be withheld anything", async ({
    page,
  }) => {
    // ── WHAT THIS TEST USED TO ASSERT, AND WHY IT CHANGED (ADR 0005) ──────
    //
    // It signed in as a groomer, fetched /facility/dashboard/staff, and checked
    // that the owner-only control was absent from the FIRST PAINT — with
    // "Manage departments" as a sanity anchor proving a real page came back
    // rather than a redirect shell.
    //
    // The facility portal is the admin's now, so the groomer no longer gets a
    // page to have anything withheld from: the layout gate sends them to
    // /employee. The anchor is what caught it, exactly as designed — it exists
    // to stop "the control is absent" being satisfied by "nothing rendered",
    // and here nothing rendered.
    //
    // So the assertion moves up a layer. This is now the stronger claim: not
    // "we withheld the button" but "we did not serve the page". The withholding
    // itself is still proved below, by an owner who DOES get the control.
    await signIn(page, "groomer@yipyy.dev");

    const html = await serverHtml(page, STAFF_PAGE);
    expect(html, "a soft redirect, not the staff page").toContain(
      "NEXT_REDIRECT",
    );
    expect(html, "and none of its content came with it").not.toContain(
      OWNER_ONLY,
    );
    expect(html).not.toContain("Manage departments");
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

  // A third test lived here: "signed out still renders the legacy fallback",
  // asserting that a signed-out visitor got the staff page with its owner-only
  // controls, because the client-side cascade stood in for the database.
  //
  // It is deleted rather than updated. The behaviour it described is gone — a
  // signed-out request now gets the redirect shell — and there is nothing left
  // to rename it to. "Signed out is turned away" is already owned by
  // admin-portal-enforced.spec.ts and employee-identity.spec.ts, and a third
  // copy would be duplication, not coverage.
});
