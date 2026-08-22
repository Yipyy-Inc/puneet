import { test, expect, type Page } from "@playwright/test";
import { signIn, signOut } from "./_auth";

// ============================================================================
// A passkey enrolled on this account signs in without a password.
//
// ── WHAT THIS ACTUALLY PROVES, AND WHY IT NEEDS A REAL BROWSER ────────────
//
// Passkeys cannot be faked at the HTTP layer: the whole mechanism is a
// signature produced by the browser's credential API over a challenge the
// server issued. So this drives Chrome's WebAuthn stack through CDP with a
// VIRTUAL AUTHENTICATOR — a real implementation with a software key store,
// which signs exactly as a fingerprint sensor would. If the signature, the
// challenge, the origin or the RP ID are wrong, the browser refuses and this
// test fails, which is the point.
//
// The round trip is the assertion: enrol, sign out, sign back in with nothing
// typed. That is the flow the feature was asked for, in the client's own words
// — "next time they can sign in using passkey and skip putting password using
// the biometrics or pin" — and each half is worthless without the other. A test
// that only enrolled would pass against a store nothing reads; one that only
// signed in would need a credential it did not create.
//
// ── IT ALSO CHECKS THE ROW, NOT ONLY THE TOAST ────────────────────────────
//
// After enrolling it reads `GET /api/auth/passkey`. A success toast over an
// empty table is exactly the failure `bun run check:success-claims` exists to
// catch, and this is the one place it can be checked end to end.
//
// ── CLEANUP IS NOT OPTIONAL ───────────────────────────────────────────────
//
// There is one Postgres and CI writes to it. Every credential this creates is
// removed again in `afterAll`, in the shape role-editor-writes.spec.ts
// established: a fresh context, a best-effort teardown, and no ability to turn
// a green run red. A leaked credential would not merely be litter — the next
// run would find a passkey already enrolled, and `excludeCredentials` would
// make the authenticator refuse to create a second one.
//
// Chromium only. `WebAuthn.addVirtualAuthenticator` is a CDP command, and CDP
// is Chrome's. playwright.config.ts defines exactly one project, so there is
// nothing here to skip — but that is the reason, and it is why this file must
// not be assumed portable if a second browser is ever added.
// ============================================================================

/** The customer fixture: has a password, and a verified address. */
const ACCOUNT = "customer@yipyy.dev";

type StoredPasskey = { credential_id: string };

async function listPasskeys(page: Page): Promise<StoredPasskey[]> {
  const response = await page.request.get("/api/auth/passkey");
  if (!response.ok()) return [];
  const body = (await response.json()) as { passkeys?: StoredPasskey[] };
  return body.passkeys ?? [];
}

/** Remove every credential on the account. Safe to call when there are none. */
async function removeAllPasskeys(page: Page): Promise<void> {
  for (const passkey of await listPasskeys(page)) {
    await page.request.delete(
      `/api/auth/passkey/${encodeURIComponent(passkey.credential_id)}`,
    );
  }
}

/**
 * A software authenticator that behaves like a phone with a fingerprint reader.
 *
 * `hasResidentKey` and `hasUserVerification` are not decoration — the enrolment
 * route asks for `residentKey: "required"` and `userVerification: "required"`,
 * so an authenticator without either is refused before any of our code runs.
 * `isUserVerified` and `automaticPresenceSimulation` stand in for the human
 * touching the sensor.
 */
async function attachVirtualAuthenticator(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test.describe("passkey sign-in", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNT);
      await removeAllPasskeys(page);
    } catch {
      // Teardown must not turn a green run red. If the credential survives, the
      // next run's opening clear is the backstop — see the note at the top.
    } finally {
      await context.close();
    }
  });

  test("a passkey enrolled in settings signs the customer back in", async ({
    page,
  }) => {
    // The virtual authenticator belongs to the CONTEXT, so it outlives the
    // sign-out below — which is what makes the second half of this test
    // possible at all. Attach before anything navigates.
    await attachVirtualAuthenticator(page);

    await signIn(page, ACCOUNT);

    // Whatever a previous failed run left behind. Enrolling on top of an
    // existing credential makes `excludeCredentials` refuse, and the failure
    // would look like a broken feature rather than a dirty database.
    await removeAllPasskeys(page);

    // ── Enrol ───────────────────────────────────────────────────────────
    await page.goto("/customer/settings");

    const card = page
      .locator("div")
      .filter({ hasText: /^Passkeys/ })
      .first();
    await expect(card).toBeVisible();

    await page.getByRole("button", { name: "Add a passkey" }).click();

    // The row, not the toast. A success message over an empty table is the
    // exact shape check:success-claims guards against elsewhere.
    await expect
      .poll(async () => (await listPasskeys(page)).length, {
        message: "the enrolled credential never reached Postgres",
        timeout: 15_000,
      })
      .toBe(1);

    // ── Sign out, and back in with no password ──────────────────────────
    await signOut(page);
    expect((await page.request.get("/api/permissions")).status()).toBe(401);

    await page.goto("/sign-in");

    // Renders only where WebAuthn exists, so its presence is itself the check
    // that the capability probe agrees with the browser we are driving.
    const passkeyButton = page.getByRole("button", {
      name: "Sign in with a passkey",
    });
    await expect(passkeyButton).toBeVisible();
    await passkeyButton.click();

    // The session is the assertion. /api/permissions answers 200 only when
    // Supabase accepts the token, so this proves the magic-auth bridge produced
    // a session that is real all the way down to RLS — not merely a cookie.
    await expect
      .poll(async () => (await page.request.get("/api/permissions")).status(), {
        message:
          "the passkey was accepted but no usable session reached Postgres",
        timeout: 30_000,
      })
      .toBe(200);
  });

  test("a passkey cannot be enrolled without a session", async ({ page }) => {
    await signOut(page);

    // Both halves of enrolment refuse an anonymous caller. Checked because the
    // write goes through the service-role client, which bypasses RLS — so these
    // two routes are the only thing standing between a stranger and a
    // credential on somebody else's account.
    expect(
      (await page.request.post("/api/auth/passkey/register/options")).status(),
    ).toBe(401);

    expect(
      (
        await page.request.post("/api/auth/passkey/register/verify", {
          data: {},
        })
      ).status(),
    ).toBe(401);
  });
});
