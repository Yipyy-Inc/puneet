import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// "ADD SERVICE CHARGES" — MoéGo's picker, and the once-per-appointment rule
// made VISIBLE.
//
// `autoApply: "none"` is MoéGo's DEFAULT for a custom fee: somebody chooses it
// at the till. We offered that mode in the editor, persisted it, and then had
// nowhere to choose it from — so the default meant "never".
//
// What this proves:
//
//   P1  a fee nothing applies automatically can be put on a bill by hand,
//       and the line carries the rule that charged it
//   P2  `amount_due` moves by the fee exactly once
//   P3  a fee already on the bill comes back as added and DISABLED — the
//       constraint surfaced before the 409 rather than after it
//   P4  a fee scoped to another service is never offered here
//
// ── IT PUTS THE FACILITY'S PRICING RULES BACK ────────────────────────────
//
// There is one Postgres and CI writes to it. `pricing_rules` is read in
// `beforeAll` and written back in `afterAll` WHATEVER HAPPENED, the same shape
// service-charges.spec.ts and booking-checkout-truth.spec.ts use.
// ============================================================================

const MARKER = "[e2e sc-picker]";
const SETTINGS = "/api/facility/settings";
const ALICE = { client: 15, pet: 1 };

const HANDLING_FEE = {
  id: "e2e-scp-handling",
  name: `${MARKER} Extra handling`,
  amount: 22,
  feeType: "flat" as const,
  scope: "per_booking" as const,
  // The mode that had nowhere to be chosen from.
  autoApply: "none" as const,
  applicableServices: ["all"],
  isActive: true,
};

const GROOMING_ONLY_FEE = {
  ...HANDLING_FEE,
  id: "e2e-scp-grooming",
  name: `${MARKER} Grooming only`,
  amount: 9,
  applicableServices: ["grooming"],
};

interface BookingPayload {
  id: number;
  totalCost?: number;
  amountDue?: number;
}

interface LineItem {
  id: string;
  name: string;
  price: number;
  feeId?: string;
}

let originalPricingRules: Record<string, unknown> | null = null;
const made: number[] = [];

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function writePricingRules(page: Page, value: unknown) {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: "pricing_rules", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
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

/** Open the picker from the booking page's overflow menu. */
async function openPicker(page: Page, ref: number) {
  await page.goto(
    `/facility/dashboard/clients/${ALICE.client}/bookings/${ref}`,
  );
  const more = page.getByRole("button", { name: /more actions/i }).first();
  await expect(more).toBeVisible({ timeout: 30_000 });
  await more.click();
  await page.getByRole("menuitem", { name: /add service charges/i }).click();
  const dialog = page
    .getByRole("dialog")
    .filter({ hasText: /add service charges/i });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.get(SETTINGS);
    expect(res.ok(), await res.text()).toBe(true);
    const body = (await res.json()) as Record<
      string,
      { value: Record<string, unknown> } | undefined
    >;
    originalPricingRules = body.pricing_rules?.value ?? null;
    await writePricingRules(page, {
      ...(originalPricingRules ?? {}),
      customFees: [HANDLING_FEE, GROOMING_ONLY_FEE],
    });
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

test.describe("adding a service charge by hand", () => {
  let ref = 0;

  test("a manual fee reaches the bill, named, and is charged once", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        facilityId: 0,
        service: "boarding",
        startDate: day(50),
        endDate: day(52),
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 160,
        discount: 0,
        totalCost: 160,
        specialRequests: MARKER,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    ref = ((await created.json()) as { id: number }).id;
    made.push(ref);

    // Nothing applies it: `autoApply: "none"` is not in the automatic set.
    expect(
      (await lines(page, ref)).filter((l) => l.name.includes("Extra handling")),
      "a manual fee is not applied automatically",
    ).toHaveLength(0);

    const dialog = await openPicker(page, ref);

    // P4: a fee for another service is not on this boarding booking's list.
    await expect(dialog.getByText("Grooming only")).toHaveCount(0);

    await dialog.getByRole("button", { name: /extra handling/i }).click();
    await dialog.getByRole("button", { name: /add .*to the bill/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    // P1: on the bill, under the facility's own name, carrying the rule id.
    await expect
      .poll(
        async () =>
          (await lines(page, ref)).find((l) =>
            l.name.includes("Extra handling"),
          )?.price,
        { timeout: 15_000 },
      )
      .toBe(22);
    const fee = (await lines(page, ref)).find((l) =>
      l.name.includes("Extra handling"),
    );
    expect(fee?.feeId, "the line names the rule that charged it").toBe(
      HANDLING_FEE.id,
    );

    // P2: the service's price is untouched; the customer owes it once.
    const after = await booking(page, ref);
    expect(after?.totalCost, "total_cost is still the service").toBe(160);
    expect(after?.amountDue, "the fee is owed exactly once").toBe(182);
  });

  test("a fee already on the bill comes back as added, and cannot be added twice", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const dialog = await openPicker(page, ref);

    // P3: the constraint, before the 409 rather than after it.
    const row = dialog.getByRole("button", { name: /extra handling/i });
    await expect(row).toBeDisabled();
    await expect(dialog.getByText(/already on this bill/i)).toBeVisible();

    // Nothing is selectable, so nothing can be added.
    await expect(
      dialog.getByRole("button", { name: /add to the bill/i }),
    ).toBeDisabled();

    await dialog.getByRole("button", { name: /go back/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    // The bill did not move.
    expect((await booking(page, ref))?.amountDue).toBe(182);
    expect(
      (await lines(page, ref)).filter((l) => l.feeId === HANDLING_FEE.id),
      "one line, not two",
    ).toHaveLength(1);
  });
});
