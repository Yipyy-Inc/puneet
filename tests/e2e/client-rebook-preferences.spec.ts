import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_auth";

// ============================================================================
// This client comes back on their own schedule, and the list obeys it.
//
// ── THE ASSERTION THAT MATTERS ────────────────────────────────────────────
//
// Not "the override saved". An override that saves and changes nothing is the
// same screen as before with a row in a table behind it. So this sets an
// interval on the client file and then reads the FACILITY's lapsed list back:
// `expected_days` has to be the client's number, and `days_overdue` has to move
// with it. That is `rebook_pipeline` honouring it, which is the one place the
// Queue, the Lapsed tab and the send route all read.
//
// ── AND THE SWITCH HAS TO REMOVE THEM ─────────────────────────────────────
//
// The master toggle is the facility's note — "she books when she books, do not
// chase her" — and it is not a suppression. Suppression is the customer's own
// decision, keyed by address, and stops every marketing message. Both are
// enforced; this asserts the one this screen can write.
//
// ── EVERYTHING IT SETS IS UNSET IN afterAll ───────────────────────────────
//
// Which runs regardless of outcome. A leftover override would quietly change
// what the rebook specs see — and, worse, a leftover OPT-OUT would remove a
// client from the lapsed list, so `rebook-lapsed` and `automation-send-boundary`
// would go green having tested one client fewer. A cleanup leak that makes
// other specs pass is the dangerous direction.
// ============================================================================

interface Prefs {
  remindersEnabled: boolean;
  services: {
    service: string;
    defaultDays: number | null;
    overrideDays: number | null;
    effectiveDays: number | null;
    source: "default" | "override";
    completedVisits: number;
    observedDays: number | null;
  }[];
}

interface Lapsed {
  clients: {
    clientId: string;
    clientName: string;
    service: string;
    expectedDays: number;
    daysOverdue: number;
  }[];
}

/** A client who is on the lapsed list right now, so the effect is visible. */
async function aLapsedClient(page: Page) {
  const lapsed = (await (
    await page.request.get("/api/rebook/lapsed")
  ).json()) as Lapsed;
  return lapsed.clients[0];
}

async function prefsFor(page: Page, ref: number): Promise<Prefs> {
  const response = await page.request.get(
    `/api/clients/${ref}/rebook-preferences`,
  );
  expect(response.status()).toBe(200);
  return (await response.json()) as Prefs;
}

/**
 * The app-facing numeric ref for a client, by name.
 *
 * The lapsed list speaks uuids and the client file speaks refs — two ids for
 * one person, which is a real seam in this codebase rather than a quirk of the
 * test. `/api/clients` returns the ref as `id`.
 */
async function refFor(page: Page, name: string): Promise<number | null> {
  const response = await page.request.get("/api/clients");
  if (!response.ok()) return null;
  const rows = (await response.json()) as { id: number; name: string }[];
  return rows.find((c) => c.name === name)?.id ?? null;
}

test.describe.configure({ mode: "serial" });

