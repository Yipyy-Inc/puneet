import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The customer-package routes, over real HTTP with a real session.
//
// supabase/tests/prepaid-packages.sql proves the DATABASE behaves — 10
// assertions, one transaction, rolled back. It cannot prove the ROUTES do: the
// mapper, the legacy-id resolution, the PostgREST embed and the `clients.ref`
// filter all live above Postgres, and every one of them can be wrong while
// every policy is right.
//
// ── THIS FILE WRITES NOTHING, DELIBERATELY ────────────────────────────────
//
// The pass ledger is append-only and `customer_packages` has no delete policy,
// so a purchase or a redemption made here could not be undone afterwards —
// every run would leave a fake sale on a real client's record, and a fake
// redemption is a bath somebody did not have.
//
// `booking-write-integrity.spec.ts` solves the same problem by marking its rows
// and cancelling them in afterAll. There is no equivalent of "cancel" for a
// spent pass, so this file takes the other route: it exercises the reads and
// the REFUSALS, both of which write nothing, and leaves the successful write
// path to the SQL suite, which can roll back.
//
// What that leaves uncovered, stated rather than implied: `purchase_package`
// and `redeem_package_pass` succeeding through HTTP. Their success is covered
// at the database level (P1–P7) and their argument marshalling is covered here
// by the refusals, which reach the same resolution code.
// ============================================================================

const API = "/api/packages/owned";
const CATALOGUE = "/api/grooming/prepaid-packages";

interface OwnedPackage {
  id: string;
  customerId: number;
  packageName: string;
  passesTotal: number;
  passesUsed: number;
  status: string;
  expiresAt?: string;
  passes: {
    moduleId: string;
    packageId: string;
    serviceName: string;
    totalPasses: number;
    usedPasses: number;
  }[];
  redemptions: { id: string; passNumber: number; serviceLabel: string }[];
}

