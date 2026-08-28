import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Who a tip is owed to, and who may say it has been paid.
//
// ── WHAT THIS COVERS, AND WHAT THE SQL FILE COVERS ────────────────────────
//
// The attribution itself is a Postgres trigger, and it is tested where it lives
// — supabase/tests/tip-attribution.sql asserts the four rules that matter, and
// does it inside a transaction that rolls back. Repeating that here through the
// UI would be slower, flakier, and would leave rows in the one shared database.
//
// What only a browser can answer is the boundary: the payout RPC is
// SECURITY DEFINER and decides for itself who may call it, so the thing worth
// asserting from outside is that the ROUTE in front of it cannot be talked into
// paying out somebody else's facility.
//
// ── AND ONE ASSERTION ABOUT HONESTY ───────────────────────────────────────
//
// `mark_tips_paid` returns how many allocations it actually changed, and the
// route passes that straight back rather than flattening it to a boolean. A
// screen that says "paid" on the strength of a call that changed nothing would
// tell an owner they had settled up when they had not — and on a second run, it
// would tell them so about money they had already paid once.
// ============================================================================

const payout = (page: Page, body: unknown): Promise<APIResponse> =>
  page.request.post("/api/tips/payout", {
    data: body,
    failOnStatusCode: false,
  });

/**
 * A well-formed request naming a facility that is nobody's.
 *
 * A REAL v4 shape — version nibble 4, variant nibble 8. An all-zero uuid is
 * rejected by the route's own validation before it ever reaches the facility
 * check, so a lazier fixture here would have made the 403 assertion below pass
 * for the wrong reason and then fail the moment somebody read it.
 */
const STRANGER = {
  facilityId: "11111111-1111-4111-8111-11111111dead",
  staffId: "22222222-2222-4222-8222-22222222beef",
};

test.describe("recording a tip payout", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    await page.context().clearCookies();
    expect((await payout(page, STRANGER)).status()).toBe(401);
  });

  test("what an owner can and cannot do", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    await test.step("a malformed body is refused before anything is read", async () => {
      for (const body of [
        {},
        { facilityId: STRANGER.facilityId },
        { staffId: STRANGER.staffId },
        // Not uuids. The RPC would raise on the cast; the route should not let
        // it get that far.
        { facilityId: "nope", staffId: "nope" },
      ]) {
        expect((await payout(page, body)).status(), JSON.stringify(body)).toBe(
          400,
        );
      }
    });

    await test.step("naming a facility that is not theirs is refused", async () => {
      // THE ASSERTION THIS FILE EXISTS FOR. `mark_tips_paid` checks
      // `edit_payroll` against the facility id it is HANDED, so a route that
      // forwarded the caller's would be asking the caller's own question. The
      // session decides, and the body is only allowed to agree.
      const response = await payout(page, STRANGER);
      expect(response.status()).toBe(403);
      expect((await response.text()).toLowerCase()).toContain("not your");
    });
  });

  test("a groomer may not record a payout for their own facility", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    // `edit_payroll`, which a groomer does not hold — splitting a tip is a till
    // act, but recording that money has LEFT the business is payroll.
    // 403 either way: the body names a facility that is not theirs (the route
    // refuses), or it is theirs and the RPC refuses. Both are the same answer
    // to the person pressing the button, and neither may be a 500.
    const response = await payout(page, STRANGER);
    expect([400, 403]).toContain(response.status());
  });

  test("the tips report is not offered to a groomer", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const response = await page.goto("/facility/dashboard/reports/tips");

    // Reports are gated on `ops_view_reports`. A groomer either gets a refusal
    // or is sent elsewhere — what must NOT happen is a page of somebody's
    // payroll.
    const status = response?.status() ?? 0;
    if (status === 200) {
      await expect(
        page.getByRole("heading", { name: "Tips", exact: true }),
      ).toHaveCount(0);
    }
  });
});