test.describe("a client's own rebook interval", () => {
  let ref: number | null = null;
  let service: string | null = null;
  let clientId: string | null = null;

  test.afterAll(async ({ browser }) => {
    if (ref === null) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, "owner@yipyy.dev");
      // Back to the facility's interval, and reminders back on. Both, in that
      // order, and both with the status checked — a cleanup that fails quietly
      // is worse than none, because the next run inherits it and passes.
      if (service) {
        await page.request.put(`/api/clients/${ref}/rebook-preferences`, {
          data: { service, frequencyDays: null, remindersEnabled: true },
          failOnStatusCode: true,
        });
      }
      await page.request.put(`/api/clients/${ref}/rebook-preferences`, {
        data: { service: null, remindersEnabled: true },
        failOnStatusCode: true,
      });
    } finally {
      await context.close();
    }
  });

  test("an override changes what the facility's lapsed list computes", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    const target = await aLapsedClient(page);
    test.skip(!target, "nobody is lapsed at this facility right now");

    ref = await refFor(page, target.clientName);
    test.skip(ref === null, "could not resolve that client's ref");
    service = target.service;
    clientId = target.clientId;

    const before = await prefsFor(page, ref!);
    const row = before.services.find((s) => s.service === service);
    expect(row, `${service} should be on the client's file`).toBeTruthy();
    expect(row!.source).toBe("default");

    // Half the facility's interval, so the change cannot be mistaken for noise.
    const half = Math.max(1, Math.floor(target.expectedDays / 2));
    const put = await page.request.put(
      `/api/clients/${ref}/rebook-preferences`,
      {
        data: { service, frequencyDays: half, reason: "ZZ probe" },
        failOnStatusCode: false,
      },
    );
    expect(put.status()).toBe(200);

    const after = await prefsFor(page, ref!);
    const updated = after.services.find((s) => s.service === service)!;
    expect(updated.overrideDays).toBe(half);
    expect(updated.effectiveDays).toBe(half);
    expect(updated.source).toBe("override");

    // ── THE PART THAT IS NOT ABOUT THIS SCREEN ───────────────────────────
    //
    // The facility's lapsed list has to use the client's number. If it does
    // not, the override is a row in a table and nothing else.
    const lapsed = (await (
      await page.request.get("/api/rebook/lapsed")
    ).json()) as Lapsed;
    const listed = lapsed.clients.find(
      (c) => c.clientId === target.clientId && c.service === service,
    );
    expect(
      listed,
      "they should still be lapsed on a shorter interval",
    ).toBeTruthy();
    expect(listed!.expectedDays).toBe(half);
    expect(
      listed!.daysOverdue,
      "a shorter interval makes them MORE overdue, not less",
    ).toBeGreaterThan(target.daysOverdue);
  });

  test("the master switch takes them off the list entirely", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");
    test.skip(ref === null, "the first test did not run");

    const off = await page.request.put(
      `/api/clients/${ref}/rebook-preferences`,
      {
        data: { service: null, remindersEnabled: false },
        failOnStatusCode: false,
      },
    );
    expect(off.status()).toBe(200);

    // Gone from EVERY service, not just the one with the override — that is
    // what `service is null` means, and it is the difference between the master
    // switch and a per-service one.
    const lapsed = (await (
      await page.request.get("/api/rebook/lapsed")
    ).json()) as Lapsed;
    expect(
      lapsed.clients.filter((c) => c.clientId === clientId),
      "a client the facility asked not to chase must not be on the list",
    ).toHaveLength(0);
  });

  test("the client file renders what the API returned", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");
    test.skip(ref === null, "the first test did not run");

    // The API assertions above prove the DATA. This proves somebody can see it:
    // the section is far down a very long page, so a render fault here would
    // never surface in a screenshot and did not surface in any other spec.
    await page.goto(`/facility/dashboard/clients/${ref}`);

    const card = page
      .locator("div")
      .filter({ has: page.getByText("Rebook settings", { exact: true }) })
      .last();
    await expect(
      card.getByText("Rebook settings", { exact: true }),
    ).toBeVisible();

    // The switch is the facility's note, and the screen has to say that it is
    // not the customer's unsubscribe — two different facts that look identical
    // from a toggle.
    await expect(
      page.getByText(/does not affect anything they unsubscribed from/),
    ).toBeVisible();

    // And at least one service row, showing where its interval came from.
    await expect(
      page.getByText(/facility default|theirs/).first(),
    ).toBeVisible();
  });

  test("an interval cannot be set for every service at once", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    // The facility's intervals differ per service, so one number across all of
    // them would silently put a daycare client's grooming on the daycare cycle.
    // Refused, rather than stored and quietly wrong.
    const response = await page.request.put(
      `/api/clients/${ref ?? 1}/rebook-preferences`,
      {
        data: { service: null, frequencyDays: 30 },
        failOnStatusCode: false,
      },
    );
    expect(response.status()).toBe(400);
  });
});
