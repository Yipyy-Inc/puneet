import { test, expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { bookingListSearch } from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";
import { answerCareSteps, expectFrameSteady, pickRoomType } from "./_wizard";
import { bookingsMarked, cancelBookingsMarked } from "./_sweep";

// ============================================================================
// THE BOOKING FORM'S MEDICATIONS STEP, END TO END (2026-10-01).
//
// The client sent the page they wanted: a medication entered the way it is
// given — ½ a tablet, staff to split it, morning and evening, not on the
// checkout day, in a pill pocket the facility supplies at $0.75 a dose — with
// the stay's doses beside it. And the facility's own page under Settings ›
// Services › Feeding & medications that decides what it shows, what the
// facility sells, and what it charges.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// S1  What the facility sells is set on its Feeding & medications page, and a
//     customer's booking form reads it.
// S2  Staff walk the step: quick picks, the split question, the days and the
//     times, the method and what the facility supplies, the supply check
//     that counts half tablets, the pharmacy label the page ships asking
//     for, a capsule's note, an eye drop's side, the stay panel. The booking keeps all of it; the pill pockets are ONE line
//     on its bill, not money in its price; the pet's profile keeps both
//     medications, and the next booking starts with them.
// S3  A staff edit moves the line it changed, and a line removed at the till
//     is not brought back by a later edit.
// S4  A customer's request: the pill pockets are billed, the customer cannot
//     waive them, and the request still confirms itself at the service's
//     price.
// S5  A daycare request is a booking a day: the administration fee lands
//     once, on the first, and the pill pockets on the days that use them.
// S6  Boarding's Medications step ships required: Next waits until Buddy has
//     a medication or "takes no medication" is ticked, and the booking keeps
//     that answer.
// S7  The safety rules on the step: a controlled substance refused, the
//     pharmacy label confirmed, a photo of it sent once the booking is
//     saved, and the vet — kept on the booking and on Buddy's profile.
// S8  A training enrolment carries the dog's medications to every session
//     it books, as one request: the fee once, the pill pockets per session.
// S9  A label photo: replaced, removed by staff, refused when it is not a
//     photo or not a medication of the booking; a customer reads their own
//     and cannot remove it.
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
  vet?: unknown;
} = {};

