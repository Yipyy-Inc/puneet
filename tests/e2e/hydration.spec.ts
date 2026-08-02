import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { PASSWORD } from "./_auth";

// ============================================================================
// No hydration mismatches on the surfaces a signed-in person lands on.
//
// The bug that prompted this: the smart-insights widget. Its state
// (dismissals, snoozes, settings) lives in localStorage, so the server rendered
// "no insights, no badge" and the client rendered whatever this browser knew.
// Reproducible on every load, and this test fails without the fix — checked by
// reverting it.
//
// A SECOND mismatch was seen once, on the staff page, under a loaded suite run.
// It has not been reproduced since. This test does NOT currently catch it, and
// saying otherwise would be worse than not having the test: if it reappears,
// this file is where the reproduction belongs.
//
// TWO THINGS THIS TEST DOES DELIBERATELY, both learned from nearly missing the
// first bug:
//
//   • A FRESH TAB per route. A mismatch only happens during hydration, so a
//     client-side navigation from another page never exercises it — the test
//     would pass while the bug shipped.
//
//   • It signs in as a GROOMER, not an admin. A platform admin holds every
//     permission, which is what the server's SSR fallback already assumes, so
//     permission-shaped mismatches would agree by accident and stay hidden.
// ============================================================================

const FACILITY_ROUTES = [
  "/facility/dashboard",
  "/facility/dashboard/insights",
  "/facility/dashboard/staff",
  "/facility/dashboard/settings",
];

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

/** Sign in, then drop the warm JS context so each route is a first arrival. */
async function sessionFor(
  browser: Browser,
  email: string,
): Promise<BrowserContext> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signIn(page, email);
  await page.close();
  return ctx;
}

async function hydrationErrors(ctx: BrowserContext, route: string) {
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => {
    if (e.message.includes("Hydration")) errors.push(e.message.slice(0, 100));
  });
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4500);
  await page.close();
  return errors;
}

test("the facility portal hydrates cleanly for a non-owner", async ({
  browser,
}) => {
  test.setTimeout(600_000);
  const ctx = await sessionFor(browser, "groomer@yipyy.dev");
  for (const route of FACILITY_ROUTES) {
    expect(await hydrationErrors(ctx, route), `hydration on ${route}`).toEqual(
      [],
    );
  }
  await ctx.close();
});

test("the platform portal hydrates cleanly", async ({ browser }) => {
  test.setTimeout(600_000);
  const ctx = await sessionFor(browser, "admin@yipyy.dev");
  expect(
    await hydrationErrors(ctx, "/dashboard"),
    "hydration on /dashboard",
  ).toEqual([]);
  await ctx.close();
});
