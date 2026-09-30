import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { cancelBookingsMarked } from "./_sweep";

// ============================================================================
// A FACILITY DECIDES WHICH SERVICES NEED ITS APPROVAL.
//
// Every booking a customer makes arrives as a REQUEST with its price zeroed —
// `private.enforce_booking_integrity` insists, because the number came from
// their browser. A facility can now say a service needs no approval, and a
// booking for it is confirmed on the spot.
//
// The switch existed once before as a fake: it lived in localStorage, nothing
// read it, and "Direct booking — customers are confirmed instantly" was never
// true. It was deleted for that. This file is why it can exist again.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// T1  OFF is the default and the default is a request. Every facility that has
//     never touched this keeps exactly the behaviour it had.
// T2  ON, priced from the facility's own rates, and agreeing with what the
//     customer was shown → confirmed, at the SERVER's price.
// T3  THE SAFETY PROPERTY. ON, but the customer's quote disagrees with the
//     facility's rates → still a request. Nobody is charged a number they were
//     never shown, and nothing is confirmed at a price the server did not
//     derive.
// T4  A customer cannot confirm their own booking by asking.
//
// The setting is restored in afterAll. Leaving daycare auto-confirming on the
// shared e2e facility would quietly change what every other booking spec
// means.
// ============================================================================

const MARKER = "[e2e booking-auto-confirm]";
const ALICE = { client: 15, pet: 1 };
/** What the e2e facility's daycare rate card charges for a full day. */
const FULL_DAY = 38;

// ── GROOMING'S NUMBER, AND WHERE EACH HALF COMES FROM ─────────────────────
//
// Buddy weighs 25 lb. The facility's `grooming_config.pet_size_tiers` puts
// anything over 15 and up to 35 in "medium", and Basic Bath's medium price is
// 35. So create_booking resolves the size, and the server prices it from the
// facility's own `grooming_service_size_prices` row for that pairing.
//
// Written out rather than read from the database at runtime BECAUSE it is the
// assertion: a spec that asked the same tables the code asks would agree with
// itself no matter what either did.
const GROOM_SERVICE = "groom-pkg-001"; // Basic Bath
const GROOM_MEDIUM = 35;

/** Half of a $38 full day. Percentage, so the maths is the code's not mine. */
const DEPOSIT_PERCENT = 50;
const DEPOSIT_ON_FULL_DAY = FULL_DAY / 2;
const DEPOSIT_LABEL = "[e2e] daycare deposit";

const made: number[] = [];

/** The facility's deposit rules, as they were before this spec ran. */
let priorDeposits: unknown = null;

