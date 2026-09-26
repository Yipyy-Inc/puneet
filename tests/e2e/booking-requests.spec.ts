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

// ============================================================================
// AN APPROVED BOARDING REQUEST IS GIVEN A KENNEL OF ITS RATE'S TYPE
// (2026-09-26).
//
// A request drops its room on purpose, so an unconfirmed booking holds no
// kennel; approving it gave none back, and the dog waited on the kennel board
// for somebody to place it. Approval now places it, in a kennel of one of the
// rate's room types that admits the pet (src/lib/boarding/kennel-on-confirm.ts).
//
// Buddy is a 25 lb dog. Condominium takes up to 60 lb; Private Care Suite
// takes 80 lb and up.
//
// K1  A rate limited to Condominium: approved, Buddy is in a Condominium, and
//     the answer names the kennel.
// K2  A rate limited to Private Care: no kennel of it admits Buddy. Approved
//     all the same — the booking is confirmed with no kennel, as every
//     approval used to leave it — and the answer says none was found. "Find
//     a kennel" asks again and says the same.
// K3  A confirmed stay saved with no kennel: "Find a kennel" (POST
//     /api/boarding/stays/find) places it in a kennel of its rate's type —
//     the button on the booking page and the check-in board, where "Assign a
//     kennel first" linked to a board that never shows a guest with none.
// K4  A customer cannot use it.
//
// The two rates are made for the run and removed after it; the bookings go
// with the rest of this file's in the afterAll above.
// ============================================================================

const KENNEL_MARKER = `${MARKER} kennel`;
const RATE_NIGHT = 60;

interface RoomsPayload {
  categories: { id: string; rowId?: string; name: string }[];
  rooms: { id: string; categoryId: string; name: string }[];
}

interface Decided {
  status: string;
  kennels?: { ref: number; kennel: string | null }[];
}

async function findKennel(page: Page, bookingRef: number) {
  return page.request.post("/api/boarding/stays/find", {
    data: { bookingRef },
  });
}

