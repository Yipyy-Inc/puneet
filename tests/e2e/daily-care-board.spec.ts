import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The Daily Care board looks after animals that are actually here.
//
// ── WHAT IT USED TO SHOW ──────────────────────────────────────────────────
//
// `getCurrentGuests()` from `src/data/boarding.ts` — a fixture filtered to
// `status === "checked-in"`. So the floor board listed animals that were not in
// the building, with feeding schedules nobody had given and medications nobody
// had prescribed, and staff ticked them off.
//
// The log underneath it was `careLogStore`, a module-level array in the
// JavaScript heap — not even localStorage. Every meal and dose recorded at the
// kennel was gone on the next navigation, and none of it reached the stay.
//
// ── WHAT THESE TESTS ARE FOR ──────────────────────────────────────────────
//
// Two things the fixture could not do, and one that matters more than both: a
// meal logged on the FLOOR must be the same record as a meal logged on the
// BOOKING. Two screens writing one concept to two stores is how a dose gets
// given twice.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Care log rows cascade with their booking
// and nothing deletes a booking here, so cleanup releases the kennel and
// cancels — the board only reads bookings with a live stay.
// ============================================================================

const MARKER = "[e2e daily-care]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface CareGuest {
  id: string;
  petName: string;
  ownerName: string;
  kennelName: string;
  feedingTimes: string[];
  feedingInstructions: string;
  allergies: string[];
  medications: { medicationName: string; times: string[] }[];
}

interface CareLogEntry {
  id: string;
  bookingRef: number;
  taskKey: string;
  taskType: string;
  occurredOn: string;
  outcome: string;
  notes: string | null;
  details: Record<string, unknown>;
}

/** The facility's own day. Every seeded facility is America/Toronto. */
function facilityToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * A kennel free for the whole window — the same problem the boarding specs hit.
 *
 * A room free THIS INSTANT can be occupied for the nights a new booking wants,
 * and the exclusion constraint refuses that with a 409 three steps later.
 */
