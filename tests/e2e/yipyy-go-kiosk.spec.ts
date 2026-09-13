import { test, expect, type Browser } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";
import { defaultYipyyGoConfig } from "../../src/data/yipyygo-config";

// ============================================================================
// The check-in desk, end to end: an owner’s code, the desk that reads it, and
// the arrival it records.
//
// The kiosk this replaces validated tokens from a Map in the browser that
// made them — a code made on a phone never opened on the desk’s tablet —
// searched fixture bookings, kept no override reason and checked nobody in.
//
//   • a groomer, who cannot check daycare in, gets the same answer for a real
//     daycare code as for a made-up one: the refusal says nothing about which;
//   • a code the OWNER issues opens the booking in RECEPTION’s browser, a
//     separate context entirely, and leaves the address once read;
//   • a required form nobody sent asks the desk why, and the reason is kept;
//   • the arrival is real: the dog reads on site, and a check_in automation
//     event exists for the booking.
//
// Every write is real and the database is shared, so the booking, its desk
// check, its attendance and its event are deleted after, and the facility’s
// pre-arrival settings are put back as they were.
//
// Reception holds open_close_register, and the staff portal stays locked for
// them until today’s drawer is counted, so the facility’s opening-count gate
// is off for this file. It goes back on last, whatever happened, and is read
// back: a facility left with it off would let register-gate pass without
// testing anything.
// ============================================================================

const MARKER = "[e2e yipyy-go-kiosk]";
const REASON = "The owner answered the questions at the desk.";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Turn the facility-wide opening-count gate on or off, as the owner. */
async function setRegisterGate(browser: Browser, required: boolean) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.put("/api/staff-onboarding/hr-config", {
      data: { requireRegisterOpenOnLogin: required },
    });
    expect(res.ok(), await res.text()).toBe(true);
  } finally {
    await context.close();
  }
}

let facilityId = "";
const saved = { had: false, value: null as unknown };
const booking = { id: "", ref: 0 };

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  await setRegisterGate(browser, false);
  const db = admin();
  const { data: pet } = await db
    .from("pets")
    .select("id, client_id, clients!inner(facility_id)")
    .eq("ref", 1)
    .single();
  facilityId = (pet as unknown as { clients: { facility_id: string } }).clients
    .facility_id;

  const { data: row } = await db
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", "yipyy_go_config")
    .maybeSingle();
  saved.had = Boolean(row);
  saved.value = row?.value ?? null;

  const config = structuredClone(defaultYipyyGoConfig);
  config.enabled = true;
  config.notifyStaffEmailOnSubmit = false;
  config.confirmationEmail = { ...config.confirmationEmail!, enabled: false };
  config.serviceConfigs = config.serviceConfigs.map((service) =>
    service.serviceType === "daycare"
      ? { ...service, enabled: true, requirement: "mandatory" as const }
      : service,
  );
  const write = saved.had
    ? db
        .from("facility_settings")
        .update({ value: config })
        .eq("facility_id", facilityId)
        .eq("domain", "yipyy_go_config")
    : db.from("facility_settings").insert({
        facility_id: facilityId,
        domain: "yipyy_go_config",
        value: config,
      });
  expect((await write).error?.message ?? null).toBeNull();

  // Arriving now, on the facility’s today, with no form sent.
  const start = new Date(Date.now() - 5 * 60_000);
  const { data, error } = await db
    .from("bookings")
    .insert({
      facility_id: facilityId,
      client_id: pet!.client_id,
      service: "daycare",
      status: "confirmed",
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 6 * 3_600_000).toISOString(),
      base_price: 40,
      total_cost: 40,
      special_requests: MARKER,
    })
    .select("id, ref")
    .single();
  expect(error?.message ?? null).toBeNull();
  booking.id = data!.id as string;
  booking.ref = Number(data!.ref);
  await db
    .from("booking_pets")
    .insert({ booking_id: booking.id, pet_id: pet!.id });
});