test.describe("customer packages over HTTP", () => {
  test("the embed resolves and every count is the same derived number", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const response = await page.request.get(API);
    expect(response.status()).toBe(200);
    const owned = (await response.json()) as OwnedPackage[];
    expect(owned.length, "the seeded purchase is readable").toBeGreaterThan(0);

    for (const pkg of owned) {
      // The pools exist — proof the `customer_package_lines` embed resolved
      // rather than quietly returning null.
      expect(pkg.passes.length).toBeGreaterThan(0);

      // The record carries the used-count in three places. They agree because
      // the mapper fills all three from one derived source; the fixture this
      // replaces kept them in step by hand.
      const poolUsed = pkg.passes.reduce((sum, p) => sum + p.usedPasses, 0);
      expect(poolUsed, `${pkg.packageName}: pools vs package`).toBe(
        pkg.passesUsed,
      );
      expect(
        pkg.redemptions.length,
        `${pkg.packageName}: ledger vs package`,
      ).toBe(pkg.passesUsed);

      const poolTotal = pkg.passes.reduce((sum, p) => sum + p.totalPasses, 0);
      expect(poolTotal).toBe(pkg.passesTotal);

      // Status is derived from the ledger and the clock, so it cannot say
      // "active" about a pack with nothing left or a date in the past.
      if (pkg.passesUsed >= pkg.passesTotal) {
        expect(pkg.status).not.toBe("active");
      }
      if (pkg.status === "active" && pkg.expiresAt) {
        expect(new Date(pkg.expiresAt).getTime()).toBeGreaterThan(Date.now());
      }

      // Redemptions are numbered by position, oldest first, with no gaps.
      const numbers = pkg.redemptions.map((r) => r.passNumber);
      expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  test("?clientId filters on the server, not in the browser", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const all = (await (await page.request.get(API)).json()) as OwnedPackage[];
    expect(all.length).toBeGreaterThan(0);
    const target = all[0]!.customerId;

    const scoped = await page.request.get(`${API}?clientId=${target}`);
    expect(scoped.status()).toBe(200);
    const rows = (await scoped.json()) as OwnedPackage[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.customerId === target)).toBe(true);
    expect(rows.length).toBeLessThanOrEqual(all.length);

    // A client with no purchases gets an empty list, not everybody's.
    const nobody = await page.request.get(`${API}?clientId=999999`);
    expect(nobody.status()).toBe(200);
    expect(await nobody.json()).toEqual([]);
  });

  test("the catalogue's purchaseCount is derived from the purchases", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const catalogue = (await (await page.request.get(CATALOGUE)).json()) as {
      id: string;
      purchaseCount: number;
      regularPrice: number;
      packagePrice: number;
      savings: number;
      services: { quantity: number; pricePerSession: number }[];
    }[];
    const owned = (await (await page.request.get(API)).json()) as {
      packageId: string;
    }[];

    for (const pkg of catalogue) {
      const sold = owned.filter((o) => o.packageId === pkg.id).length;
      expect(pkg.purchaseCount, `purchaseCount for ${pkg.id}`).toBe(sold);

      // While here: the catalogue's own derived figures are the view's, and
      // the view's arithmetic is the lines. Nothing stores these.
      const regular = pkg.services.reduce(
        (sum, s) => sum + s.quantity * s.pricePerSession,
        0,
      );
      expect(pkg.regularPrice).toBeCloseTo(regular, 2);
      expect(pkg.savings).toBeCloseTo(regular - pkg.packagePrice, 2);
    }
  });

  test("a redemption cannot be aimed at a pool the bundle does not have", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const owned = (await (
      await page.request.get(API)
    ).json()) as OwnedPackage[];
    const active = owned.find((p) => p.status === "active");
    test.skip(!active, "no active package to aim at");

    const before = active!.passesUsed;

    const refused = await page.request.post(`${API}/redeem`, {
      data: {
        customerPackageId: active!.id,
        serviceId: "svc-definitely-not-in-this-bundle",
        serviceLabel: "Nail Trim",
      },
    });
    expect(refused.status()).toBe(409);
    expect((await refused.json()).error).toContain("does not include");

    // The refusal wrote nothing — which is the assertion that matters. The
    // mock this replaces would have spent `passes[0]` instead, taking a pass
    // from a pool the customer never asked to draw on.
    const after = (await (
      await page.request.get(API)
    ).json()) as OwnedPackage[];
    expect(after.find((p) => p.id === active!.id)!.passesUsed).toBe(before);
  });

  test("a redemption with no service named is refused before it reaches the database", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const owned = (await (
      await page.request.get(API)
    ).json()) as OwnedPackage[];
    test.skip(owned.length === 0, "no package to aim at");

    const noService = await page.request.post(`${API}/redeem`, {
      data: { customerPackageId: owned[0]!.id },
    });
    expect(noService.status()).toBe(422);

    const noPackage = await page.request.post(`${API}/redeem`, {
      data: { customerPackageId: "cp-does-not-exist", serviceId: "svc-x" },
    });
    expect(noPackage.status()).toBe(404);
  });

  test("a sale resolves its client and package, or refuses", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const catalogue = (await (await page.request.get(CATALOGUE)).json()) as {
      id: string;
    }[];
    expect(catalogue.length).toBeGreaterThan(0);

    // A real package, a client who does not exist.
    const noClient = await page.request.post(API, {
      data: { clientId: 999999, packageId: catalogue[0]!.id },
    });
    expect(noClient.status()).toBe(404);
    expect((await noClient.json()).error).toContain("client");

    // A real client, a package that does not exist.
    const owned = (await (
      await page.request.get(API)
    ).json()) as OwnedPackage[];
    test.skip(owned.length === 0, "no known client to sell to");
    const realClient = owned[0]!.customerId;

    const noPackage = await page.request.post(API, {
      data: { clientId: realClient, packageId: "gpp-does-not-exist" },
    });
    expect(noPackage.status()).toBe(404);
    expect((await noPackage.json()).error).toContain("package");

    // Neither field at all.
    const nothing = await page.request.post(API, { data: {} });
    expect(nothing.status()).toBe(422);

    // Nothing above created a row.
    const after = (await (await page.request.get(API)).json()) as unknown[];
    expect(after.length).toBe(owned.length);
  });
});

// ============================================================================
// The portal's half: one catalogue table, two questions asked of it.
// ============================================================================