/** A 1×1 PNG: a real photo, as far as the route's sniffing is concerned. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function buddysVet(page: Page): Promise<unknown> {
  const res = await page.request.get(`/api/pets?clientRef=${ALICE}`);
  expect(res.ok(), await res.text()).toBe(true);
  const pets = (await res.json()) as Array<{ id: number; vet?: unknown }>;
  return Array.isArray(pets)
    ? (pets.find((pet) => pet.id === BUDDY)?.vet ?? null)
    : null;
}

async function photos(page: Page, ref: number) {
  const res = await page.request.get(`/api/bookings/${ref}/medication-photos`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Array<{
    id: string;
    medicationId: string;
    url: string;
  }>;
}

function uploadPhoto(
  page: Page,
  ref: number,
  medicationId: string,
  buffer: Buffer = PNG,
) {
  return page.request.post(`/api/bookings/${ref}/medication-photos`, {
    multipart: {
      file: { name: "label.png", mimeType: "image/png", buffer },
      medicationId,
    },
  });
}

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
  // Boarding ships with its Medications step required (answerCareSteps).
  await answerCareSteps(dialog);
  await dialog.getByRole("button", { name: /^next$/i }).click();
}

/** The pill pocket sold at the e2e price: the page ships selling nothing. */
function sellingPockets(methods: unknown): unknown[] {
  return (Array.isArray(methods) ? methods : []).map((row) =>
    (row as { id?: string }).id === "pill_pocket"
      ? { ...(row as object), sell: true, price: POCKET, per: "dose" }
      : row,
  );
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
    prior.vet = await buddysVet(page);

    // The facility supplies pill pockets at $0.75 a dose. Everything else on
    // the page is as it ships.
    const current = prior.settings.medication_instructions?.value as Record<
      string,
      unknown
    >;
    await writeSetting(page, "medication_instructions", {
      ...current,
      methods: sellingPockets(current.methods),
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
      data: {
        medications: Array.isArray(prior.buddy) ? prior.buddy : [],
        vet: prior.vet ?? null,
      },
    });
    // The class S8 enrols Buddy in; its sessions and enrolment go with it,
    // and its bookings were cancelled with the rest above.
    const { count } = await admin()
      .from("training_series")
      .delete({ count: "exact" })
      .like("name", `${MARKER}%`);
    console.log(`cleanup: ${count ?? 0} training series deleted`);

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

test("S1 what the facility sells is set on its own page, and a customer's form reads it", async ({
  page,
}) => {
  test.setTimeout(3 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await page.goto("/facility/dashboard/settings/feeding-medications");
  await page.getByRole("tab", { name: "Medications" }).click();

  // The price written above, read back by the page.
  await expect(page.getByLabel("Price of Pill pocket")).toHaveValue("0.75", {
    timeout: 60_000,
  });

  // Cheese, by the day, sold through the page.
  await page.getByRole("switch", { name: "We sell Cheese" }).click();
  const cheesePrice = page.getByLabel("Price of Cheese");
  await cheesePrice.fill("1.25");
  await cheesePrice.blur();
  await page
    .getByRole("radiogroup", {
      name: "Charged per dose or per day for Cheese",
    })
    .locator("label", { hasText: "/ day" })
    .click();
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Medication settings saved" }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("tab", { name: "Medications" }).click();
  await expect(page.getByLabel("Price of Cheese")).toHaveValue("1.25", {
    timeout: 60_000,
  });

  const stored = (await settings(page)).medication_instructions;
  expect(stored.configured).toBe(true);
  const methods = (stored.value as { methods?: Array<Record<string, unknown>> })
    .methods;
  expect(methods).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "pill_pocket",
        sell: true,
        price: POCKET,
        per: "dose",
      }),
      expect.objectContaining({
        id: "cheese",
        sell: true,
        price: 1.25,
        per: "day",
      }),
    ]),
  );

  // A customer's booking form reads the same setting, through their own
  // client row (20261001083734 lets them).
  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.get("/api/customer/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const theirs = (await res.json()) as Record<string, Setting>;
  expect(theirs.medication_instructions?.configured).toBe(true);
  expect(
    (theirs.medication_instructions?.value as { methods?: unknown })?.methods,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "pill_pocket", sell: true, price: POCKET }),
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
  // The pill that sent the whole form out of its window (2026-10-02).
  await expectFrameSteady(dialog);
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

  // The page ships asking for the pharmacy label: Save waits for it.
  const saveMedication = dialog.getByRole("button", {
    name: "Save medication",
  });
  await expect(saveMedication).toBeDisabled();
  await expect(
    dialog.getByText("Confirm the pharmacy label to save"),
  ).toBeVisible();
  await dialog
    .getByRole("checkbox", {
      name: /original pharmacy-labelled packaging/i,
    })
    .click();
  await saveMedication.click();

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
  await dialog
    .getByRole("checkbox", {
      name: /original pharmacy-labelled packaging/i,
    })
    .click();
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
    labelConfirmed: true,
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

test("S5 a daycare request split by day: the administration fee once, the pill pockets on the days that use them", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const before = (await settings(page)).medication_instructions
    ?.value as Record<string, unknown>;
  // $5 for each medication on each day it is given.
  await writeSetting(page, "medication_instructions", {
    ...before,
    fee: { mode: "med_day", amount: 5, injection: 5 },
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
    // Given on two of the three days: two medication-days, on the first.
    expect(byDay).toEqual([
      [`${MEDICATION_FEE}×2@5`, `${POCKETS}×1@${POCKET}`],
      [],
      [`${POCKETS}×1@${POCKET}`],
    ]);
  } finally {
    // Only this test charges a fee; the rest of the file does not.
    await writeSetting(page, "medication_instructions", before);
  }
});

