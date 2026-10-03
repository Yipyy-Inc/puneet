import { test, expect, type Locator, type Page } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";
import { answerCareSteps, expectFrameSteady, pickRoomType } from "./_wizard";
import { bookingsMarked, cancelBookingsMarked } from "./_sweep";

// ============================================================================
// THE BOOKING FORM'S FEEDING STEP, END TO END (2026-10-01).
//
// The client sent the page they wanted: a plan per pet — breakfast and dinner,
// every day, a cup of the owner's own kibble in labelled bags, and the
// facility's house kibble at dinner at $3.50 a meal — with the stay's meals
// and the packing list beside it. And the facility's own page under Settings
// › Services › Feeding & medications that decides what it shows and what
// house food the facility provides.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// S1  The facility's house food is set on its Feeding & medications page, and
//     a customer's booking form reads it.
// S2  Staff walk the step: meal times, the owner's food and how it is packed,
//     a house food served at dinner only, how the pet eats, allergies, the
//     stay panel. The booking keeps all of it; the house food is ONE line on
//     its bill, not money in its price; the pet's profile keeps the plan, and
//     the next booking starts with it.
// S3  A staff edit moves the house-food line it changed, and a line removed
//     at the till is not brought back by a later edit.
// S4  A customer's request: the house food is billed, the customer cannot
//     waive it, and the request still confirms itself at the service's price.
// S5  House food included in the price is no line at all.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// The settings it touches are put back as they were, Buddy's saved feeding
// plan too, and every booking it made is cancelled — by marker as well as by
// list, in `finally`, so a run that died part-way is healed by the next one.
// ============================================================================

const MARKER = "[e2e booking-feeding]";
const ALICE = 15;
const BUDDY = 1;
/** What the e2e facility's daycare rate card charges for a full day. */
const FULL_DAY = 38;
const KIBBLE = "hf-e2e-kibble";
const MEAL_PRICE = 3.5;
const HOUSE_LINE = `care:house-food:${KIBBLE}`;

test.use({ actionTimeout: 20_000 });

type Setting = { value: unknown; configured: boolean };

interface BookingRead {
  id: number;
  status: string;
  totalCost: number;
  feedingSchedule?: Array<Record<string, unknown>>;
}

interface LineRead {
  id: string;
  kind: string;
  name: string;
  unitPrice: number;
  quantity: number;
  feeId?: string;
}

const made: number[] = [];
const prior: {
  settings?: Record<string, Setting>;
  buddy?: unknown;
} = {};

/** The facility's house kibble, as its settings page writes it. */
const houseKibble = {
  id: KIBBLE,
  name: "House kibble",
  description: "Adult, chicken & rice",
  type: "kibble",
  unit: "cup",
  pricePerMeal: MEAL_PRICE,
  pricePerDay: 8,
  on: true,
};

function iso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return iso(d);
}

/** The first Monday of the month `ahead` months from now, as a day number. */
function firstMonday(ahead: number): number {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    if (new Date(now.getFullYear(), now.getMonth() + ahead, d).getDay() === 1) {
      return d;
    }
  }
  return 1;
}

async function settings(page: Page): Promise<Record<string, Setting>> {
  const res = await page.request.get("/api/facility/settings");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Record<string, Setting>;
}

