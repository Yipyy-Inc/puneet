import { test, expect, type Page } from "@playwright/test";

import { bookingListSearch } from "@/lib/api/booking-list-params";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A CUSTOMER'S REQUEST, DECIDED BY THE FACILITY — every day of it.
//
// A customer's multi-day daycare request was ONE booking dated its first day,
// the other days a list in `details` no board reads; approving it kept it that
// way, so days two and three never reached the daycare board. Nothing stopped
// staff confirming a request at the $0 the database sets on arrival, and
// deciding one said "the customer was not messaged" whatever Automations had
// switched on.
//
// Now a customer's multi-day request is a booking per day tied by one group,
// and POST /api/bookings/[ref]/decision approves, declines or waitlists every
// day together: an unpriced approval is refused, "at the quote" writes the
// customer's quoted price, and the answer says whether a message went out.
//
// Requests are made AS THE CUSTOMER (Alice, client 15, and Buddy) through the
// API the booking form uses, far enough ahead to collide with nothing; every
// booking made is cancelled by ref in afterAll.
// ============================================================================

const MARKER = "[e2e booking-requests]";
const ALICE = { client: 15, pet: 1 }; // customer@yipyy.dev, Buddy

interface BookingPayload {
  id: number;
  status?: string;
  startDate?: string;
  totalCost?: number;
  groupRefs?: number[];
  bookingGroup?: { id: string; part: number; of: number };
  requestedQuote?: { totalCost?: number };
}

const made: number[] = [];

function isoDaysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

/** A daycare request as the customer's booking form sends it: a part a day. */
async function customerRequest(
  page: Page,
  days: string[],
  perDay: number,
  tag: string,
): Promise<number[]> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: ALICE.client,
      petId: ALICE.pet,
      facilityId: 0,
      service: "daycare",
      startDate: days[0],
      endDate: days[0],
      checkInTime: "08:00",
      checkOutTime: "17:00",
      status: "request_submitted",
      basePrice: perDay * days.length,
      discount: 0,
      totalCost: perDay * days.length,
      specialRequests: `${MARKER} ${tag}`,
      daycareSelectedDates: days,
      parts: days.map((day) => ({
        petIds: [ALICE.pet],
        startDate: day,
        endDate: day,
        checkInTime: "08:00",
        checkOutTime: "17:00",
        basePrice: perDay,
        discount: 0,
        totalCost: perDay,
      })),
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const first = (await res.json()) as BookingPayload;
  const refs = first.groupRefs ?? [first.id];
  made.push(...refs);
  return refs;
}

async function read(page: Page, refs: number[]) {
  const res = await page.request.get(
    `/api/bookings${bookingListSearch({ refs })}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as BookingPayload[];
}

async function decide(
  page: Page,
  ref: number,
  body: { action: string; atQuote?: boolean },
) {
  return page.request.post(`/api/bookings/${ref}/decision`, { data: body });
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const refused: string[] = [];
    for (const ref of made) {
      const res = await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
      if (!res.ok()) refused.push(`${ref}: ${await res.text()}`);
    }
    expect(refused, "cleanup left bookings behind").toEqual([]);
  } finally {
    await page.close();
  }
});

test.describe("the facility decides a customer's request whole", () => {
  test("a three-day request is three bookings, one request, each at $0 with its quote", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const days = [431, 432, 433].map(isoDaysAhead);
    const refs = await customerRequest(page, days, 40, "three days");
    expect(refs).toHaveLength(3);

    const stored = await read(page, refs);
    expect(stored.map((b) => b.startDate).sort()).toEqual(days);
    expect(new Set(stored.map((b) => b.bookingGroup?.id)).size).toBe(1);
    for (const day of stored) {
      expect(day.status).toBe("request_submitted");
      expect(Number(day.totalCost ?? 0)).toBe(0);
      expect(Number(day.requestedQuote?.totalCost)).toBe(40);
    }
  });

  test("an unpriced request is not approved; at the quote, every day is", async ({
    page,
  }) => {
    const refs = made.slice(0, 3);
    await signIn(page, ACCOUNTS.owner);

    // Straight to confirmed, as the status menu or an old screen would.
    const direct = await page.request.patch(`/api/bookings/${refs[0]}`, {
      data: { status: "confirmed" },
    });
    expect(direct.status()).toBe(422);
    expect(((await direct.json()) as { reason?: string }).reason).toBe(
      "unpriced",
    );

    const unpriced = await decide(page, refs[1], { action: "approve" });
    expect(unpriced.status()).toBe(422);

    const res = await decide(page, refs[1], {
      action: "approve",
      atQuote: true,
    });
    expect(res.status(), await res.text()).toBe(200);
    const decided = (await res.json()) as {
      status: string;
      refs: number[];
      messaged: string;
    };
    expect(decided.status).toBe("confirmed");
    expect([...decided.refs].sort()).toEqual([...refs].sort());
    expect(["sent", "queued", "not_sent"]).toContain(decided.messaged);

    for (const day of await read(page, refs)) {
      expect(day.status).toBe("confirmed");
      expect(Number(day.totalCost)).toBe(40);
    }

    // Decided once is decided.
    const again = await decide(page, refs[0], { action: "decline" });
    expect(again.status()).toBe(409);
  });

  test("declining and waitlisting move every day", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const toDecline = await customerRequest(
      page,
      [441, 442].map(isoDaysAhead),
      35,
      "decline",
    );
    const toWaitlist = await customerRequest(
      page,
      [451, 452].map(isoDaysAhead),
      35,
      "waitlist",
    );

    // A customer does not decide their own request.
    const asCustomer = await decide(page, toDecline[0], { action: "approve" });
    expect(asCustomer.status()).toBe(403);

    await signIn(page, ACCOUNTS.owner);
    expect(
      (await decide(page, toDecline[0], { action: "decline" })).status(),
    ).toBe(200);
    for (const day of await read(page, toDecline)) {
      expect(day.status).toBe("declined");
    }

    expect(
      (await decide(page, toWaitlist[1], { action: "waitlist" })).status(),
    ).toBe(200);
    for (const day of await read(page, toWaitlist)) {
      expect(day.status).toBe("waitlisted");
    }
  });

  test("the requests page shows the request whole and approves it at its quote", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const refs = await customerRequest(
      page,
      [461, 462].map(isoDaysAhead),
      45,
      "page",
    );

    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/online-booking");
    const card = page
      .locator("div.rounded-2xl")
      .filter({ hasText: `${MARKER} page` })
      .filter({ has: page.getByRole("button", { name: /approve at/i }) })
      .first();
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card).toContainText(/2 days/);
    await expect(card).toContainText(/Quoted \$90\.00/);

    await card.getByRole("button", { name: /approve at \$90\.00/i }).click();
    await expect(page.getByText(/2 days confirmed for Buddy/i)).toBeVisible({
      timeout: 30_000,
    });
    await expect(card).toBeHidden({ timeout: 30_000 });

    for (const day of await read(page, refs)) {
      expect(day.status).toBe("confirmed");
      expect(Number(day.totalCost)).toBe(45);
    }
  });
});
