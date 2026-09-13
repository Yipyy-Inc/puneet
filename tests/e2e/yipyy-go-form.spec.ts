import { readFileSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";
import { defaultYipyyGoConfig } from "../../src/data/yipyygo-config";

// ============================================================================
// A pre-arrival form, from the owner’s first save to the facility’s approval.
//
// The form this replaces saved to a fixture keyed by booking, uploaded no
// photo, and was reviewed by staff in a modal that wrote the same fixture:
// nothing the owner did reached the facility, and nothing staff did reached
// the owner. So:
//
//   • a draft survives a reload, and so does its photo, a real file;
//   • the dashboard’s form reminder is there until the form is sent;
//   • staff ask for changes, the owner reads the facility’s own words on the
//     form and sends it again, and staff approve it — each a real row.
//
// Real writes to the shared database: the booking, its form and its photo —
// row and file — are deleted after, and the facility’s settings put back.
// ============================================================================

const MARKER = "[e2e yipyy-go-form]";
const CHANGES = "Add the dose for the evening medication.";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

let facilityId = "";
let clientRef = 0;
const saved = { had: false, value: null as unknown };
const booking = { id: "", ref: 0 };

async function next(page: Page) {
  await page.getByRole("button", { name: /^Continue to / }).click();
  await expect(
    page.getByRole("button", { name: /^Continue to |^Send / }),
  ).toBeEnabled({ timeout: 30_000 });
}

async function stepTo(page: Page, label: RegExp) {
  for (let i = 0; i < 12; i += 1) {
    if (
      await page
        .locator("[aria-current=step]")
        .filter({ hasText: label })
        .count()
    ) {
      return;
    }
    await next(page);
  }
  throw new Error(`never reached ${label}`);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const db = admin();
  const { data: pet } = await db
    .from("pets")
    .select("id, client_id, clients!inner(facility_id, ref)")
    .eq("ref", 1)
    .single();
  const owner = (
    pet as unknown as { clients: { facility_id: string; ref: number } }
  ).clients;
  facilityId = owner.facility_id;
  clientRef = owner.ref;

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
  config.formTemplate = {
    ...config.formTemplate,
    features: {
      ...config.formTemplate.features,
      photoUploads: true,
      belongingsPhotoRequired: false,
      addOnsSection: false,
      tipSection: false,
    },
  };
  const write = saved.had
    ? db
        .from("facility_settings")
        .update({ value: config })
        .eq("facility_id", facilityId)
        .eq("domain", "yipyy_go_config")
    : db
        .from("facility_settings")
        .insert({
          facility_id: facilityId,
          domain: "yipyy_go_config",
          value: config,
        });
  expect((await write).error?.message ?? null).toBeNull();

  const start = new Date(Date.now() + 7 * 86_400_000);
  start.setUTCHours(13, 0, 0, 0);
  const { data, error } = await db
    .from("bookings")
    .insert({
      facility_id: facilityId,
      client_id: pet!.client_id,
      service: "daycare",
      status: "confirmed",
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 9 * 3_600_000).toISOString(),
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

test.afterAll(async () => {
  const db = admin();
  const { data: rows } = await db
    .from("bookings")
    .select("id")
    .eq("special_requests", MARKER);
  const ids = (rows ?? []).map((row) => row.id as string);
  if (ids.length > 0) {
    const { data: forms } = await db
      .from("yipyy_go_submissions")
      .select("id")
      .in("booking_id", ids);
    const formIds = (forms ?? []).map((form) => form.id as string);
    if (formIds.length > 0) {
      const { data: photos } = await db
        .from("yipyy_go_photos")
        .select("storage_path")
        .in("submission_id", formIds);
      const paths = (photos ?? []).map((photo) => photo.storage_path as string);
      if (paths.length > 0)
        await db.storage.from("yipyy-go-photos").remove(paths);
    }
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
});

test("a draft and its photo survive a reload, and sending clears the dashboard reminder", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await signIn(page, ACCOUNTS.customer);
  const formPath = `/customer/bookings/${booking.ref}/yipyygo-form`;
  const reminder = page.locator(`a[href="${formPath}"]`);

  await page.goto("/customer/dashboard");
  await expect(reminder.first()).toBeVisible({ timeout: 90_000 });

  await page.goto(formPath);
  await expect(
    page.getByRole("heading", { name: /’s pre-arrival form/ }),
  ).toBeVisible({ timeout: 90_000 });
  await stepTo(page, /Belongings/);
  await page.locator("input[type=file]").setInputFiles({
    name: "labelled-bags.jpg",
    mimeType: "image/jpeg",
    buffer: readFileSync("public/dogs/dog-1.jpg"),
  });
  await expect(
    page.getByRole("button", { name: "Delete labelled-bags.jpg" }),
  ).toBeVisible({ timeout: 30_000 });
  // Moving on saves the draft.
  await stepTo(page, /Review/);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /’s pre-arrival form/ }),
  ).toBeVisible({ timeout: 90_000 });
  await stepTo(page, /Belongings/);
  await expect(
    page.getByRole("button", { name: "Delete labelled-bags.jpg" }),
  ).toBeVisible({ timeout: 30_000 });

  const { data: draft } = await admin()
    .from("yipyy_go_submissions")
    .select("status, answers")
    .eq("booking_id", booking.id)
    .single();
  expect(draft?.status).toBe("draft");
  expect(
    (draft?.answers as { belongingsPhotoId?: string } | null)
      ?.belongingsPhotoId,
  ).toBeTruthy();

  await stepTo(page, /Review/);
  await page.getByRole("button", { name: /^Send Buddy’s form/ }).click();
  await expect(
    page.getByRole("heading", { name: "Buddy’s form is sent" }),
  ).toBeVisible({ timeout: 60_000 });

  // What the reminder is derived from says the form counts now…
  const { data: state } = await admin()
    .from("booking_yipyy_go")
    .select("satisfied")
    .eq("booking_id", booking.id)
    .single();
  expect(state?.satisfied).toBe(true);

  // …and the dashboard, once it has drawn its stays and settled, no longer
  // asks for it. The list shows five stays, so the booking itself is no anchor.
  await page.goto("/customer/dashboard");
  await expect(page.getByText(/upcoming bookings/i).first()).toBeVisible({
    timeout: 90_000,
  });
  await page.waitForLoadState("networkidle");
  await expect(reminder).toHaveCount(0);
});

