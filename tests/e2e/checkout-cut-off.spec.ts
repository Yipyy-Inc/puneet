import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// PUT /api/lodging/checkout-cut-off — the route in front of
// `save_checkout_cut_off` (20260925120000).
//
// What the function DOES to stays — holding a late check-out, giving a night
// back, refusing a collision — is proven in lodging-checkout-cutoff.sql C7-C11,
// inside a transaction that is rolled back. This file proves the ROUTE: who may
// call it, what it refuses, and that it answers with the report.
//
// ── IT NEVER SWITCHES THE CUT-OFF ON ──────────────────────────────────────
//
// One Postgres, shared with production. Switching it on here would re-derive
// every upcoming stay in the demo facility and hold late check-outs that other
// specs expect to be free. So the one successful call saves it OFF — which,
// with no facility ever having had it on, leaves every stay exactly as booked —
// and the row is put back the way it was found.
// ============================================================================

const ROUTE = "/api/lodging/checkout-cut-off";
const DEMO = "a0000000-0000-4000-8000-0000000000f1";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let saved: { had: boolean; value: unknown } = { had: false, value: null };

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const { data } = await admin()
    .from("facility_settings")
    .select("value")
    .eq("facility_id", DEMO)
    .eq("domain", "lodging_config")
    .maybeSingle();
  saved = { had: Boolean(data), value: data?.value ?? null };
});

test.afterAll(async () => {
  const db = admin();
  if (saved.had) {
    await db
      .from("facility_settings")
      .update({ value: saved.value })
      .eq("facility_id", DEMO)
      .eq("domain", "lodging_config");
  } else {
    await db
      .from("facility_settings")
      .delete()
      .eq("facility_id", DEMO)
      .eq("domain", "lodging_config");
  }
});

test.describe("saving the checkout cut-off", () => {
  test("signed out gets 401", async ({ request }) => {
    const res = await request.put(ROUTE, {
      data: { enabled: false, time: null },
    });
    expect(res.status()).toBe(401);
  });

  test("a groomer is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.put(ROUTE, {
      data: { enabled: false, time: null },
    });
    expect(res.status(), await res.text()).toBe(403);
  });

  test("a time that is not a time, and 'on' with no time, are refused", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const malformed = await page.request.put(ROUTE, {
      data: { enabled: true, time: "25:00" },
    });
    expect(malformed.status(), await malformed.text()).toBe(422);

    const timeless = await page.request.put(ROUTE, {
      data: { enabled: true, time: null },
    });
    expect(timeless.status(), await timeless.text()).toBe(422);
  });

  test("the owner saves it off and is told what changed", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.put(ROUTE, {
      data: { enabled: false, time: "14:00" },
    });
    expect(res.status(), await res.text()).toBe(200);
    const report = (await res.json()) as {
      held: number;
      released: number;
      conflicts: number[];
    };
    // Off holds nothing, so nothing can be held or collide. `released` is
    // only non-zero if something had ever been held, which it had not.
    expect(report.held).toBe(0);
    expect(report.conflicts).toEqual([]);
    expect(Number.isInteger(report.released)).toBe(true);

    // And the setting reads back as saved.
    const settings = await page.request.get("/api/facility/settings");
    const body = (await settings.json()) as Record<
      string,
      { value: { checkoutCutOff?: { enabled?: boolean; time?: string } } }
    >;
    expect(body.lodging_config?.value.checkoutCutOff).toEqual({
      enabled: false,
      time: "14:00",
    });
  });
});
