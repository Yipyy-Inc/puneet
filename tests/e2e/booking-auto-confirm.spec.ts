import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

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

const made: number[] = [];

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

async function bookAsCustomer(page: Page, total: number) {
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
      discount: 0,
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
