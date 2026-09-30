import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";
import { cancelBookingsMarked } from "./_sweep";

// ============================================================================
// THE ONE ADD-ONS LIST, OVER HTTP (2026-09-26, 20260926223644).
//
// Settings > Services > Add-ons, as the reference article sets it up: a list
// grouped under categories the facility can sort, each add-on with its
// category, price, duration, staff requirement, services, pet limits and an
// override per location. The table and its policies are asserted in
// `service-add-ons.sql`; this is the HTTP path the screen uses.
//
//   1. a manager builds it: categories, an add-on with an override, a PATCH
//      that sends only what moved, and a new order for the categories;
//   2. deleting a category keeps its add-on, uncategorised; deleting the
//      add-on takes it off the list;
//   3. a pet owner reads the LIVE add-ons of their own facility, and cannot
//      write one;
//   4. a groomer (no manage_services) cannot add or change one, and a
//      signed-out caller reads nothing;
//   5. "apply the changes to all unconfirmed upcoming appointments?" — after
//      an edit, the bookings not yet confirmed are counted and, on yes, take
//      the new price; a confirmed one keeps what it was sold at; a pet owner
//      and a signed-out caller can do neither (2026-09-30).
//
// ── EVERYTHING MADE HERE IS DELETED ────────────────────────────────────────
//
// Add-ons and categories carry MARKER in their names and are HARD-deleted by
// the service role before and after — the API's own delete archives, which is
// right for a facility and would leave an inert row behind here. The two
// bookings of case 5 carry MARKER in their notes and are cancelled by it,
// before and after.
// ============================================================================

const MARKER = "[e2e add-ons]";
const ADD_ONS = "/api/add-ons";
const CATEGORIES = "/api/add-ons/categories";

interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMin: number;
  categoryId: string | null;
  requiresStaff: boolean;
  appliesToAllServices: boolean;
  serviceRefs: string[];
  eligibleWeightTiers: string[];
  eligibleCoatTypes: string[];
  isActive: boolean;
  overrides: {
    locationId: string;
    price: number | null;
    taxable: boolean | null;
    durationMin: number | null;
  }[];
}

interface Category {
  id: string;
  name: string;
  displayOrder: number;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("The service role is needed to sweep.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sweep() {
  const db = admin();
  await db.from("service_add_ons").delete().like("name", `${MARKER}%`);
  await db
    .from("service_add_on_categories")
    .delete()
    .like("name", `${MARKER}%`);
}

async function list(page: Page): Promise<AddOn[]> {
  const res = await page.request.get(ADD_ONS);
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as AddOn[]) : [];
}

async function categories(page: Page): Promise<Category[]> {
  const res = await page.request.get(CATEGORIES);
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as Category[]) : [];
}

