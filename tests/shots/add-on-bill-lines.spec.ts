import { mkdirSync } from "node:fs";

import { test, expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH AN ADD-ON AS A LINE ON THE BILL (2026-09-30).
//
// Three things a person sees now that a booking's add-ons are bill lines:
//
//   1. the confirm step asks WHO DOES IT, for an add-on set up as needing
//      somebody ("Assigned to");
//   2. the booking's payment summary lists the add-on by name, at its price,
//      with that person beside it;
//   3. after the add-on's price is edited, Settings asks whether the bookings
//      not yet confirmed should take it ("Apply the changes to N unconfirmed
//      upcoming appointments?").
//
// It WRITES into the demo facility: one add-on and one boarding service (both
// removed in afterAll — the add-on hard-deleted by the service role, since the
// API's delete archives), and two bookings, cancelled in afterAll.
//
// WHAT TO LOOK FOR IN THE FILES (add-on-lines-*):
//   · the "Assigned to" control under the add-on on the confirm step, a 40px
//     pill (48 at 599), its French label not clipped;
//   · the add-on as its own line on the payment summary, "With <name>";
//   · the prompt's title naming the count, its two buttons reading as the
//     plan says, neither clipped at 599 in French.
//
//   E2E_BASE_URL=http://localhost:3111 bun run local bunx playwright test \
//     --config=playwright.shots.config.ts --project=light add-on-bill-lines
// ============================================================================

test.use({ actionTimeout: 30_000 });
test.describe.configure({ mode: "serial" });

const OUT = "C:/tmp/pwv/shots";
const MARKER = "[shots add-on lines]";
const ADD_ON = `${MARKER} Nail trim`;
const SERVICE = `${MARKER} Stay`;
const SERVICES = "/api/boarding/services";
const ALICE = 15;

const state = {
  addOnId: "",
  bookings: [] as number[],
};

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function language(page: Page, lang: "en" | "fr") {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: lang, domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: lang, domain: host, path: "/" },
  ]);
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The first Tuesday of next month, and the Wednesday after it. */
function nextMonthTuesday(): [number, number] {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() + 1, d);
    if (date.getDay() === 2) return [d, d + 1];
  }
  return [2, 3];
}

async function removeServices(page: Page) {
  const res = await page.request.get(SERVICES);
  if (!res.ok()) return;
  const body: unknown = await res.json().catch(() => null);
  if (!Array.isArray(body)) return;
  for (const s of body as { id: string; name: string }[]) {
    if (s.name.includes(MARKER)) {
      await page.request.delete(`${SERVICES}/${s.id}`);
    }
  }
}

async function removeAddOns() {
  await admin().from("service_add_ons").delete().like("name", `${MARKER}%`);
}

test.beforeAll(async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  await removeAddOns();
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await removeServices(page);

    const addOn = await page.request.post("/api/add-ons", {
      data: {
        name: ADD_ON,
        description: "Clipped and filed",
        price: 15,
        durationMin: 10,
        requiresStaff: true,
      },
    });
    expect(addOn.status(), await addOn.text()).toBe(201);
    state.addOnId = (
      (await addOn.json()) as { addOn: { id: string } }
    ).addOn.id;

    const service = await page.request.post(SERVICES, {
      data: {
        name: SERVICE,
        price: 50,
        unit: "night",
        lodgingTypeIds: [],
        isActive: true,
        defaultAddOns: [],
      },
    });
    expect(service.status(), await service.text()).toBe(201);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    for (const ref of state.bookings) {
      await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
    }
    await removeServices(page);
  } finally {
    await page.close();
    await removeAddOns();
  }
});

