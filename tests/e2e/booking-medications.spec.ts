import { test, expect, type Locator, type Page } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked, cancelBookingsMarked } from "./_sweep";

// ============================================================================
// THE BOOKING FORM'S MEDICATIONS STEP, END TO END (2026-10-01).
//
// The client sent the page they wanted: a medication entered the way it is
// given — ½ a tablet, staff to split it, morning and evening, not on the
// checkout day, in a pill pocket the facility supplies at $0.75 a dose — with
// the stay's doses beside it. And a setting under Care tasks that decides what
// that page shows and what the facility supplies.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// S1  The facility's Medications page is a setting it saves, and a customer's
//     booking form reads it.
// S2  Staff walk the step: quick picks, the split question, the days and the
//     times, the method and what the facility supplies, the supply check
//     that counts half tablets, a capsule's note, an eye drop's side, the
//     stay panel. The booking keeps all of it; the pill pockets are ONE line
//     on its bill, not money in its price; the pet's profile keeps both
//     medications, and the next booking starts with them.
// S3  A staff edit moves the line it changed, and a line removed at the till
//     is not brought back by a later edit.
// S4  A customer's request: the pill pockets are billed, the customer cannot
//     waive them, and the request still confirms itself at the service's
//     price.
// S5  A daycare request is a booking a day: the medication fee lands once,
//     on the first, and the pill pockets on the days that use them.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// The settings it touches are put back as they were, Buddy's saved
// medications too, and every booking it made is cancelled — by marker as
// well as by list, in `finally`, so a run that died part-way is healed by the
// next one.
// ============================================================================

const MARKER = "[e2e booking-medications]";
const ALICE = 15;
const BUDDY = 1;
/** What the e2e facility's daycare rate card charges for a full day. */
const FULL_DAY = 38;
const POCKET = 0.75;
const POCKETS = "care:provided:pill_pocket";
const MEDICATION_FEE = "care:medication-fee";

test.use({ actionTimeout: 20_000 });

type Setting = { value: unknown; configured: boolean };

interface BookingRead {
  id: number;
  status: string;
  totalCost: number;
  medications?: Array<Record<string, unknown>>;
  groupRefs?: number[];
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
  buddy?: unknown[];
} = {};

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

