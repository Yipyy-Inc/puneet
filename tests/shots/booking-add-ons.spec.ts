import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE ADD-ONS A GROOM IS OFFERED (2026-09-26).
//
// The groom offered its add-ons from two lists once they were one table, and
// an add-on for every service sat in both. It has ONE list now, decided by the
// add-on rules: this shows it from the customer's side.
//
// WRITES, with the service role, into the demo facility's one add-ons list:
//   · an add-on for EVERY service, with a description — on the list once;
//   · one for the chosen grooming service only — on the list;
//   · one for TRAINING only — NOT on the list.
// All three are deleted again in a `finally`.
//
// WHAT TO LOOK FOR IN THE FILES (grooming-add-ons-*):
//   · each add-on once, with its description, minutes and price;
//   · no "for {pet}" per-pet section under the list;
//   · the training-only add-on absent; nothing clipped at 599 in French.
//
//   E2E_BASE_URL=http://localhost:3111 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light booking-add-ons
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots";
const LEGACY = "e2e-shot-booking-add-ons";
const PACKAGE = "Basic Bath";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function french(page: Page) {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

test("the add-ons a groom is offered, once each", async ({ page }) => {
  test.setTimeout(8 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });

  const db = admin();
  const { data: pet } = await db
    .from("pets")
    .select("clients!inner(facility_id)")
    .eq("ref", 1)
    .single();
  const facilityId = (pet as unknown as { clients: { facility_id: string } })
    .clients.facility_id;
  const { data: groom } = await db
    .from("grooming_services")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("name", PACKAGE)
    .limit(1)
    .single();
  expect(groom, `the demo facility has "${PACKAGE}"`).not.toBeNull();

  const remove = () =>
    db
      .from("service_add_ons")
      .delete()
      .eq("facility_id", facilityId)
      .like("legacy_id", `${LEGACY}%`);
  await remove();
  // Every row names every column: a multi-row insert fills a column one row
  // leaves out with NULL, not with its default.
  const { error } = await db.from("service_add_ons").insert([
    {
      facility_id: facilityId,
      legacy_id: `${LEGACY}-all`,
      name: "Lavender facial",
      description: "A gentle face wash that brightens the coat around the eyes",
      price: 12,
      duration_min: 10,
      applies_to_all_services: true,
      service_refs: [],
    },
    {
      facility_id: facilityId,
      legacy_id: `${LEGACY}-bath`,
      name: "Paw balm",
      description: "",
      price: 8,
      duration_min: 0,
      applies_to_all_services: false,
      service_refs: [`grooming:${(groom as { id: string }).id}`],
    },
    {
      facility_id: facilityId,
      legacy_id: `${LEGACY}-training`,
      name: "Training treat pouch",
      description: "",
      price: 9,
      duration_min: 0,
      applies_to_all_services: false,
      service_refs: ["training"],
    },
  ]);
  expect(error).toBeNull();

  try {
    await signIn(page, ACCOUNTS.customer);
    for (const lang of ["en", "fr"] as const) {
      if (lang === "fr") await french(page);
      for (const width of [1440, 599]) {
        await page.setViewportSize({ width, height: 1400 });
        await page.goto("/customer/bookings/new?service=grooming");
        await page.getByText("Buddy", { exact: false }).first().click();
        const next = page
          .getByRole("button", { name: /^(next|suivant)$/i })
          .first();
        await next.click();
        await page
          .getByText(PACKAGE, { exact: false })
          .first()
          .click({ timeout: 45_000 });
        await next.click();

        // One switch per add-on. The per-pet list that used to sit under this
        // one named its switches "{add-on} for {pet}", so a second switch for
        // an add-on is exactly the duplicate this pins.
        const switchFor = (name: string) =>
          page.getByRole("switch", { name: new RegExp(name) });
        await expect(switchFor("Lavender facial")).toHaveCount(1, {
          timeout: 45_000,
        });
        await expect(switchFor("Paw balm")).toHaveCount(1);
        await expect(switchFor("Training treat pouch")).toHaveCount(0);
        await page.waitForTimeout(400);
        await page.screenshot({
          path: `${OUT}/grooming-add-ons-${lang}-${width}.png`,
          fullPage: true,
        });
      }
    }
  } finally {
    await remove();
  }
});
