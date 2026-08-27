import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Commanding the terminal: stopping it, and opening the drawer beside it.
//
// ── WHAT THIS CAN AND CANNOT COVER ────────────────────────────────────────
//
// It cannot prove the device did anything. Every case below is REFUSED or
// validated before Clover is contacted — signed out, wrong permission, a
// malformed serial — so the suite runs on every push without a Flex on the
// desk and without touching a merchant.
//
// What actually happens on the hardware is `docs/product/terminal-test-script.md`,
// and that file exists because this spec cannot be it. Saying so here matters:
// a green run on this file must never be read as "cancel works".
//
// ── THE ASSERTION WORTH HAVING ────────────────────────────────────────────
//
// That cancel never claims to have undone a payment. A card approved in the
// moment before the cancel arrived is still paid, and a screen that says
// "payment cancelled" on the strength of a stopped PROMPT would be telling
// somebody money came back when it did not. The route answers `stopped`, and
// carries a note saying exactly that.
//
// ── AND WHY THE OWNER CASES ARE ONE TEST ──────────────────────────────────
//
// `signIn` runs the whole flow; there is no cached storage state in this
// suite, and four sign-ins in one file produced an intermittent
// `/api/permissions -> 401` — the harness refusing a rapid re-sign-in, not
// these routes. Grouped by IDENTITY, which is the only thing a sign-in buys,
// and named with `test.step` so a failure still says which case broke. A
// flaky spec in the push gate blocks pushes for a reason nobody can
// reproduce and teaches people to re-run until green.
// ============================================================================

const post = (page: Page, body: unknown): Promise<APIResponse> =>
  page.request.post("/api/payments/clover/device", {
    data: body,
    failOnStatusCode: false,
  });

/** A well-formed cancel for a device that does not exist. */
const cancel = { action: "cancel", deviceSerial: "C000000000000000" };

test.describe("commanding a terminal", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    await page.context().clearCookies();
    expect((await post(page, cancel)).status()).toBe(401);
  });

  test("what somebody who may take payments can and cannot do", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    await test.step("a body naming no action or no terminal is refused", async () => {
      for (const body of [
        {},
        { action: "cancel" },
        { deviceSerial: "C000000000000000" },
        // Not one of the two actions. A discriminated union rejects it rather
        // than falling through to the drawer branch.
        { action: "explode", deviceSerial: "C000000000000000" },
        // Too short to be a serial.
        { action: "cancel", deviceSerial: "x" },
      ]) {
        expect((await post(page, body)).status(), JSON.stringify(body)).toBe(
          400,
        );
      }
    });

    await test.step("cancel never reports having undone a payment", async () => {
      const response = await post(page, cancel);

      // 200 (the command was sent and the device did not answer) or 403 (this
      // account administers no facility with a terminal) are both fine. A 500
      // is not: an unreachable device is an ordinary outcome at a counter.
      expect([200, 403]).toContain(response.status());
      if (response.status() !== 200) return;

      const body = (await response.json()) as {
        stopped?: boolean;
        cancelled?: boolean;
        note?: string;
      };

      // THE ASSERTION THIS FILE EXISTS FOR. The word must stay `stopped`, and
      // the note must keep saying what it does not do. Rename this to
      // `cancelled` and the screen above it starts saying "payment cancelled"
      // about a prompt — and eventually about money.
      expect(body).toHaveProperty("stopped");
      expect(body.cancelled, "must not claim to have cancelled a payment").toBe(
        undefined,
      );
      expect(body.note ?? "").toContain("does not reverse");
    });
  });

  test("a groomer may neither stop a terminal nor open a drawer", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    // Cancel wants `financial_take_payment` — whoever may start a prompt may
    // stop one — and the drawer wants `open_close_register`. A groomer holds
    // neither.
    expect((await post(page, cancel)).status()).toBe(403);
    expect(
      (
        await post(page, {
          action: "open-drawer",
          deviceSerial: "C000000000000000",
        })
      ).status(),
    ).toBe(403);
  });
});
