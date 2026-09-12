import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A groomer's ready estimate is kept, and a groom starts after check-in
// (2026-09-12).
//
// The check-in dialog lets the groomer correct the ready time the lifecycle
// trigger derives ("matted coat — give it another half hour"). It was toasted
// ("ready ~15:30") and dropped: the board kept the trigger's number.
// PATCH /api/grooming/appointments takes `estimatedReadyTime` now, applied
// after any status in the same request. This pins:
//
//   1. A groom cannot be put in progress, or given a ready time, before the
//      pet is checked in — which is also why the appointment page's check-in,
//      which wrote "in-progress" straight away, failed; it checks in first
//      now.
//   2. Checked in, the groomer's estimate is stored and read back; one
//      earlier than the check-in is refused; and the groom can then start.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Every booking made here carries MARKER and is cancelled in afterAll, as
// booking-write-integrity.spec.ts does (there is no delete policy on
// bookings, by design).
// ============================================================================

const MARKER = "[e2e grooming-ready-estimate]";
const CLIENT_REF = 15;
const PET_REF = 1; // Buddy
const GROOMING_SERVICE = "groom-pkg-002";
const APPOINTMENTS = "/api/grooming/appointments";

// The day the booking is made on and the day the board is asked for — the
// same string, as training-attendance.spec.ts passes it.
const today = new Date().toISOString().slice(0, 10);

type Appointment = {
  id: string;
  status: string;
  checkInTime: string | null;
  estimatedReadyTime?: string;
};

async function book(page: Page): Promise<string> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: CLIENT_REF,
      petId: PET_REF,
      facilityId: 11,
      service: "grooming",
      serviceType: GROOMING_SERVICE,
      startDate: today,
      endDate: today,
      checkInTime: "09:00",
      checkOutTime: "10:00",
      status: "confirmed",
      basePrice: 0,
      discount: 0,
      totalCost: 0,
      paymentStatus: "pending",
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return String(((await res.json()) as { id: number }).id);
}

async function appointment(page: Page, id: string): Promise<Appointment> {
  const res = await page.request.get(`${APPOINTMENTS}?date=${today}`);
  expect(res.ok(), await res.text()).toBe(true);
  const found = ((await res.json()) as Appointment[]).find((a) => a.id === id);
  expect(found, `appointment ${id} is on today's board`).toBeTruthy();
  return found!;
}

function patch(page: Page, data: Record<string, unknown>) {
  return page.request.patch(APPOINTMENTS, { data });
}

function plusMinutes(hhmm: string, minutes: number): string | null {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  if (total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (await page.request.get("/api/bookings")).json()) as {
      id: number;
      status?: string;
      specialRequests?: string;
    }[];
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

test.describe("a groomer's ready estimate", () => {
  test.slow();

  test("nothing starts, and no ready time is set, before check-in", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const id = await book(page);

    const started = await patch(page, { id, status: "in-progress" });
    expect(started.status(), await started.text()).toBe(403);

    const early = await patch(page, { id, estimatedReadyTime: "12:00" });
    expect(early.status()).toBe(422);
  });

  test("checked in, the groomer's estimate is kept, and the groom can start", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const id = await book(page);

    const checkedIn = await patch(page, { id, status: "checked-in" });
    expect(checkedIn.status(), await checkedIn.text()).toBe(204);

    const derived = await appointment(page, id);
    expect(derived.checkInTime).toBeTruthy();
    expect(derived.estimatedReadyTime, "the trigger derived one").toBeTruthy();

    const adjusted = plusMinutes(derived.estimatedReadyTime!, 25);
    test.skip(
      adjusted === null,
      "too close to midnight on the facility's clock to move the estimate",
    );

    const saved = await patch(page, { id, estimatedReadyTime: adjusted });
    expect(saved.status(), await saved.text()).toBe(204);
    expect((await appointment(page, id)).estimatedReadyTime).toBe(adjusted);

    const beforeCheckIn = await patch(page, {
      id,
      estimatedReadyTime: "00:00",
    });
    expect(beforeCheckIn.status()).toBe(422);

    const started = await patch(page, { id, status: "in-progress" });
    expect(started.status(), await started.text()).toBe(204);
  });
});