async function depositSetting(page: Page): Promise<Record<string, unknown>> {
  const res = await page.request.get("/api/facility/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as Record<string, { value?: unknown }>;
  return (all.deposit_rules?.value ?? {}) as Record<string, unknown>;
}

async function writeDeposits(page: Page, value: unknown) {
  const res = await page.request.patch("/api/facility/settings", {
    data: { domain: "deposit_rules", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

/** One enabled daycare rule, every other rule left exactly as it was. */
async function setDaycareDeposit(page: Page, percent: number | null) {
  const current = await depositSetting(page);
  if (priorDeposits === null) priorDeposits = structuredClone(current);

  const rules = ((current.rules ?? []) as Array<Record<string, unknown>>).map(
    (rule) =>
      rule.scope === "service" && rule.serviceType === "daycare"
        ? {
            ...rule,
            enabled: percent !== null,
            amountType: "percentage",
            amount: percent ?? 0,
            label: DEPOSIT_LABEL,
          }
        : rule,
  );
  await writeDeposits(page, { ...current, rules });
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function approvalSetting(page: Page): Promise<Record<string, unknown>> {
  const res = await page.request.get("/api/facility/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as Record<string, unknown>;
  return (all.booking_approval ?? {}) as Record<string, unknown>;
}

async function setAutoConfirm(page: Page, value: Record<string, boolean>) {
  const current = await approvalSetting(page);
  const res = await page.request.patch("/api/facility/settings", {
    data: {
      domain: "booking_approval",
      value: {
        ...current,
        // Required by the schema, and absent on a facility that has never
        // saved this domain — which is every facility until it does.
        responseHours: current.responseHours ?? {},
        autoConfirm: value,
      },
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

/** A customer's daycare booking, quoting `total`. */
async function bookGroomingAsCustomer(page: Page, total: number) {
  return page.request.post("/api/bookings", {
    data: {
      clientId: ALICE.client,
      petId: ALICE.pet,
      service: "grooming",
      startDate: day(15),
      endDate: day(15),
      checkInTime: "10:00",
      checkOutTime: "11:00",
      status: "confirmed",
      basePrice: total,
      discount: 0,
      totalCost: total,
      specialRequests: MARKER,
      // The RPC takes the service from `serviceType` (groomingFor() in the
      // route) — the payload carries CHOICES, never money.
      serviceType: GROOM_SERVICE,
    },
  });
}

async function bookAsCustomer(page: Page, total: number, discount = 0) {
  return page.request.post("/api/bookings", {
    data: {
      clientId: ALICE.client,
      petId: ALICE.pet,
      service: "daycare",
      startDate: day(14),
      endDate: day(14),
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "confirmed",
      basePrice: total,
      discount,
      totalCost: total,
      specialRequests: MARKER,
    },
  });
}

test.describe("a facility decides which services need its approval", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      // The setting first: a spec that leaves this on changes what every
      // other booking spec means.
      await setAutoConfirm(page, {});
      // The deposit rules as they were — a spec that leaves one enabled asks
      // every later booking on this facility for money nobody configured.
      if (priorDeposits !== null) await writeDeposits(page, priorDeposits);

      let cancelled = 0;
      for (const ref of made) {
        const res = await page.request.patch(`/api/bookings/${ref}`, {
          data: { status: "cancelled" },
        });
        if (res.ok()) cancelled += 1;
      }
      console.log(
        `cleanup: auto-confirm cleared, ${cancelled} booking(s) cancelled`,
      );
    } finally {
      await page.close();
      // A LIST ONLY KNOWS WHAT THE TESTS REACHED THE LINE TO RECORD. A run
      // that dies between creating a booking and recording it leaves the row
      // CONFIRMED, and `purge_e2e_bookings()` only ever deletes rows already
      // CANCELLED — so nothing collects it, ever. Found 2026-09-23 with rows
      // from this spec sitting in the shared database since 2026-09-20.
      //
      // Inside the finally, because the cleanup above can throw, and a
      // backstop that runs only on the happy path is not one.
      await cancelBookingsMarked(browser, MARKER, "after");
    }
  });

  test("off by default: a customer's booking is a request", async ({
    page,
  }) => {
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setAutoConfirm(staff, {});
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookAsCustomer(page, FULL_DAY);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number; status: string };
    made.push(booking.id);

    // The trigger's own answer, unchanged by any of this.
    expect(booking.status).toBe("request_submitted");
  });

  test("on, and priced from the facility's rates: confirmed", async ({
    page,
  }) => {
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setAutoConfirm(staff, { daycare: true });
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookAsCustomer(page, FULL_DAY);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as {
      id: number;
      status: string;
      totalCost?: number;
    };
    made.push(booking.id);

    expect(booking.status, "confirmed without staff touching it").toBe(
      "confirmed",
    );
    // The SERVER's number, from the facility's rate card — not the one the
    // browser posted, even though here they agree.
    expect(booking.totalCost).toBe(FULL_DAY);
  });

  test("on, but the quote disagrees with the rates: still a request", async ({
    page,
  }) => {
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setAutoConfirm(staff, { daycare: true });
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    // A browser asking to be charged a dollar for a day that costs 38.
    const res = await bookAsCustomer(page, 1);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number; status: string };
    made.push(booking.id);

    expect(
      booking.status,
      "a price the server did not derive is never confirmed",
    ).toBe("request_submitted");
  });

  // Until 2026-09-30 this was confirmed at the full $38 and the $5 the
  // customer was shown off it was dropped: they were billed more than they
  // were told. The server checks the day's price and cannot work out a
  // discount again, and taking the browser's word for one would let anyone
  // give themselves one — so staff decide it, and the quote keeps it.
  test("on and priced right, but with a discount: left to staff, who keep it", async ({
    page,
  }) => {
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setAutoConfirm(staff, { daycare: true });
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookAsCustomer(page, FULL_DAY, 5);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number; status: string };
    made.push(booking.id);
    expect(booking.status, "never confirmed at the full price").toBe(
      "request_submitted",
    );

    await signIn(page, ACCOUNTS.owner);
    const decided = await page.request.post(
      `/api/bookings/${booking.id}/decision`,
      { data: { action: "approve", atQuote: true } },
    );
    expect(decided.status(), await decided.text()).toBe(200);
    const after = await page.request.get(`/api/bookings?ref=${booking.id}`);
    const [row] = (await after.json()) as Array<{
      status: string;
      totalCost?: number;
      extrasTotal?: number;
      discount?: number;
      amountDue?: number;
    }>;
    expect(row.status).toBe("confirmed");
    expect(row.totalCost).toBe(FULL_DAY);
    expect(row.discount).toBe(5);
    // The day less the discount, and whatever the facility bills on top.
    expect(row.amountDue, "what the customer was shown").toBe(
      FULL_DAY - 5 + (row.extrasTotal ?? 0),
    );
  });

  test("grooming confirms at the size the database picked", async ({
    page,
  }) => {
    // The gap the client asked about: the switch was offered for every service
    // and grooming could never act on it, because the server returned
    // `cannot_price`. It reads the size create_booking already chose now.
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setAutoConfirm(staff, { grooming: true });
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookGroomingAsCustomer(page, GROOM_MEDIUM);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number };
    made.push(booking.id);

    const read = await page.request.get(`/api/bookings?ref=${booking.id}`);
    const [row] = (await read.json()) as Array<{
      status: string;
      totalCost: number;
    }>;
    expect(row?.status, "grooming still arrived as a request").toBe(
      "confirmed",
    );
    // The facility's medium price, not the number the customer posted — they
    // agree here, and the point is which one was written.
    expect(row?.totalCost).toBe(GROOM_MEDIUM);
  });

  test("grooming at the WRONG price stays a request", async ({ page }) => {
    // The safety property. The server knows less than the wizard — no coat, no
    // breed, no groomer tier — so a facility using those gets a disagreement,
    // and a disagreement must never confirm. Posting a small-dog price for a
    // medium dog is the same shape of disagreement.
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setAutoConfirm(staff, { grooming: true });
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookGroomingAsCustomer(page, 30);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number };
    made.push(booking.id);

    const read = await page.request.get(`/api/bookings?ref=${booking.id}`);
    const [row] = (await read.json()) as Array<{
      status: string;
      totalCost: number;
    }>;
    expect(
      row?.status,
      "a grooming price the server did not derive was confirmed",
    ).toBe("request_submitted");
    expect(row?.totalCost, "and nothing was charged for it").toBe(0);
  });

  test("a confirmed booking records the deposit the facility asks for", async ({
    page,
  }) => {
    // The gap: a facility could set a deposit policy AND switch instant
    // booking on, and the two never met — the booking confirmed with the whole
    // balance owed and nothing said a deposit was due, so the policy was
    // silently ignored for every online booking.
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setDaycareDeposit(staff, DEPOSIT_PERCENT);
      await setAutoConfirm(staff, { daycare: true });
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookAsCustomer(page, FULL_DAY);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number };
    made.push(booking.id);

    const read = await page.request.get(`/api/bookings?ref=${booking.id}`);
    const [row] = (await read.json()) as Array<{
      status: string;
      totalCost: number;
      amountPaid?: number;
      depositRequired?: number;
      depositRuleLabel?: string;
    }>;

    expect(row?.status).toBe("confirmed");
    expect(
      row?.depositRequired,
      "the facility's deposit was not recorded",
    ).toBe(DEPOSIT_ON_FULL_DAY);
    expect(row?.depositRuleLabel).toBe(DEPOSIT_LABEL);

    // RECORDED, NOT CHARGED. This is the assertion that keeps the feature
    // honest: confirming a booking and taking money in the same breath,
    // without the customer pressing pay, is how a chargeback starts.
    expect(
      row?.amountPaid ?? 0,
      "a deposit was taken, not just asked for",
    ).toBe(0);
  });

  test("no deposit rule, nothing recorded", async ({ page }) => {
    // The other direction. A facility with no policy must not acquire one
    // because the feature shipped.
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setDaycareDeposit(staff, null);
      await setAutoConfirm(staff, { daycare: true });
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookAsCustomer(page, FULL_DAY);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number };
    made.push(booking.id);

    const read = await page.request.get(`/api/bookings?ref=${booking.id}`);
    const [row] = (await read.json()) as Array<{
      status: string;
      depositRequired?: number;
    }>;
    expect(row?.status).toBe("confirmed");
    expect(row?.depositRequired ?? 0).toBe(0);
  });

  test("a customer cannot confirm their own booking by asking", async ({
    page,
  }) => {
    // Explicitly OFF: the test before this leaves daycare auto-confirming,
    // and a booking that arrives confirmed would make this assert nothing.
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await setAutoConfirm(staff, {});
    } finally {
      await staff.close();
    }

    await signIn(page, ACCOUNTS.customer);
    const res = await bookAsCustomer(page, FULL_DAY);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number };
    made.push(booking.id);

    const tried = await page.request.patch(`/api/bookings/${booking.id}`, {
      data: { status: "confirmed" },
    });
    expect(tried.ok(), "only cancelling is theirs to do").toBe(false);
  });
});