async function create(page: Page, data: Record<string, unknown>) {
  const res = await page.request.post(ADD_ONS, {
    data,
    failOnStatusCode: false,
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { addOn: AddOn; overridesWritten: boolean };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await cancelBookingsMarked(browser, MARKER, "before");
  await sweep();
});
test.afterAll(async ({ browser }) => {
  await cancelBookingsMarked(browser, MARKER, "after");
  await sweep();
});

test.describe("the one add-ons list", () => {
  test("a manager builds it: a category, an add-on with an override, and an order", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const treats = await page.request.post(CATEGORIES, {
      data: { name: `${MARKER} Treats` },
    });
    expect(treats.status(), await treats.text()).toBe(201);
    const treatsId = ((await treats.json()) as Category).id;
    const walks = await page.request.post(CATEGORIES, {
      data: { name: `${MARKER} Walks` },
    });
    expect(walks.status(), await walks.text()).toBe(201);
    const walksId = ((await walks.json()) as Category).id;

    const clash = await page.request.post(CATEGORIES, {
      data: { name: `${MARKER} treats` },
      failOnStatusCode: false,
    });
    expect(clash.status(), "a name the facility uses, in any case").toBe(409);

    const locations = (await (
      await page.request.get("/api/locations")
    ).json()) as { id: string }[];
    const locationId = Array.isArray(locations) ? locations[0]?.id : undefined;

    const { addOn, overridesWritten } = await create(page, {
      name: `${MARKER} Nail trim`,
      description: "Clipped and filed",
      price: 15,
      durationMin: 10,
      categoryId: treatsId,
      requiresStaff: true,
      appliesToAllServices: false,
      serviceRefs: ["training"],
      eligibleWeightTiers: ["small"],
      eligibleCoatTypes: ["long"],
      overrides: locationId
        ? [{ locationId, price: 18, taxable: false, durationMin: null }]
        : [],
    });
    expect(overridesWritten, "the override was written").toBe(true);
    expect(addOn).toMatchObject({
      price: 15,
      durationMin: 10,
      categoryId: treatsId,
      requiresStaff: true,
      appliesToAllServices: false,
      serviceRefs: ["training"],
      eligibleWeightTiers: ["small"],
      eligibleCoatTypes: ["long"],
    });
    if (locationId) {
      expect(addOn.overrides).toEqual([
        { locationId, price: 18, taxable: false, durationMin: null },
      ]);
    }

    // A PATCH names only what moved: the description and override stay.
    const moved = await page.request.patch(`${ADD_ONS}/${addOn.id}`, {
      data: { price: 16 },
      failOnStatusCode: false,
    });
    expect(moved.status(), await moved.text()).toBe(200);
    const read = (await list(page)).find((a) => a.id === addOn.id);
    expect(read?.price).toBe(16);
    expect(read?.description).toBe("Clipped and filed");
    expect(read?.overrides.length).toBe(locationId ? 1 : 0);

    // A service reference that is not one is refused before it reaches SQL.
    const junk = await page.request.patch(`${ADD_ONS}/${addOn.id}`, {
      data: { serviceRefs: ["boarding:not-a-uuid"] },
      failOnStatusCode: false,
    });
    expect(junk.status()).toBe(422);

    // Sort the categories: walks before treats.
    const order = await page.request.put(`${CATEGORIES}/order`, {
      data: { ids: [walksId, treatsId] },
      failOnStatusCode: false,
    });
    expect(order.status(), await order.text()).toBe(200);
    const mine = (await categories(page)).filter((c) =>
      c.name.startsWith(MARKER),
    );
    expect(mine.map((c) => c.id)).toEqual([walksId, treatsId]);
  });

  test("deleting a category keeps its add-on; deleting the add-on takes it off the list", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const addOn = (await list(page)).find(
      (a) => a.name === `${MARKER} Nail trim`,
    );
    expect(addOn, "the add-on from the first test").toBeTruthy();
    const categoryId = addOn!.categoryId!;

    const renamed = await page.request.patch(`${CATEGORIES}/${categoryId}`, {
      data: { name: `${MARKER} Nibbles` },
      failOnStatusCode: false,
    });
    expect(renamed.status(), await renamed.text()).toBe(200);

    const gone = await page.request.delete(`${CATEGORIES}/${categoryId}`);
    expect(gone.status(), await gone.text()).toBe(200);
    const kept = (await list(page)).find((a) => a.id === addOn!.id);
    expect(kept, "THE ADD-ON IS STILL ON THE LIST").toBeTruthy();
    expect(kept?.categoryId ?? null, "and is now uncategorised").toBeNull();

    const deleted = await page.request.delete(`${ADD_ONS}/${addOn!.id}`);
    expect(deleted.status(), await deleted.text()).toBe(200);
    expect((await list(page)).some((a) => a.id === addOn!.id)).toBe(false);

    const again = await page.request.delete(`${ADD_ONS}/${addOn!.id}`, {
      failOnStatusCode: false,
    });
    expect(again.status(), "a deleted add-on cannot be deleted twice").toBe(
      403,
    );
  });

  test("a pet owner reads the live add-ons of their facility, and writes none", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await create(page, { name: `${MARKER} Live treat`, price: 3 });
    await create(page, {
      name: `${MARKER} Paused treat`,
      price: 3,
      isActive: false,
    });

    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.get("/api/customer/add-ons");
    expect(res.ok(), await res.text()).toBe(true);
    const body = (await res.json()) as { addOns: AddOn[] };
    const names = body.addOns
      .map((a) => a.name)
      .filter((name) => name.startsWith(MARKER));
    expect(names).toEqual([`${MARKER} Live treat`]);

    const write = await page.request.post(ADD_ONS, {
      data: { name: `${MARKER} By a customer`, price: 1 },
      failOnStatusCode: false,
    });
    expect(write.status(), await write.text()).toBe(403);
  });

  test("a groomer cannot add or change one, and a signed-out caller reads nothing", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    const made = await page.request.post(ADD_ONS, {
      data: { name: `${MARKER} By a groomer`, price: 1 },
      failOnStatusCode: false,
    });
    expect(made.status(), await made.text()).toBe(403);

    const target = (await list(page)).find(
      (a) => a.name === `${MARKER} Live treat`,
    );
    if (target) {
      const changed = await page.request.patch(`${ADD_ONS}/${target.id}`, {
        data: { price: 0 },
        failOnStatusCode: false,
      });
      expect(changed.status(), await changed.text()).toBe(403);
    }

    const context = await browser.newContext();
    try {
      const anon = await context.newPage();
      expect((await anon.request.get(ADD_ONS)).status()).toBe(401);
      expect((await anon.request.get("/api/customer/add-ons")).status()).toBe(
        401,
      );
    } finally {
      await context.close();
    }
  });
});

