import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The booking page's remaining actions do what they say.
//
// ── WHAT THIS PINS (2026-09-12) ─────────────────────────────────────────────
//
//   1. The status rules are the FACILITY'S, stored in `facility_settings`
//      (`booking_status_rules`). They were written into fixture facility 11 in
//      the browser — gone on reload — and every facility's booking page read
//      that fixture.
//   2. "Email invoice" / "SMS link" ask the server to send the pay link, and
//      the server refuses what it cannot do rather than claiming it: a bad
//      channel is a 422, a booking that owes nothing is a 409. (The success
//      path is not driven here: locally the sender really sends.)
//   3. "Mark as ready" writes the `ready` status. It ran the check-in rule on
//      a booking that was already checked in, changed nothing, and toasted.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
//
// The rules are put back as they were in afterAll; bookings carry MARKER and
// are cancelled.
// ============================================================================

const MARKER = "[e2e booking-actions]";
const SETTINGS = "/api/facility/settings";
const BOB = { client: 16, pet: 3 };

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
}

let originalRules: unknown = null;
let rulesWereConfigured = false;

async function readRules(page: Page) {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as Record<
    string,
    { value: unknown; configured: boolean } | undefined
  >;
  return body.booking_status_rules;
}

async function book(page: Page, daysAhead: number, totalCost: number) {
  const day = new Date(Date.now() + daysAhead * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: BOB.client,
      petId: BOB.pet,
      facilityId: 0,
      service: "daycare",
      startDate: day,
      endDate: day,
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "confirmed",
      basePrice: totalCost,
      discount: 0,
      totalCost,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as BookingPayload;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    if (rulesWereConfigured && originalRules) {
      await page.request.patch(SETTINGS, {
        data: { domain: "booking_status_rules", value: originalRules },
      });
    }
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    for (const b of all) {
      if (!b.specialRequests?.includes(MARKER) || b.status === "cancelled") {
        continue;
      }
      await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
    }
  } finally {
    await page.close();
  }
});

test.describe("the booking page's actions do what they say", () => {
  test("the status rules are stored for the facility, and read back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = await readRules(page);
    expect(before).toBeDefined();
    rulesWereConfigured = Boolean(before?.configured);
    originalRules = before?.value ?? null;

    const value = {
      customStatuses: [],
      autoTransitions: {
        onDepositPaid: "confirmed",
        onCheckIn: "in_progress",
        onCheckout: "completed",
        onPaymentComplete: "none",
      },
      iftttTransitionRules: [],
    };
    const saved = await page.request.patch(SETTINGS, {
      data: { domain: "booking_status_rules", value },
    });
    expect(saved.ok(), await saved.text()).toBe(true);

    const after = await readRules(page);
    expect(after?.configured).toBe(true);
    expect(after?.value).toEqual(value);

    // A rule with an action the booking page does not know is refused, not
    // stored and silently ignored.
    const bad = await page.request.patch(SETTINGS, {
      data: {
        domain: "booking_status_rules",
        value: {
          ...value,
          iftttTransitionRules: [
            {
              id: "x",
              service: "any",
              action: "onSunrise",
              currentStatus: "any",
              targetStatus: "confirmed",
              enabled: true,
            },
          ],
        },
      },
    });
    expect(bad.ok()).toBe(false);

    // Back to what it was — or to the defaults, if nobody had set it.
    await page.request.patch(SETTINGS, {
      data: {
        domain: "booking_status_rules",
        value: rulesWereConfigured ? originalRules : before?.value,
      },
    });
  });

  test("the pay link is refused when it cannot be sent, not claimed", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const owing = await book(page, 430, 64);
    const badChannel = await page.request.post(
      `/api/bookings/${owing.id}/pay-link`,
      { data: { channel: "fax" } },
    );
    expect(badChannel.status()).toBe(422);

    const free = await book(page, 431, 0);
    const nothingOwed = await page.request.post(
      `/api/bookings/${free.id}/pay-link`,
      { data: { channel: "email" } },
    );
    expect(nothingOwed.status()).toBe(409);
  });

  test("a message to a client is refused when it cannot be sent", async ({
    page,
  }) => {
    // The calendar drawer's "Send reminder SMS" and composer toasted "SMS
    // sent" over an in-memory array. They go through this route now; its
    // refusals are what can be pinned without sending a real message.
    await signIn(page, ACCOUNTS.owner);
    const badChannel = await page.request.post(
      `/api/clients/${BOB.client}/message`,
      { data: { channel: "pigeon", body: "Hello" } },
    );
    expect(badChannel.status()).toBe(422);
    const empty = await page.request.post(
      `/api/clients/${BOB.client}/message`,
      { data: { channel: "sms", body: "   " } },
    );
    expect(empty.status()).toBe(422);
    const nobody = await page.request.post("/api/clients/999999999/message", {
      data: { channel: "sms", body: "Hello" },
    });
    expect(nobody.status()).toBe(404);
  });

  test("Mark as ready writes the ready status", async ({ page }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const created = await book(page, 432, 64);
    const checkedIn = await page.request.patch(`/api/bookings/${created.id}`, {
      data: { status: "checked_in" },
    });
    expect(checkedIn.ok(), await checkedIn.text()).toBe(true);

    await page.goto(
      `/facility/dashboard/clients/${BOB.client}/bookings/${created.id}`,
    );
    await page
      .getByRole("button", { name: /^more$/i })
      .first()
      .click({ timeout: 30_000 });
    await page.getByRole("menuitem", { name: /mark as ready/i }).click();

    // Unlogged care puts a gate in front of it; the gate's own "continue" is
    // the staff member saying they know.
    const gate = page.getByRole("alertdialog");
    if (await gate.isVisible().catch(() => false)) {
      await gate.getByRole("button").last().click();
    }

    await expect
      .poll(
        async () => {
          const res = await page.request.get("/api/bookings");
          const all = (await res.json()) as BookingPayload[];
          return all.find((b) => b.id === created.id)?.status;
        },
        { timeout: 20_000 },
      )
      .toBe("ready");
  });
});
