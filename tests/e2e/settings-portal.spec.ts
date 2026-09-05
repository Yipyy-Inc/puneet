import { test, expect, type Locator, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// SETTINGS IS A SET OF ADDRESSES, AND EACH ONE STAYS IN ITS OWN PORTAL.
//
// Two things are asserted here and neither can be seen from the source.
//
// ── 1. THE PORTAL ─────────────────────────────────────────────────────────
//
// `/employee/settings` renders the same screens the facility admin sees and
// carries NO route gate, deliberately: personal settings belong to every
// employee, whatever else they may not touch.
//
// Every navigation on that screen was hardcoded to `/facility/dashboard/
// settings` anyway — the rail itself, the Yipyy Pay wizard, and 28 links
// scattered through the product. `canAccessFacilityPortal` admits facility
// admins and platform admins and nobody else, so for a groomer guardPortal
// denied the navigation and `landingPathFor` forwarded them to
// /employee/schedule. A 200, a real screen, and no error anywhere: the settings
// rail ejected them from the portal on the first item they touched.
//
// ── 2. THE OLD ADDRESSES ──────────────────────────────────────────────────
//
// `?section=` was how this screen was navigated for its whole life, so it is in
// bookmarks, in emails, in `src/data/facility-onboarding.ts`, and — the one
// nobody can edit — in the Site URL Clover redirects a merchant back to after
// connecting a real merchant account. That last one carries `&step=2`, and
// dropping it lands somebody who just connected on the screen that offers to
// connect an account.
//
// ── IT WRITES NOTHING ─────────────────────────────────────────────────────
//
// No seeding and no settings saves — this reads where a navigation lands. Worth
// stating, because staging and local dev share the PRODUCTION database and a
// spec that saved a setting here would be editing a real facility's
// configuration to prove a routing fix.
// ============================================================================

/**
 * Follow one link and wait for it to land, with a single retry.
 *
 * ── WHY A RETRY, AND WHY NOT A POLL ───────────────────────────────────────
 *
 * The switchboard behind these routes is one 4,600-line "use client"
 * component, and the first navigation into it is slow enough to lose a click:
 * measured here, a click on the settings index left the address bar unchanged
 * four seconds later, and the next click worked.
 *
 * The first version of this polled — re-clicking every 500ms until the URL
 * moved — and that was worse than the problem. It queued several navigations
 * into one pending one, and the run ended on whichever resolved last, which was
 * sometimes the page it started from. One click, a real wait, one retry.
 */
async function follow(page: Page, link: Locator, target: string) {
  await expect(link).toBeVisible({ timeout: 20_000 });
  await link.click();
  try {
    await page.waitForURL(`**${target}`, { timeout: 20_000 });
  } catch {
    await link.click();
    await page.waitForURL(`**${target}`, { timeout: 20_000 });
  }
}

/**
 * Open a section from the index, then a second one from the rail beside it, and
 * report where the second click landed.
 *
 * Both surfaces are covered on purpose. The index is a grid of every section a
 * viewer may open; the rail only appears once you are inside one. They are two
 * sets of links built by two different components, and a portal bug in either
 * strands the same person.
 */
async function walkTwoSections(page: Page, index: string): Promise<URL> {
  await follow(
    page,
    page
      .getByRole("link")
      .filter({ hasText: /^\s*My profile\s*$/i })
      .first(),
    `${index}/my-profile`,
  );

  // …and now the rail, which only exists on a section page.
  await follow(
    page,
    page
      .getByRole("link")
      .filter({ hasText: /^\s*My notifications\s*$/i })
      .first(),
    `${index}/my-notifications`,
  );

  return new URL(page.url());
}

test.describe("settings stays in its portal", () => {
  test("a groomer's clicks do not eject them from /employee", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    await page.goto("/employee/settings");
    await expect(page).toHaveURL(/\/employee\/settings$/, { timeout: 30_000 });

    const after = await walkTwoSections(page, "/employee/settings");
    expect(
      after.pathname,
      `a settings link sent a groomer to ${after.pathname} — the facility portal denies them, so guardPortal forwards to /employee/schedule`,
    ).toBe("/employee/settings/my-notifications");
  });

  test("an owner's clicks stay in the facility portal", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    await page.goto("/facility/dashboard/settings");
    await expect(page).toHaveURL(/\/facility\/dashboard\/settings$/, {
      timeout: 30_000,
    });

    const after = await walkTwoSections(page, "/facility/dashboard/settings");
    expect(after.pathname).toBe(
      "/facility/dashboard/settings/my-notifications",
    );
  });
});

test.describe("old settings addresses still resolve", () => {
  test("?section= becomes a path, in the portal that asked", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    await page.goto("/facility/dashboard/settings?section=taxes");
    await expect(page).toHaveURL(/\/facility\/dashboard\/settings\/taxes$/, {
      timeout: 30_000,
    });

    // A renamed section keeps its old address: `financial` became `yipyy-pay`.
    await page.goto("/facility/dashboard/settings?section=financial");
    await expect(page).toHaveURL(/\/facility\/dashboard\/settings\/yipyy-pay/, {
      timeout: 30_000,
    });
  });

  test("Clover's return path keeps the wizard step it came back on", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The exact address src/app/clover/_components/clover-result.tsx sends a
    // merchant to after a successful connection.
    await page.goto("/facility/dashboard/settings?section=yipyy-pay&step=2");
    await page.waitForURL(/\/settings\/yipyy-pay/, { timeout: 30_000 });

    const url = new URL(page.url());
    expect(url.pathname).toBe("/facility/dashboard/settings/yipyy-pay");
    expect(
      url.searchParams.get("step"),
      "the connect wizard's step was dropped by the redirect — a merchant who just connected lands back on 'connect an account'",
    ).toBe("2");
  });

  test("a section that does not exist says so, instead of rendering another one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Two training screens linked to `training-disciplines` for months. It is
    // not a section; the old page fell through to Business and looked like a
    // page, which is why nobody reported it.
    await page.goto("/facility/dashboard/settings/training-disciplines");

    // Asserted on the RENDERED not-found, not on an HTTP status, and that is
    // not a shortcut. The facility layout streams, so headers are already sent
    // by the time the page calls `notFound()` — Next then answers 200 with the
    // not-found instruction in the RSC payload and the client router shows it.
    // src/lib/auth/portal-gate.ts records the same thing about `redirect()`
    // from these layouts, measured with curl.
    await expect(page.getByText("That page has moved")).toBeVisible({
      timeout: 30_000,
    });
  });
});
