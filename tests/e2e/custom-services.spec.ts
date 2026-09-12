import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";
import {
  createDefaultCustomServiceModule,
  normalizeCustomServiceModule,
} from "@/data/custom-services";
import type { CustomServiceModule } from "@/types/facility";

// ============================================================================
// A custom service is the facility's (2026-09-12).
//
// Custom services lived in localStorage, seeded from a fixture: every
// facility showed the same invented services, an edit reached nobody else,
// and the customer booking flow offered them to real customers. They are the
// `custom_services` setting now, and a customer reads a projection
// (`public.offered_custom_services()`, 20260912172123). This pins:
//
//   1. The facility's list is stored and read back; two services cannot
//      share a slug.
//   2. A customer is offered the active, online-bookable service — not the
//      draft — and never the facility's internal notes.
//   3. A platform admin adds a service to a facility through
//      /api/facilities/[id]/custom-services; a customer cannot.
//   4. Through the screen: a service's settings, saved, survive a reload.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// afterAll puts the facility's `custom_services` back exactly as it was —
// deleting the row, as service_role, if it had none.
// ============================================================================

const MARKER = "e2e-custom";
const SETTINGS = "/api/facility/settings";
const FACILITY_SLUG = "yipyy-demo-facility";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function moduleNamed(
  slug: string,
  status: CustomServiceModule["status"],
): CustomServiceModule {
  const base = createDefaultCustomServiceModule(0);
  return normalizeCustomServiceModule({
    ...base,
    id: `${MARKER}-${slug}`,
    slug: `${MARKER}-${slug}`,
    name: `E2E ${slug}`,
    status,
    internalNotes: "check the pool chlorine first",
    workflow: {
      ...base.workflow!,
      bookableOnline: true,
      questionnaireCompleted: true,
    },
  });
}

type Setting = {
  value: { modules: CustomServiceModule[] };
  configured: boolean;
};
let facilityId = "";
let original: Setting | undefined;

async function readSetting(page: Page): Promise<Setting> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as Record<string, Setting>).custom_services;
}

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
      .eq("domain", "custom_services");
    return;
  }
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    await page.request.patch(SETTINGS, {
      data: { domain: "custom_services", value: original.value },
    });
  } finally {
    await page.close();
  }
});

test.describe("custom services are the facility's", () => {
  test("the list is stored and read back, and slugs are unique", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const saved = await page.request.patch(SETTINGS, {
      data: {
        domain: "custom_services",
        value: {
          modules: [
            ...(original?.value.modules ?? []),
            moduleNamed("swim", "active"),
            moduleNamed("draft", "draft"),
          ],
        },
      },
    });
    expect(saved.ok(), await saved.text()).toBe(true);

    const back = await readSetting(page);
    expect(back.value.modules.map((m) => m.slug)).toEqual(
      expect.arrayContaining([`${MARKER}-swim`, `${MARKER}-draft`]),
    );

    const twin = await page.request.patch(SETTINGS, {
      data: {
        domain: "custom_services",
        value: {
          modules: [
            moduleNamed("swim", "active"),
            moduleNamed("swim", "draft"),
          ],
        },
      },
    });
    expect(twin.ok()).toBe(false);
  });

  test("a customer is offered the active service, without the facility's notes", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.get("/api/customer/custom-services");
    expect(res.ok(), await res.text()).toBe(true);
    const { modules } = (await res.json()) as {
      modules: Record<string, unknown>[];
    };
    const swim = modules.find((m) => m.slug === `${MARKER}-swim`);
    expect(swim, "the active, online service is offered").toBeTruthy();
    expect(swim).not.toHaveProperty("internalNotes");
    expect(modules.some((m) => m.slug === `${MARKER}-draft`)).toBe(false);

    // Nor can they read the setting row itself.
    const direct = await page.request.get(SETTINGS);
    const body = direct.ok()
      ? ((await direct.json()) as Record<string, Setting>)
      : {};
    expect(
      (body.custom_services?.value.modules ?? []).some(
        (m) => m.slug === `${MARKER}-swim`,
      ),
    ).toBe(false);
  });

  test("a platform admin gives the facility a service; a customer cannot", async ({
    page,
    browser,
  }) => {
    const route = `/api/facilities/${facilityId}/custom-services`;
    const customer = await browser.newPage();
    try {
      await signIn(customer, ACCOUNTS.customer);
      const refused = await customer.request.post(route, {
        data: { module: moduleNamed("sneaky", "active") },
      });
      expect(refused.status()).toBe(403);
    } finally {
      await customer.close();
    }

    await signIn(page, ACCOUNTS.admin);
    const created = await page.request.post(route, {
      data: { module: moduleNamed("admin-made", "draft") },
    });
    expect(created.status(), await created.text()).toBe(201);
    const again = await page.request.post(route, {
      data: { module: moduleNamed("admin-made", "draft") },
    });
    expect(again.status()).toBe(409);

    const lists = (await (await page.request.get(route)).json()) as {
      modules: CustomServiceModule[];
    };
    expect(lists.modules.some((m) => m.slug === `${MARKER}-admin-made`)).toBe(
      true,
    );
  });

  test("through the screen: a service's settings survive a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const description = `Saved by e2e ${Date.now()}`;
    await page.goto(
      `/facility/dashboard/services/custom/${MARKER}-swim/settings`,
    );
    const field = page.locator("#settings-description");
    await field.fill(description, { timeout: 30_000 });
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText("Settings saved")).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await expect(page.locator("#settings-description")).toHaveValue(
      description,
      { timeout: 30_000 },
    );
  });
});