async function staysOf(page: Page, ref: number) {
  const res = await page.request.get(`/api/boarding/stays?bookingRef=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  return (
    (await res.json()) as {
      stays: { roomId: string | null; roomName: string | null }[];
    }
  ).stays;
}

/** This run's rates, removed. Never a throw inside a teardown. */
async function removeKennelRates(page: Page) {
  const res = await page.request.get("/api/boarding/services");
  if (!res.ok()) return;
  const body: unknown = await res.json().catch(() => null);
  if (!Array.isArray(body)) return;
  for (const rate of body as { id: string; name: string }[]) {
    if (rate.name.includes(KENNEL_MARKER)) {
      await page.request.delete(`/api/boarding/services/${rate.id}`);
    }
  }
}

test.describe("an approved boarding request is placed in a kennel of its rate's type", () => {
  const rates = { condo: "", privateCare: "" };
  let rooms: RoomsPayload = { categories: [], rooms: [] };

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const res = await page.request.get("/api/rooms");
      expect(res.ok(), await res.text()).toBe(true);
      rooms = (await res.json()) as RoomsPayload;
      await removeKennelRates(page);

      for (const [key, legacy] of [
        ["condo", "cat-condo"],
        ["privateCare", "cat-private-care"],
      ] as const) {
        const type = rooms.categories.find((c) => c.id === legacy);
        expect(type?.rowId, `the demo facility has ${legacy}`).toBeTruthy();
        const created = await page.request.post("/api/boarding/services", {
          data: {
            name: `${KENNEL_MARKER} ${legacy}`,
            price: RATE_NIGHT,
            unit: "night",
            lodgingTypeIds: [type!.rowId],
            isActive: true,
          },
        });
        expect(created.status(), await created.text()).toBe(201);
        rates[key] = (
          (await created.json()) as { service: { rowId: string } }
        ).service.rowId;
      }
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      await removeKennelRates(page);
    } finally {
      await page.close();
    }
  });

  /** Two nights, far ahead, the rate named — as the customer's form sends it. */
  async function boardingRequest(
    page: Page,
    rateRowId: string,
    startIn: number,
  ): Promise<number> {
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        facilityId: 0,
        service: "boarding",
        startDate: isoDaysAhead(startIn),
        endDate: isoDaysAhead(startIn + 2),
        checkInTime: "14:00",
        checkOutTime: "11:00",
        status: "request_submitted",
        basePrice: 2 * RATE_NIGHT,
        discount: 0,
        totalCost: 2 * RATE_NIGHT,
        specialRequests: KENNEL_MARKER,
        boardingServiceId: rateRowId,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const ref = ((await res.json()) as BookingPayload).id;
    made.push(ref);
    return ref;
  }

  test("K1 a rate limited to Condominium: approved, Buddy is in a Condominium", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const ref = await boardingRequest(page, rates.condo, 481);

    await signIn(page, ACCOUNTS.owner);
    // A request holds no kennel.
    expect(await staysOf(page, ref)).toEqual([]);

    const res = await decide(page, ref, { action: "approve", atQuote: true });
    expect(res.status(), await res.text()).toBe(200);
    const decided = (await res.json()) as Decided;
    expect(decided.status).toBe("confirmed");

    const stays = await staysOf(page, ref);
    expect(stays).toHaveLength(1);
    const kennel = rooms.rooms.find((r) => r.id === stays[0]!.roomId);
    expect(kennel?.categoryId).toBe("cat-condo");
    expect(decided.kennels).toEqual([{ ref, kennel: kennel!.name }]);
  });

  test("K2 no kennel of the rate's type admits Buddy: confirmed with none, and said so", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const ref = await boardingRequest(page, rates.privateCare, 491);

    await signIn(page, ACCOUNTS.owner);
    const res = await decide(page, ref, { action: "approve", atQuote: true });
    expect(res.status(), await res.text()).toBe(200);
    const decided = (await res.json()) as Decided;
    expect(decided.status).toBe("confirmed");
    expect(decided.kennels).toEqual([{ ref, kennel: null }]);
    expect(await staysOf(page, ref)).toEqual([]);

    // "Find a kennel" asks the same question again, and gets the same answer.
    const found = await findKennel(page, ref);
    expect(found.status(), await found.text()).toBe(200);
    expect(await found.json()).toEqual({ kennel: null });
  });

  test("K3 a confirmed stay with no kennel: Find a kennel places it in its rate's type", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    // Staff may save a stay with no kennel, to be placed later.
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        facilityId: 0,
        service: "boarding",
        startDate: isoDaysAhead(501),
        endDate: isoDaysAhead(503),
        checkInTime: "14:00",
        checkOutTime: "11:00",
        status: "confirmed",
        basePrice: 2 * RATE_NIGHT,
        discount: 0,
        totalCost: 2 * RATE_NIGHT,
        specialRequests: KENNEL_MARKER,
        boardingServiceId: rates.condo,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const ref = ((await res.json()) as BookingPayload).id;
    made.push(ref);
    expect(await staysOf(page, ref)).toEqual([]);

    const found = await findKennel(page, ref);
    expect(found.status(), await found.text()).toBe(200);
    const { kennel } = (await found.json()) as { kennel: string | null };

    const stays = await staysOf(page, ref);
    expect(stays).toHaveLength(1);
    const placed = rooms.rooms.find((r) => r.id === stays[0]!.roomId);
    expect(placed?.categoryId).toBe("cat-condo");
    expect(kennel).toBe(placed!.name);

    // In a kennel now: there is nothing left to find.
    expect((await findKennel(page, ref)).status()).toBe(409);
  });

  test("K4 a customer cannot use Find a kennel", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await findKennel(page, made[made.length - 1]!);
    expect(res.status()).toBe(403);
  });
});
