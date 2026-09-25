import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";

// ============================================================================
// ANSWERING A CUSTOMER'S REQUEST IS STAFF WORK — and the boundary is the point.
//
// A customer can ask the facility to change their dates, or to cancel where
// the facility said it cancels that service itself. Until now nothing could
// ANSWER one: the ask sat in the booking's notes and whether anybody had dealt
// with it was a judgement call.
//
// The new route writes two things — a reply the customer reads, then the
// decision — and both are staff writes. So the test that matters is not that
// staff can answer; it is that the person who ASKED cannot answer themselves.
// A customer approving their own cancellation request would be a customer
// marking their own refund as agreed.
//
// ── THE REPLY IS ATTEMPTED FIRST, WHICH IS ALSO THE SECURITY ORDER ────────
//
// `notes_insert` needs a staff permission the customer does not hold, so a
// customer's attempt is refused before anything is decided. That ordering was
// chosen for failure-safety (an answer with no explanation tells nobody) and
// it happens to put the cheapest refusal first.
// ============================================================================

const MARKER = "[e2e request-decision]";
const ALICE = { client: 15, pet: 1 };
const made: number[] = [];

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface RequestRow {
  noteId: string;
  kind: string;
  bookingRef: number;
}

test.describe.configure({ mode: "serial" });

let bookingRef = 0;
let noteId = "";

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: ALICE.client,
        petId: ALICE.pet,
        facilityId: 0,
        service: "daycare",
        startDate: day(21),
        endDate: day(21),
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 40,
        discount: 0,
        totalCost: 40,
        specialRequests: MARKER,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    bookingRef = ((await res.json()) as { id: number }).id;
    made.push(bookingRef);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // Narrowed and guarded: unfiltered this read is ~2,000 rows, times out,
    // answers `{error}`, and a cast would turn that into "all is not
    // iterable" INSIDE the teardown — cleaning up nothing while the run looks
    // fine. See the boarding teardowns, 2026-09-22.
    // Asked of the DATABASE by marker (`bookingsMarked`, the service role's
    // way in), not read out of a booking list: guarded, the list read still
    // timed out under load and cleaned nothing (debt map, 2026-09-25).
    const all = (await bookingsMarked(MARKER)).map((b) => ({
      id: b.ref,
      status: b.status,
      specialRequests: MARKER,
      amountPaid: b.amountPaid,
    }));

    let cancelled = 0;
    for (const b of all) {
      if (!b.specialRequests?.includes(MARKER)) continue;
      if (b.status === "cancelled") continue;
      const res = await page.request.patch(`/api/bookings/${b.id}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled++;
    }
    console.log(`cleanup: ${cancelled} booking(s) cancelled`);
  } finally {
    await page.close();
  }
});

async function pending(page: Page): Promise<RequestRow[]> {
  const res = await page.request.get("/api/facility/requests");
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  expect(Array.isArray(body), "the requests list answers with a list").toBe(
    true,
  );
  return body as RequestRow[];
}

test.describe("answering a customer's request", () => {
  test("the customer asks, and the ask reaches the facility's list", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const asked = await page.request.post(
      `/api/customer/bookings/${bookingRef}/notes`,
      { data: { kind: "change_dates", content: `${MARKER} can we move it?` } },
    );
    expect(asked.ok(), await asked.text()).toBe(true);

    await signIn(page, ACCOUNTS.owner);
    const mine = (await pending(page)).filter(
      (r) => r.bookingRef === bookingRef,
    );
    expect(mine, "the ask is waiting for an answer").toHaveLength(1);
    expect(mine[0].kind).toBe("change_dates");
    noteId = mine[0].noteId;
  });

  test("a signed-out caller cannot answer", async ({ request }) => {
    const res = await request.post(
      `/api/bookings/${bookingRef}/requests/${noteId}/decision`,
      {
        data: { decision: "approved", reply: "yes" },
        failOnStatusCode: false,
      },
    );
    expect(res.status()).toBe(401);
  });

  test("the customer who asked cannot answer themselves", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.post(
      `/api/bookings/${bookingRef}/requests/${noteId}/decision`,
      {
        data: { decision: "approved", reply: `${MARKER} yes please` },
        failOnStatusCode: false,
      },
    );
    // Refused, whatever the shape of the refusal — what matters is that it is
    // not a 200 and the request is still waiting.
    expect(res.ok(), await res.text()).toBe(false);

    await signIn(page, ACCOUNTS.owner);
    const still = (await pending(page)).filter(
      (r) => r.bookingRef === bookingRef,
    );
    expect(still, "the ask is still unanswered").toHaveLength(1);
  });

  test("an answer with no words is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(
      `/api/bookings/${bookingRef}/requests/${noteId}/decision`,
      { data: { decision: "approved", reply: "  " }, failOnStatusCode: false },
    );
    expect(res.status(), await res.text()).toBe(400);
  });

  test("staff answer it, and it leaves the list", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(
      `/api/bookings/${bookingRef}/requests/${noteId}/decision`,
      {
        data: {
          decision: "declined",
          reply: `${MARKER} sorry, that week is full.`,
        },
      },
    );
    expect(res.ok(), await res.text()).toBe(true);

    const after = (await pending(page)).filter(
      (r) => r.bookingRef === bookingRef,
    );
    expect(after, "answered, so no longer waiting").toHaveLength(0);
  });

  test("the same request cannot be answered twice", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(
      `/api/bookings/${bookingRef}/requests/${noteId}/decision`,
      {
        data: { decision: "approved", reply: `${MARKER} changed my mind` },
        failOnStatusCode: false,
      },
    );
    expect(res.status(), await res.text()).toBe(409);
  });

  test("the customer reads the answer on their own booking", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    // `customer/bookings/[ref]/notes` is POST-only — asking is its whole job.
    // Reading back goes through the shared notes route, which is what the
    // customer's own booking page uses.
    const res = await page.request.get(
      `/api/notes?category=booking&ref=${bookingRef}`,
    );
    expect(res.ok(), await res.text()).toBe(true);
    const body: unknown = await res.json();
    const notes = Array.isArray(body) ? (body as { content: string }[]) : [];
    expect(
      notes.some((n) => n.content.includes("that week is full")),
      "the reply is shared with the customer, not filed away from them",
    ).toBe(true);
  });
});