test.afterAll(async ({ browser }) => {
  test.setTimeout(180_000);
  try {
    const db = admin();
    const { data: rows } = await db
      .from("bookings")
      .select("id")
      .eq("special_requests", MARKER);
    const ids = (rows ?? []).map((row) => row.id as string);
    if (ids.length > 0) {
      await db.from("automation_events").delete().in("booking_id", ids);
      await db.from("bookings").delete().in("id", ids);
    }
    if (!facilityId) return;
    if (saved.had) {
      await db
        .from("facility_settings")
        .update({ value: saved.value })
        .eq("facility_id", facilityId)
        .eq("domain", "yipyy_go_config");
    } else {
      await db
        .from("facility_settings")
        .delete()
        .eq("facility_id", facilityId)
        .eq("domain", "yipyy_go_config");
    }
  } finally {
    // Last, and asserted: a facility left with its drawer gate off is a silent
    // hole, and the spec guarding the gate would pass straight through it.
    await setRegisterGate(browser, true);
    if (facilityId) {
      const { data: hr } = await admin()
        .from("staff_hr_config")
        .select("require_register_open_on_login")
        .eq("facility_id", facilityId)
        .single();
      expect(
        hr?.require_register_open_on_login,
        "the drawer gate is back on",
      ).toBe(true);
    }
  }
});

/** The kiosk link the owner’s check-in code page is answered with. */
async function issueCode(browser: Browser): Promise<URL> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, ACCOUNTS.customer);
  const issued = page.waitForResponse(
    (response) =>
      response.url().includes(`/bookings/${booking.ref}/check-in-pass`) &&
      response.request().method() === "POST",
    { timeout: 120_000 },
  );
  await page.goto(`/customer/bookings/${booking.ref}/check-in-qr`);
  const answer = await issued;
  expect(answer.status()).toBe(201);
  const { url } = (await answer.json()) as { url: string };
  await context.close();
  return new URL(url);
}

test("a groomer gets the same refusal for a real daycare code as for a made-up one", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const link = await issueCode(browser);
  expect(link.pathname).toBe("/employee/check-in");
  const code = link.searchParams.get("code")!;

  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, ACCOUNTS.groomer);
  const resolve = (value: string) =>
    page.request.post("/api/yipyy-go/check-in-pass/resolve", {
      data: { code: value },
    });
  const real = await resolve(code);
  const madeUp = await resolve("A".repeat(43));
  expect(real.status()).toBe(404);
  expect(madeUp.status()).toBe(404);
  expect(await real.json()).toEqual(await madeUp.json());
  await context.close();
});

test("a code the owner issues opens the booking at reception, and the arrival is real", async ({
  browser,
}) => {
  test.setTimeout(300_000);
  const link = await issueCode(browser);

  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, ACCOUNTS.reception);
  await page.goto(`${link.pathname}${link.search}`);

  const checkIn = page.getByRole("button", { name: /^Check in Buddy/ });
  await expect(checkIn).toBeVisible({ timeout: 120_000 });
  // Read once, and out of the address of a shared desk.
  expect(new URL(page.url()).searchParams.get("code")).toBeNull();

  // A required form nobody sent: the desk has to say why.
  await checkIn.click();
  await expect(
    page.getByText("Write why, to check Buddy in without the form."),
  ).toBeVisible();
  await page.getByLabel("Why Buddy is checked in without it").fill(REASON);
  await checkIn.click();
  await expect(page.getByText("Buddy checked in")).toBeVisible({
    timeout: 60_000,
  });

  const db = admin();
  const { data: desk } = await db
    .from("yipyy_go_desk_checks")
    .select("source, form_missing, override_reason")
    .eq("booking_id", booking.id);
  expect(desk).toEqual([
    { source: "code", form_missing: true, override_reason: REASON },
  ]);
  const { data: presence } = await db
    .from("booking_presence")
    .select("arrived_at")
    .eq("booking_id", booking.id)
    .single();
  expect(presence?.arrived_at).toBeTruthy();
  const { data: events } = await db
    .from("automation_events")
    .select("kind, dedupe_key")
    .eq("booking_id", booking.id)
    .eq("kind", "check_in");
  expect(events).toEqual([
    { kind: "check_in", dedupe_key: `check_in:${booking.id}` },
  ]);
  await context.close();
});
