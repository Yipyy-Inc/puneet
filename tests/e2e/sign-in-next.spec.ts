import { test, expect } from "@playwright/test";

import { ACCOUNTS, PASSWORD } from "./_auth";

// ============================================================================
// Signing in returns a person to the page that asked them to.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// Every portal gate bounced a signed-out visitor to `/sign-in?next=<path>`, and
// nothing read `next`: every sign-in landed on `/`. A customer who opened the
// estimate link in their email signed in and was shown their dashboard.
//
// ── WHAT IT ASSERTS ───────────────────────────────────────────────────────
//
// A signed-out customer asking for a portal page is sent to sign in with that
// page as `next`, and after signing in lands on it. And the open-redirect
// guard: a `next` naming another site is ignored, so the sign-in still ends on
// this site.
//
// Password sign-in only. The same `next` reaches Google/Apple (a cookie across
// the round trip), passkeys and the verification code step through the same
// check, tests/unit/safe-next.test.ts; this spec cannot drive a third-party
// provider.
// ============================================================================

async function signInOnPage(
  page: import("@playwright/test").Page,
  email: string,
) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.describe("sign-in returns to where it was asked for", () => {
  test("a signed-out customer lands on the page they opened", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/customer/estimates");

    await expect(page).toHaveURL(/\/sign-in\?next=%2Fcustomer%2Festimates$/);

    await signInOnPage(page, ACCOUNTS.customer);
    await page.waitForURL(/\/customer\/estimates$/, { timeout: 60_000 });
    expect(new URL(page.url()).pathname).toBe("/customer/estimates");
  });

  test("a next naming another site is ignored", async ({ page, baseURL }) => {
    await page.context().clearCookies();
    await page.goto(`/sign-in?next=${encodeURIComponent("//evil.example/x")}`);

    await signInOnPage(page, ACCOUNTS.customer);
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
      timeout: 60_000,
    });
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  });
});
