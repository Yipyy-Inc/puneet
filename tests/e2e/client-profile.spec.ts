import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The client profile page, /facility/dashboard/clients/[id].
//
// The client record itself was already real. The FACILITY was not:
//
//   const facility = facilities.find((f) => f.name === client.facility);
//
// — the client's facility STRING matched against `src/data/facilities.ts`. The
// API labels a client with the real facility name ("Yipyy Demo Facility"),
// which appears nowhere in that fixture, so `facility` was undefined for every
// real client.
//
// Both booking buttons are wrapped in `if (client && facility)`. So they did
// not crash. They silently did nothing — no modal, no error, no toast — on the
// two most obvious controls on a customer's file.
// ============================================================================

const STAFF = ACCOUNTS.owner;

test.describe("the client profile", () => {
  // 3,536 lines; dev mode compiles it on first hit and the wizard is a lazy
  // chunk of its own. A cold run lost the race at 90s.
  test.slow();

  test("the Book button opens the wizard", async ({ page }) => {
    await signIn(page, STAFF);

    // A real client, named from the API rather than hardcoded.
    const clients = (await (await page.request.get("/api/clients")).json()) as {
      id: number;
      name: string;
    }[];
    expect(clients.length, "the facility has clients").toBeGreaterThan(0);
    const target = clients[0]!;

    await page.goto(`/facility/dashboard/clients/${target.id}`, {
      waitUntil: "commit",
    });
    await expect(page.getByText(target.name).first()).toBeVisible({
      timeout: 90_000,
    });

    // The header action. Before the fix this click was swallowed by
    // `if (client && facility)` and nothing appeared.
    await page
      .getByRole("button", { name: /^Book$/ })
      .first()
      .click();

    await expect(page.getByRole("dialog").first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test("the payments list totals from the ledger, not a status that does not exist", async ({
    page,
  }) => {
    await signIn(page, STAFF);

    const clients = (await (await page.request.get("/api/clients")).json()) as {
      id: number;
      name: string;
    }[];

    // A client who actually has payments — an empty ledger would prove nothing.
    let target: { id: number; name: string } | undefined;
    let rows: { amount: number; isRefund: boolean }[] = [];
    for (const c of clients) {
      const r = (await (
        await page.request.get(`/api/payments?clientRef=${c.id}`)
      ).json()) as { amount: number; isRefund: boolean }[];
      if (r.length > 0) {
        target = c;
        rows = r;
        break;
      }
    }
    test.skip(!target, "no client at this facility has payments");

    // The old code filtered `p.status === "completed"` — a field the real row
    // does not have — and summed `p.totalAmount`, which it also does not have.
    // Every row here IS money that moved; a refund is a NEGATIVE row.
    const expected = rows.reduce((sum, r) => sum + r.amount, 0);

    await page.goto(`/facility/dashboard/clients/${target!.id}`, {
      waitUntil: "commit",
    });
    await expect(page.getByText(target!.name).first()).toBeVisible({
      timeout: 90_000,
    });

    // The stats live in the Billing tab, which Radix does not mount until it
    // is selected — so an assertion that skipped this click was testing an
    // element that does not exist yet, not a wrong number.
    await page
      .getByRole("tab", { name: /^Billing/i })
      .first()
      .click();

    await expect(page.getByText(`$${expected.toFixed(2)}`).first()).toBeVisible(
      { timeout: 30_000 },
    );
  });
});
