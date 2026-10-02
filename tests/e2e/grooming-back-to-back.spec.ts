import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked, cancelBookingsMarked } from "./_sweep";
import { closeDoneScreen, skipEvaluation, toConfirm } from "./_wizard";

// ============================================================================
// TWO DOGS ARE GROOMED BACK TO BACK (the client's flow, 2026-10-02).
//
// Grooming in the booking wizard is Package → Add-ons → Groomer & time, a pet
// at a time: each dog gets its own groom, priced and timed for its size and
// coat, and the dogs are booked one after the other with the same groomer —
// "Bubu and Mango are groomed back-to-back · 3h 15m total".
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// G1  Each dog chooses its own package; the scheduler says they go back to
//     back, and the earliest opening fits both.
// G2  The save is one booking per dog, on the same day, the second starting
//     the minute the first ends.
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// Nothing: both bookings carry MARKER and are cancelled after (and before).
// ============================================================================

const MARKER = "[e2e grooming-back-to-back]";
const ALICE = 15; // Buddy (25 lb, medium coat) and Daisy (6 lb, long coat)

test.use({ actionTimeout: 20_000 });
test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await cancelBookingsMarked(browser, MARKER, "before");
});

test.afterAll(async ({ browser }) => {
  await cancelBookingsMarked(browser, MARKER, "after");
});

test("G1–G2 Buddy and Daisy, one groom each, one after the other", async ({
  page,
}) => {
  test.setTimeout(4 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await page.goto(`/facility/dashboard/clients/${ALICE}`);
  await page
    .getByRole("button", { name: /^book$/i })
    .first()
    .click({ timeout: 90_000 });
  const dialog = page.getByRole("dialog");
  const next = dialog.getByRole("button", { name: /^next$/i });

  await dialog.getByText("Buddy", { exact: true }).first().click();
  await dialog.getByText("Daisy", { exact: true }).first().click();
  await next.click();
  await dialog.getByText(/groom/i).first().click();
  await next.click();

  // G1 — a package for each dog, chosen on that dog's tab.
  const pets = dialog.getByRole("radiogroup", { name: "Pets" });
  for (const name of ["Buddy", "Daisy"]) {
    await pets.locator("label").filter({ hasText: name }).click();
    await dialog
      .locator("button[aria-pressed]")
      .filter({ hasText: "Full Groom" })
      .click();
  }
  await next.click(); // add-ons
  await next.click(); // groomer & time
  await expect(dialog.getByText(/groomed back-to-back/i)).toBeVisible();
  await dialog.getByRole("button", { name: /^take this slot$/i }).click();

  await toConfirm(dialog);
  await skipEvaluation(dialog, `${MARKER} groom`);
  await dialog.getByLabel(/special requests/i).fill(`${MARKER} groom`);
  await dialog
    .getByRole("button", { name: /^create (booking|as pending)$/i })
    .click();
  await closeDoneScreen(dialog);

  // G2 — two bookings, the second where the first ends.
  const marked = await bookingsMarked(MARKER);
  expect(marked, "one booking per dog").toHaveLength(2);
  const res = await page.request.get(
    `/api/bookings?refs=${marked.map((b) => b.ref).join(",")}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const saved = (
    (await res.json()) as Array<{
      id: number;
      service: string;
      petId: number | number[];
      startDate: string;
      checkInTime: string;
      checkOutTime: string;
    }>
  ).sort((a, b) => a.checkInTime.localeCompare(b.checkInTime));
  expect(saved).toHaveLength(2);
  expect(saved.every((b) => b.service === "grooming")).toBe(true);
  expect(saved[0]!.startDate).toBe(saved[1]!.startDate);
  expect(saved[1]!.checkInTime).toBe(saved[0]!.checkOutTime);
});
