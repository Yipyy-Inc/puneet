import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";
import { withoutTestItems } from "./_settings-snapshot";
import { defaultYipyyGoConfig } from "../../src/data/yipyygo-config";

// ============================================================================
// What a pre-arrival form puts on the bill (20260913135000).
//
// An owner's form can choose add-ons, carries the facility's medication fee
// when medications are listed, and can pledge a tip. The money is the
// server's: the catalogue prices every line, whatever the request says.
//
//   1. A sent form puts the chosen add-on on the bill at the catalogue's
//      price — a `price` smuggled into the request is ignored — with the
//      medication fee beside it, and pledges 10% of the bill as it then
//      stands.
//   2. Sending it again adds nothing twice.
//   3. A line staff took off the bill is not put back by the form.
//   4. The pledge is what the checkout starts at: the booking's tips, as
//      staff read them, carry it.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
//
// beforeAll gives the e2e facility a Yipyy Go setup and one more service
// add-on, reading both settings first. afterAll deletes the booking — its
// form, its lines and its charges go with it — and puts both settings back as
// they were.
// ============================================================================

const MARKER = "[e2e yipyy-go-charges]";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer.
const ADD_ON = "e2e-yipyy-go-extra-play";
const TEN_PERCENT = "e2e-yipyy-go-ten-percent";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let facilityId = "";
let bookingId = "";
let bookingRef = 0;
const saved: Record<string, { had: boolean; value: unknown }> = {};

async function remember(domain: string) {
  const { data } = await admin()
    .from("facility_settings")
    .select("value")
    .eq("facility_id", facilityId)
    .eq("domain", domain)
    .maybeSingle();
  // Cleaned as it is taken: this file's "Extra play" add-on was being put
  // back run after run, because the copy it restored already held it from a
  // run that died first. See `_settings-snapshot.ts`.
  saved[domain] = {
    had: Boolean(data),
    value: withoutTestItems(data?.value ?? null),
  };
}

async function put(domain: string, value: unknown) {
  const db = admin();
  const { error } = saved[domain].had
    ? await db
        .from("facility_settings")
        .update({ value })
        .eq("facility_id", facilityId)
        .eq("domain", domain)
    : await db
        .from("facility_settings")
        .insert({ facility_id: facilityId, domain, value });
  expect(error?.message ?? null).toBeNull();
}

async function restore(domain: string) {
  const entry = saved[domain];
  if (!entry || !facilityId) return;
  const db = admin();
  if (entry.had) {
    await db
      .from("facility_settings")
      .update({ value: entry.value })
      .eq("facility_id", facilityId)
      .eq("domain", domain);
  } else {
    await db
      .from("facility_settings")
      .delete()
      .eq("facility_id", facilityId)
      .eq("domain", domain);
  }
}

const BODY = {
  answers: {
    belongings: [],
    medications: [
      {
        id: "m1",
        name: "Apoquel",
        dosage: "16 mg",
        frequency: "once_daily",
        times: ["08:00"],
        method: "with_food",
      },
    ],
    noMedications: false,
  },
  // A price the request has no business sending; the catalogue decides.
  addOnRequests: [{ addOnId: ADD_ON, quantity: 2, price: 0.01 }],
  tip: { type: "preset", presetId: TEN_PERCENT },
};

interface SubmitAnswer {
  charges: {
    key: string;
    kind: string;
    unitPrice: number;
    quantity: number;
    onBill: boolean;
  }[];
  tipAmount: number | null;
}

async function send(request: APIRequestContext): Promise<SubmitAnswer> {
  const res = await request.post(
    `/api/customer/yipyy-go/bookings/${bookingRef}/pets/${BUDDY}/submit`,
    { data: BODY },
  );
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as SubmitAnswer;
}

