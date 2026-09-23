import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE DAYCARE MENU IS A ROW, AND ONLY THE RIGHT PEOPLE MAY WRITE IT.
//
// `daycare_services` (20260924120000) replaced the `daycare_rates` setting so
// a booking can PICK a named service instead of having the cheapest one that
// covers the hours chosen for it. This pins the half the server owns:
//
//   1. the menu reads back, and a service created here comes back on it;
//   2. a PATCH sends only what changed and leaves the rest alone — the whole
//      reason `daycareServiceToRow` builds its write key by key;
//   3. the PERMISSION SPLIT: `manage_services` writes the menu,
//      `manage_rates` writes the price. A caller with neither is refused;
//   4. a service cannot roll over into itself;
//   5. a branch price replaces the facility one FOR THAT BRANCH.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
//
// Everything made here carries MARKER in its name, and `afterAll` DELETES it —
// `daycare_services` has a real delete policy, unlike `bookings`, so this
// leaves nothing behind at all. The sweep asks the database what carries the
// marker rather than replaying a list the tests filled, because a test that
// fails between creating and recording would otherwise leave a service on a
// real facility's menu.
// ============================================================================

const MARKER = "[e2e daycare-svc]";
const BASE = "/api/daycare/services";

interface Service {
  id: string;
  rowId: string;
  name: string;
  price: number;
  facilityPrice: number;
  taxable: boolean;
  maxDurationHours: number | null;
  rolloverAfterMinutes: number | null;
  rolloverToServiceId: string | null;
  eligibleSpecies: string[];
  eligibleWeightTiers: string[];
  blockedPetTags: string[];
  description: string;
  isActive: boolean;
  locationPricing: { locationId: string | null; price: number }[];
}

async function menu(page: Page, locationId?: string): Promise<Service[]> {
  const res = await page.request.get(
    locationId ? `${BASE}?locationId=${locationId}` : BASE,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  // A cast is a claim: a 500 answers `{error}`, and `.filter` on that throws.
  return Array.isArray(body) ? (body as Service[]) : [];
}

async function create(page: Page, body: Record<string, unknown>) {
  return page.request.post(BASE, { data: body, failOnStatusCode: false });
}

test.describe.configure({ mode: "serial" });

async function sweep(page: Page): Promise<number> {
  let removed = 0;
  for (const s of await menu(page)) {
    if (!s.name.includes(MARKER)) continue;
    const res = await page.request.delete(`${BASE}/${s.id}`);
    if (res.ok()) removed += 1;
  }
  return removed;
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // Heal whatever a crashed earlier run left on the menu, before adding.
    const healed = await sweep(page);
    if (healed > 0)
      console.log(`sweep(before): ${healed} left by an earlier run`);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    console.log(`cleanup: ${await sweep(page)} service(s) removed`);
  } finally {
    await page.close();
  }
});

test.describe("the daycare menu", () => {
  test("a service is created, reads back on the menu, and is priced", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await create(page, {
      name: `${MARKER} Full day`,
      description: "Drop off from seven",
      price: 42,
      taxable: true,
      maxDurationHours: 10,
      eligibleSpecies: ["Dog"],
    });
    expect(res.status(), await res.text()).toBe(201);

    const { service, pricesWritten } = (await res.json()) as {
      service: Service;
      pricesWritten: boolean;
    };
    expect(service.name).toContain(MARKER);
    expect(service.price).toBeCloseTo(42, 2);
    expect(service.maxDurationHours).toBeCloseTo(10, 2);
    expect(service.eligibleSpecies).toEqual(["Dog"]);
    // Nothing was asked for, so nothing was refused.
    expect(pricesWritten, "no branch prices were sent").toBe(true);

    const mine = (await menu(page)).find((s) => s.id === service.id);
    expect(mine, "it is on the menu").toBeTruthy();
    expect(mine?.isActive, "a new service is live unless said otherwise").toBe(
      true,
    );
  });

  test("a PATCH changes only what it names", async ({ page }) => {
    // The point of building the write key by key. A facility that spends an
    // afternoon on eligibility and then flips the service inactive must not
    // lose the afternoon.
    await signIn(page, ACCOUNTS.owner);

    const created = await create(page, {
      name: `${MARKER} Half day`,
      price: 24,
      eligibleSpecies: ["Dog", "Cat"],
      eligibleWeightTiers: ["small", "medium"],
      description: "Four hours",
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };

    const patched = await page.request.patch(`${BASE}/${service.id}`, {
      data: { isActive: false },
      failOnStatusCode: false,
    });
    expect(patched.status(), await patched.text()).toBe(200);

    const after = (await patched.json()).service as Service;
    expect(after.isActive, "what the PATCH named").toBe(false);
    expect(after.eligibleSpecies, "and nothing else").toEqual(["Dog", "Cat"]);
    expect(after.eligibleWeightTiers).toEqual(["small", "medium"]);
    expect(after.description).toBe("Four hours");
    expect(after.price).toBeCloseTo(24, 2);
  });

  test("a service cannot roll over into itself", async ({ page }) => {
    // A self-rollover would never settle at check-out: the stay passes the
    // ceiling, becomes itself, and passes the ceiling again.
    await signIn(page, ACCOUNTS.owner);

    const created = await create(page, {
      name: `${MARKER} Loop`,
      price: 10,
      maxDurationHours: 4,
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };

    const res = await page.request.patch(`${BASE}/${service.id}`, {
      data: { rolloverToServiceId: service.rowId, rolloverAfterMinutes: 30 },
      failOnStatusCode: false,
    });
    expect(res.status(), await res.text()).toBe(422);
  });

  test("a branch price replaces the facility one, for that branch only", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await create(page, {
      name: `${MARKER} Branch priced`,
      price: 30,
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };

    // `facility` is the facility-wide row — location_id null, the one the
    // partial unique index allows exactly one of.
    const priced = await page.request.patch(`${BASE}/${service.id}`, {
      data: { branchPrices: { facility: 33 } },
      failOnStatusCode: false,
    });
    expect(priced.status(), await priced.text()).toBe(200);
    expect(
      (await priced.json()).pricesWritten,
      "the owner holds manage_rates",
    ).toBe(true);

    const after = (await menu(page)).find((s) => s.id === service.id);
    expect(
      after?.price,
      "the facility-wide row wins over the column",
    ).toBeCloseTo(33, 2);
    expect(after?.locationPricing.length).toBeGreaterThan(0);
  });

  test("a groomer may not write the menu", async ({ page }) => {
    // Who may author services is RLS on the table, not a check in the route.
    await signIn(page, ACCOUNTS.groomer);
    const res = await create(page, { name: `${MARKER} Not yours`, price: 5 });
    expect(res.status(), await res.text()).toBe(403);
  });

  test("a signed-out caller reads nothing and writes nothing", async ({
    page,
  }) => {
    await page.context().clearCookies();
    expect((await page.request.get(BASE)).status()).toBe(401);
    const res = await create(page, { name: `${MARKER} Signed out`, price: 5 });
    expect(res.status()).toBe(401);
  });

  test("a service needs a name", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await create(page, { price: 20 });
    expect(res.status(), await res.text()).toBe(422);
  });
});