test("staff ask for changes, the owner sends the form again, and staff approve it", async ({
  browser,
}) => {
  test.setTimeout(420_000);
  const staffContext = await browser.newContext();
  const desk = await staffContext.newPage();
  await signIn(desk, ACCOUNTS.owner);
  await desk.goto(
    `/facility/dashboard/clients/${clientRef}/bookings/${booking.ref}`,
  );
  const card = desk.locator("#yipyy-go");
  const review = card.getByRole("button", { name: "Review Buddy’s form" });
  await expect(review).toBeVisible({ timeout: 120_000 });

  await review.click();
  await desk.getByRole("button", { name: "Ask for changes" }).click();
  await desk.getByLabel("What the owner should change").fill(CHANGES);
  await desk
    .getByRole("button", { name: "Open Buddy’s form for changes" })
    .click();
  await expect(desk.getByText("Buddy’s form is open for changes")).toBeVisible({
    timeout: 60_000,
  });

  // The owner reads the facility’s words on the form, and sends it again.
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await signIn(owner, ACCOUNTS.customer);
  await owner.goto(`/customer/bookings/${booking.ref}/yipyygo-form`);
  await expect(owner.getByText("The facility asked for changes")).toBeVisible({
    timeout: 90_000,
  });
  await expect(owner.getByText(CHANGES)).toBeVisible();
  await stepTo(owner, /Review/);
  await owner.getByRole("button", { name: /^Send Buddy’s form/ }).click();
  await expect(
    owner.getByRole("heading", { name: "Buddy’s form is sent" }),
  ).toBeVisible({ timeout: 60_000 });
  await ownerContext.close();

  await desk.reload();
  await expect(review).toBeVisible({ timeout: 120_000 });
  await review.click();
  await desk.getByRole("button", { name: "Approve Buddy’s form" }).click();
  await expect(desk.getByText("Buddy’s form approved")).toBeVisible({
    timeout: 60_000,
  });
  await expect(card.getByText("Form reviewed")).toBeVisible({
    timeout: 30_000,
  });

  const { data: form } = await admin()
    .from("yipyy_go_submissions")
    .select("status")
    .eq("booking_id", booking.id)
    .single();
  expect(form?.status).toBe("approved");
  await staffContext.close();
});