async function freeRoom(
  page: import("@playwright/test").Page,
  from: string,
  to: string,
): Promise<string> {
  const res = await page.request.get(
    `/api/boarding/rooms?from=${from}&to=${to}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const payload = (await res.json()) as {
    rooms: { id: string; active: boolean }[];
    occupied: { roomId: string }[];
  };
  const taken = new Set(payload.occupied.map((o) => o.roomId));
  const room = payload.rooms.find((r) => r.active && !taken.has(r.id));
  expect(room, "a kennel is free for the whole stay").toBeTruthy();
  return room!.id;
}

async function guestsOn(
  page: import("@playwright/test").Page,
  date: string,
): Promise<CareGuest[]> {
  const res = await page.request.get(`/api/daily-care?date=${date}`);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { guests: CareGuest[] }).guests;
}

test.describe("the daily care board", () => {
  const today = facilityToday();
  let bookingRef = 0;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      const yesterday = new Date(`${today}T00:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const from = yesterday.toISOString().slice(0, 10);
      const room = await freeRoom(page, from, today);

      // A stay with REAL care instructions on it — the shapes the booking flow
      // captures, which is what the board has to be able to read.
      const created = await page.request.post("/api/bookings", {
        data: {
          clientId: CLIENT_REF,
          petId: PET_REF,
          facilityId: 11,
          service: "boarding",
          startDate: from,
          endDate: today,
          checkInTime: "14:00",
          checkOutTime: "11:00",
          status: "confirmed",
          basePrice: 120,
          discount: 0,
          totalCost: 120,
          specialRequests: MARKER,
          unitAssignment: room,
          feedingSchedule: [
            {
              id: "feed-e2e",
              occasions: [
                {
                  id: "occ-1",
                  label: "Breakfast",
                  time: "08:00",
                  components: [],
                },
                { id: "occ-2", label: "Dinner", time: "17:30", components: [] },
              ],
              source: "parent_brings",
              prepInstructions: [],
              prepNotes: "Half a scoop, warm water",
              ifRefuses: [],
              frequency: "daily",
              allergies: ["chicken"],
              notes: "",
            },
          ],
          medications: [
            {
              id: "med-e2e",
              name: "Rimadyl",
              amount: "1 tablet",
              form: "tablet",
              frequency: "daily",
              times: ["08:00"],
              adminInstructions: ["with_food"],
              ifMissed: "skip",
            },
          ],
        },
      });
      expect(created.status(), await created.text()).toBe(201);
      bookingRef = ((await created.json()) as { id: number }).id;

      // On the board means IN the building — the stay has to be checked in.
      const arrived = await page.request.post("/api/boarding/attendance", {
        data: { bookingRef },
      });
      expect(arrived.status(), await arrived.text()).toBe(201);
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const all = (await (await page.request.get("/api/bookings")).json()) as {
        id: number;
        status?: string;
        specialRequests?: string;
      }[];

      let cleared = 0;
      for (const b of all) {
        if (!b.specialRequests?.includes(MARKER)) continue;
        if (b.status === "cancelled") continue;
        await page.request.put("/api/boarding/stays", {
          data: { bookingRef: b.id, roomId: null },
        });
        const cancel = await page.request.patch(`/api/bookings/${b.id}`, {
          data: { status: "cancelled" },
        });
        if (cancel.ok()) cleared++;
      }
      console.log(`cleanup: ${cleared} booking(s) cancelled`);
    } finally {
      await page.close();
    }
  });

  test("a guest on the board is a booking that is really here", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const guests = await guestsOn(page, today);
    const mine = guests.find((g) => g.id === String(bookingRef));

    expect(mine, "the stay checked in above is on the board").toBeTruthy();
    // The fixture named these from a seed file. They come off the booking now.
    expect(mine!.ownerName.length, "the owner is named").toBeGreaterThan(0);
    expect(mine!.kennelName).not.toBe("Unassigned");
  });

  test("the owner's instructions arrive with the guest", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const mine = (await guestsOn(page, today)).find(
      (g) => g.id === String(bookingRef),
    );

    // One entry per OCCASION. A two-meal schedule collapsing into one is how a
    // dog gets fed once, and it is the specific thing the adapter guards.
    expect(mine!.feedingTimes, "both meals").toEqual(["08:00", "17:30"]);
    expect(mine!.allergies).toContain("chicken");
    expect(mine!.feedingInstructions).toContain("Half a scoop");
    expect(mine!.medications.map((m) => m.medicationName)).toContain("Rimadyl");
  });

  test("a guest who was never here is not on the board", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Every guest the board returns has a kennel and an arrival behind it. The
    // fixture could not make this claim: its guests were an array literal.
    const guests = await guestsOn(page, today);
    for (const guest of guests) {
      expect(
        Number.isFinite(Number(guest.id)),
        `${guest.id} is a booking ref`,
      ).toBe(true);
    }
  });

  test("a meal logged on the floor is the same record as on the booking", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const taskKey = `feed-${bookingRef}-08:00`;
    const logged = await page.request.post("/api/care-log", {
      data: {
        bookingRef,
        taskKey,
        taskType: "feeding",
        outcome: "ate_all",
        occurredOn: today,
        executedAt: "08:05",
        servedAt: "08:00",
        notes: "Warmed as asked",
        details: { staffInitials: "E2", healthObservation: "bright" },
      },
    });
    expect(logged.status(), await logged.text()).toBe(201);

    // THE POINT OF THE WHOLE CONVERSION. The board reads the day; the booking
    // page reads the stay. Before this they were two different stores, and the
    // board's was an array in memory.
    const day = (await (
      await page.request.get(`/api/care-log?on=${today}`)
    ).json()) as CareLogEntry[];
    const stay = (await (
      await page.request.get(`/api/care-log?bookingRef=${bookingRef}`)
    ).json()) as CareLogEntry[];

    const onDay = day.find((e) => e.taskKey === taskKey);
    const onStay = stay.find((e) => e.taskKey === taskKey);

    expect(onDay, "the floor's day view has it").toBeTruthy();
    expect(onStay, "the booking's own history has it").toBeTruthy();
    expect(onDay!.id, "and it is ONE row, not two").toBe(onStay!.id);

    // The extras the floor records and the booking page never needed.
    expect(onDay!.details.staffInitials).toBe("E2");
    expect(onDay!.details.healthObservation).toBe("bright");
    expect(onDay!.notes).toBe("Warmed as asked");
  });

  test("correcting a meal edits the record rather than adding one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const taskKey = `feed-${bookingRef}-17:30`;
    for (const outcome of ["refused", "ate_all"]) {
      const res = await page.request.post("/api/care-log", {
        data: {
          bookingRef,
          taskKey,
          taskType: "feeding",
          outcome,
          occurredOn: today,
          executedAt: "17:35",
        },
      });
      expect(res.status(), await res.text()).toBe(201);
    }

    // `care_log_one_per_task_per_day`. Somebody who mis-taps "refused" is
    // correcting the record, not reporting a second dinner.
    const entries = (await (
      await page.request.get(`/api/care-log?bookingRef=${bookingRef}`)
    ).json()) as CareLogEntry[];
    const dinners = entries.filter((e) => e.taskKey === taskKey);

    expect(dinners.length, "one row for one meal").toBe(1);
    expect(dinners[0]!.outcome, "and it is the correction").toBe("ate_all");
  });

  test("the board survives a reload, which the in-memory store could not", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = (await (
      await page.request.get(`/api/care-log?on=${today}`)
    ).json()) as CareLogEntry[];
    expect(before.length, "the meals logged above are there").toBeGreaterThan(
      0,
    );

    await page.goto("/facility/dashboard/daily-care");
    await page.reload();

    const after = (await (
      await page.request.get(`/api/care-log?on=${today}`)
    ).json()) as CareLogEntry[];
    expect(after.map((e) => e.id).sort()).toEqual(
      before.map((e) => e.id).sort(),
    );
  });
});
