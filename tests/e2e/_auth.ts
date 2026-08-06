import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, type Page } from "@playwright/test";

// ============================================================================
// Signing in, in one place.
//
// The dev-account password used to be copy-pasted into seven spec files, which
// quietly made rotating it a CODE CHANGE across the test suite rather than one
// line of SQL. That is the wrong shape for a credential: the thing you most
// want to be easy is replacing it.
//
// It comes from E2E_PASSWORD, read out of .env.local by playwright.config.ts.
// Rotate the accounts, put the new value there, re-run the provisioning script,
// and nothing here needs editing.
//
// ── THE PROVIDER CHANGED; THE CONTRACT DID NOT ────────────────────────────
//
// This used to POST /login, a Supabase Auth form. Clerk owns identity now
// (20260805223000, 20260805233000) and that route is gone. `signIn(page, email)`
// keeps its name, its signature and its guarantee, so NONE of the 36 specs
// needed touching — the same reason src/lib/supabase/server.ts kept
// `createServerClient()` while swapping the identity underneath it.
//
// These are DEVELOPMENT accounts on a demo facility, provisioned by
// scripts/provision-e2e-identities.ts into a Clerk DEVELOPMENT instance. They
// are not in supabase/seed/dev-accounts.sql any more: that file created
// auth.users rows, and a GoTrue user authenticates nothing now.
// ============================================================================

export const PASSWORD = process.env.E2E_PASSWORD ?? "YipyyDev!2026";

/**
 * The dev accounts, one per role.
 *
 * Unchanged from the Supabase Auth era, deliberately — the specs assert against
 * these roles and this is a change of identity provider, not of what the
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
 * ── WHY NOT DRIVE THE FORM ────────────────────────────────────────────────
 *
 * `clerk.signIn` talks to Clerk's client SDK directly instead of typing into
 * <SignIn />. That is not only for speed: driving the component couples all 36
 * specs to Clerk's markup, so a Clerk release that renames a field breaks the
 * entire suite at once, in a way that looks like an application bug. The
 * sign-in SCREEN deserves a test; it should be one spec, not a precondition of
 * every other one.
 *
 * `setupClerkTestingToken` still has to run per page — bot protection applies
 * to the API call as much as to the form.
 *
 * ── WHY /sign-in AND NOT / ────────────────────────────────────────────────
 *
 * `clerk.signIn` needs a loaded Clerk on an UNPROTECTED page. `/` redirects to
 * /dashboard, which is gated, so a signed-out visit bounces — and the helper
 * would be racing a redirect while trying to authenticate inside it.
 *
 * ── WHY POLL /api/permissions ─────────────────────────────────────────────
 *
 * Unchanged from the Supabase version, and still the right check: a redirect
 * can land before the session is readable by the SERVER, and the route resolves
 * `my_permissions()` through the database as the caller. So a 200 means the
 * whole chain works — Clerk session, JWT, RLS — rather than that a cookie
 * exists. It answers 200 for a customer too, with an empty map, which is why
 * one helper serves all seven accounts.
 *
 * The 60s allowance is for the dev server compiling a route on first hit, not
 * for slow auth.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.loaded({ page });

  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: email,
      password: PASSWORD,
    },
  });

  await expect
    .poll(async () => (await page.request.get("/api/permissions")).status(), {
      timeout: 60_000,
    })
    .toBe(200);
}

/**
 * Drop the session.
 *
 * Playwright gives each test a fresh context, so specs do not normally need
 * this — it is for the ones that assert what a SIGNED-OUT visitor sees after
 * having been signed in, which used to be done by clearing cookies. Clerk holds
 * the session in its own storage, so clearing cookies leaves a client that
 * still believes it is authenticated.
 */
export async function signOut(page: Page): Promise<void> {
  await clerk.signOut({ page });
}