// ============================================================================
// BOARDING, WITH THE ADD-ONS ITS SERVICE INSISTS ON (2026-09-25).
//
// The server priced boarding's BASE only, so any add-on on a customer's
// request — including one the service attaches by itself, by length of stay —
// made the quote disagree and the booking stayed a request. It priced them
// from the facility's own catalogue, and refused a booking that dropped one
// of its service's defaults.
//
// Since 2026-09-30 an add-on is a LINE ON THE BILL, written by the server at
// the catalogue's price when the booking is made. So the quote a customer's
// form sends — and the price the server compares it with — is the SERVICE;
// the add-ons are beside it, and what is owed is the two together.
//
// B1  The stay and its service's default add-on, quoted right → confirmed at
//     the SERVICE's price, the add-on a line of its own, both owed.
// B2  The default taken off → still a request.
// B3  The right lines, and a total that counts them as well — what the form
//     sent before 2026-09-30 → still a request, not a booking charged twice.
// ============================================================================

const BOARD_MARKER = `${MARKER} boarding`;
const BOARD_SERVICE = `${MARKER} Stay with walks`;
/** The walk add-on's id, from the one add-ons list — set in beforeAll. */
let walkId = "";
/** The service's nightly price, and one walk. */
const NIGHT = 50;
const WALK = 7;

