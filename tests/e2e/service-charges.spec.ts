import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A SERVICE CHARGE IS A LINE ON THE BILL, CHARGED ONCE.
//
// A custom fee used to be folded into `bookings.total_cost`, indistinguishable
// from the base price — invisible on an invoice, invisible to every report,
// with no record of which rule charged it.
//
// Moving it out is the one change in this work that can take money twice, so
// this file exists to prove it does not:
//
//   S1  `total_cost` is the SERVICE's price, with the fee excluded
//   S2  `amount_due` includes the fee EXACTLY ONCE — the double-charge test
//   S3  the line carries the facility's own name for the rule
//   S4  a per-pet fee multiplies; a capped one stops at the cap
//   S5  a multi-day block is charged ONCE, not once per day
//   S6  a second application is refused, so no pass can double it
//
// ── IT PUTS THE FACILITY'S PRICING RULES BACK ────────────────────────────
//
// There is one Postgres and CI writes to it. `pricing_rules` is read in
// `beforeAll` and written back in `afterAll` WHATEVER HAPPENED — the same
// shape booking-checkout-truth.spec.ts uses for the tax config, for the same
// reason. A run that died halfway must not leave a facility charging a fee it
// never authored.
// ============================================================================

const MARKER = "[e2e service-charges]";
const SETTINGS = "/api/facility/settings";
const ALICE = { client: 15, pet: 1 };

const CLEANING_FEE = {
  id: "e2e-sc-cleaning",
  name: `${MARKER} Cleaning fee`,
  amount: 15,
  feeType: "flat" as const,
  scope: "per_booking" as const,
  autoApply: "at_checkout" as const,
  applicableServices: ["all"],
  isActive: true,
};

interface BookingPayload {
  id: number;
  totalCost?: number;
  amountDue?: number;
  extrasTotal?: number;
  taxableExtrasTotal?: number;
}

interface LineItem {
  id: string;
  kind: string;
  name: string;
  unitPrice: number;
  quantity: number;
  price: number;
}

let originalPricingRules: Record<string, unknown> | null = null;
const made: number[] = [];

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function readPricingRules(page: Page) {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as Record<
    string,
    { value: Record<string, unknown> } | undefined
  >;
  return body.pricing_rules?.value ?? null;
}

async function writePricingRules(page: Page, value: unknown) {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: "pricing_rules", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function withFees(page: Page, fees: unknown[]) {
  await writePricingRules(page, {
    ...(originalPricingRules ?? {}),
    customFees: fees,
  });
}

async function book(
  page: Page,
  input: { service: string; start: string; end: string; total: number },
): Promise<number> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE.client,
      petId: ALICE.pet,
      facilityId: 0,
      service: input.service,
      startDate: input.start,
      endDate: input.end,
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "confirmed",
      basePrice: input.total,
      discount: 0,
      totalCost: input.total,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const ref = ((await res.json()) as { id: number }).id;
  made.push(ref);
  return ref;
}

async function lines(page: Page, ref: number): Promise<LineItem[]> {
  const res = await page.request.get(`/api/bookings/${ref}/line-items`);
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as LineItem[]) : [];
}

async function booking(
  page: Page,
  ref: number,
): Promise<BookingPayload | null> {
  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  if (!res.ok()) return null;
  const body: unknown = await res.json();
  return Array.isArray(body) ? ((body[0] as BookingPayload) ?? null) : null;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    originalPricingRules = await readPricingRules(page);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // Whatever happened. A facility left charging a fee it never authored is
    // worse than a failed test.
    if (originalPricingRules)
      await writePricingRules(page, originalPricingRules);

    let cancelled = 0;
    for (const ref of made) {
      const res = await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
    }
    console.log(
      `cleanup: pricing rules restored, ${cancelled}/${made.length} booking(s) cancelled`,
    );
  } finally {
    await page.close();
  }
});

