import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH "FIND A KENNEL" — the booking page's kennel card and the check-in
// board's guest card, for a confirmed stay that has no kennel (2026-09-26).
//
// The booking page said "No kennel yet" and stopped; the check-in board's
// "Assign a kennel first" linked to a kennel board that never shows a guest
// with none. Both offer to find one now.
//
// It WRITES one booking — a confirmed stay from today, no kennel — because
// that is the state being photographed, and cancels it in afterAll. Nothing
// is clicked: the button's work is covered by booking-requests.spec.ts, K3.
//
//   bunx playwright test --config=playwright.shots.config.ts find-a-kennel --project light
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const MARKER = "[shots find-a-kennel]";
const ALICE = { client: 15, pet: 1 }; // customer@yipyy.dev, Buddy
const FIND = /find a kennel|trouver un chenil/i;

let ref = 0;

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function french(page: Page) {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

test.afterAll(async ({ browser }) => {
  if (!ref) return;
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.patch(`/api/bookings/${ref}`, {
      data: { status: "cancelled" },
    });
    expect(res.ok(), `cleanup left booking ${ref}: ${await res.text()}`).toBe(
      true,
    );
  } finally {
    await page.close();
  }
});

test("find a kennel, on the booking page and the check-in board", async ({
  page,
}) => {
  test.slow();
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);

  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE.client,
      petId: ALICE.pet,
      facilityId: 0,
      service: "boarding",
      startDate: day(0),
      endDate: day(2),
      checkInTime: "14:00",
      checkOutTime: "11:00",
      status: "confirmed",
      basePrice: 90,
      discount: 0,
      totalCost: 90,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  ref = ((await res.json()) as { id: number }).id;

  for (const lang of ["en", "fr"] as const) {
    if (lang === "fr") await french(page);

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`/facility/dashboard/bookings/${ref}`);
    const button = page.getByRole("button", { name: FIND }).first();
    await expect(button).toBeVisible({ timeout: 60_000 });
    const card = page.locator('[data-slot="card"]').filter({ has: button });
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await card.screenshot({ path: `${OUT}/find-kennel-card-${lang}-1440.png` });
    await page.setViewportSize({ width: 599, height: 1000 });
    await page.waitForTimeout(600);
    await card.scrollIntoViewIfNeeded();
    await card.screenshot({ path: `${OUT}/find-kennel-card-${lang}-599.png` });

    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/facility/dashboard/services/boarding/check-in");
    const guest = page
      .locator("[data-status]")
      .filter({ hasText: `#${ref}` })
      .first();
    await expect(guest.getByRole("button", { name: FIND })).toBeVisible({
      timeout: 60_000,
    });
    await guest.screenshot({
      path: `${OUT}/find-kennel-checkin-${lang}-1440.png`,
    });
    await page.setViewportSize({ width: 599, height: 1000 });
    await page.waitForTimeout(600);
    await guest.scrollIntoViewIfNeeded();
    await guest.screenshot({
      path: `${OUT}/find-kennel-checkin-${lang}-599.png`,
    });
  }
});
