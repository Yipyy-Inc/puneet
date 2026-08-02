import { expect, type Page } from "@playwright/test";

// ============================================================================
// Signing in, in one place.
//
// The dev-account password used to be copy-pasted into seven spec files, which
// quietly made rotating it a CODE CHANGE across the test suite rather than one
// line of SQL. That is the wrong shape for a credential: the thing you most
// want to be easy is replacing it.
//
// It now comes from E2E_PASSWORD, falling back to the seeded default so an
// unconfigured checkout still runs. Rotate the accounts, put the new value in
// .env.local, and nothing here needs editing.
//
// These are DEVELOPMENT accounts on a demo facility (supabase/seed/
// dev-accounts.sql, which refuses to be a migration for exactly this reason).
// The fallback below is not a secret being leaked — it is the documented seed
// value. It stops being appropriate the moment these accounts exist anywhere
// that matters, which is why the env var exists.
// ============================================================================

export const PASSWORD = process.env.E2E_PASSWORD ?? "YipyyDev!2026";

/**
 * The dev accounts, one per role.
 *
 * A STAFF_ENFORCED helper used to live here, so employee specs could skip
 * themselves while the staff portal was still open and they were acting as mock
 * staff through the `employee_staff_id` cookie. Both are gone: every portal
 * requires a session now, and those specs sign in as the accounts below.
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
 * Polls /api/permissions rather than a URL or a heading, because a redirect
 * can land before the auth cookie is readable by the server — the check has to
 * be one only a real session can pass.
 *
 * The 60s allowance is for the dev server compiling a route on first hit, not
 * for slow auth. Several specs failed on a 30s budget purely because they were
 * the first to touch a page.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect
    .poll(async () => (await page.request.get("/api/permissions")).status(), {
      timeout: 60_000,
    })
    .toBe(200);
}
