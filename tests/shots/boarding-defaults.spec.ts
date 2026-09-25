import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "../e2e/_auth";
import { withoutTestItems } from "../e2e/_settings-snapshot";

// ============================================================================
// PHOTOGRAPH THE BOARDING MENU WHERE A CUSTOMER NOW MEETS IT, AND A SERVICE'S
// DEFAULT ADD-ONS WHERE A FACILITY SETS THEM.
//
// WRITES: one add-on in the demo facility's catalogue (read first, restored
// cleaned of test items), one boarding service carrying two defaults. Both go
// in a `finally`. One Postgres, shared with production.
//
// WHAT TO LOOK FOR IN THE FILES:
//   · customer-menu-*: "Which boarding service?" above the dates, the shot
//     service among the cards, nothing clipped at 599 in French
//   · defaults-editor-*: section 6, two rows, each field with its own label;
//     at 599 the three fields stack and the bin stays visible
//   · defaults-included-*: "Comes with …" above the choosable add-ons, the
//     walks counted by the stay, amounts in the locale's money format
//
//   E2E_BASE_URL=http://localhost:3111 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light boarding-defaults
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots";
const MARKER = "[shot boarding-defaults]";
const ADD_ON = "e2e-shot-defaults-walk";
const SERVICE_NAME = `${MARKER} Stay with walks`;
const SERVICES = "/api/boarding/services";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function removeServices(page: Page) {
  const res = await page.request.get(SERVICES);
  const body: unknown = res.ok() ? await res.json().catch(() => null) : null;
  for (const s of Array.isArray(body)
    ? (body as { id: string; name: string }[])
    : []) {
    if (s.name.includes(MARKER)) {
      await page.request.delete(`${SERVICES}/${s.id}`);
    }
  }
}

async function french(page: Page) {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

test("the boarding menu for customers, and default add-ons for facilities", async ({
  page,
  browser,
}) => {
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
  const { data: stored } = await db
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "service_addons")
    .maybeSingle();
  const had = Boolean(stored);
  const kept = withoutTestItems(stored?.value ?? null) as {
    addOns?: unknown[];
    categories?: unknown[];
  } | null;
  const withWalk = {
    ...(kept ?? {}),
    categories: kept?.categories ?? [],
    addOns: [
      ...(kept?.addOns ?? []),
      {
        id: ADD_ON,
        name: "Walk",
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
  if (had) {
    await db
      .from("facility_settings")
      .update({ value: withWalk })
      .eq("facility_id", facilityId)
      .eq("domain", "service_addons");
  } else {
    await db.from("facility_settings").insert({
      facility_id: facilityId,
      domain: "service_addons",
      value: withWalk,
    });
  }

  await signIn(page, ACCOUNTS.owner);
  await removeServices(page);
  const made = await page.request.post(SERVICES, {
    data: {
      name: SERVICE_NAME,
      price: 50,
      unit: "night",
      lodgingTypeIds: [],
      isActive: true,
      defaultAddOns: [
        {
          addOnId: ADD_ON,
          appliesOn: "every_day",
          quantityPerDay: 1,
          minNights: null,
        },
        {
          addOnId: ADD_ON,
          appliesOn: "last_day",
          quantityPerDay: 2,
          minNights: 3,
        },
      ],
    },
  });
  expect(made.status(), await made.text()).toBe(201);

  try {
    // ── The editor ────────────────────────────────────────────────────────
    for (const lang of ["en", "fr"] as const) {
      if (lang === "fr") await french(page);
      for (const width of [1440, 599]) {
        await page.setViewportSize({ width, height: 1400 });
        await page.goto("/facility/dashboard/services/boarding/menu");
        await page
          .locator('[data-slot="card"]', { hasText: SERVICE_NAME })
          .getByRole("button", { name: /^(edit|modifier)$/i })
          .click({ timeout: 45_000 });
        const dialog = page.getByRole("dialog");
        const section = dialog.getByRole("heading", { name: /^6 · / });
        await section.scrollIntoViewIfNeeded();
        await expect(dialog.locator("#bsv-default-1-min")).toHaveValue("3");
        await dialog.screenshot({
          path: `${OUT}/defaults-editor-${lang}-${width}.png`,
        });
        await page.keyboard.press("Escape");
      }
    }

    // ── The customer ──────────────────────────────────────────────────────
    const customer = await browser.newPage();
    try {
      await signIn(customer, ACCOUNTS.customer);
      for (const lang of ["en", "fr"] as const) {
        if (lang === "fr") await french(customer);
        for (const width of [1440, 599]) {
          await customer.setViewportSize({ width, height: 1400 });
          await customer.goto("/customer/bookings/new?service=boarding");
          await customer.getByText("Buddy", { exact: false }).first().click();
          await customer
            .getByRole("button", { name: /^(next|suivant)$/i })
            .first()
            .click();
          const card = customer.getByRole("button", {
            name: /Stay with walks/,
          });
          await expect(card).toBeVisible({ timeout: 45_000 });
          await customer.screenshot({
            path: `${OUT}/customer-menu-${lang}-${width}.png`,
            fullPage: true,
          });
        }
      }
    } finally {
      await customer.close();
    }
  } finally {
    await removeServices(page);
    if (had) {
      await db
        .from("facility_settings")
        .update({ value: kept })
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
});