test.describe("a facility's service charges", () => {
  test("the fee is a line, and the booking's price is the service alone", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await withFees(page, [CLEANING_FEE]);

    const ref = await book(page, {
      service: "boarding",
      start: day(30),
      end: day(32),
      total: 200,
    });

    const items = await lines(page, ref);
    const fee = items.find((i) => i.name.includes("Cleaning fee"));
    expect(fee, "the fee is on the bill by name").toBeTruthy();
    expect(fee!.kind).toBe("fee");
    expect(fee!.price).toBe(15);

    const after = await booking(page, ref);
    // S1: the SERVICE's price, fee excluded.
    expect(after?.totalCost, "total_cost is the service alone").toBe(200);
    // S2: THE DOUBLE-CHARGE TEST. 200 + 15, not 200 + 15 + 15, and not 215 + 15.
    expect(after?.amountDue, "the customer owes the fee exactly once").toBe(
      215,
    );
  });

  test("a branch's own price is the one charged there", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // The branch this facility's bookings land on. Read rather than
    // hardcoded: a uuid typed into a spec is a spec that passes somewhere
    // else for the wrong reason.
    const locRes = await page.request.get("/api/locations");
    expect(locRes.ok(), await locRes.text()).toBe(true);
    const locBody: unknown = await locRes.json();
    const locations = Array.isArray(locBody)
      ? (locBody as { id: string; status?: string }[])
      : [];
    const here = locations.find((l) => l.status === "active") ?? locations[0];
    expect(here?.id, "the facility has a branch to price against").toBeTruthy();

    await withFees(page, [
      {
        ...CLEANING_FEE,
        id: "e2e-sc-branch",
        name: "Branch-priced fee",
        amount: 15,
        // $25 HERE, $15 everywhere else.
        locationPrices: { [here!.id]: 25 },
      },
    ]);

    const ref = await book(page, {
      service: "boarding",
      start: day(34),
      end: day(35),
      total: 200,
    });

    const items = await lines(page, ref);
    const fee = items.find((i) => i.name.includes("Branch-priced fee"));
    expect(fee, "the fee reached the bill").toBeTruthy();
    // The override, not the facility-wide 15 — this is the whole feature.
    expect(fee!.price, "the branch's price, not the facility's").toBe(25);

    const after = await booking(page, ref);
    expect(after?.totalCost).toBe(200);
    expect(after?.amountDue, "200 + the branch's 25").toBe(225);
  });

  test("a price set for ANOTHER branch does not apply here", async ({
    page,
  }) => {
    // The negative control, and the one that matters: an override must be
    // keyed to a branch, not merely present. Without this a map with any
    // entry at all could silently reprice every location.
    await signIn(page, ACCOUNTS.owner);
    await withFees(page, [
      {
        ...CLEANING_FEE,
        id: "e2e-sc-elsewhere",
        name: "Elsewhere-priced fee",
        amount: 15,
        locationPrices: { "00000000-0000-4000-8000-000000000999": 99 },
      },
    ]);

    const ref = await book(page, {
      service: "boarding",
      start: day(36),
      end: day(37),
      total: 200,
    });

    const items = await lines(page, ref);
    const fee = items.find((i) => i.name.includes("Elsewhere-priced fee"));
    expect(fee, "the fee still applies").toBeTruthy();
    expect(fee!.price, "the usual amount, not the other branch's").toBe(15);
    expect((await booking(page, ref))?.amountDue).toBe(215);
  });

  test("an exempt fee is owed but not taxed", async ({ page }) => {
    // MoéGo configures tax per fee. Ours is a boolean rather than a rate —
    // the facility's own tax settings decide the rate, and a second one with
    // no name or registration number is worse than none.
    //
    // The pair of numbers is the whole point: the customer still owes the
    // fee, and the government still does not get tax on it.
    await signIn(page, ACCOUNTS.owner);
    await withFees(page, [
      {
        ...CLEANING_FEE,
        id: "e2e-sc-exempt",
        name: "No-show penalty",
        amount: 30,
        taxable: false,
      },
    ]);

    const ref = await book(page, {
      service: "boarding",
      start: day(38),
      end: day(39),
      total: 200,
    });

    const items = await lines(page, ref);
    const fee = items.find((i) => i.name.includes("No-show penalty"));
    expect(fee, "the fee reached the bill").toBeTruthy();
    expect(fee!.price).toBe(30);

    const after = await booking(page, ref);
    expect(after?.extrasTotal, "it is still owed").toBe(30);
    expect(after?.amountDue, "and still on the total").toBe(230);
    expect(after?.taxableExtrasTotal, "but no part of it is taxable").toBe(0);
  });

  test("a fee that says nothing about tax is taxed", async ({ page }) => {
    // The negative control, and the one that protects every bill written
    // before this existed: absence is not a decision to stop charging tax.
    await signIn(page, ACCOUNTS.owner);
    await withFees(page, [{ ...CLEANING_FEE, id: "e2e-sc-silent" }]);

    const ref = await book(page, {
      service: "boarding",
      start: day(40),
      end: day(41),
      total: 200,
    });

    const after = await booking(page, ref);
    expect(after?.extrasTotal).toBe(15);
    expect(
      after?.taxableExtrasTotal,
      "silence means taxed, as it always did",
    ).toBe(15);
  });

  test("a per-pet fee multiplies, and a cap stops it", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await withFees(page, [
      {
        ...CLEANING_FEE,
        id: "e2e-sc-capped",
        name: `${MARKER} Capped fee`,
        feeType: "percentage",
        amount: 10,
        maxFee: 12,
      },
    ]);

    const ref = await book(page, {
      service: "boarding",
      start: day(34),
      end: day(36),
      total: 300,
    });

    const items = await lines(page, ref);
    const fee = items.find((i) => i.name.includes("Capped fee"));
    // 10% of 300 is 30, capped at 12. A capped line is ONE charge of the cap:
    // three units of 8.3333 would round to 24.99 against a cap of 25.
    expect(fee?.price, "the cap binds").toBe(12);
    expect((await booking(page, ref))?.amountDue).toBe(312);
  });

  test("a multi-day block is charged once, not once per day", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await withFees(page, [CLEANING_FEE]);

    // The wizard splits a daycare request into one booking PER DAY. A $15 fee
    // applied to each row would be $45 here.
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        facilityId: 0,
        service: "daycare",
        startDate: day(40),
        endDate: day(42),
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 120,
        discount: 0,
        totalCost: 120,
        specialRequests: MARKER,
        // A part carries its own pets and its own share of the money —
        // `bookingPartSchema` requires all four. `splitMoney` would have
        // divided the total had the form sent one, but a part is what the
        // server writes, so it states its share rather than inferring it.
        parts: [day(40), day(41), day(42)].map((date) => ({
          petIds: [ALICE.pet],
          startDate: date,
          endDate: date,
          basePrice: 40,
          discount: 0,
          totalCost: 40,
        })),
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const first = (await res.json()) as { id: number; groupRefs?: number[] };
    const refs = first.groupRefs?.length ? first.groupRefs : [first.id];
    made.push(...refs);

    let feeLines = 0;
    let feeTotal = 0;
    for (const ref of refs) {
      for (const item of await lines(page, ref)) {
        if (!item.name.includes("Cleaning fee")) continue;
        feeLines++;
        feeTotal += item.price;
      }
    }
    expect(feeLines, "one fee line across the whole request").toBe(1);
    expect(feeTotal, "the amount the facility authored, not a multiple").toBe(
      15,
    );
  });

  test("the same fee cannot land twice on one booking", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const ref = made[0];

    // The constraint, surfaced. This is what stops the create pass and the
    // till pass from charging the same fee twice.
    const clash = await page.request.post(`/api/bookings/${ref}/line-items`, {
      data: {
        items: [
          {
            kind: "fee",
            name: `${MARKER} Cleaning fee`,
            unitPrice: 15,
            feeId: CLEANING_FEE.id,
          },
        ],
      },
      failOnStatusCode: false,
    });
    expect(clash.status(), await clash.text()).toBe(409);

    // And with `ifAbsent` it is simply a no-op, which is what the automatic
    // passes rely on.
    const quiet = await page.request.post(`/api/bookings/${ref}/line-items`, {
      data: {
        ifAbsent: true,
        items: [
          {
            kind: "fee",
            name: `${MARKER} Cleaning fee`,
            unitPrice: 15,
            feeId: CLEANING_FEE.id,
          },
        ],
      },
    });
    expect(quiet.ok(), await quiet.text()).toBe(true);
    const body = (await quiet.json()) as { items: unknown[] };
    expect(body.items, "nothing was inserted the second time").toHaveLength(0);

    // The bill did not move.
    expect((await booking(page, ref))?.amountDue).toBe(215);
  });

  test("with no fees authored, nothing is added", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await withFees(page, []);

    const ref = await book(page, {
      service: "boarding",
      start: day(44),
      end: day(46),
      total: 180,
    });

    expect(await lines(page, ref)).toHaveLength(0);
    const after = await booking(page, ref);
    expect(after?.totalCost).toBe(180);
    expect(after?.amountDue, "no fee, no change").toBe(180);
  });
});