test.describe("the portal shop reads the same rows as the facility", () => {
  test("/api/packages spans modules; the grooming route does not", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const portal = (await (await page.request.get("/api/packages")).json()) as {
      id: string;
      name: string;
      totalValue: number;
      packagePrice: number;
      savings: number;
      savingsPercentage: number;
      services: { serviceId: string; quantity: number }[];
    }[];
    const grooming = (await (await page.request.get(CATALOGUE)).json()) as {
      id: string;
      services: { serviceId: string }[];
    }[];

    // The portal sees strictly more: the facility's grooming route filters to
    // bundles it can actually price.
    expect(portal.length).toBeGreaterThan(grooming.length);
    const groomingIds = new Set(grooming.map((p) => p.id));
    expect(
      [...groomingIds].every((id) => portal.some((p) => p.id === id)),
    ).toBe(true);

    // A cross-counter bundle exists, and belongs to neither module's admin
    // screen — this is the case that put `module` on the line, not the package.
    const multi = portal.filter((p) => p.services.length > 1);
    expect(multi.length).toBeGreaterThan(0);
    for (const bundle of multi) {
      // If a multi-service bundle is grooming-only it may legitimately appear
      // in both; the ones that are not must not.
      const inGrooming = groomingIds.has(bundle.id);
      const allGrooming = bundle.services.every((s) =>
        s.serviceId.startsWith("groom-"),
      );
      expect(inGrooming).toBe(allGrooming);
    }

    // Savings are the view's, so the shop's struck-through price and its badge
    // cannot disagree with the facility's.
    for (const pkg of portal) {
      expect(pkg.savings).toBeCloseTo(pkg.totalValue - pkg.packagePrice, 2);
      if (pkg.totalValue > 0) {
        expect(pkg.savingsPercentage).toBeCloseTo(
          Math.round((pkg.savings / pkg.totalValue) * 1000) / 10,
          1,
        );
      }
    }
  });

  // ── Can the pass actually be spent? ──────────────────────────────────────
  //
  // Grooming lines used to be written in two id namespaces: the counter's
  // packages named `groom-pkg-*` and the portal's named `srv-*`, from the
  // separate platform-wide catalogue in src/data/services-pricing.ts. Since
  // redemption matches a pool by service id, a grooming pass bought in the
  // portal could never be spent — the customer paid and the pass sat there.
  //
  // This asks the counter's own question, and it is read-only, which this file
  // requires: a spent pass cannot be un-spent. 20260806580000 re-keyed the
  // lines and added a trigger; the SQL suite covers the trigger and the
  // round trip.
  //
  // Before that migration this failed on "Grooming Maintenance", which the
  // facility's own grooming screen listed while naming `srv-005` — a service
  // that screen does not have.
  test("every grooming pass names a service the counter can resolve", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const bundles = (await (await page.request.get(CATALOGUE)).json()) as {
      id: string;
      name: string;
      services: { serviceId: string }[];
    }[];
    const services = (await (
      await page.request.get("/api/grooming/services")
    ).json()) as { id: string }[];

    expect(
      bundles.length,
      "there are grooming bundles to check",
    ).toBeGreaterThan(0);
    const sellable = new Set(services.map((s) => s.id));

    for (const bundle of bundles) {
      for (const line of bundle.services) {
        expect(
          sellable.has(line.serviceId),
          `${bundle.name} sells passes for "${line.serviceId}", which is not on the grooming menu`,
        ).toBe(true);
      }
    }
  });

  test("the shop page renders the catalogue from Postgres", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    await page.goto("/customer/packages");

    // Named from the seeded catalogue, not from a fixture: the fixture array
    // that used to back this screen is deleted.
    await expect(
      page.getByRole("heading", { name: /Buy Passes & Bundles/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: "Daycare 10-Pack", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Weekend Getaway", exact: true }),
    ).toBeVisible();
    // Rank 1 badges as Most Popular, which a boolean could not have said.
    await expect(page.getByText("Most Popular").first()).toBeVisible();
  });
});

// ============================================================================
// The customer's own view — the boundary the portal migration created.
//
// Before 20260806460000 these tables were staff-only, and pointing the portal
// at them produced an empty shop and an empty "my packs" for everybody. The
// fix adds customer read policies scoped by `private.own_client_ids()`, so
// these assertions are about the scope, not just about seeing something.
// ============================================================================

test.describe("what a customer can and cannot see", () => {
  test("a customer sees their own packages and nobody else's", async ({
    page,
  }) => {
    // The owner's view: every purchase at the facility.
    await signIn(page, ACCOUNTS.owner);
    const staffView = (await (
      await page.request.get(API)
    ).json()) as OwnedPackage[];

    await page.context().clearCookies();
    await signIn(page, ACCOUNTS.customer);
    const customerView = (await (
      await page.request.get(API)
    ).json()) as OwnedPackage[];

    // Positive control first: without it, "sees nothing but their own" passes
    // vacuously on a policy that denies everyone.
    expect(
      customerView.length,
      "the customer can see at least one package of their own",
    ).toBeGreaterThan(0);

    const mine = new Set(customerView.map((p) => p.customerId));
    expect(mine.size, "exactly one customer's packages came back").toBe(1);

    // And it is a real subset: the staff view is not being handed over whole.
    const staffCustomers = new Set(staffView.map((p) => p.customerId));
    expect(staffCustomers.size).toBeGreaterThanOrEqual(mine.size);
    for (const pkg of customerView) {
      expect(staffView.some((s) => s.id === pkg.id)).toBe(true);
    }
  });

  test("a customer sees the shop but cannot edit the catalogue", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const shop = (await (await page.request.get("/api/packages")).json()) as {
      id: string;
      name: string;
    }[];
    expect(shop.length, "the shop is readable").toBeGreaterThan(0);

    // Reading the menu is not permission to change it. `manage_services` is a
    // staff permission and a customer has no membership at all.
    const created = await page.request.post(CATALOGUE, {
      data: {
        name: "Free Everything",
        packagePrice: 0,
        validityDays: 3650,
        services: [
          {
            serviceId: "groom-pkg-002",
            serviceName: "Full Groom",
            quantity: 99,
          },
        ],
      },
    });
    expect(created.status()).toBeGreaterThanOrEqual(400);

    const after = (await (await page.request.get("/api/packages")).json()) as {
      name: string;
    }[];
    expect(after.some((p) => p.name === "Free Everything")).toBe(false);
  });
});