test("S6 a required Medications step waits for an answer, and the booking keeps it", async ({
  page,
}) => {
  test.setTimeout(6 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  // Buddy with nothing saved, so the step asks.
  const cleared = await page.request.patch(`/api/pets/${BUDDY}`, {
    data: { medications: [] },
  });
  expect(cleared.ok(), await cleared.text()).toBe(true);

  const dialog = await toMedications(page, 4);
  const nextButton = dialog.getByRole("button", { name: /^next$/i });
  await expect(nextButton).toBeDisabled();
  await expect(
    dialog.getByText(
      "Add a medication, or confirm Buddy takes none, to continue.",
    ),
  ).toBeVisible();

  await pick(dialog, "checkbox", "Buddy takes no medication");
  await expect(nextButton).toBeEnabled();
  await expect(
    dialog.getByRole("radio", { name: /^Buddy\s*No medication$/ }),
  ).toBeChecked();

  await nextButton.click();
  await expect(dialog.getByText("Buddy takes no medication")).toBeVisible();
  await dialog.getByLabel(/special requests/i).fill(`${MARKER} none`);
  await dialog.getByRole("button", { name: /^create booking$/i }).click();
  const toast = page.locator("[data-sonner-toast]").first();
  await expect(toast).toBeVisible({ timeout: 45_000 });
  const said = (await toast.innerText()).replace(/\s+/g, " ");
  const ref = Number(/#(\d+)/.exec(said)?.[1]);
  expect(ref, `the wizard said: ${said}`).toBeGreaterThan(0);
  made.push(ref);

  const saved = (await booking(page, ref)) as BookingRead & {
    noMedication?: number[];
  };
  expect(saved.noMedication).toEqual([BUDDY]);
  expect(saved.medications ?? []).toEqual([]);
});

test("S7 a controlled substance is refused; the label is confirmed, photographed, and the vet kept", async ({
  page,
}) => {
  test.setTimeout(6 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  const before = (await settings(page)).medication_instructions
    ?.value as Record<string, unknown>;
  await writeSetting(page, "medication_instructions", {
    ...before,
    rules: { ...(before.rules as object), photo: true },
  });
  await page.request.patch(`/api/pets/${BUDDY}`, {
    data: { medications: [], vet: null },
  });

  let ref = 0;
  try {
    const dialog = await toMedications(page, 5);
    await dialog.getByRole("button", { name: "Add medication" }).click();

    // The page ships refusing controlled substances, by any name.
    await dialog.locator("#meds-name").fill("Gabapentin 100 mg");
    await expect(
      dialog.getByText(
        "We don’t accept controlled substances such as Gabapentin 100 mg. Call us before booking.",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Save medication" }),
    ).toBeDisabled();

    // Rimadyl: the label confirmed, and photographed.
    await dialog.locator("#meds-name").fill("Rimadyl");
    await dialog
      .getByRole("checkbox", {
        name: /original pharmacy-labelled packaging/i,
      })
      .click();
    await dialog.locator('input[type="file"]').setInputFiles({
      name: "rimadyl-label.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await expect(dialog.getByText("rimadyl-label.png")).toBeVisible();
    await expect(
      dialog.getByText(/sent when the booking is saved/),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Save medication" }).click();
    const card = dialog.getByRole("article", { name: "Rimadyl" });
    await expect(card).toContainText("Photo of the label attached");

    // The vet, asked once Buddy takes a medication.
    await dialog.getByLabel("Clinic").fill("[e2e] Plateau Vet");
    await dialog.getByLabel("Phone").fill("514-555-0100");

    await next(dialog);
    await expect(
      dialog.getByText("Vet: [e2e] Plateau Vet · 514-555-0100"),
    ).toBeVisible();
    await dialog.getByLabel(/special requests/i).fill(`${MARKER} rules`);
    await dialog.getByRole("button", { name: /^create booking$/i }).click();
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 45_000 });
    const said = (await toast.innerText()).replace(/\s+/g, " ");
    ref = Number(/#(\d+)/.exec(said)?.[1]);
    expect(ref, `the wizard said: ${said}`).toBeGreaterThan(0);
    made.push(ref);

    const saved = (await booking(page, ref)) as BookingRead & {
      vetContacts?: Record<string, unknown>;
    };
    const rimadyl = (saved.medications ?? []).find((m) => m.name === "Rimadyl");
    expect(rimadyl).toMatchObject({ labelConfirmed: true });
    expect(saved.vetContacts).toEqual({
      [String(BUDDY)]: { clinic: "[e2e] Plateau Vet", phone: "514-555-0100" },
    });

    // The photo, sent once the booking had its ref.
    await expect
      .poll(async () => (await photos(page, ref)).length, { timeout: 30_000 })
      .toBe(1);
    const [photo] = await photos(page, ref);
    expect(photo.medicationId).toBe(rimadyl?.id);
    expect(photo.url).toContain("booking-medication-photos");

    // Buddy's profile keeps his vet for next time.
    await expect
      .poll(async () => buddysVet(page), { timeout: 30_000 })
      .toEqual({ clinic: "[e2e] Plateau Vet", phone: "514-555-0100" });
  } finally {
    if (ref > 0) {
      const saved = await booking(page, ref);
      for (const med of saved.medications ?? []) {
        await page.request.delete(
          `/api/bookings/${ref}/medication-photos?medicationId=${encodeURIComponent(String(med.id))}`,
        );
      }
    }
    await writeSetting(page, "medication_instructions", before);
  }
});

test("S8 a training enrolment carries the dog's medications to every session, as one request", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const before = (await settings(page)).medication_instructions
    ?.value as Record<string, unknown>;
  await writeSetting(page, "medication_instructions", {
    ...before,
    services: { ...(before.services as object), training: "optional" },
    fee: { mode: "dose", amount: 1, injection: 5 },
  });
  try {
    // A three-week class starting tomorrow evening.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const created = await page.request.post("/api/training/series", {
      data: {
        name: `${MARKER} class`,
        dayOfWeek: tomorrow.getDay(),
        startTime: "18:00",
        durationMinutes: 60,
        startDate: iso(tomorrow),
        numberOfSessions: 3,
        capacity: 4,
        totalPrice: 90,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const seriesId = ((await created.json()) as { id: string }).id;

    const enrolled = await page.request.post(
      `/api/training/series/${seriesId}/enrollments`,
      {
        data: {
          clientId: ALICE,
          petId: BUDDY,
          care: {
            medications: [
              apoquel({
                id: "med-e2e-class",
                times: ["18:30"],
                dayRule: "every_day",
                frequency: "once_daily",
              }),
            ],
          },
        },
      },
    );
    expect(enrolled.status(), await enrolled.text()).toBe(201);
    const body = (await enrolled.json()) as {
      careNotSaved?: boolean;
      bookings: Array<{ bookingRef: number }>;
    };
    const refs = body.bookings.map((b) => b.bookingRef);
    made.push(...refs);
    expect(body.careNotSaved).toBeUndefined();
    expect(refs).toHaveLength(3);

    // Every session carries the medication, tied as one request.
    for (const [index, ref] of refs.entries()) {
      const saved = (await booking(page, ref)) as BookingRead & {
        bookingGroup?: { part: number; of: number };
      };
      expect(saved.medications?.[0]).toMatchObject({ name: "Apoquel" });
      expect(saved.bookingGroup).toMatchObject({ part: index + 1, of: 3 });
    }

    // The fee once, on the first session; a pill pocket at each.
    const byRef = await Promise.all(
      refs.map(async (ref) =>
        careLines(await lines(page, ref))
          .map((line) => `${line.feeId}×${line.quantity}@${line.unitPrice}`)
          .sort(),
      ),
    );
    expect(byRef).toEqual([
      [`${MEDICATION_FEE}×3@1`, `${POCKETS}×1@${POCKET}`],
      [`${POCKETS}×1@${POCKET}`],
      [`${POCKETS}×1@${POCKET}`],
    ]);
  } finally {
    await writeSetting(page, "medication_instructions", before);
  }
});

test("S9 a label photo is replaced and removed by staff; a customer reads theirs and cannot remove it", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const created = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE,
      petId: BUDDY,
      service: "boarding",
      startDate: day(150),
      endDate: day(152),
      checkInTime: "14:00",
      checkOutTime: "11:00",
      status: "confirmed",
      basePrice: 120,
      discount: 0,
      totalCost: 120,
      specialRequests: `${MARKER} photo`,
      medications: [apoquel({ id: "med-e2e-photo" })],
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const ref = ((await created.json()) as { id: number }).id;
  made.push(ref);

  try {
    // Not a photo; not a medication of this booking.
    const notPhoto = await uploadPhoto(
      page,
      ref,
      "med-e2e-photo",
      Buffer.from("%PDF-1.4 not a label"),
    );
    expect(notPhoto.status(), await notPhoto.text()).toBe(415);
    const notHers = await uploadPhoto(page, ref, "med-not-on-it");
    expect(notHers.status(), await notHers.text()).toBe(422);

    // Added, then replaced: one photo, the newest.
    const first = await uploadPhoto(page, ref, "med-e2e-photo");
    expect(first.status(), await first.text()).toBe(201);
    const second = await uploadPhoto(page, ref, "med-e2e-photo");
    expect(second.status(), await second.text()).toBe(201);
    const newest = ((await second.json()) as { id: string }).id;
    expect((await photos(page, ref)).map((p) => p.id)).toEqual([newest]);
    const { data: row } = await admin()
      .from("bookings")
      .select("id")
      .eq("ref", ref)
      .single();
    const { count } = await admin()
      .from("booking_medication_photos")
      .select("id", { count: "exact", head: true })
      .eq("booking_id", (row as { id: string }).id);
    expect(count, "the older photo's row went with it").toBe(1);

    // The customer reads their own, and cannot remove it.
    await signIn(page, ACCOUNTS.customer);
    expect((await photos(page, ref)).map((p) => p.id)).toEqual([newest]);
    const refused = await page.request.delete(
      `/api/bookings/${ref}/medication-photos?medicationId=med-e2e-photo`,
    );
    expect(refused.status(), await refused.text()).toBe(403);
  } finally {
    // Staff remove it — the row and the file.
    await signIn(page, ACCOUNTS.owner);
    const removed = await page.request.delete(
      `/api/bookings/${ref}/medication-photos?medicationId=med-e2e-photo`,
    );
    expect(removed.status(), await removed.text()).toBe(204);
  }
  expect(await photos(page, ref)).toEqual([]);
});
