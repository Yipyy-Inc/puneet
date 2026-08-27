import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Arriving at /clover from Clover's own dashboard.
//
// ── WHAT THIS CANNOT COVER, SAID FIRST ────────────────────────────────────
//
// Not the OAuth handoff. Every case below stops before Clover is contacted:
// signed out, or signed in as somebody who administers nothing. Completing the
// flow needs a merchant clicking through Clover's consent screen, which is why
// `clover-pay.spec.ts` skips itself without a provisioned merchant, and a green
// run on this file must never be read as "connecting works".
//
// ── WHAT IT DOES ASSERT ───────────────────────────────────────────────────
//
// That a launch is not a dead end. Clover documents that installing from the
// App Market sends the merchant to the registered Site URL with a `merchant_id`
// and NO authorisation code, and that the app must then start the authorise
// call itself. Before this, that arrival was indistinguishable from somebody
// typing the URL: the merchant id was dropped and the page said "Sign in to
// manage payments" — to people who were already signed in.
//
// And that the merchant id is never used to decide what gets CONNECTED. It
// arrives in a query string, so it steers copy and nothing else; the facility
// still comes from the session and is still sealed into a signed state by
// /api/payments/clover/connect.
// ============================================================================

/** Shaped like a real Clover merchant id, and belonging to nobody. */
const LAUNCH_MID = "ZZZZTESTMID001";

test.describe("launched from the Clover dashboard", () => {
  test("a signed-out launch says what to do, and names the merchant", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto(`/clover?merchant_id=${LAUNCH_MID}`);

    // The merchant they came from is shown, so they can check they link the
    // right one once they are signed in.
    await expect(page.getByText(LAUNCH_MID)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /sign in/i }).first(),
    ).toBeVisible();

    // NOT the generic card. That wording is what this change exists to stop
    // being the answer to every launch.
    await expect(page.getByText("Sign in to manage payments")).toHaveCount(0);
  });

  test("no merchant id is still the plain signed-out card", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/clover");

    // Somebody typing the URL is not a launch, and nothing should imply they
    // arrived from a merchant account.
    await expect(page.getByText("Sign in to manage payments")).toBeVisible();
  });

  test("a merchant id is never reflected into the page as markup", async ({
    page,
  }) => {
    await page.context().clearCookies();
    const nasty = '"><img src=x onerror=alert(1)>';
    await page.goto(`/clover?merchant_id=${encodeURIComponent(nasty)}`);

    // React escapes it, so it lands as text and no element is created from it.
    // Asserted rather than assumed: this value comes from a query string and is
    // rendered verbatim on the launch cards.
    await expect(page.locator("img[src='x']")).toHaveCount(0);
  });

  test("somebody who administers nothing is told that, not told to sign in", async ({
    page,
  }) => {
    // A groomer holds no admin access anywhere, so `activeAdminFacility` says
    // `none` — the same answer it gives for a signed-OUT visitor. Collapsing
    // the two is the defect this file is about, one layer down: it would tell
    // a signed-in person to sign in.
    await signIn(page, ACCOUNTS.groomer);
    await page.goto(`/clover?merchant_id=${LAUNCH_MID}`);

    await expect(page.getByText(/do not administer a facility/i)).toBeVisible();

    // And no route to attaching a merchant account to a business they do not
    // run.
    await expect(page.getByRole("link", { name: /connect/i })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /^sign in$/i })).toHaveCount(0);
  });
});
