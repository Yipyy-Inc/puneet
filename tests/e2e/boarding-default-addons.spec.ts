import { test, expect, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";
import { withoutTestItems } from "./_settings-snapshot";
import { cancelBookingsMarked } from "./_sweep";

// ============================================================================
// A BOARDING SERVICE'S DEFAULT ADD-ONS — saved, offered, and on the booking.
//
// `boarding_service_default_addons` sat in the schema from the menu's first
// migration and nothing wrote or read it. A facility can now attach add-ons
// to a service by the length of the stay; this follows one from the editor's
// API to a saved booking.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// D1  A service's defaults are saved, read back as saved, replaced, and
//     cleared by an empty list — through the same routes the editor uses.
// D2  The customer's menu carries them, because they are part of the price
//     the customer is quoted (20260925173458).
// D3  A stay booked with the service carries them as add-on lines, counted
//     by the stay: one night is two days, so "every day" is two walks.
//
// ── IT WRITES, AND PUTS BACK ──────────────────────────────────────────────
//
// One add-on in the facility's catalogue (the settings are read first and
// restored, cleaned of anything a crashed run left — `_settings-snapshot.ts`),
// one boarding service, and one booking, cancelled by its marker.
// ============================================================================

const MARKER = "[e2e boarding-defaults]";
const ADD_ON = "e2e-boarding-defaults-walk";
const ADD_ON_NAME = `${MARKER} Walk`;
const SERVICE_NAME = `${MARKER} Stay with walks`;
const SERVICES = "/api/boarding/services";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer, client 15.
const ALICE = 15;

test.use({ actionTimeout: 20_000 });
test.describe.configure({ mode: "serial" });

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let facilityId = "";
let serviceId = "";
let catalogue: { had: boolean; value: unknown } | null = null;

interface Rule {
  addOnId: string;
  appliesOn: string;
  quantityPerDay: number;
  minNights: number | null;
}

interface Service {
  id: string;
  name: string;
  defaultAddOns?: Rule[];
}

interface WriteResult {
  service: Service | null;
  defaultsWritten?: boolean;
}

const EVERY_DAY: Rule = {
  addOnId: ADD_ON,
  appliesOn: "every_day",
  quantityPerDay: 1,
  minNights: null,
};

/** The staff menu, or nothing — never a throw, so a sweep cannot die. */
async function menu(page: Page): Promise<Service[]> {
  const res = await page.request.get(SERVICES);
  if (!res.ok()) return [];
  const body: unknown = await res.json().catch(() => null);
  return Array.isArray(body) ? (body as Service[]) : [];
}

async function removeServices(page: Page) {
  for (const s of await menu(page)) {
    if (s.name.includes(MARKER)) {
      await page.request.delete(`${SERVICES}/${s.id}`);
    }
  }
}

test.beforeAll(async ({ browser }) => {
  const db = admin();
  const { data: pet, error } = await db
    .from("pets")
    .select("clients!inner(facility_id)")
    .eq("ref", BUDDY)
    .single();
  expect(error?.message ?? null).toBeNull();
  facilityId = (pet as unknown as { clients: { facility_id: string } }).clients
    .facility_id;

  const { data } = await db
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "service_addons")
    .maybeSingle();
  catalogue = {
    had: Boolean(data),
    value: withoutTestItems(data?.value ?? null),
  };

  const existing = (catalogue.value ?? {}) as {
    addOns?: unknown[];
    categories?: unknown[];
  };
  const value = {
    ...existing,
    categories: existing.categories ?? [],
    addOns: [
      ...(existing.addOns ?? []),
      {
        id: ADD_ON,
        name: ADD_ON_NAME,
        description: "Twenty minutes around the block",
        pricingType: "per_day",
        price: 7,
        petScope: "per_pet",
        applicableServices: ["boarding"],
        requiresScheduling: false,
        generatesTask: false,
        isActive: true,
        // All three are required by `serviceAddOnSchema`, and a stored value
        // that fails it makes the settings layer drop the WHOLE domain: the
        // booking form then sees no add-ons at all.
        sortOrder: 99,
        createdAt: "2026-09-25T00:00:00.000Z",
        updatedAt: "2026-09-25T00:00:00.000Z",
      },
    ],
  };
  const { error: writeError } = catalogue.had
    ? await db
        .from("facility_settings")
        .update({ value })
        .eq("facility_id", facilityId)
        .eq("domain", "service_addons")
    : await db
        .from("facility_settings")
        .insert({ facility_id: facilityId, domain: "service_addons", value });
  expect(writeError?.message ?? null).toBeNull();

  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await removeServices(page);
  } finally {
    await page.close();
  }
  await cancelBookingsMarked(browser, MARKER, "before");
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await removeServices(page);
  } finally {
    await page.close();
    // Inside the finally: a backstop placed after the try is skipped by
    // exactly the failure it exists for.
    await cancelBookingsMarked(browser, MARKER, "after");
    if (catalogue && facilityId) {
      const db = admin();
      if (catalogue.had) {
        await db
          .from("facility_settings")
          .update({ value: catalogue.value })
          .eq("facility_id", facilityId)
          .eq("domain", "service_addons");
      } else {
        await db
          .from("facility_settings")
          .delete()
          .eq("facility_id", facilityId)
          .eq("domain", "service_addons");
      }
    }
  }
});

