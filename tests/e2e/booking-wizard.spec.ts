import { test, expect, type Locator, type Page } from "@playwright/test";

import {
  bookingListSearch,
  type BookingListParams,
} from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE NEW BOOKING WIZARD, DRIVEN BY STAFF, TO A SAVED BOOKING.
//
// A facility reported bookings "stuck on the evaluations": a dog without a
// passed evaluation could not be booked from the facility side at all — the
// service cards were locked, Next stayed disabled, and there was no way past.
// Staff now book past the rule with a reason, which is saved on the booking;
// customers are unchanged.
//
// Walking every service through the real form found two more ways it could
// not finish, both pinned here:
//   - Boarding: the room cards are room TYPES, and the type's id went out as a
//     room. The database refused every one ("This facility has no room
//     cat-condo."), in a toast that was gone before anyone read it. Choosing
//     the room from a background read that had not arrived then picked a
//     room already taken ("That room is already booked for those dates.") —
//     the walk's own earlier stay is what caught it.
//   - One day of daycare went out with no end ("null value in column
//     end_at").
//
// Each test reads the booking back from the API. Bookings carry MARKER in
// their special requests, and afterAll cancels them — the suite's convention,
// since payments are append-only and none are taken here.
// ============================================================================

const MARKER = "[e2e booking-wizard]";
const ALICE = 15; // Alice Johnson: Daisy (no evaluation), Buddy (passed)
const BOB = 16; // Bob Smith: Max (evaluation expired)

test.use({ actionTimeout: 20_000 });

interface BookingPayload {
  id: number;
  service?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  unitAssignment?: string;
  specialRequests?: string;
  evaluationOverride?: {
    reason: string;
    pets: Array<{ id: number; name: string; reason: string }>;
  };
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Next month's first Tuesday and the Wednesday after it, as day numbers. */
function nextMonthTuesday(): [number, number] {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 1, d);
    if (day.getDay() === 2) return [d, d + 1];
  }
  return [2, 3];
}

/**
 * Alice's bookings for TODAY only. Her list is 1,000+ rows of earlier runs,
 * and even a six-week window of it answered 500 (statement timeout), so this
 * file never reads her list for anything wider than one day.
 */
function aliceToday(): BookingListParams {
  const now = iso(new Date());
  return { clientRef: ALICE, from: now, to: now };
}

/** Every booking this run made, cancelled by ref in afterAll. */
const made: number[] = [];

