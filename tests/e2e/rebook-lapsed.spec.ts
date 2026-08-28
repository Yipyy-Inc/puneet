import { test, expect } from "@playwright/test";
import { signIn } from "./_auth";

// ============================================================================
// The Lapsed tab shows what the database says, and offers only what it can do.
//
// ── WHAT THIS WOULD HAVE CAUGHT ───────────────────────────────────────────
//
// Until 2026-08-28 this tab rendered five people who did not exist —
// `lapsedClients` in src/data/rebook-reminders.ts — identical at every
// facility, with six buttons that raised `toast.success("Composer opened for
// Charlie Brown")` and did nothing. Every assertion anyone could have written
// about the DOM passed the whole time, because the DOM was fine. The screen was
// not.
//
// So the check here is not "does a card render". It is that the names on screen
// are the names the API returns, which is the one thing a fixture cannot fake.
//
// ── AND THAT IT DOES NOT OFFER A SEND IT CANNOT MAKE ──────────────────────
//
// `remindersEnabledFor` is the facility's own list of services whose lapsed
// clients may be written to, and the fallback is EMPTY — a facility that has
// never configured this must not start messaging because the app assumed a
// four-week grooming cycle for them. The screen has to honour that, or staff
// press Send and the route refuses behind their back.
//
// ── IT DOES NOT PRESS SEND ────────────────────────────────────────────────
//
// There is one Postgres and one Resend account. Queueing a real reminder to a
// real address is not something a spec gets to do casually; the boundary that
// governs it is asserted in automation-send-boundary.spec.ts, which is careful
// to choose requests whose correct outcome is that nothing is queued.
// ============================================================================

const AUTOMATIONS = "/facility/dashboard/automations";
const LAPSED_API = "/api/rebook/lapsed";

interface LapsedPayload {
  clients: {
    clientId: string;
    clientName: string;
    service: string;
    daysOverdue: number;
  }[];
  configured: boolean;
  remindersEnabledFor: string[];
}

test.describe.configure({ mode: "serial" });

test.describe("the lapsed clients tab", () => {
  test("shows the clients the database says are lapsed", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    const payload = (await (
      await page.request.get(LAPSED_API)
    ).json()) as LapsedPayload;

    await page.goto(AUTOMATIONS);
    await page.getByRole("tab", { name: "Rebook Reminders" }).click();
    await page.getByRole("tab", { name: /^Lapsed/ }).click();

    if (payload.clients.length === 0) {
      await expect(page.getByText("Nobody has lapsed")).toBeVisible();
      return;
    }

    // The most overdue first — that is the order the function returns and the
    // order the cards are rendered in, so the top card names the top row.
    const first = payload.clients[0];
    await expect(
      page.getByText(first.clientName, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByText(`${first.daysOverdue}d overdue`).first(),
    ).toBeVisible();

    // The tab's own count comes from the same query the list does. They were
    // separate numbers once — one from a fixture, one from nowhere — and a
    // count that disagrees with what is underneath it is worse than no count.
    await expect(
      page.getByRole("tab", { name: `Lapsed (${payload.clients.length})` }),
    ).toBeVisible();
  });

  test("says so when the frequencies are ours rather than the facility's", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    const payload = (await (
      await page.request.get(LAPSED_API)
    ).json()) as LapsedPayload;

    await page.goto(AUTOMATIONS);
    await page.getByRole("tab", { name: "Rebook Reminders" }).click();
    await page.getByRole("tab", { name: /^Lapsed/ }).click();

    const banner = page.getByText(
      "These are our assumed visit frequencies, not yours",
    );

    // `configured` travels with the data for exactly this sentence. A number
    // the app assumed and a number the facility chose must not look the same,
    // and this is the only place that distinction is visible.
    if (payload.configured) {
      await expect(banner).toBeHidden();
    } else {
      await expect(banner).toBeVisible();
    }
  });

  test("does not offer a send for a service whose reminders are off", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    const payload = (await (
      await page.request.get(LAPSED_API)
    ).json()) as LapsedPayload;

    test.skip(
      payload.clients.length === 0,
      "nobody has lapsed at this facility right now",
    );

    await page.goto(AUTOMATIONS);
    await page.getByRole("tab", { name: "Rebook Reminders" }).click();
    await page.getByRole("tab", { name: /^Lapsed/ }).click();

    const sendable = payload.clients.filter((c) =>
      payload.remindersEnabledFor.includes(c.service),
    );

    // The bulk button carries the count, so it is the honest single assertion:
    // with nothing sendable it must be disabled, and it must never be enabled
    // for more people than the facility has switched on.
    const bulk = page.getByRole("button", { name: /Send .*reminder/ });
    await expect(bulk).toBeDisabled();

    if (sendable.length === 0) {
      // Every per-card Remind is disabled too, and the card says why rather
      // than leaving somebody to wonder.
      await expect(
        page.getByText(/Reminders are switched off for/).first(),
      ).toBeVisible();
      for (const button of await page
        .getByRole("button", { name: "Remind" })
        .all()) {
        await expect(button).toBeDisabled();
      }
    }
  });

  test("dismissing explains that it is not permanent", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    const payload = (await (
      await page.request.get(LAPSED_API)
    ).json()) as LapsedPayload;
    test.skip(payload.clients.length === 0, "nobody has lapsed");

    await page.goto(AUTOMATIONS);
    await page.getByRole("tab", { name: "Rebook Reminders" }).click();
    await page.getByRole("tab", { name: /^Lapsed/ }).click();

    // Scoped to the tab panel, NOT the page. The maintenance banner at the
    // top of every facility screen also has a button called "Dismiss", and a
    // page-wide locator picks it first — closing the banner, opening no dialog,
    // and failing on an assertion that has nothing to do with what broke.
    await page
      .getByRole("tabpanel")
      .getByRole("button", { name: "Dismiss" })
      .first()
      .click();

    // Opened, read, and CANCELLED. The dialog is the assertion — staff have to
    // be told a dismissal lasts until the client's next visit, because the
    // alternative reading ("gone forever") is the one people assume and it is
    // wrong. Confirming it here would write a row this spec has no business
    // writing; automation-send-boundary covers the write, and cleans up.
    await expect(
      page.getByText(/hides this client until their next visit/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keep them" }).click();
  });
});
