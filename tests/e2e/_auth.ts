import type { Page } from "@playwright/test";

// ============================================================================
// Signing in, in one place.
//
// The dev-account password used to be copy-pasted into seven spec files, which
// quietly made rotating it a CODE CHANGE across the test suite rather than one
// line of config. That is the wrong shape for a credential: the thing you most
// want to be easy is replacing it.
//
// It comes from E2E_PASSWORD, read out of .env.local by playwright.config.ts.
// Rotate the accounts, put the new value there, re-run the provisioning script,
// and nothing here needs editing.
//
// ── THE PROVIDER CHANGED TWICE; THE CONTRACT DID NOT ──────────────────────
//
// This posted /login under Supabase Auth, then drove Clerk's client SDK, and now
// drives our own form. `signIn(page, email)` keeps its name, its signature and
// its guarantee through all three, so NONE of the 36 specs have ever needed
// touching — the same reason src/lib/supabase/server.ts kept
// `createServerClient()` while swapping the identity underneath it.
//
// ── WHY IT NOW DRIVES THE FORM, HAVING DELIBERATELY NOT DONE SO BEFORE ────
//
// Under Clerk this used `clerk.signIn()` — the Backend API — and the reason was
// explicit: driving <SignIn /> coupled all 36 specs to a VENDOR'S markup, so a
// Clerk release renaming a field broke the entire suite at once, looking like an
// application bug.
//
// `@clerk/testing` has no WorkOS equivalent, so that option is gone. But the
// objection went with it: the markup is OURS now (ADR 0004 §4 kept the custom
// UI), and a WorkOS release cannot rename our fields. If these selectors break
// it is because we changed our own sign-in screen — which the suite SHOULD
// notice. The cost is honest: sign-in is now a real form submit and a
// precondition of every spec.
//
// ── WHY NOT INJECT A SESSION COOKIE DIRECTLY ──────────────────────────────
//
// Tempting, and rejected. The AuthKit cookie is a SEALED payload whose format is
// the SDK's private business; hand-rolling it would couple the suite to an
// internal encoding that can change in a patch release, and it would test a
// session no user could ever have obtained.
//
// These are DEVELOPMENT accounts on a demo facility, provisioned by
// scripts/provision-e2e-identities.ts into the WorkOS STAGING environment.
// ============================================================================

/** The shared dev-account password. Also used by the provisioning script. */
export const PASSWORD = process.env.E2E_PASSWORD ?? "YipyyDev!2026";

/**
 * The dev accounts, one per role.
 *
 * Unchanged across both provider migrations, deliberately — the specs assert
 * against these roles and this is a change of identity provider, not of what the
 * fixtures mean.
 *
 * One login per role is a real constraint on what a test can express — there is
 * no second groomer to use as a same-role control. staff-portal-nav.spec.ts says
 * where that bites and what it does instead.
 */
export const ACCOUNTS = {
  admin: "admin@yipyy.dev",
  owner: "owner@yipyy.dev",
  manager: "manager@yipyy.dev",
  groomer: "groomer@yipyy.dev",
  reception: "reception@yipyy.dev",
  caretaker: "caretaker@yipyy.dev",
  customer: "customer@yipyy.dev",
} as const;

/**
 * Sign in and wait until the session is genuinely usable.
 *
 * ── WHY /sign-in AND NOT / ────────────────────────────────────────────────
 *
 * `/` redirects to /dashboard, which is gated, so a signed-out visit bounces and
 * the helper would be racing a redirect while trying to authenticate inside it.
 *
 * ── WHY POLL /api/permissions ─────────────────────────────────────────────
 *
 * Unchanged across all three providers, and still the right check: a redirect
 * can land before the session is readable by the SERVER, and the route resolves
 * `my_permissions()` through the database as the caller. So a 200 means the
 * whole chain works — WorkOS session, JWT, RLS — rather than that a cookie
 * exists. It answers 200 for a customer too, with an empty map, which is why one
 * helper serves all seven accounts.
 *
 * The 60s allowance is for the dev server compiling a route on first hit, not
 * for slow auth.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  // Drop anything already there. Several specs switch roles mid-test, and
  // signing in on top of a live session would leave the previous one's cookie
  // racing the new one. Cheap when there is nothing to clear.
  await page.context().clearCookies();

  await page.goto("/sign-in");

  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  let status = 0;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    status = (await page.request.get("/api/permissions")).status();
    if (status === 200) return;
    await page.waitForTimeout(1_000);
  }

  throw new Error(
    [
      `Signed in as ${email}, but the server does not accept the session (/api/permissions -> ${status}).`,
      "",
      await diagnose(page),
    ].join("\n"),
  );
}

/**
 * Which failure this is — because the 401 is ambiguous and expensive.
 *
 * /api/permissions answers `401 Not signed in.` for two unrelated causes: no
 * session at all, and a session Supabase will not accept. They need completely
 * different fixes and look identical from here, so the difference is worked out
 * ONCE rather than in whichever spec happens to run first.
 *
 * The second is the one that costs an afternoon. Supabase's third-party auth is
 * registered against SPECIFIC WorkOS environments; a token from any other one is
 * refused with `PGRST301 No suitable key or wrong key type`, so getCurrentUser()
 * throws, the route catches it, and the message says the caller is not signed in
 * when they demonstrably are.
 */
async function diagnose(page: Page): Promise<string> {
  const onScreen = await page
    .locator('[role="alert"]')
    .first()
    .textContent()
    .catch(() => null);

  if (onScreen?.trim()) {
    return [
      `The sign-in form reported: ${onScreen.trim()}`,
      "",
      "So sign-in itself failed. Check the account exists in the WorkOS STAGING",
      "environment, and that its email is marked verified:",
      "  bun scripts/provision-e2e-identities.ts",
    ].join("\n");
  }

  const hasSession = (await page.context().cookies()).some((c) =>
    c.name.startsWith("wos-session"),
  );

  if (!hasSession) {
    return [
      "No WorkOS session cookie was set, and the form showed no error.",
      "The submit probably never completed — check the selectors in this file",
      "against src/components/auth/EmailSignInForm.tsx.",
    ].join("\n");
  }

  return [
    "A WorkOS session EXISTS — the break is between WorkOS and Supabase.",
    "",
    "Supabase accepts tokens only from the WorkOS environments registered on it",
    "as third-party auth providers, and refuses every other one with",
    "`PGRST301 No suitable key or wrong key type`.",
    "",
    "Check both, in this order:",
    "  1. WORKOS_CLIENT_ID matches an issuer registered in Supabase Dashboard ->",
    "     Authentication -> Third-Party Auth.",
    '  2. The environment\'s JWT template is `{"role": "authenticated"}`. Without',
    "     it every token is `anon` and every read returns zero rows.",
  ].join("\n");
}

/**
 * Drop the session.
 *
 * Playwright gives each test a fresh context, so specs do not normally need
 * this — it is for the ones that assert what a SIGNED-OUT visitor sees after
 * having been signed in.
 *
 * Clearing cookies is now SUFFICIENT, which it was not under Clerk: Clerk held
 * the session in its own client storage, so a cookie clear left a browser that
 * still believed it was authenticated. AuthKit's session is the cookie.
 */
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies();
}