interface MenuService {
  id: string;
  name: string;
}

/**
 * Delete (archive) every add-on this file made. Asked of the API, not
 * remembered, so a run that died before its afterAll is cleaned by the next;
 * never a throw inside a teardown.
 */
async function archiveMarkedAddOns(page: Page): Promise<void> {
  const res = await page.request.get("/api/add-ons");
  if (!res.ok()) return;
  const body: unknown = await res.json().catch(() => null);
  if (!Array.isArray(body)) return;
  for (const addOn of body as { id: string; name: string }[]) {
    if (addOn.name.includes(MARKER)) {
      await page.request.delete(`/api/add-ons/${addOn.id}`);
    }
  }
}

interface BillLine {
  kind: string;
  name: string;
  quantity: number;
  unitPrice: number;
  price: number;
}

/** The lines on a booking's bill, as whoever is signed in may read them. */
async function billOf(page: Page, ref: number): Promise<BillLine[]> {
  const res = await page.request.get(`/api/bookings/${ref}/line-items`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as BillLine[];
}

/** The staff menu, or nothing — never a throw inside a teardown. */
async function boardingMenu(page: Page): Promise<MenuService[]> {
  const res = await page.request.get("/api/boarding/services");
  if (!res.ok()) return [];
  const body: unknown = await res.json().catch(() => null);
  return Array.isArray(body) ? (body as MenuService[]) : [];
}

test.describe("boarding confirms with the add-ons its service attaches", () => {
  let serviceRowId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      // The facility's add-ons stay; one walk joins the one add-ons list
      // for the run. Anything a crashed run left is archived first.
      await archiveMarkedAddOns(page);
      const put = await page.request.post("/api/add-ons", {
        data: { name: `${MARKER} Walk`, price: WALK },
      });
      expect(put.status(), await put.text()).toBe(201);
      walkId = ((await put.json()) as { addOn: { id: string } }).addOn.id;

      for (const s of await boardingMenu(page)) {
        if (s.name.includes(MARKER)) {
          await page.request.delete(`/api/boarding/services/${s.id}`);
        }
      }
      const created = await page.request.post("/api/boarding/services", {
        data: {
          name: BOARD_SERVICE,
          price: NIGHT,
          unit: "night",
          lodgingTypeIds: [],
          isActive: true,
          defaultAddOns: [
            {
              addOnId: walkId,
              appliesOn: "every_day",
              quantityPerDay: 1,
              minNights: null,
            },
          ],
        },
      });
      expect(created.status(), await created.text()).toBe(201);
      serviceRowId = ((await created.json()) as { service: { rowId: string } })
        .service.rowId;

      await setAutoConfirm(page, { boarding: true });
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      await setAutoConfirm(page, {}).catch(() => undefined);
      await archiveMarkedAddOns(page);
      for (const s of await boardingMenu(page)) {
        if (s.name.includes(MARKER)) {
          await page.request.delete(`/api/boarding/services/${s.id}`);
        }
      }
    } finally {
      await page.close();
      await cancelBookingsMarked(browser, BOARD_MARKER, "after");
    }
  });

  /** One night, the service named, the lines as a customer's form saves them. */
  const book = (
    page: Page,
    total: number,
    lines: Array<{ serviceId: string; quantity: number; petId: number }>,
  ) =>
    page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        service: "boarding",
        startDate: day(40),
        endDate: day(41),
        checkInTime: "14:00",
        checkOutTime: "11:00",
        status: "confirmed",
        basePrice: NIGHT,
        discount: 0,
        totalCost: total,
        specialRequests: BOARD_MARKER,
        boardingServiceId: serviceRowId,
        extraServices: lines,
      },
    });

  // Every day of a one-night stay is two days: two walks.
  const twoWalks = () => [{ serviceId: walkId, quantity: 2, petId: ALICE.pet }];

  test("B1 the stay and its default add-on, quoted right: confirmed", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await book(page, NIGHT, twoWalks());
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as {
      id: number;
      status: string;
      totalCost?: number;
      amountDue?: number;
    };
    made.push(booking.id);
    expect(booking.status).toBe("confirmed");
    expect(booking.totalCost, "the service alone").toBe(NIGHT);
    expect(booking.amountDue, "and the walks beside it").toBe(NIGHT + 2 * WALK);

    // The walks are a line the customer can read on their own bill, at the
    // facility's price — nothing in the request said what they cost.
    const bill = await billOf(page, booking.id);
    expect(bill).toHaveLength(1);
    expect(bill[0]).toMatchObject({
      kind: "add_on",
      name: `${MARKER} Walk`,
      quantity: 2,
      unitPrice: WALK,
      price: 2 * WALK,
    });

    // And it is in a kennel. A customer's booking arrives with none — a
    // request must not hold one — and confirming it now gives one of its
    // rate's types (every type here), as staff approval does (2026-09-26).
    await signIn(page, ACCOUNTS.owner);
    const stays = await page.request.get(
      `/api/boarding/stays?bookingRef=${booking.id}`,
    );
    expect(stays.ok(), await stays.text()).toBe(true);
    expect(((await stays.json()) as { stays: unknown[] }).stays).toHaveLength(
      1,
    );
  });

  test("B2 the default taken off: still a request", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await book(page, NIGHT, []);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number; status: string };
    made.push(booking.id);
    expect(booking.status).toBe("request_submitted");
  });

  test("B3 the right lines and a total that counts them too: still a request", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await book(page, NIGHT + 2 * WALK, twoWalks());
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number; status: string };
    made.push(booking.id);
    expect(booking.status).toBe("request_submitted");
  });
});

