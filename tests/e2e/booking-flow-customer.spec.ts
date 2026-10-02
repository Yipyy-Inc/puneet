import { test, expect, type Locator } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked, cancelBookingsMarked } from "./_sweep";
import { answerCareSteps, pickRoomType } from "./_wizard";

// ============================================================================
// A PET OWNER BOOKS THROUGH THE CLIENT'S FLOW (2026-10-02).
//
// The booking form became the client's own flow, in both portals: Who's
// coming → Service → Details (Schedule, Room type, Add-ons, the care steps) →
// Confirm. The modal was CUJ-1's whole journey and had no spec of its own.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// C1  A customer books boarding start to finish and the facility receives it:
//     the room type they chose, their note, and a request or a booking,
//     whichever the facility's approval settings make it.
// C2  The drop-off and pick-up times are the facility's, and every day ends
//     in "Custom time" — the client's words: "make an option to select
//     custom time as well".
// C3  A customer never sees how many rooms are left — "only the facility
//     side needs to see how many rooms are left". Staff see the count on the
//     same card.
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// Nothing: the one booking it makes carries MARKER and is cancelled after —
// and before, for a run that died between making it and cancelling it.
// ============================================================================

const MARKER = "[e2e booking-flow-customer]";
const ALICE = 15; // ACCOUNTS.customer's client record: Buddy and Daisy

test.use({ actionTimeout: 20_000 });
test.describe.configure({ mode: "serial" });

/** The first Tuesday of the month after next, and the Thursday after it. */
function tuesdayToThursday(): [number, number] {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 2, d);
    if (day.getDay() === 2) return [d, d + 2];
  }
  return [2, 4];
}

/** Two months on: clear of the other specs' stays next month. */
async function pickStay(wizard: Locator) {
  const nextMonth = wizard.getByRole("button", { name: /^next month$/i });
  await nextMonth.click();
  await nextMonth.click();
  const [tuesday, thursday] = tuesdayToThursday();
  await wizard
    .getByRole("button", { name: String(tuesday), exact: true })
    .click();
  await wizard
    .getByRole("button", { name: String(thursday), exact: true })
    .click();
}

/** "8 of 14 free", "Last one left" — the counts staff read on a room card. */
const ROOM_COUNT = /\d+ of \d+ free|last one left/i;

test.beforeAll(async ({ browser }) => {
  await cancelBookingsMarked(browser, MARKER, "before");
});

test.afterAll(async ({ browser }) => {
  await cancelBookingsMarked(browser, MARKER, "after");
});

test("C1–C3 a customer books boarding, with the facility's times and no room counts", async ({
  page,
}) => {
  test.setTimeout(4 * 60 * 1000);
  await signIn(page, ACCOUNTS.customer);
  await page.goto("/customer/bookings/new");
  const wizard = page.getByRole("dialog");
  const buddy = wizard.getByText("Buddy", { exact: true }).first();
  await expect(buddy).toBeVisible({ timeout: 60_000 });
  await buddy.click();
  await wizard.getByRole("button", { name: /^next$/i }).click();
  await wizard
    .getByText(/boarding/i)
    .first()
    .click();
  await wizard.getByRole("button", { name: /^next$/i }).click();

  // C2 — the stay, then the facility's times for each end of it.
  await pickStay(wizard);
  await expect(wizard.getByText(/^drop-off · /i).first()).toBeVisible();
  await expect(wizard.getByText(/^pick-up · /i).first()).toBeVisible();
  await expect(wizard.getByText(/^custom time$/i).first()).toBeVisible();
  await wizard.getByRole("button", { name: /^next$/i }).click();

  // C3 — the room types, with no count anywhere on them.
  await expect(
    wizard.getByRole("heading", { name: /^choose a room$/i }),
  ).toBeVisible();
  await expect(
    wizard.locator("button[aria-pressed]").filter({ hasText: "Condominium" }),
  ).toBeVisible();
  await expect(wizard.getByText(ROOM_COUNT)).toHaveCount(0);
  await pickRoomType(wizard, "Condominium");

  // Add-ons and the care steps, as a person with nothing to add.
  const submit = wizard.getByRole("button", {
    name: /^(request booking|book & pay deposit|book appointment)$/i,
  });
  for (let i = 0; i < 8 && !(await submit.isVisible()); i += 1) {
    await answerCareSteps(wizard);
    await wizard.getByRole("button", { name: /^next$/i }).click();
  }
  await wizard.getByLabel(/special requests/i).fill(`${MARKER} stay`);
  await submit.click();
  await expect(
    wizard.getByRole("heading", {
      name: /^(request sent to the team|you’re booked!)$/i,
    }),
  ).toBeVisible({ timeout: 60_000 });

  // C1 — what the facility received.
  const marked = await bookingsMarked(MARKER);
  expect(marked, "one booking carries the note").toHaveLength(1);
  const [made] = marked;
  expect(made.service).toBe("boarding");
  expect(["request_submitted", "confirmed"]).toContain(made.status);

  const menu = await page.request.get("/api/customer/boarding-services");
  expect(menu.ok(), await menu.text()).toBe(true);
  const condo = ((await menu.json()) as { id: string; name: string }[]).find(
    (s) => s.name === "Condominium",
  );
  expect(condo, "Condominium is on the customer's menu").toBeTruthy();

  const owner = await page.context().browser()!.newPage();
  try {
    await signIn(owner, ACCOUNTS.owner);
    const res = await owner.request.get(`/api/bookings?ref=${made.ref}`);
    expect(res.ok(), await res.text()).toBe(true);
    const [saved] = (await res.json()) as Array<{
      id: number;
      clientId: number;
      boardingServiceId?: string;
      specialRequests?: string;
    }>;
    expect(saved?.clientId).toBe(ALICE);
    expect(saved?.boardingServiceId).toBe(condo!.id);
    expect(saved?.specialRequests).toContain(MARKER);
  } finally {
    await owner.close();
  }
});

test("C3 staff see the count on the same card", async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await page.goto(`/facility/dashboard/clients/${ALICE}`);
  await page
    .getByRole("button", { name: /^book$/i })
    .first()
    .click({ timeout: 90_000 });
  const wizard = page.getByRole("dialog");
  await wizard.getByText("Buddy", { exact: true }).first().click();
  await wizard.getByRole("button", { name: /^next$/i }).click();
  await wizard
    .getByText(/boarding/i)
    .first()
    .click();
  await wizard.getByRole("button", { name: /^next$/i }).click();
  await pickStay(wizard);
  await wizard.getByRole("button", { name: /^next$/i }).click();
  await expect(
    wizard.locator("button[aria-pressed]").filter({ hasText: "Condominium" }),
  ).toContainText(ROOM_COUNT);
});