async function bill() {
  const db = admin();
  const [{ data: lines }, { data: booking }] = await Promise.all([
    db
      .from("booking_line_items")
      .select("id, kind, unit_price, quantity, source_id")
      .eq("booking_id", bookingId)
      .like("source_id", "yipyy-go:%"),
    db
      .from("bookings")
      .select("amount_due, tip_amount")
      .eq("id", bookingId)
      .single(),
  ]);
  return {
    lines: (lines ?? []).map((line) => ({
      id: line.id as string,
      sourceId: line.source_id as string,
      unitPrice: Number(line.unit_price),
      quantity: Number(line.quantity),
    })),
    amountDue: Number(booking?.amount_due ?? 0),
    tip: booking?.tip_amount === null ? null : Number(booking?.tip_amount),
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const db = admin();
  const { data: pet, error: petError } = await db
    .from("pets")
    .select("id, client_id, clients!inner(facility_id)")
    .eq("ref", BUDDY)
    .single();
  expect(petError?.message ?? null).toBeNull();
  facilityId = (pet as unknown as { clients: { facility_id: string } }).clients
    .facility_id;

  await remember("yipyy_go_config");
  await remember("service_addons");

  const config = structuredClone(defaultYipyyGoConfig);
  config.enabled = true;
  config.addOnsApproval = "auto";
  config.notifyStaffEmailOnSubmit = false;
  config.confirmationEmail = { ...config.confirmationEmail!, enabled: false };
  config.medicationFee = {
    enabled: true,
    amount: 5,
    billing: "per_stay",
    label: `${MARKER} Medication fee`,
  };
  config.tipPopup = {
    enabled: true,
    title: "Thank the team",
    message: "Tips go to the people looking after your dog.",
    appliesTo: "stay_total",
    allowCustomAmount: true,
    allowSkip: true,
    presets: [
      { id: TEN_PERCENT, label: "10%", type: "percentage", value: 10 },
      { id: "e2e-yipyy-go-five", label: "$5", type: "fixed", value: 5 },
    ],
  };
  config.serviceConfigs = config.serviceConfigs.map((service) =>
    service.serviceType === "daycare"
      ? { ...service, enabled: true, requirement: "mandatory" as const }
      : service,
  );
  config.formTemplate = {
    ...config.formTemplate,
    features: {
      ...config.formTemplate.features,
      addOnsSection: true,
      tipSection: true,
      belongingsPhotoRequired: false,
    },
  };
  await put("yipyy_go_config", config);

  // The facility's own add-ons stay; this one joins them for the run.
  const existing = (saved.service_addons.value ?? {}) as {
    addOns?: unknown[];
    categories?: unknown[];
  };
  await put("service_addons", {
    ...existing,
    categories: existing.categories ?? [],
    addOns: [
      ...(existing.addOns ?? []),
      {
        id: ADD_ON,
        name: `${MARKER} Extra play`,
        description: "Thirty more minutes outside",
        pricingType: "per_day",
        price: 7.5,
        maxQuantity: 3,
        petScope: "per_pet",
        applicableServices: ["daycare"],
        requiresScheduling: false,
        generatesTask: false,
        isActive: true,
      },
    ],
  });

  // One facility-local day, so a per-day add-on counts once.
  const start = new Date(Date.now() + 6 * 86_400_000);
  start.setUTCHours(13, 0, 0, 0);
  const end = new Date(start.getTime() + 9 * 3_600_000);
  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .insert({
      facility_id: facilityId,
      client_id: pet!.client_id,
      service: "daycare",
      status: "confirmed",
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      base_price: 100,
      total_cost: 100,
      special_requests: MARKER,
    })
    .select("id, ref")
    .single();
  expect(bookingError?.message ?? null).toBeNull();
  bookingId = booking!.id as string;
  bookingRef = Number(booking!.ref);

  const { error: linkError } = await db
    .from("booking_pets")
    .insert({ booking_id: bookingId, pet_id: pet!.id });
  expect(linkError?.message ?? null).toBeNull();
});

test.afterAll(async () => {
  const db = admin();
  if (bookingId) await db.from("bookings").delete().eq("id", bookingId);
  await db.from("bookings").delete().eq("special_requests", MARKER);
  await restore("service_addons");
  await restore("yipyy_go_config");
});

test.describe("what a pre-arrival form puts on the bill", () => {
  test("the add-on at the catalogue's price, the medication fee, and 10% pledged", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.customer);

    // The offer the form shows is priced by the server.
    const offer = await page.request.get(
      `/api/customer/yipyy-go/bookings/${bookingRef}`,
    );
    expect(offer.ok(), await offer.text()).toBe(true);
    const offered = (
      (await offer.json()) as {
        offeredAddOns: { id: string; unitPrice: number }[];
      }
    ).offeredAddOns.find((item) => item.id === ADD_ON);
    expect(offered?.unitPrice).toBe(7.5);

    const answer = await send(page.request);
    const addOn = answer.charges.find((charge) => charge.kind === "add_on");
    const fee = answer.charges.find(
      (charge) => charge.kind === "medication_fee",
    );
    // Two a day, for one day, at $7.50 — not the $0.01 the request said.
    expect(addOn).toMatchObject({ unitPrice: 7.5, quantity: 2, onBill: true });
    expect(fee).toMatchObject({ unitPrice: 5, quantity: 1, onBill: true });

    const after = await bill();
    expect(after.lines).toHaveLength(2);
    // $100 + $15 + $5, and 10% of it, pledged once the lines were on it.
    expect(after.amountDue).toBe(120);
    expect(after.tip).toBe(12);
    expect(answer.tipAmount).toBe(12);
  });

  test("sending it again adds nothing twice", async ({ page }) => {
    test.slow();
    await signIn(page, ACCOUNTS.customer);
    await send(page.request);
    const after = await bill();
    expect(after.lines).toHaveLength(2);
    expect(after.amountDue).toBe(120);
    expect(after.tip).toBe(12);
  });

  test("a line staff took off the bill is not put back", async ({ page }) => {
    test.slow();
    const before = await bill();
    const addOnLine = before.lines.find((line) =>
      line.sourceId.includes(ADD_ON),
    );
    expect(addOnLine, "the add-on line is on the bill").toBeTruthy();
    const { error } = await admin()
      .from("booking_line_items")
      .delete()
      .eq("id", addOnLine!.id);
    expect(error?.message ?? null).toBeNull();

    await signIn(page, ACCOUNTS.customer);
    const answer = await send(page.request);
    expect(
      answer.charges.find((charge) => charge.kind === "add_on")?.onBill,
    ).toBe(false);
    const after = await bill();
    expect(after.lines.map((line) => line.unitPrice)).toEqual([5]);
  });

  test("the pledge is what the checkout starts at", async ({ page }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.get(`/api/bookings/${bookingRef}/tips`);
    expect(res.ok(), await res.text()).toBe(true);
    const tips = (await res.json()) as {
      tipOnBooking: number;
      tipCollected: number;
    };
    const { tip } = await bill();
    expect(tip).not.toBeNull();
    expect(tips.tipOnBooking).toBe(tip!);
    expect(tips.tipCollected).toBe(0);
  });
});