// ============================================================================
// DAYCARE AND GROOMING, WITH THE ADD-ONS A CUSTOMER CHOSE (2026-09-26).
//
// The server priced a daycare booking's BASE only, so an add-on on a
// customer's daycare request made the quote disagree and every one of those
// bookings stayed a request — silently, with auto-confirm switched on.
//
// Since 2026-09-30 the add-on is a line on the bill, written by the server at
// the catalogue's price — by the rule the wizard's total uses: every live
// add-on for THIS type of service, at the booking location's price. The quote
// and the server's price are both the service alone.
//
// D1  A day and an add-on for every service, quoted right → confirmed at the
//     day's price, the add-on a line, both owed.
// D2  The same line, and a quote that counts the add-on as well → a request.
// D3  An add-on the facility set up for TRAINING only → refused outright, by
//     name: a request must not carry an add-on the facility does not sell on
//     it.
// D4  Two days and one add-on → both days confirmed, the add-on billed ONCE,
//     on the first. Before, every day was priced with all of the request's
//     add-ons and a multi-day request with one could never confirm.
// G1  A groom and the add-on for every service — which the groom's one list
//     carries — quoted right → confirmed at the groom's price, the add-on a
//     line.
// ============================================================================

const EXTRA_MARKER = `${MARKER} extras`;
/** An add-on for every service, and one for training only — beforeAll. */
let treatId = "";
let trainingOnlyId = "";
const TREAT = 6;
const TRAINING_ONLY = 9;