test("D1 a service's default add-ons are saved, replaced and cleared", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);

  const made = await page.request.post(SERVICES, {
    data: {
      name: SERVICE_NAME,
      price: 50,
      unit: "night",
      lodgingTypeIds: [],
      isActive: true,
      defaultAddOns: [EVERY_DAY],
    },
  });
  expect(made.status(), await made.text()).toBe(201);
  const created = (await made.json()) as WriteResult;
  expect(created.defaultsWritten).toBe(true);
  expect(created.service?.defaultAddOns).toEqual([EVERY_DAY]);
  serviceId = created.service!.id;

  const patch = async (defaultAddOns: Rule[]) => {
    const res = await page.request.patch(`${SERVICES}/${serviceId}`, {
      data: { defaultAddOns },
    });
    expect(res.ok(), await res.text()).toBe(true);
    return (await res.json()) as WriteResult;
  };

  const later: Rule = {
    addOnId: ADD_ON,
    appliesOn: "except_checkout",
    quantityPerDay: 2,
    minNights: 2,
  };
  expect((await patch([later])).service?.defaultAddOns).toEqual([later]);
  expect((await patch([])).service?.defaultAddOns).toEqual([]);
  expect((await patch([EVERY_DAY])).service?.defaultAddOns).toEqual([
    EVERY_DAY,
  ]);
});

test("D2 the customer's menu carries them", async ({ page }) => {
  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.get("/api/customer/boarding-services");
  expect(res.ok(), await res.text()).toBe(true);
  const offered = (await res.json()) as Service[];
  const ours = offered.find((s) => s.name === SERVICE_NAME);
  expect(ours, "the service is on the customer's menu").toBeTruthy();
  expect(ours?.defaultAddOns).toEqual([EVERY_DAY]);
});

/** The first Tuesday of next month, and the Wednesday after it. */
function nextMonthTuesday(): [number, number] {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 1, d);
    if (day.getDay() === 2) return [d, d + 1];
  }
  return [2, 3];
}

async function next(dialog: Locator) {
  await dialog.getByRole("button", { name: /^next$/i }).click();
}

test("D3 a stay booked with the service carries them, counted by the stay", async ({
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
  await expect(dialog).toBeVisible();

  await dialog.getByText("Buddy", { exact: true }).first().click();
  await next(dialog);
  await dialog
    .getByText(/boarding/i)
    .first()
    .click();
  await next(dialog);

  // One night: Tuesday in, Wednesday out — two days.
  await dialog.locator("button:has(svg.lucide-chevron-right)").first().click();
  const [tuesday, wednesday] = nextMonthTuesday();
  await dialog
    .getByRole("button", { name: String(tuesday), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: String(wednesday), exact: true })
    .click();
  await next(dialog);

  // The service first, then a room of a type it may be sold into.
  await dialog
    .getByRole("button", { name: new RegExp("Stay with walks") })
    .click();
  // The ROOM card, not the text: the demo facility's services were carried
  // over from its classes and share their names, so "Condominium" is also
  // a service card above — and clicking that one switches the service.
  await dialog
    .locator("div.group.rounded-2xl")
    .filter({ hasText: "Condominium" })
    .first()
    .click();
  await next(dialog);

  // The add-ons step names what the service adds by itself.
  await expect(
    dialog.getByText(`Comes with ${SERVICE_NAME}`),
    "the add-ons step lists the service's defaults",
  ).toBeVisible();

  const create = dialog.getByRole("button", { name: /^create booking$/i });
  for (let i = 0; i < 8 && !(await create.isVisible()); i += 1) {
    await next(dialog);
  }
  await dialog.getByLabel(/special requests/i).fill(`${MARKER} stay`);
  await create.click();
  const toast = page.locator("[data-sonner-toast]").first();
  await expect(toast).toBeVisible({ timeout: 45_000 });
  const said = (await toast.innerText()).replace(/\s+/g, " ");
  const ref = Number(/#(\d+)/.exec(said)?.[1]);
  expect(ref, `the wizard said: ${said}`).toBeGreaterThan(0);

  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  const [saved] = (await res.json()) as Array<{
    id: number;
    extraServices?: Array<{
      serviceId: string;
      quantity: number;
      petId: number;
    }>;
  }>;
  expect(saved?.id).toBe(ref);
  expect(
    saved?.extraServices,
    "every day of a one-night stay is two walks, on Buddy",
  ).toContainEqual({ serviceId: ADD_ON, quantity: 2, petId: BUDDY });
});