async function buddysMedications(page: Page): Promise<unknown[]> {
  const res = await page.request.get(`/api/pets?clientRef=${ALICE}`);
  expect(res.ok(), await res.text()).toBe(true);
  const pets = (await res.json()) as Array<{
    id: number;
    medications?: unknown[];
  }>;
  const buddy = Array.isArray(pets)
    ? pets.find((pet) => pet.id === BUDDY)
    : undefined;
  return Array.isArray(buddy?.medications) ? buddy.medications : [];
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

/** Apoquel as the step writes it: ½ tablet, staff to split, morning and evening, not on checkout, pill pockets supplied. */
function apoquel(overrides: Record<string, unknown> = {}) {
  return {
    id: "med-e2e-apoquel",
    petId: BUDDY,
    name: "Apoquel",
    strength: "16 mg",
    amount: "½ tablet",
    doseAmount: 0.5,
    doseUnit: "tablet",
    splitBy: "staff",
    form: "tablet",
    frequency: "twice_daily",
    times: ["08:00", "18:00"],
    dayRule: "except_checkout",
    food: "with",
    adminInstructions: ["with_food"],
    givenWith: "pill_pocket",
    facilityProvidesMedAid: true,
    facilityMedAidItem: "pill_pocket",
    notes: "",
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
  const input = scope
    .page()
    .getByRole(role, { name, exact: typeof name === "string" });
  await scope.locator("label").filter({ has: input }).first().click();
}

/** Buddy, boarding, Monday to Friday `ahead` months out, a Condominium. */
async function toMedications(page: Page, ahead: number) {
  const dialog = await openWizard(page);
  await dialog.getByText("Buddy", { exact: true }).first().click();
  await next(dialog);
  await dialog
    .getByText(/boarding/i)
    .first()
    .click();
  await next(dialog);
  for (let i = 0; i < ahead; i += 1) {
    await dialog
      .locator("button:has(svg.lucide-chevron-right)")
      .first()
      .click();
  }
  const monday = firstMonday(ahead);
  await dialog
    .getByRole("button", { name: String(monday), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: String(monday + 4), exact: true })
    .click();
  await next(dialog);
  await dialog.getByText("Condominium", { exact: true }).first().click();
  await expect(dialog.getByText(/Buddy\s*·\s*Condominium/)).toBeVisible();

  const heading = dialog.getByRole("heading", {
    name: "Medications",
    exact: true,
  });
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
    prior.buddy = await buddysMedications(page);

    // The facility supplies pill pockets at $0.75 a dose. Everything else on
    // the page is as it ships.
    const current = prior.settings.medication_instructions?.value as Record<
      string,
      unknown
    >;
    await writeSetting(page, "medication_instructions", {
      ...current,
      provided: [{ method: "pill_pocket", price: POCKET, per: "dose" }],
    });
    // Buddy starts with nothing saved, so the step starts empty.
    const cleared = await page.request.patch(`/api/pets/${BUDDY}`, {
      data: { medications: [] },
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
    for (const domain of [
      "medication_instructions",
      "care_fees",
      "booking_approval",
    ]) {
      const was = prior.settings?.[domain];
      if (was && was.value !== undefined) {
        await page.request.patch("/api/facility/settings", {
          data: { domain, value: was.value },
        });
      }
    }
    await page.request.patch(`/api/pets/${BUDDY}`, {
      data: { medications: Array.isArray(prior.buddy) ? prior.buddy : [] },
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

test("S1 the Medications page is a setting the facility saves, and a customer's form reads it", async ({
  page,
}) => {
  test.setTimeout(3 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await page.goto("/facility/dashboard/settings/care-tasks");

  // The price written above, read back by the card.
  const pocketPrice = page.getByLabel("Price for Pill pocket");
  await expect(pocketPrice).toHaveValue(String(POCKET), { timeout: 60_000 });

  // Cheese, by the day, saved through the card.
  await page.getByRole("switch", { name: "Cheese" }).click();
  await page.getByLabel("Price for Cheese").fill("1.25");
  await page
    .getByRole("radiogroup", { name: "How Cheese is charged" })
    .locator("label", { hasText: "Per day" })
    .click();
  await page
    .getByRole("button", { name: /save changes/i, disabled: false })
    .click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Medication instructions saved" }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Price for Cheese")).toHaveValue("1.25", {
    timeout: 60_000,
  });

  const stored = (await settings(page)).medication_instructions;
  expect(stored.configured).toBe(true);
  expect(stored.value).toMatchObject({
    provided: [
      { method: "pill_pocket", price: POCKET, per: "dose" },
      { method: "cheese", price: 1.25, per: "day" },
    ],
  });

  // A customer's booking form reads the same setting, through their own
  // client row (20261001083734 lets them).
  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.get("/api/customer/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const theirs = (await res.json()) as Record<string, Setting>;
  expect(theirs.medication_instructions?.configured).toBe(true);
  expect(
    (theirs.medication_instructions?.value as { provided?: unknown })?.provided,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ method: "pill_pocket", price: POCKET }),
    ]),
  );
  expect(typeof theirs.feeding_instructions?.configured).toBe("boolean");
});

test("S2 staff enter two medications the way they are given, and the pill pockets are one line on the bill", async ({
  page,
}) => {
  test.setTimeout(6 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  const dialog = await toMedications(page, 2);

  await expect(dialog.getByText("No medications for Buddy")).toBeVisible();
  await dialog.getByRole("button", { name: "Add medication" }).click();

  // ── Apoquel 16 mg, ½ a tablet that staff split ─────────────────────────
  await dialog.locator("#meds-name").fill("Apoquel");
  await dialog.locator("#meds-strength").fill("16 mg");
  await pick(dialog, "radio", "½");
  await expect(dialog.getByText("½ tablet per dose")).toBeVisible();
  await expect(
    dialog.getByText("Giving ½ tablet. Who splits them?"),
  ).toBeVisible();
  await pick(dialog, "radio", "Staff will split");

  // Every day but checkout, by default: Monday to Thursday.
  await expect(
    dialog.getByRole("radio", { name: /every day except checkout/i }),
  ).toHaveAttribute("aria-checked", "true");
  await pick(dialog, "checkbox", /^Evening/);
  await expect(
    dialog.getByText("2× daily · 8 doses over 4 days"),
  ).toBeVisible();

  // In a pill pocket, which the facility supplies.
  await pick(dialog, "radio", /^Pill pocket/);
  await dialog.getByRole("radio", { name: /facility provides/i }).click();
  await expect(dialog.getByText("8 pill pockets")).toBeVisible();
  await expect(dialog.getByText("4 days × 2 doses/day × $0.75")).toBeVisible();
  // Staff may waive it; this one is charged.
  await expect(
    dialog.getByLabel("Waive charge for this booking (staff only)"),
  ).not.toBeChecked();

  // Half a tablet twice a day for four days is four tablets.
  await dialog.locator("#meds-supply").fill("3");
  await expect(dialog.getByText("Short by 1 tablet · 4 needed")).toBeVisible();
  await dialog.locator("#meds-supply").fill("4");
  await expect(
    dialog.getByText("Enough for the stay · 4 tablets needed"),
  ).toBeVisible();

  await dialog.locator("#meds-allergy").fill("Penicillin");
  await dialog.locator("#meds-allergy").press("Enter");
  await expect(dialog.getByText("Penicillin", { exact: true })).toBeVisible();

  await dialog.getByRole("button", { name: "Save medication" }).click();

  const apoquelCard = dialog.getByRole("article", { name: "Apoquel" });
  await expect(apoquelCard).toContainText("16 mg · ½ tablet (staff to split)");
  await expect(apoquelCard).toContainText(
    "2× daily · 8:00 AM, 6:00 PM · 4 days",
  );
  await expect(apoquelCard).toContainText(
    "Pill pocket · facility provides 8 pill pockets ($6.00)",
  );

  // The stay beside it, in the rail: four nights, no dose on checkout.
  const panel = page.getByRole("region", { name: "Stay and doses for Buddy" });
  await expect(panel).toContainText("Boarding · Buddy");
  await expect(panel).toContainText("4 nights");
  await expect(panel).toContainText("Checkout");
  await expect(panel).toContainText("No doses");
  await expect(panel).toContainText("8 × pill pockets (Apoquel)");
  await expect(panel).toContainText("$6.00");

  // ── Optimmune, an eye drop in the left eye at bedtime ──────────────────
  await dialog
    .getByRole("button", { name: "Add another medication for Buddy" })
    .click();
  await dialog.locator("#meds-name").fill("Optimmune");
  // A capsule says it cannot be split, and counts whole.
  await pick(dialog, "radio", "Capsule");
  await expect(dialog.getByText(/Capsules can.t be split/)).toBeVisible();
  await pick(dialog, "radio", "Drops");
  await pick(dialog, "radio", "Eye");
  await expect(dialog.getByText("Which side?")).toBeVisible();
  await pick(dialog, "radio", "Left");
  await pick(dialog, "checkbox", /^Morning/);
  await pick(dialog, "checkbox", /^Bedtime/);
  await dialog.getByRole("button", { name: "Save medication" }).click();

  const dropsCard = dialog.getByRole("article", { name: "Optimmune" });
  await expect(dropsCard).toContainText("1 drop");
  await expect(dropsCard).toContainText("1× daily · 8:00 PM · 4 days");
  await expect(dialog.getByText("All medications saved")).toBeVisible();

  // ── Confirm and create ──────────────────────────────────────────────────
  await next(dialog);
  await expect(dialog.getByText("Pill pockets (8 × $0.75)")).toBeVisible();
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
  const byName = (name: string) =>
    (saved.medications ?? []).find((m) => m.name === name);
  expect(byName("Apoquel")).toMatchObject({
    strength: "16 mg",
    doseAmount: 0.5,
    doseUnit: "tablet",
    splitBy: "staff",
    form: "tablet",
    dayRule: "except_checkout",
    times: ["08:00", "18:00"],
    givenWith: "pill_pocket",
    facilityProvidesMedAid: true,
    facilityMedAidItem: "pill_pocket",
    drugAllergies: ["Penicillin"],
    supplyCount: 4,
  });
  expect(byName("Optimmune")).toMatchObject({
    form: "drops",
    givenWith: "eye",
    side: "left",
    times: ["20:00"],
  });

  // ONE line for the pill pockets, at the setting's price; the stay's price
  // does not carry them.
  const care = careLines(await lines(page, ref));
  expect(care).toEqual([
    expect.objectContaining({
      feeId: POCKETS,
      kind: "fee",
      // In the client's language — it is their bill, and Alice's record
      // may say either.
      name: expect.stringMatching(/^(Pill pockets|Friandises à pilule)$/),
      unitPrice: POCKET,
      quantity: 8,
    }),
  ]);

  // The profile keeps both for next time…
  await expect
    .poll(
      async () =>
        (await buddysMedications(page)).map(
          (m) => (m as { name?: string }).name,
        ),
      { timeout: 30_000 },
    )
    .toEqual(expect.arrayContaining(["Apoquel", "Optimmune"]));

  // …and the next booking starts with them.
  const again = await toMedications(page, 3);
  await expect(again.getByRole("article", { name: "Apoquel" })).toBeVisible();
  await expect(again.getByRole("article", { name: "Optimmune" })).toBeVisible();
  await expect(
    again.getByRole("radio", { name: /^Buddy\s*2 meds$/ }),
  ).toBeChecked();
});

test("S3 a staff edit moves the pill pockets it changed, and a line removed at the till stays removed", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const start = day(70);
  const end = day(74);
  const created = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE,
      petId: BUDDY,
      service: "boarding",
      startDate: start,
      endDate: end,
      checkInTime: "14:00",
      checkOutTime: "11:00",
      status: "confirmed",
      basePrice: 200,
      discount: 0,
      totalCost: 200,
      specialRequests: `${MARKER} edit`,
      medications: [apoquel()],
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const ref = ((await created.json()) as { id: number }).id;
  made.push(ref);

  const pockets = async () =>
    (await lines(page, ref)).filter((line) => line.feeId === POCKETS);
  expect((await pockets()).map((l) => l.quantity)).toEqual([8]);
  expect((await booking(page, ref)).totalCost).toBe(200);

  // Mornings only: four doses, four pockets.
  const edit = async (times: string[]) => {
    const res = await page.request.patch(`/api/bookings/${ref}`, {
      data: { medications: [apoquel({ times })] },
    });
    expect(res.ok(), await res.text()).toBe(true);
  };
  await edit(["08:00"]);
  expect((await pockets()).map((l) => l.quantity)).toEqual([4]);

  // Taken off at the till…
  const [line] = await pockets();
  const removed = await page.request.delete(
    `/api/bookings/${ref}/line-items?id=${line!.id}`,
  );
  expect(removed.ok(), await removed.text()).toBe(true);

  // …and an edit afterwards does not put it back.
  await edit(["08:00", "18:00"]);
  expect(await pockets()).toEqual([]);
});

test("S4 a customer's pill pockets are billed, never waived by them, and the request confirms itself", async ({
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
      startDate: day(17),
      endDate: day(17),
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "confirmed",
      basePrice: FULL_DAY,
      discount: 0,
      // The service alone: the pill pockets are a line, not part of this.
      totalCost: FULL_DAY,
      specialRequests: `${MARKER} customer`,
      medications: [
        apoquel({
          id: "med-e2e-customer",
          times: ["08:00", "12:00"],
          dayRule: "every_day",
          // Asked for by the customer, and not theirs to ask.
          aidWaived: true,
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
  expect(requested.medications?.[0]?.aidWaived).toBeUndefined();

  const care = careLines(await lines(page, requested.id));
  expect(care).toEqual([
    expect.objectContaining({
      feeId: POCKETS,
      unitPrice: POCKET,
      quantity: 2,
    }),
  ]);
});

test("S5 a daycare request split by day: the medication fee once, the pill pockets on the days that use them", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  await writeSetting(page, "care_fees", {
    medicationAdmin: {
      enabled: true,
      amount: 5,
      scope: "per_medication",
      services: ["boarding", "daycare"],
    },
    daycareFeeding: { enabled: false, amount: 0, scope: "per_pet" },
  });

  try {
    const dates = [day(30), day(31), day(32)];
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE,
        petId: BUDDY,
        service: "daycare",
        startDate: dates[0],
        endDate: dates[2],
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: FULL_DAY * 3,
        discount: 0,
        totalCost: FULL_DAY * 3,
        daycareSelectedDates: dates,
        specialRequests: `${MARKER} days`,
        parts: dates.map((date) => ({
          petIds: [BUDDY],
          startDate: date,
          endDate: date,
          checkInTime: "08:00",
          checkOutTime: "17:00",
          basePrice: FULL_DAY,
          discount: 0,
          totalCost: FULL_DAY,
        })),
        medications: [
          apoquel({
            id: "med-e2e-days",
            times: ["12:00"],
            dayRule: "certain_dates",
            specificDays: [dates[0], dates[2]],
          }),
        ],
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = (await res.json()) as BookingRead;
    const refs = Array.isArray(body.groupRefs) ? body.groupRefs : [];
    made.push(...refs);
    expect(refs).toHaveLength(3);

    const byDay = await Promise.all(
      refs.map(async (ref) =>
        careLines(await lines(page, ref))
          .map((line) => `${line.feeId}×${line.quantity}@${line.unitPrice}`)
          .sort(),
      ),
    );
    expect(byDay).toEqual([
      [`${MEDICATION_FEE}×1@5`, `${POCKETS}×1@${POCKET}`],
      [],
      [`${POCKETS}×1@${POCKET}`],
    ]);
  } finally {
    // Only this test charges a medication fee; the rest of the file does not.
    const was = prior.settings?.care_fees?.value;
    if (was !== undefined) await writeSetting(page, "care_fees", was);
  }
});
