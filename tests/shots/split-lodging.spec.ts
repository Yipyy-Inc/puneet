import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH A GUEST WHO MOVES KENNELS PART-WAY, WHERE STAFF SEE AND MAKE IT.
//
// WRITES: one boarding booking for Alice's Buddy, placed in a free kennel and
// moved to another from today. Its stays are cleared and it is cancelled in a
// `finally`. One Postgres, shared with production.
//
// WHAT TO LOOK FOR IN THE FILES:
//   · kennels-card-*: two rows, each a kennel and its nights in long form,
//     "Move Buddy" as an outline button; nothing clipped at 599 in French
//   · move-dialog-*: two labelled fields, the night list in long form, the
//     primary button naming the pet; at 599 the fields stack full width
//
//   E2E_BASE_URL=http://localhost:3111 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light split-lodging
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots";
const MARKER = "[shot split-lodging]";

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

test("the kennels card and the move dialog", async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await signIn(page, ACCOUNTS.owner);

  const window = { startDate: day(-1), endDate: day(3) };
  const rooms = await page.request.get(
    `/api/boarding/rooms?from=${window.startDate}&to=${window.endDate}`,
  );
  const board = (await rooms.json()) as {
    rooms: { id: string; active: boolean }[];
    occupied: { roomId: string }[];
  };
  const free = board.rooms.filter(
    (r) =>
      r.active &&
      !r.id.includes("e2e") &&
      !board.occupied.some((o) => o.roomId === r.id),
  );
  expect(free.length).toBeGreaterThanOrEqual(2);

  const made = await page.request.post("/api/bookings", {
    data: {
      clientId: 15,
      petId: 1,
      facilityId: 11,
      service: "boarding",
      ...window,
      checkInTime: "14:00",
      checkOutTime: "11:00",
      status: "checked_in",
      basePrice: 200,
      discount: 0,
      totalCost: 200,
      specialRequests: MARKER,
      unitAssignment: free[0]!.id,
    },
  });
  expect(made.status(), await made.text()).toBe(201);
  const ref = ((await made.json()) as { id: number }).id;

  try {
    const moved = await page.request.post("/api/boarding/stays/move", {
      data: { bookingRef: ref, from: day(0), roomId: free[1]!.id },
    });
    expect(moved.ok(), await moved.text()).toBe(true);

    for (const lang of ["en", "fr"] as const) {
      if (lang === "fr") await french(page);
      for (const width of [1440, 599]) {
        await page.setViewportSize({ width, height: 1400 });
        await page.goto(`/facility/dashboard/clients/15/bookings/${ref}`);
        const card = page
          .locator('[data-slot="card"]')
          .filter({ has: page.getByText(/^(kennels|chenils)$/i) });
        await expect(card.locator("li")).toHaveCount(2, { timeout: 60_000 });
        await card.screenshot({
          path: `${OUT}/kennels-card-${lang}-${width}.png`,
        });

        await card.getByRole("button", { name: /^(move|déplacer) /i }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await dialog.screenshot({
          path: `${OUT}/move-dialog-${lang}-${width}.png`,
        });
        await page.keyboard.press("Escape");
      }
    }
  } finally {
    await page.request.put("/api/boarding/stays", {
      data: { bookingRef: ref, roomId: null },
    });
    await page.request.patch(`/api/bookings/${ref}`, {
      data: { status: "cancelled" },
    });
  }
});
