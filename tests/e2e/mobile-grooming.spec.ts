import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Mobile grooming is the facility's (2026-09-12).
//
// Vans, service areas, travel zones and each groomer's area schedule lived in
// localStorage, seeded with two invented vans and two Montréal areas. They
// are the `mobile_grooming` setting now, and a customer reads a projection
// (`public.offered_mobile_grooming()`, 20260912183315). This pins:
//
//   1. The setting is stored and read back; an arrival window past four
//      hours is refused.
//   2. A customer is told van visits are offered, with the ACTIVE area and
//      zone only — and is never sent a van, its plate, or a staff schedule.
//   3. Through the screen: an arrival window picked in the grooming settings
//      is still picked after a reload.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// afterAll puts the facility's `mobile_grooming` back exactly as it was —
// deleting the row, as service_role, if it had none.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const FACILITY_SLUG = "yipyy-demo-facility";
const PLATE = "E2E-PLATE-77";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Setting = { value: Record<string, unknown>; configured: boolean };
let facilityId = "";
let original: Setting | undefined;

async function readSetting(page: Page): Promise<Setting> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as Record<string, Setting>).mobile_grooming;
}

const CONFIGURED = {
  enabled: true,
  arrivalWindowMinutes: 60,
  certainAreaEnabled: false,
  vans: [
    {
      id: "e2e-van",
      facilityId: 0,
      name: "E2E Van",
      licensePlate: PLATE,
      homeBaseAddress: "1 Test Road",
      assignedStaffIds: ["e2e-staff"],
      primaryDriverId: "e2e-staff",
      active: true,
    },
  ],
  serviceAreas: [
    {
      id: "e2e-area-on",
      facilityId: 0,
      name: "E2E North",
      type: "postal",
      postalCodes: ["H2P"],
      daysOfWeek: [1, 3],
      active: true,
    },
    {
      id: "e2e-area-off",
      facilityId: 0,
      name: "E2E South",
      type: "postal",
      postalCodes: ["J4K"],
      daysOfWeek: [2],
      active: false,
    },
  ],
  travelZones: [
    {
      id: "e2e-zone-on",
      label: "E2E Zone 1",
      maxMiles: 5,
      surchargeMode: "flat",
      surchargeAmount: 10,
      active: true,
    },
    {
      id: "e2e-zone-off",
      label: "E2E Zone 2",
      maxMiles: 15,
      surchargeMode: "flat",
      surchargeAmount: 20,
      active: false,
    },
  ],
  staffSchedules: [
    {
      staffId: "e2e-staff",
      weeklyTemplate: { "1": "e2e-area-on" },
      dateOverrides: {},
    },
  ],
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const { data } = await admin()
    .from("facilities")
    .select("id")
    .eq("slug", FACILITY_SLUG)
    .single();
  facilityId = (data as { id: string }).id;
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    original = await readSetting(page);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  if (!original?.configured) {
    await admin()
      .from("facility_settings")
      .delete()
      .eq("facility_id", facilityId)
      .eq("domain", "mobile_grooming");
    return;
  }
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await page.request.patch(SETTINGS, {
      data: { domain: "mobile_grooming", value: original.value },
    });
  } finally {
    await page.close();
  }
});

test.describe("mobile grooming is the facility's", () => {
  test("the setting is stored and read back, and a window past four hours is refused", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const saved = await page.request.patch(SETTINGS, {
      data: { domain: "mobile_grooming", value: CONFIGURED },
    });
    expect(saved.ok(), await saved.text()).toBe(true);

    const back = await readSetting(page);
    expect(back.configured).toBe(true);
    expect(back.value.enabled).toBe(true);
    expect((back.value.vans as { id: string }[])[0]?.id).toBe("e2e-van");

    const tooLong = await page.request.patch(SETTINGS, {
      data: {
        domain: "mobile_grooming",
        value: { ...CONFIGURED, arrivalWindowMinutes: 999 },
      },
    });
    expect(tooLong.ok()).toBe(false);
  });

  test("a customer is told what is offered, and never sent a van", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.get("/api/customer/mobile-grooming");
    expect(res.ok(), await res.text()).toBe(true);
    const raw = await res.text();
    const offered = JSON.parse(raw) as {
      enabled: boolean;
      hasActiveVans: boolean;
      serviceAreas: { id: string }[];
      travelZones: { id: string }[];
    };

    expect(offered.enabled).toBe(true);
    expect(offered.hasActiveVans).toBe(true);
    expect(offered.serviceAreas.map((a) => a.id)).toEqual(["e2e-area-on"]);
    expect(offered.travelZones.map((z) => z.id)).toEqual(["e2e-zone-on"]);
    expect(offered).not.toHaveProperty("vans");
    expect(offered).not.toHaveProperty("staffSchedules");
    expect(raw).not.toContain(PLATE);
  });

  test("through the screen: a picked arrival window survives a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/services/grooming/settings");
    const twoHours = page.getByRole("button", { name: "2 h", exact: true });
    await expect(twoHours).toBeVisible({ timeout: 60_000 });

    // Saved to the facility's setting — not to this browser. RETRIED, like
    // training-trainers.spec.ts: on a cold dev server a click can land while
    // the page is still being compiled and swapped, and is lost.
    await expect(async () => {
      await twoHours.click();
      await expect
        .poll(
          async () => (await readSetting(page)).value.arrivalWindowMinutes,
          { timeout: 5_000 },
        )
        .toBe(120);
    }).toPass({ timeout: 60_000 });

    await page.reload();
    await expect(page.locator("#arrival-window-minutes")).toHaveValue("120", {
      timeout: 60_000,
    });
  });
});