/** Walks the staff booking form for one night of boarding, to the confirm step. */
async function toConfirmStep(page: Page): Promise<Locator> {
  await page.goto(`/facility/dashboard/clients/${ALICE}`);
  await page
    .getByRole("button", { name: /^(book|réserver)$/i })
    .first()
    .click({ timeout: 90_000 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const next = () =>
    dialog.getByRole("button", { name: /^(next|suivant)$/i }).click();

  await dialog.getByText("Buddy", { exact: true }).first().click();
  await next();
  await dialog
    .getByText(/boarding|pension/i)
    .first()
    .click();
  await next();

  await dialog.locator("button:has(svg.lucide-chevron-right)").first().click();
  const [tuesday, wednesday] = nextMonthTuesday();
  await dialog
    .getByRole("button", { name: String(tuesday), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: String(wednesday), exact: true })
    .click();
  await next();

  await dialog.getByRole("button", { name: new RegExp("Stay") }).click();
  await dialog
    .locator("div.group.rounded-2xl")
    .filter({ hasText: "Condominium" })
    .first()
    .click();
  await next();

  // The add-ons step: the nail trim, for Buddy.
  await dialog
    .locator("div.group.rounded-2xl")
    .filter({ hasText: "Nail trim" })
    .getByRole("button", { name: "+", exact: true })
    .click();

  const finish = dialog.getByRole("button", {
    name: /^(create booking|créer la réservation)$/i,
  });
  for (let i = 0; i < 8 && !(await finish.isVisible()); i += 1) {
    await next();
  }
  await expect(finish).toBeVisible();
  return dialog;
}

test("who does it, and the line on the bill", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);

  // ── English: choose somebody, photograph, and make the booking ──────────
  await page.setViewportSize({ width: 1440, height: 1100 });
  let dialog = await toConfirmStep(page);
  let staff = dialog.getByRole("combobox", { name: /Staff member for/ });
  await staff.scrollIntoViewIfNeeded();
  await expect(staff).toContainText("Not assigned yet");
  await page.waitForTimeout(300);
  await dialog.screenshot({
    path: `${OUT}/add-on-lines-staff-en-1440-unset.png`,
  });

  await staff.click();
  const people = page.getByRole("option");
  await expect(people.nth(1)).toBeVisible();
  const chosen = ((await people.nth(1).innerText()) ?? "").trim();
  await people.nth(1).click();
  await expect(staff).toContainText(chosen);
  await page.waitForTimeout(300);
  await dialog.screenshot({ path: `${OUT}/add-on-lines-staff-en-1440.png` });

  await page.setViewportSize({ width: 599, height: 1100 });
  await staff.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/add-on-lines-staff-en-599.png` });
  await page.setViewportSize({ width: 1440, height: 1100 });

  await dialog.getByRole("button", { name: /^create booking$/i }).click();
  const toast = page.locator("[data-sonner-toast]").first();
  await expect(toast).toBeVisible({ timeout: 45_000 });
  const said = (await toast.innerText()).replace(/\s+/g, " ");
  const ref = Number(/#(\d+)/.exec(said)?.[1]);
  expect(ref, `the form said: ${said}`).toBeGreaterThan(0);
  state.bookings.push(ref);

  // The line the server wrote: the catalogue's price, and who does it.
  const bill = await page.request.get(`/api/bookings/${ref}/line-items`);
  expect(bill.ok(), await bill.text()).toBe(true);
  const lines = (await bill.json()) as Array<{
    kind: string;
    name: string;
    unitPrice: number;
    staffName?: string;
  }>;
  expect(lines.filter((l) => l.kind === "add_on")).toEqual([
    expect.objectContaining({ name: ADD_ON, unitPrice: 15, staffName: chosen }),
  ]);

  // ── The bill, both languages, both widths ───────────────────────────────
  for (const lang of ["en", "fr"] as const) {
    await language(page, lang);
    for (const width of [1440, 599]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.goto(`/facility/dashboard/clients/${ALICE}/bookings/${ref}`);
      const line = page.getByText(ADD_ON).first();
      await expect(line).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByText(lang === "fr" ? `Avec ${chosen}` : `With ${chosen}`),
      ).toBeVisible();
      await line.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${OUT}/add-on-lines-bill-${lang}-${width}.png`,
      });
    }
  }

  // ── French: the same control, not saved ─────────────────────────────────
  await page.setViewportSize({ width: 1440, height: 1100 });
  dialog = await toConfirmStep(page);
  staff = dialog.getByRole("combobox", { name: /Personne responsable/ });
  await staff.scrollIntoViewIfNeeded();
  await expect(staff).toContainText("Pas encore attribué");
  await page.waitForTimeout(300);
  await dialog.screenshot({ path: `${OUT}/add-on-lines-staff-fr-1440.png` });
  await page.setViewportSize({ width: 599, height: 1100 });
  await staff.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/add-on-lines-staff-fr-599.png` });
  await language(page, "en");
});

test("the question Settings asks after an edit", async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await language(page, "en");

  // One booking that is not confirmed yet carries the nail trim.
  const made = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE,
      petId: 1,
      service: "daycare",
      startDate: day(26),
      endDate: day(26),
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "pending",
      basePrice: 38,
      discount: 0,
      totalCost: 38,
      specialRequests: MARKER,
      extraServices: [{ serviceId: state.addOnId, quantity: 1, petId: 1 }],
    },
  });
  expect(made.status(), await made.text()).toBe(201);
  state.bookings.push(((await made.json()) as { id: number }).id);

  let price = 15;
  for (const lang of ["en", "fr"] as const) {
    await language(page, lang);
    for (const width of [1440, 599]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/facility/dashboard/settings/addons");
      await page
        .getByRole("button", {
          name:
            lang === "fr" ? `Actions pour ${ADD_ON}` : `Actions for ${ADD_ON}`,
        })
        .click({ timeout: 60_000 });
      await page
        .getByRole("menuitem", { name: lang === "fr" ? "Modifier" : "Edit" })
        .click();
      const form = page.getByRole("dialog");
      await expect(form).toBeVisible();
      price += 1;
      await form.locator("#add-on-price").fill(String(price));
      await form
        .getByRole("button", {
          name:
            lang === "fr" ? "Enregistrer les modifications" : "Save changes",
        })
        .click();

      const prompt = page.getByRole("alertdialog");
      await expect(prompt).toBeVisible({ timeout: 45_000 });
      await expect(prompt).toContainText(
        lang === "fr"
          ? "Appliquer les modifications à 1 rendez-vous à venir non confirmé"
          : "Apply the changes to 1 unconfirmed upcoming appointment?",
      );
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `${OUT}/add-on-lines-apply-${lang}-${width}.png`,
      });

      const last = lang === "fr" && width === 599;
      if (!last) {
        await prompt
          .getByRole("button", {
            name:
              lang === "fr"
                ? "Nouveaux rendez-vous seulement"
                : "New appointments only",
          })
          .click();
        await expect(prompt).toBeHidden();
        continue;
      }

      // The last time, yes — and the screen says how many it changed.
      await prompt
        .getByRole("button", { name: "Appliquer à 1 rendez-vous" })
        .click();
      await expect(prompt).toBeHidden({ timeout: 30_000 });
      await expect(
        page.locator("[data-sonner-toast]").filter({
          hasText: "mis à jour sur 1 rendez-vous",
        }),
      ).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/add-on-lines-applied-fr-599.png` });
    }
  }
  await language(page, "en");
});
