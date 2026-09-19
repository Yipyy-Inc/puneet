import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A BOOKING'S HISTORY IS WHAT HAPPENED TO IT.
//
// Every booking page showed six invented "Change History" entries and nothing
// recorded a real one. The database records every write now
// (20260919142555_a_bookings_changes_record_themselves) and the booking page
// reads it back. This makes a booking, changes its status and its price, and
// reads the history back from the API and on the page.
//
// One booking for Bob Smith (client 16, Max), far ahead; cancelled in afterAll.
// ============================================================================

const MARKER = "[e2e booking-history]";
const BOB = { client: 16, pet: 3 };
let made: number | null = null;

interface HistoryEntry {
  who: string;
  category: string;
  changes: Array<{ field: string; from: unknown; to: unknown }>;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  if (made === null) return;
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.patch(`/api/bookings/${made}`, {
      data: { status: "cancelled" },
    });
    expect(res.ok(), await res.text()).toBe(true);
  } finally {
    await page.close();
  }
});

test("a booking's status and price changes are its history", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const day = new Date(Date.now() + 480 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const created = await page.request.post("/api/bookings", {
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
      basePrice: 40,
      discount: 0,
      totalCost: 40,
      specialRequests: MARKER,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  made = ((await created.json()) as { id: number }).id;

  const priced = await page.request.patch(`/api/bookings/${made}`, {
    data: { basePrice: 40, discount: 5, totalCost: 35 },
  });
  expect(priced.ok(), await priced.text()).toBe(true);
  const waitlisted = await page.request.patch(`/api/bookings/${made}`, {
    data: { status: "no_show" },
  });
  expect(waitlisted.ok(), await waitlisted.text()).toBe(true);

  const res = await page.request.get(`/api/bookings/${made}/history`);
  expect(res.ok(), await res.text()).toBe(true);
  const history = (await res.json()) as HistoryEntry[];
  const fields = history.flatMap((e) => e.changes.map((c) => c.field));
  expect(fields).toContain("status");
  expect(fields).toContain("total");
  expect(
    history.some((e) =>
      e.changes.some((c) => c.field === "status" && c.to === "no_show"),
    ),
  ).toBe(true);
  // Recorded under the person who made it.
  expect(history.every((e) => e.who && e.who !== "System")).toBe(true);

  await page.goto(`/facility/dashboard/clients/${BOB.client}/bookings/${made}`);
  const card = page.locator("#history");
  await expect(card).toBeVisible({ timeout: 60_000 });
  await expect(card).toContainText(/Status: Confirmed → No-show/);
  await expect(card).toContainText(/Total: \$40\.00 → \$35\.00/);
  await expect(card).toContainText(/Created as Confirmed/);
});
