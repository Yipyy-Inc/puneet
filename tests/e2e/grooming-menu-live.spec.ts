import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The grooming menu the booking flow offers is the facility's own.
//
// ── THE BUG ───────────────────────────────────────────────────────────────
//
// Everything that books a groom read `groomingPackages` from
// src/data/grooming.ts — a module array — while the facility's rates screen
// wrote `grooming_services` in Postgres. A service added there was invisible
// everywhere a groom is booked, and a deactivated one stayed bookable.
//
// It got sharper with 20260806560000: the appointment is now PRICED from
// `grooming_services`. So a price edited on the rates screen would have been
// quoted to the customer from the fixture and recorded from the table — two
// numbers for one groom.
//
// ── WHY THIS TEST WRITES, AND WHY THAT IS SAFE ────────────────────────────
//
// A comparison of names would prove nothing: the table was SEEDED from the
// fixture, so the two agree today and would agree just as well if the booking
// screen were still reading the array. The only honest test creates something
// the fixture cannot contain and looks for it downstream.
//
// Unlike a spent pass (see package-purchase-redeem.spec.ts, which writes
// nothing for exactly this reason), a service is fully reversible: POST and
// DELETE both exist, and afterAll removes anything wearing the marker. A leaked
// row would be a menu item nobody ordered, not a bath nobody had.
//
// ── CONFIRMED FAILING WITHOUT THE FIX ─────────────────────────────────────
//
// Point `GroomingPackagePicker` back at `groomingPackages` and re-run: the
// first test still passes — the route was never the broken part — and the
// second fails with "element(s) not found". That gap between the two is the
// entire bug, and it is why this file drives the wizard instead of stopping at
// the API.
// ============================================================================

const SERVICES = "/api/grooming/services";
const MARKER = "[e2e menu]";
const PROBE = `${MARKER} Seaweed Wrap`;

interface Service {
  id: string;
  name: string;
  basePrice?: number;
  isActive?: boolean;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const services = (await (
      await page.request.get(SERVICES)
    ).json()) as Service[];

    const mine = services.filter((s) => s.name?.includes(MARKER));
    let removed = 0;
    for (const service of mine) {
      const res = await page.request.delete(
        `${SERVICES}/${encodeURIComponent(service.id)}`,
      );
      if (res.ok()) removed++;
      else console.log(`cleanup: ${service.id} -> ${res.status()}`);
    }
    // Counting the SERVER's answer, not the loop — the same mistake
    // booking-write-integrity's cleanup made once.
    console.log(`cleanup: ${removed}/${mine.length} probe service(s) removed`);
  } finally {
    await page.close();
  }
});

test.describe("the grooming menu is the facility's", () => {
  test("a service created on the rates screen is offered to the booking flow", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await page.request.post(SERVICES, {
      data: { name: PROBE, basePrice: 88, duration: 45, isActive: true },
    });
    expect(created.status(), await created.text()).toBe(201);

    // The list the booking path now reads. Before this change the modal read a
    // module array, which cannot contain a row that did not exist at build
    // time — so this is the assertion the fixture could never satisfy.
    const services = (await (
      await page.request.get(SERVICES)
    ).json()) as Service[];

    const probe = services.find((s) => s.name === PROBE);
    expect(probe, "the new service is on the facility's menu").toBeTruthy();
    expect(Number(probe?.basePrice ?? 0)).toBe(88);
  });

  test("the customer booking screen offers it too", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);

    // `?service=grooming` preselects and LOCKS the service (page.tsx:125), so
    // the wizard skips the service picker. It still opens on STEP 1, Client &
    // Pet — the grooming menu lives on step 2, and a pet has to be chosen
    // first because the cards price against its size.
    await page.goto("/customer/bookings/new?service=grooming");

    await page.getByText("Buddy", { exact: false }).first().click();
    await page
      .getByRole("button", { name: /next|continue/i })
      .first()
      .click();

    // The card the picker renders from the facility's menu. This is the surface
    // that was reading the fixture — asserting on /api/grooming/services alone
    // would only prove the route works, not that this screen uses it.
    await expect(
      page.getByText(PROBE, { exact: false }).first(),
      "the booking wizard offers the service the facility just created",
    ).toBeVisible({ timeout: 20_000 });
  });
});
