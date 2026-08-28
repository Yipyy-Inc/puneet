import { test, expect } from "@playwright/test";
import { signIn } from "./_auth";

// ============================================================================
// The Queue forecasts, and the History counts what actually happened.
//
// ── THE NUMBER THAT WAS A LITERAL ─────────────────────────────────────────
//
// The History tab showed "Total Sent: 1,392" for months. It was a number typed
// into a TypeScript file, on a system that had never sent a message. So the
// assertion here is not "a tile renders" — it is that every tile equals what
// the API says, which is itself counted from the rows listed underneath it.
// Three places, one number, or the test fails.
//
// ── AND THE QUEUE HAS TO ADMIT IT IS A FORECAST ───────────────────────────
//
// Nothing is scheduled for anybody on that tab. `scheduledSendOn` is arithmetic
// on their last visit and the facility's own interval, recomputed on every
// read — so a client who books tomorrow simply stops appearing, with nothing to
// cancel. The old version showed the same cards under a "Send Now" that did
// nothing, which read as a queue of pending messages. The difference between a
// forecast and a queue is the difference between this screen being honest and
// not, and it is asserted rather than assumed.
// ============================================================================

const AUTOMATIONS = "/facility/dashboard/automations";

interface QueuePayload {
  clients: { clientName: string; service: string; scheduledSendOn: string }[];
  daysAhead: number;
}

interface HistoryPayload {
  entries: unknown[];
  stats: {
    sent: number;
    waiting: number;
    skipped: number;
    failed: number;
    rebooked: number;
    recoveredRevenue: number;
  };
}

async function openRebookTab(
  page: import("@playwright/test").Page,
  tab: RegExp | string,
) {
  await page.goto(AUTOMATIONS);
  await page.getByRole("tab", { name: "Rebook Reminders" }).click();
  await page.getByRole("tab", { name: tab }).click();
}

test.describe.configure({ mode: "serial" });

test.describe("the rebook queue and history", () => {
  test("the queue says it is a forecast, not a set of scheduled messages", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    const payload = (await (
      await page.request.get("/api/rebook/queue?days=30")
    ).json()) as QueuePayload;

    await openRebookTab(page, /^Queue/);

    // The disclaimer is the assertion. Without it this tab reads as a list of
    // messages already booked to go out, which is what the fixture version
    // implied and could not deliver.
    await expect(page.getByText(/Nothing here is scheduled yet/)).toBeVisible();

    if (payload.clients.length === 0) {
      await expect(
        page.getByText(/Nobody comes due in the next 30 days/),
      ).toBeVisible();
      // The empty state has to say WHY it is empty, or it reads as broken.
      await expect(
        page.getByText(/already overdue is on the Lapsed tab/),
      ).toBeVisible();
      return;
    }

    await expect(
      page.getByText(payload.clients[0].clientName, { exact: true }).first(),
    ).toBeVisible();
  });

  test("the queue window changes what is asked for", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");
    await openRebookTab(page, /^Queue/);

    // 30 / 60 / 90 are separate requests, not a client-side filter over one
    // over-fetched list — so the button has to reach the server. Asserted by
    // catching the request rather than by counting cards, which would pass on
    // an empty facility either way.
    const request = page.waitForRequest((r) =>
      r.url().includes("/api/rebook/queue?days=90"),
    );
    await page.getByRole("button", { name: "Next 90 days" }).click();
    await request;
  });

  test("every history tile equals what the API counted", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    const payload = (await (
      await page.request.get("/api/rebook/history")
    ).json()) as HistoryPayload;

    await openRebookTab(page, /^History/);

    if (payload.entries.length === 0) {
      await expect(
        page.getByText(/No rebook reminders have been sent yet/),
      ).toBeVisible();
    }

    // Scoped to the tab panel: "Sent" and a number appear elsewhere on this
    // screen, and a page-wide match would assert against the wrong tile.
    const panel = page.getByRole("tabpanel");
    for (const [label, value] of [
      ["Sent", payload.stats.sent],
      ["Waiting", payload.stats.waiting],
      ["Rebooked", payload.stats.rebooked],
      ["Skipped", payload.stats.skipped],
      ["Failed", payload.stats.failed],
    ] as const) {
      const tile = panel
        .locator("div")
        .filter({ hasText: new RegExp(`^${label}${value}$`) })
        .first();
      await expect(
        tile,
        `the ${label} tile should read ${value}`,
      ).toBeVisible();
    }
  });

  test("the analytics row above the card is real too", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    const history = (await (
      await page.request.get("/api/rebook/history")
    ).json()) as HistoryPayload;

    await page.goto(AUTOMATIONS);
    await page.getByRole("tab", { name: "Rebook Reminders" }).click();

    // "Reminders sent" is the tile that used to be a literal. It now has to
    // agree with the outbox, which is the same source the History tab counts.
    await expect(page.getByText("Reminders sent")).toBeVisible();
    await expect(
      page.getByText(String(history.stats.sent), { exact: true }).first(),
    ).toBeVisible();

    // Null, not 0%, when nothing has gone out. "0%" reads as "the messages are
    // not working"; the truth is that none have been sent.
    if (history.stats.sent === 0) {
      await expect(page.getByText("Nothing sent yet")).toBeVisible();
    }
  });
});
