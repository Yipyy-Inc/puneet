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

const API = "/api/grooming/customer-packages";
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