async function bookings(page: Page, params: BookingListParams) {
  const res = await page.request.get(
    `/api/bookings${bookingListSearch(params)}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as BookingPayload[];
}

async function byRef(page: Page, ref: number) {
  return (await bookings(page, { ref })).find((b) => b.id === ref);
}

async function openWizard(page: Page, clientRef: number) {
  await page.goto(`/facility/dashboard/clients/${clientRef}`);
  await page
    .getByRole("button", { name: /^book$/i })
    .first()
    .click({ timeout: 90_000 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function next(dialog: Locator) {
  await dialog.getByRole("button", { name: /^next$/i }).click();
}

/**
 * Next until Create shows, then create with the marker, and answer the ref the
 * wizard announced. A refusal fails here with its own words — the toast is
 * read as it appears, not after it has gone.
 */
async function create(page: Page, dialog: Locator, tag: string) {
  const createButton = dialog.getByRole("button", {
    name: /^create booking$/i,
  });
  for (let i = 0; i < 8 && !(await createButton.isVisible()); i += 1) {
    await next(dialog);
  }
  await dialog.getByLabel(/special requests/i).fill(`${MARKER} ${tag}`);
  await createButton.click();
  const toast = page.locator("[data-sonner-toast]").first();
  await expect(toast).toBeVisible({ timeout: 45_000 });
  const said = (await toast.innerText()).replace(/\s+/g, " ");
  const ref = Number(/#(\d+)/.exec(said)?.[1]);
  expect(ref, `the wizard said: ${said}`).toBeGreaterThan(0);
  made.push(ref);
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  return ref;
}

async function cancelMade(page: Page) {
  const refused: string[] = [];
  for (const ref of made) {
    const res = await page.request.patch(`/api/bookings/${ref}`, {
      data: { status: "cancelled" },
    });
    if (!res.ok()) refused.push(`${ref}: ${await res.text()}`);
  }
  expect(refused, "cleanup left bookings behind").toEqual([]);
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await cancelMade(page);
  } finally {
    await page.close();
  }
});

test.describe("staff finish the New Booking wizard for every service", () => {
  test.setTimeout(4 * 60 * 1000);

  test("one day of daycare for a dog with no evaluation, past the rule", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const evaluationsBefore = (await bookings(page, aliceToday())).filter(
      (b) => b.service === "evaluation",
    ).length;

    const dialog = await openWizard(page, ALICE);
    await dialog.getByText("Daisy", { exact: true }).first().click();
    await next(dialog);
    await dialog
      .getByText(/daycare/i)
      .first()
      .click();

    // Staff are not locked out: the card opens, and the choice is theirs.
    await expect(
      dialog.getByRole("button", { name: /book an evaluation instead/i }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: /^next$/i }),
    ).toBeDisabled();
    await dialog.getByRole("switch").last().click();
    await dialog.getByLabel(/why is this booking/i).fill(`${MARKER} regular`);
    await next(dialog);

    await dialog
      .locator("button:has(svg.lucide-chevron-right)")
      .first()
      .click();
    const [tuesday] = nextMonthTuesday();
    await dialog
      .getByRole("button", { name: String(tuesday), exact: true })
      .click();
    await next(dialog);
    // The play area: Next waits for one, and the cards arrive with the day's
    // capacity, so this waits for them rather than glancing.
    await dialog
      .locator("div.group.bg-card.rounded-2xl.cursor-pointer")
      .first()
      .click();

    const ref = await create(page, dialog, "daycare");
    const saved = await byRef(page, ref);
    expect(saved?.service).toBe("daycare");
    expect(saved?.startDate).toBe(saved?.endDate);
    expect(saved?.evaluationOverride?.reason).toContain(MARKER);
    expect(saved?.evaluationOverride?.pets).toEqual([
      expect.objectContaining({ name: "Daisy", reason: "missing" }),
    ]);

    // Booking past the rule does not quietly book an evaluation as well —
    // the old code booked one for today at 9:00.
    const evaluationsAfter = (await bookings(page, aliceToday())).filter(
      (b) => b.service === "evaluation",
    ).length;
    expect(evaluationsAfter).toBe(evaluationsBefore);
  });

  test("grooming for a dog whose evaluation expired, past the rule", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const dialog = await openWizard(page, BOB);
    await dialog.getByText("Max", { exact: true }).first().click();
    await next(dialog);
    await dialog.getByText(/groom/i).first().click();
    await dialog.getByRole("switch").last().click();
    await dialog.getByLabel(/why is this booking/i).fill(`${MARKER} expired`);
    await next(dialog);
    await dialog.getByText("Full Groom", { exact: true }).first().click();
    await next(dialog); // add-ons
    await next(dialog); // schedule
    await dialog.getByRole("button", { name: /next available/i }).click();

    const ref = await create(page, dialog, "grooming");
    const saved = await byRef(page, ref);
    expect(saved?.service).toBe("grooming");
    expect(saved?.evaluationOverride?.pets).toEqual([
      expect.objectContaining({ name: "Max", reason: "expired" }),
    ]);
  });

  test("boarding in a room type is held by a real room of that type", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const dialog = await openWizard(page, ALICE);
    await dialog.getByText("Buddy", { exact: true }).first().click();
    await next(dialog);
    await dialog
      .getByText(/boarding/i)
      .first()
      .click();
    await next(dialog);
    await dialog
      .locator("button:has(svg.lucide-chevron-right)")
      .first()
      .click();
    const [tuesday, wednesday] = nextMonthTuesday();
    await dialog
      .getByRole("button", { name: String(tuesday), exact: true })
      .click();
    await dialog
      .getByRole("button", { name: String(wednesday), exact: true })
      .click();
    await next(dialog);

    // One click on the card places the only dog — no chip to find first.
    await dialog.getByText("Condominium", { exact: true }).first().click();
    await expect(dialog.getByText(/Buddy\s*·\s*Condominium/)).toBeVisible();

    const ref = await create(page, dialog, "boarding");
    const saved = await byRef(page, ref);
    expect(saved?.service).toBe("boarding");
    expect(saved?.unitAssignment).toBeTruthy();
    expect(saved?.unitAssignment).not.toBe("cat-condo");
  });
});