async function writeSetting(page: Page, domain: string, value: unknown) {
  const res = await page.request.patch("/api/facility/settings", {
    data: { domain, value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function buddysPlan(page: Page): Promise<unknown> {
  const res = await page.request.get(`/api/pets?clientRef=${ALICE}`);
  expect(res.ok(), await res.text()).toBe(true);
  const pets = (await res.json()) as Array<{
    id: number;
    feedingPlan?: unknown;
  }>;
  const buddy = Array.isArray(pets)
    ? pets.find((pet) => pet.id === BUDDY)
    : undefined;
  return buddy?.feedingPlan ?? null;
}

async function booking(page: Page, ref: number): Promise<BookingRead> {
  const res = await page.request.get(
    `/api/bookings${bookingListSearch({ ref })}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const rows = (await res.json()) as BookingRead[];
  const row = rows.find((b) => b.id === ref);
  expect(row, `booking #${ref} reads back`).toBeTruthy();
  return row!;
}

async function lines(page: Page, ref: number): Promise<LineRead[]> {
  const res = await page.request.get(`/api/bookings/${ref}/line-items`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as LineRead[];
}

const careLines = (all: LineRead[]) =>
  all.filter((line) => line.feeId?.startsWith("care:"));

/** Buddy's plan as the step writes it: breakfast and dinner, own kibble, house kibble at dinner. */
function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: "feed-e2e-buddy",
    petId: BUDDY,
    occasions: [
      {
        id: "breakfast",
        slot: "breakfast",
        label: "Breakfast",
        time: "07:00",
        components: [],
      },
      {
        id: "dinner",
        slot: "dinner",
        label: "Dinner",
        time: "17:00",
        components: [],
      },
    ],
    source: "mix",
    prepInstructions: [],
    ifRefuses: [],
    frequency: "daily",
    allergies: [],
    notes: "",
    dayRule: "every_day",
    foods: [
      {
        id: "food-own",
        source: "own",
        type: "kibble",
        brand: "Orijen Original",
        unit: "cup",
        amount: 1,
        pack: "pre_portioned",
      },
      {
        id: "food-house",
        source: "house",
        type: "kibble",
        houseFoodId: KIBBLE,
        houseFoodName: "House kibble",
        unit: "cup",
        amount: 1,
      },
    ],
    ...overrides,
  };
}

// ── THE WIZARD ─────────────────────────────────────────────────────────────

async function openWizard(page: Page) {
  await page.goto(`/facility/dashboard/clients/${ALICE}`);
  await page
    .getByRole("button", { name: /^book$/i })
    .first()
    .click({ timeout: 90_000 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

async function next(dialog: Locator) {
  // Boarding ships with its Medications step required (answerCareSteps).
  await answerCareSteps(dialog);
  await dialog.getByRole("button", { name: /^next$/i }).click();
}

/**
 * A pill or a segment. Its native input is visually hidden, so the click goes
 * to the label that holds it — which is what a person clicks too.
 */
async function pick(
  scope: Locator,
  role: "radio" | "checkbox",
  name: string | RegExp,
) {
  // `has` is queried inside each label, so the inner locator starts from the
  // page — one built from `scope` would look for the scope inside the label.
  const input = scope.page().getByRole(role, {
    name,
    exact: typeof name === "string",
  });
  await scope.locator("label").filter({ has: input }).first().click();
}

/** Buddy, boarding, Monday to Friday `ahead` months out, a Condominium. */
async function toFeeding(page: Page, ahead: number) {
  const dialog = await openWizard(page);
  await dialog.getByText("Buddy", { exact: true }).first().click();
  await next(dialog);
  await dialog
    .getByText(/boarding/i)
    .first()
    .click();
  await next(dialog);
  for (let i = 0; i < ahead; i += 1) {
    await dialog.getByRole("button", { name: "Next month" }).first().click();
  }
  const monday = firstMonday(ahead);
  await dialog
    .getByRole("button", { name: String(monday), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: String(monday + 4), exact: true })
    .click();
  await next(dialog);
  await pickRoomType(dialog, "Condominium");

  const heading = dialog.getByRole("heading", { name: "Feeding", exact: true });
  for (let i = 0; i < 5 && !(await heading.isVisible()); i += 1) {
    await next(dialog);
  }
  await expect(heading).toBeVisible();
  return dialog;
}

test.beforeAll(async ({ browser }) => {
  // A run that died part-way left its bookings confirmed; heal that first.
  await cancelBookingsMarked(browser, MARKER, "before");

  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // A cancelled stay keeps its kennel until it is released, and the walk
    // below books the same kennel type on the same nights every run.
    for (const b of await bookingsMarked(MARKER, { holdingAStay: true })) {
      await page.request.put("/api/boarding/stays", {
        data: { bookingRef: b.ref, roomId: null },
      });
    }
    prior.settings = await settings(page);
    prior.buddy = await buddysPlan(page);

    // The facility provides house kibble at $3.50 a meal — house food
    // switched on, which it ships off. Everything else on the page is as it
    // ships.
    const current = prior.settings.feeding_instructions?.value as Record<
      string,
      unknown
    >;
    await writeSetting(page, "feeding_instructions", {
      ...current,
      house: { on: true, pricing: "meal", foods: [houseKibble] },
    });
    // Buddy starts with no saved plan, so the step starts empty.
    const cleared = await page.request.patch(`/api/pets/${BUDDY}`, {
      data: { feedingPlan: null },
    });
    expect(cleared.ok(), await cleared.text()).toBe(true);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // The settings as they were: a facility that had never saved one gets
    // its shipped value back, which is what it was reading.
    for (const domain of ["feeding_instructions", "booking_approval"]) {
      const was = prior.settings?.[domain];
      if (was && was.value !== undefined) {
        await page.request.patch("/api/facility/settings", {
          data: { domain, value: was.value },
        });
      }
    }
    await page.request.patch(`/api/pets/${BUDDY}`, {
      data: { feedingPlan: prior.buddy ?? null },
    });

    let cancelled = 0;
    for (const ref of made) {
      // The kennel first: cancelling leaves it held (a daycare booking has
      // none, and says so, which changes nothing).
      await page.request.put("/api/boarding/stays", {
        data: { bookingRef: ref, roomId: null },
      });
      const res = await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled += 1;
    }
    console.log(`cleanup: ${cancelled} booking(s) cancelled`);
  } finally {
    await page.close();
    // A list only knows what the tests reached the line to record.
    await cancelBookingsMarked(browser, MARKER, "after");
  }
});

test("S1 the facility's house food is set on its own page, and a customer's form reads it", async ({
  page,
}) => {
  test.setTimeout(3 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await page.goto("/facility/dashboard/settings/feeding-medications");

  // The house kibble written above, read back by the page.
  await expect(page.getByLabel("Name of house food 1")).toHaveValue(
    "House kibble",
    { timeout: 60_000 },
  );

  // A second house food, through the page.
  await page.getByRole("button", { name: "Add house food" }).click();
  await page.getByLabel("Name of house food 2").fill("Canned wet food");
  await page.getByLabel("Price per meal for Canned wet food").fill("2.5");
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Feeding settings saved" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Name of house food 2")).toHaveValue(
    "Canned wet food",
    { timeout: 60_000 },
  );

  const stored = (await settings(page)).feeding_instructions;
  expect(stored.configured).toBe(true);
  expect(
    (stored.value as { house?: { foods?: Array<Record<string, unknown>> } })
      .house?.foods,
  ).toEqual([
    expect.objectContaining({ id: KIBBLE, pricePerMeal: MEAL_PRICE }),
    expect.objectContaining({
      name: "Canned wet food",
      pricePerMeal: 2.5,
      on: true,
    }),
  ]);

  // A customer's booking form reads the same setting.
  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.get("/api/customer/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const theirs = (await res.json()) as Record<string, Setting>;
  expect(theirs.feeding_instructions?.configured).toBe(true);
  expect(
    (theirs.feeding_instructions?.value as { house?: { foods?: unknown } })
      ?.house?.foods,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: KIBBLE, pricePerMeal: MEAL_PRICE }),
    ]),
  );
});

test("S2 staff write Buddy's plan, and the house food is one line on the bill", async ({
  page,
}) => {
  test.setTimeout(6 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  const dialog = await toFeeding(page, 2);

  await expect(dialog.getByText("No feeding plan for Buddy")).toBeVisible();
  await dialog.getByRole("button", { name: "Add feeding plan" }).click();

  // Breakfast and dinner, every day including checkout: five days.
  await expect(dialog.getByText("2 meals a day · 5 days")).toBeVisible();
  await expect(
    dialog.getByRole("radio", { name: /every day incl\. checkout/i }),
  ).toHaveAttribute("aria-checked", "true");

  // ── Food 1: the owner's kibble, in labelled bags ──────────────────────
  await dialog.locator("#feed-brand-0").fill("Orijen Original");
  // The page ships asking for two extra meals' worth, in case pickup is late.
  await expect(dialog.getByText("Pack 12 labeled portions")).toBeVisible();
  await expect(
    dialog.getByText(
      "10 meals + 2 extra in case pickup is delayed · 1 cup each",
    ),
  ).toBeVisible();

  // ── Food 2: the house kibble, at dinner ────────────────────────────────
  await dialog
    .getByRole("button", {
      name: "Add another food (topper, wet food, broth…)",
    })
    .click();
  await dialog
    .getByRole("radiogroup", { name: "Who provides food 2?" })
    .locator("label", { hasText: "Facility provides" })
    .click();
  await expect(dialog.getByText("10 meals of House kibble")).toBeVisible();
  await pick(
    dialog.getByRole("group", { name: "Served at" }).nth(1),
    "checkbox",
    "Dinner",
  );
  await expect(dialog.getByText("5 meals of House kibble")).toBeVisible();
  await expect(
    dialog.getByText("5 days × 1 meal × $3.50 · updates with meal times"),
  ).toBeVisible();
  // The summary's total (the panel in the rail says it too).
  await expect(dialog.getByText("$17.50").first()).toBeVisible();
  // Staff may waive it; this one is charged.
  await expect(
    dialog.getByLabel("Waive charge for this booking (staff only)"),
  ).not.toBeChecked();

  // ── How Buddy eats, and what he cannot ─────────────────────────────────
  await pick(dialog, "checkbox", "Feed alone");
  await pick(dialog, "checkbox", "Eats fast");
  await dialog
    .getByRole("radio", { name: "Tell me after 1 missed meal" })
    .click();
  await pick(dialog, "radio", "No treats");
  await pick(dialog, "checkbox", "Beef");
  // A pill this far down used to push the whole form out of its window.
  await expectFrameSteady(dialog);
  await dialog.getByLabel("Other food allergy").fill("Turkey");
  await dialog.getByLabel("Other food allergy").press("Enter");
  await expect(dialog.getByRole("checkbox", { name: "Turkey" })).toBeChecked();
  await dialog.locator("#feed-notes").fill("Soak the kibble 10 minutes.");

  // The stay beside it, in the rail.
  const panel = page.getByRole("region", { name: "Stay and meals for Buddy" });
  await expect(panel).toContainText("Boarding · Buddy");
  await expect(panel).toContainText("4 nights");
  await expect(panel).toContainText("Checkout");
  await expect(panel).toContainText("1 cup dry kibble + 1 cup House kibble");
  await expect(panel).toContainText("Packing list");
  await expect(panel).toContainText("Orijen Original");
  await expect(panel).toContainText("12 portions");
  await expect(panel).toContainText("5 meals · House kibble");
  await expect(panel).toContainText("$17.50");

  // ── Confirm and create ──────────────────────────────────────────────────
  for (let i = 0; i < 4; i += 1) {
    const create = dialog.getByRole("button", { name: /^create booking$/i });
    if (await create.isVisible()) break;
    await next(dialog);
  }
  await expect(dialog.getByText("House kibble (5 × $3.50)")).toBeVisible();
  await dialog.getByLabel(/special requests/i).fill(`${MARKER} walk`);
  await dialog.getByRole("button", { name: /^create booking$/i }).click();
  const toast = page.locator("[data-sonner-toast]").first();
  await expect(toast).toBeVisible({ timeout: 45_000 });
  const said = (await toast.innerText()).replace(/\s+/g, " ");
  const ref = Number(/#(\d+)/.exec(said)?.[1]);
  expect(ref, `the wizard said: ${said}`).toBeGreaterThan(0);
  made.push(ref);

  // The booking keeps every answer.
  const saved = await booking(page, ref);
  const item = saved.feedingSchedule?.[0] as Record<string, unknown>;
  expect(item).toMatchObject({
    petId: BUDDY,
    dayRule: "every_day",
    styles: ["feed_alone"],
    habits: ["eats_fast"],
    skipMeal: "tell_after_1",
    treats: "none",
    allergies: ["Beef", "Turkey"],
    notes: "Soak the kibble 10 minutes.",
    source: "mix",
    saveToProfile: true,
  });
  expect(
    (item.occasions as Array<{ id: string }>).map((occasion) => occasion.id),
  ).toEqual(["breakfast", "dinner"]);
  expect(item.foods).toEqual([
    expect.objectContaining({
      source: "own",
      type: "kibble",
      brand: "Orijen Original",
      unit: "cup",
      amount: 1,
      pack: "pre_portioned",
    }),
    expect.objectContaining({
      source: "house",
      houseFoodId: KIBBLE,
      servedAt: ["dinner"],
    }),
  ]);

  // ONE line for the house food, at the setting's price; the stay's price
  // does not carry it.
  expect(careLines(await lines(page, ref))).toEqual([
    expect.objectContaining({
      feeId: HOUSE_LINE,
      kind: "fee",
      name: "House kibble",
      unitPrice: MEAL_PRICE,
      quantity: 5,
    }),
  ]);

  // The profile keeps the plan for next time…
  await expect
    .poll(
      async () =>
        ((await buddysPlan(page)) as { foods?: unknown[] } | null)?.foods
          ?.length ?? 0,
      { timeout: 30_000 },
    )
    .toBe(2);

  // …and the next booking starts with it.
  const again = await toFeeding(page, 3);
  await expect(again.getByText("Buddy’s feeding plan")).toBeVisible();
  await expect(
    again.getByRole("radio", { name: /^Buddy\s*Plan added$/ }),
  ).toBeChecked();
});

test("S3 a staff edit moves the house food it changed, and a line removed at the till stays removed", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const created = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE,
      petId: BUDDY,
      service: "boarding",
      startDate: day(76),
      endDate: day(80),
      checkInTime: "14:00",
      checkOutTime: "11:00",
      status: "confirmed",
      basePrice: 200,
      discount: 0,
      totalCost: 200,
      specialRequests: `${MARKER} edit`,
      feedingSchedule: [plan()],
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const ref = ((await created.json()) as { id: number }).id;
  made.push(ref);

  const house = async () =>
    (await lines(page, ref)).filter((line) => line.feeId === HOUSE_LINE);
  // Every meal, five days: ten meals.
  expect((await house()).map((l) => l.quantity)).toEqual([10]);
  expect((await booking(page, ref)).totalCost).toBe(200);

  // Dinner only: five.
  const edit = async (overrides: Record<string, unknown>) => {
    const res = await page.request.patch(`/api/bookings/${ref}`, {
      data: { feedingSchedule: [plan(overrides)] },
    });
    expect(res.ok(), await res.text()).toBe(true);
  };
  const dinnerOnly = plan().foods.map((food) =>
    food.source === "house" ? { ...food, servedAt: ["dinner"] } : food,
  );
  await edit({ foods: dinnerOnly });
  expect((await house()).map((l) => l.quantity)).toEqual([5]);

  // Taken off at the till…
  const [line] = await house();
  const removed = await page.request.delete(
    `/api/bookings/${ref}/line-items?id=${line!.id}`,
  );
  expect(removed.ok(), await removed.text()).toBe(true);

  // …and an edit afterwards does not put it back.
  await edit({ foods: dinnerOnly, notes: "Warm water on the kibble" });
  expect(await house()).toEqual([]);
});

test("S4 a customer's house food is billed, never waived by them, and the request confirms itself", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const approval = (await settings(page)).booking_approval?.value as Record<
    string,
    unknown
  >;
  await writeSetting(page, "booking_approval", {
    ...approval,
    responseHours: approval?.responseHours ?? {},
    autoConfirm: { daycare: true },
  });

  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE,
      petId: BUDDY,
      service: "daycare",
      startDate: day(19),
      endDate: day(19),
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "confirmed",
      basePrice: FULL_DAY,
      discount: 0,
      // The service alone: the house food is a line, not part of this.
      totalCost: FULL_DAY,
      specialRequests: `${MARKER} customer`,
      feedingSchedule: [
        plan({
          id: "feed-e2e-customer",
          // Asked for by the customer, and not theirs to ask.
          waivedFoods: ["food-house"],
        }),
      ],
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const requested = (await res.json()) as BookingRead;
  made.push(requested.id);

  expect(requested.status, "confirmed at the service's own price").toBe(
    "confirmed",
  );
  expect(requested.totalCost).toBe(FULL_DAY);
  expect(requested.feedingSchedule?.[0]?.waivedFoods).toBeUndefined();

  // Two meals on the one day.
  expect(careLines(await lines(page, requested.id))).toEqual([
    expect.objectContaining({
      feeId: HOUSE_LINE,
      unitPrice: MEAL_PRICE,
      quantity: 2,
    }),
  ]);
});

test("S5 house food included in the price is no line at all", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const current = (await settings(page)).feeding_instructions?.value as Record<
    string,
    unknown
  >;
  await writeSetting(page, "feeding_instructions", {
    ...current,
    house: {
      ...(current.house as Record<string, unknown>),
      pricing: "included",
    },
  });
  try {
    const created = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE,
        petId: BUDDY,
        service: "boarding",
        startDate: day(84),
        endDate: day(86),
        checkInTime: "14:00",
        checkOutTime: "11:00",
        status: "confirmed",
        basePrice: 120,
        discount: 0,
        totalCost: 120,
        specialRequests: `${MARKER} included`,
        feedingSchedule: [plan({ id: "feed-e2e-included" })],
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const ref = ((await created.json()) as { id: number }).id;
    made.push(ref);
    expect(careLines(await lines(page, ref))).toEqual([]);
  } finally {
    await writeSetting(page, "feeding_instructions", current);
  }
});