// ============================================================================
// "APPLY THE CHANGES TO ALL UNCONFIRMED UPCOMING APPOINTMENTS?" (2026-09-30)
//
// An add-on on a booking is a bill line carrying its own price, so an edit to
// the add-on does not reach the bookings that already hold it. The facility
// is asked, and "yes" reaches the bookings that are not confirmed yet — and
// no others.
// ============================================================================

/** Alice and her dog — Alice is ACCOUNTS.customer. */
const ALICE = { client: 15, pet: 1 };
/** What the e2e facility's daycare rate card charges for a full day. */
const FULL_DAY = 38;

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface BillLine {
  kind: string;
  name: string;
  unitPrice: number;
}

test.describe("an edit and the bookings that already hold the add-on", () => {
  test("the unconfirmed upcoming booking takes the new price; the confirmed one keeps its own", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { addOn } = await create(page, {
      name: `${MARKER} Apply walk`,
      price: 5,
    });
    const upcoming = `${ADD_ONS}/${addOn.id}/apply-to-upcoming`;

    const book = async (status: string, offset: number) => {
      const res = await page.request.post("/api/bookings", {
        data: {
          clientId: ALICE.client,
          petId: ALICE.pet,
          service: "daycare",
          startDate: day(offset),
          endDate: day(offset),
          checkInTime: "08:00",
          checkOutTime: "17:00",
          status,
          basePrice: FULL_DAY,
          discount: 0,
          totalCost: FULL_DAY,
          specialRequests: `${MARKER} apply`,
          extraServices: [
            { serviceId: addOn.id, quantity: 1, petId: ALICE.pet },
          ],
        },
      });
      expect(res.status(), await res.text()).toBe(201);
      return ((await res.json()) as { id: number }).id;
    };
    const walkOn = async (ref: number) => {
      const res = await page.request.get(`/api/bookings/${ref}/line-items`);
      expect(res.ok(), await res.text()).toBe(true);
      return ((await res.json()) as BillLine[]).filter(
        (line) => line.kind === "add_on",
      );
    };

    const pending = await book("pending", 23);
    const confirmed = await book("confirmed", 24);
    expect(await walkOn(pending)).toEqual([
      expect.objectContaining({ name: addOn.name, unitPrice: 5 }),
    ]);

    // The price moves, and nothing on a booking moves with it.
    const edited = await page.request.patch(`${ADD_ONS}/${addOn.id}`, {
      data: { price: 9 },
    });
    expect(edited.ok(), await edited.text()).toBe(true);
    expect((await walkOn(pending))[0]?.unitPrice).toBe(5);

    // One booking is waiting on the answer: the pending one.
    const count = await page.request.get(upcoming);
    expect(count.ok(), await count.text()).toBe(true);
    expect(await count.json()).toEqual({ bookings: 1 });

    // A pet owner may neither ask nor answer — nor may nobody.
    const owner = await browser.newContext();
    try {
      const theirs = await owner.newPage();
      await signIn(theirs, ACCOUNTS.customer);
      expect((await theirs.request.get(upcoming)).status()).toBe(403);
      expect((await theirs.request.post(upcoming)).status()).toBe(403);
    } finally {
      await owner.close();
    }
    const nobody = await browser.newContext();
    try {
      const anon = await nobody.newPage();
      expect((await anon.request.get(upcoming)).status()).toBe(401);
      expect((await anon.request.post(upcoming)).status()).toBe(401);
    } finally {
      await nobody.close();
    }
    expect(
      (await walkOn(pending))[0]?.unitPrice,
      "a refused caller changed nothing",
    ).toBe(5);

    // Yes.
    const applied = await page.request.post(upcoming);
    expect(applied.ok(), await applied.text()).toBe(true);
    expect(await applied.json()).toEqual({ applied: 1 });

    expect((await walkOn(pending))[0]?.unitPrice).toBe(9);
    expect(
      (await walkOn(confirmed))[0]?.unitPrice,
      "a confirmed booking keeps what was agreed",
    ).toBe(5);

    // And the bill followed the line: the day, and the walk at its new price.
    const read = await page.request.get(`/api/bookings?ref=${pending}`);
    expect(read.ok(), await read.text()).toBe(true);
    const [row] = (await read.json()) as Array<{ amountDue?: number }>;
    expect(row?.amountDue).toBe(FULL_DAY + 9);
  });
});
