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
