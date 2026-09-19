import { test, expect } from "@playwright/test";

import { formatBookingRef } from "@/lib/booking-id";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// YIPYY'S OWN TEAM CAN FIND ANY FACILITY'S BOOKING — AND ONLY THEY CAN.
//
// A facility calls about "booking #10896" and the admin portal had nowhere to
// type it. /api/admin/bookings finds it by the displayed number or the bare
// ref, with its facility named; /api/admin/bookings/[ref] reads it in full.
// Both are for platform members only: a facility owner and a customer are
// refused, whatever booking they name.
//
// One booking for Bob Smith (client 16), made by the owner and cancelled in
// afterAll.
// ============================================================================

const MARKER = "[e2e admin-bookings]";
let ref = 0;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const day = new Date(Date.now() + 470 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: 16,
        petId: 3,
        facilityId: 0,
        service: "daycare",
        startDate: day,
        endDate: day,
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 55,
        discount: 0,
        totalCost: 55,
        specialRequests: MARKER,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    ref = ((await res.json()) as { id: number }).id;
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  if (!ref) return;
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.patch(`/api/bookings/${ref}`, {
      data: { status: "cancelled" },
    });
    expect(res.ok(), await res.text()).toBe(true);
  } finally {
    await page.close();
  }
});

test("a platform admin finds a booking by its displayed number and reads it", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.admin);

  const lookup = await page.request.get(
    `/api/admin/bookings?q=${encodeURIComponent(formatBookingRef(ref))}`,
  );
  expect(lookup.status(), await lookup.text()).toBe(200);
  const matches = (await lookup.json()) as Array<{
    ref: number;
    facilityName: string;
  }>;
  const mine = matches.find((m) => m.ref === ref);
  expect(mine, "the displayed number finds the booking").toBeTruthy();
  expect(mine?.facilityName).toBeTruthy();

  const detail = await page.request.get(`/api/admin/bookings/${ref}`);
  expect(detail.status(), await detail.text()).toBe(200);
  expect(await detail.json()).toMatchObject({
    ref,
    status: "confirmed",
    amountDue: 55,
    specialRequests: MARKER,
  });

  const missing = await page.request.get(`/api/admin/bookings/999999999999`);
  expect(missing.status()).toBe(404);

  // Through the screen: search, then open it.
  await page.goto(
    `/dashboard/bookings?q=${encodeURIComponent(formatBookingRef(ref))}`,
  );
  await page
    .getByRole("link", { name: new RegExp(formatBookingRef(ref)) })
    .first()
    .click({ timeout: 60_000 });
  await expect(
    page.getByRole("heading", { name: /price and payment/i }),
  ).toBeVisible({ timeout: 60_000 });
});

test("a facility owner and a customer are refused", async ({ browser }) => {
  for (const account of [ACCOUNTS.owner, ACCOUNTS.customer]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, account);
      const lookup = await page.request.get(`/api/admin/bookings?q=${ref}`);
      expect(lookup.status(), `${account} lookup`).toBe(403);
      const detail = await page.request.get(`/api/admin/bookings/${ref}`);
      expect(detail.status(), `${account} detail`).toBe(403);
    } finally {
      await context.close();
    }
  }
});

test("signed out gets 401", async ({ request }) => {
  const res = await request.get(`/api/admin/bookings?q=1`, {
    failOnStatusCode: false,
  });
  expect(res.status()).toBe(401);
});

test("a facility's bookings tab lists its own, paged, and is refused to others", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.admin);
  const detail = (await (
    await page.request.get(`/api/admin/bookings/${ref}`)
  ).json()) as { facility: { id: string } };
  const facilityId = detail.facility.id;

  const listed = await page.request.get(
    `/api/facilities/${facilityId}/bookings?q=${ref}`,
  );
  expect(listed.status(), await listed.text()).toBe(200);
  const body = (await listed.json()) as {
    rows: Array<{ ref: number; clientName: string | null }>;
    total: number;
    pageSize: number;
    timezone: string;
  };
  expect(body.rows.map((r) => r.ref)).toEqual([ref]);
  expect(body.rows[0]?.clientName).toBeTruthy();
  expect(body.timezone).toBeTruthy();

  // Paged: page 1 of everything the facility has, at most a page's worth.
  const firstPage = (await (
    await page.request.get(`/api/facilities/${facilityId}/bookings`)
  ).json()) as { rows: unknown[]; total: number; pageSize: number };
  expect(firstPage.rows.length).toBeLessThanOrEqual(firstPage.pageSize);
  expect(firstPage.total).toBeGreaterThanOrEqual(firstPage.rows.length);

  await page.goto(`/dashboard/facilities/${facilityId}?tab=bookings`);
  await page
    .getByPlaceholder(/booking number, client or pet/i)
    .fill(String(ref));
  await page.getByRole("button", { name: /^search bookings$/i }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(formatBookingRef(ref)) }).first(),
  ).toBeVisible({ timeout: 60_000 });

  // The facility's own owner reads their bookings in their own portal, never
  // through the platform's route.
  const owner = await page.context().browser()!.newContext();
  const ownerPage = await owner.newPage();
  try {
    await signIn(ownerPage, ACCOUNTS.owner);
    const refused = await ownerPage.request.get(
      `/api/facilities/${facilityId}/bookings`,
    );
    expect(refused.status()).toBe(403);
  } finally {
    await owner.close();
  }
});