test.describe("daycare and grooming confirm with the add-ons chosen", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      // The facility's own add-ons stay; two join for the run. Anything a
      // crashed run left is archived first.
      await archiveMarkedAddOns(page);
      const treat = await page.request.post("/api/add-ons", {
        data: { name: `${MARKER} Treat`, price: TREAT },
      });
      expect(treat.status(), await treat.text()).toBe(201);
      treatId = ((await treat.json()) as { addOn: { id: string } }).addOn.id;
      const training = await page.request.post("/api/add-ons", {
        data: {
          name: `${MARKER} Training only`,
          price: TRAINING_ONLY,
          appliesToAllServices: false,
          serviceRefs: ["training"],
        },
      });
      expect(training.status(), await training.text()).toBe(201);
      trainingOnlyId = ((await training.json()) as { addOn: { id: string } })
        .addOn.id;

      await setAutoConfirm(page, { daycare: true, grooming: true });
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      await setAutoConfirm(page, {}).catch(() => undefined);
      await archiveMarkedAddOns(page);
    } finally {
      await page.close();
      await cancelBookingsMarked(browser, EXTRA_MARKER, "after");
    }
  });

  /** A full day, with the lines as a customer's form saves them. */
  const bookDay = (page: Page, total: number, addOnId: string) =>
    page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        service: "daycare",
        startDate: day(16),
        endDate: day(16),
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: FULL_DAY,
        discount: 0,
        totalCost: total,
        specialRequests: EXTRA_MARKER,
        extraServices: [{ serviceId: addOnId, quantity: 1, petId: ALICE.pet }],
      },
    });

  test("D1 a day and an add-on for every service, quoted right: confirmed", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await bookDay(page, FULL_DAY, treatId);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as {
      id: number;
      status: string;
      totalCost?: number;
      amountDue?: number;
    };
    made.push(booking.id);
    expect(
      booking.status,
      "the day's price is all the quote has to match",
    ).toBe("confirmed");
    expect(booking.totalCost).toBe(FULL_DAY);
    expect(booking.amountDue).toBe(FULL_DAY + TREAT);
    expect(await billOf(page, booking.id)).toEqual([
      expect.objectContaining({
        kind: "add_on",
        name: `${MARKER} Treat`,
        quantity: 1,
        unitPrice: TREAT,
      }),
    ]);
  });

  test("D2 the add-on counted in the quote as well: a request", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await bookDay(page, FULL_DAY + TREAT, treatId);
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as { id: number; status: string };
    made.push(booking.id);
    expect(booking.status).toBe("request_submitted");
  });

  test("D3 an add-on set up for training only, on a day: refused by name", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await bookDay(page, FULL_DAY, trainingOnlyId);
    expect(res.status(), await res.text()).toBe(422);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain(`${MARKER} Training only`);
  });

  test("D4 two days and one add-on: both confirmed, the add-on billed once", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const days = [day(18), day(19)];
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        service: "daycare",
        startDate: days[0],
        endDate: days[0],
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 2 * FULL_DAY,
        discount: 0,
        totalCost: 2 * FULL_DAY,
        specialRequests: EXTRA_MARKER,
        daycareSelectedDates: days,
        extraServices: [{ serviceId: treatId, quantity: 1, petId: ALICE.pet }],
        // One booking per day, as the form splits a request.
        parts: days.map((date) => ({
          petIds: [ALICE.pet],
          startDate: date,
          endDate: date,
          basePrice: FULL_DAY,
          discount: 0,
          totalCost: FULL_DAY,
        })),
      },
    });
    expect(res.ok(), await res.text()).toBe(true);
    const first = (await res.json()) as {
      id: number;
      status: string;
      groupRefs?: number[];
    };
    const refs = first.groupRefs ?? [first.id];
    made.push(...refs);
    expect(refs).toHaveLength(2);

    const bills = await Promise.all(refs.map((ref) => billOf(page, ref)));
    expect(
      bills.map((bill) => bill.length),
      "the add-on is on the first day and nowhere else",
    ).toEqual([1, 0]);

    const both = await Promise.all(
      refs.map(async (ref) => {
        const read = await page.request.get(`/api/bookings?ref=${ref}`);
        expect(read.ok(), await read.text()).toBe(true);
        const [row] = (await read.json()) as Array<{
          status: string;
          totalCost: number;
          amountDue?: number;
        }>;
        return row;
      }),
    );
    expect(both.map((b) => b?.status)).toEqual(["confirmed", "confirmed"]);
    expect(both.map((b) => b?.totalCost)).toEqual([FULL_DAY, FULL_DAY]);
    expect(both.map((b) => b?.amountDue)).toEqual([FULL_DAY + TREAT, FULL_DAY]);
  });

  test("G1 a groom and an add-on for every service, quoted right: confirmed", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        service: "grooming",
        startDate: day(17),
        endDate: day(17),
        checkInTime: "13:00",
        checkOutTime: "14:00",
        status: "confirmed",
        basePrice: GROOM_MEDIUM,
        discount: 0,
        totalCost: GROOM_MEDIUM,
        specialRequests: EXTRA_MARKER,
        serviceType: GROOM_SERVICE,
        groomingAddOns: [treatId],
      },
    });
    expect(res.ok(), await res.text()).toBe(true);
    const booking = (await res.json()) as {
      id: number;
      status: string;
      totalCost?: number;
      amountDue?: number;
    };
    made.push(booking.id);
    expect(booking.status).toBe("confirmed");
    expect(booking.totalCost).toBe(GROOM_MEDIUM);
    expect(booking.amountDue).toBe(GROOM_MEDIUM + TREAT);
    expect(await billOf(page, booking.id)).toEqual([
      expect.objectContaining({
        kind: "add_on",
        name: `${MARKER} Treat`,
        quantity: 1,
        unitPrice: TREAT,
      }),
    ]);
  });
});
