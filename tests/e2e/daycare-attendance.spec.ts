import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The daycare floor is a record, not an array.
//
// ── WHAT THE FIXTURE COULD NOT DO ─────────────────────────────────────────
//
// `daycareCheckIns` was a module array read into `useState`, so every arrival
// and departure was lost on reload. Its own check-in times are dated
// 2024-03-10 — the board showed dogs who arrived two and a half years ago and
// were never collected.
//
// It also had no way to say "booked and not here yet": a visit did not exist
// until somebody checked in. `scheduled` is a real state now, and the first
// test is about exactly that.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// Attendance rows delete with their booking (`on delete cascade`), and nothing
// deletes a booking here — so cleanup cancels, and the day query excludes
// cancelled bookings.
// ============================================================================

const MARKER = "[e2e daycare-attendance]";
const CLIENT_REF = 15;
const PET_REF = 1;

interface Visit {
  id: string;
  petName: string;
  petSize: string;
  ownerName: string;
  status: string;
  checkInTime: string;
  checkOutTime: string | null;
  playGroup: string | null;
  notes: string;
}

interface DayPayload {
  date: string;
  visits: Visit[];
  capacity: { total: number; bySize: Record<string, number> };
}

interface BookingPayload {
  id: number;
  status?: string;
  specialRequests?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function bookingBody() {
  const day = today();
  return {
    clientId: CLIENT_REF,
    petId: PET_REF,
    facilityId: 11,
    service: "daycare",
    startDate: day,
    endDate: day,
    checkInTime: "08:00",
    checkOutTime: "17:00",
    status: "confirmed",
    basePrice: 45,
    discount: 0,
    totalCost: 45,
    specialRequests: MARKER,
  };
}

async function day(page: import("@playwright/test").Page): Promise<DayPayload> {
  const res = await page.request.get("/api/daycare/attendance");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as DayPayload;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
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

test.describe("the daycare floor", () => {
  test.slow();

  test("booked and not here yet is a state the fixture could not hold", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post("/api/bookings", {
      data: bookingBody(),
    });
    expect(res.status(), await res.text()).toBe(201);
    const created = (await res.json()) as BookingPayload;

    const payload = await day(page);
    const visit = payload.visits.find((v) => v.id === String(created.id));
    expect(visit, "the booking is on today's floor").toBeTruthy();
    expect(visit!.status, "booked, not arrived").toBe("scheduled");
    expect(visit!.checkOutTime).toBeNull();

    // The join, not a copy taken at check-in: the pet and the owner come from
    // `pets` and `clients`.
    expect(visit!.petName).not.toBe("");
    expect(visit!.ownerName).not.toBe("");
    expect(
      ["small", "medium", "large", "giant"],
      "the size band comes from the facility's weight tiers",
    ).toContain(visit!.petSize);
  });

  test("checking in moves the status, and twice does not move the time", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const scheduled = (await day(page)).visits.find(
      (v) => v.status === "scheduled",
    );
    expect(scheduled, "a scheduled visit").toBeTruthy();

    const first = await page.request.post("/api/daycare/attendance", {
      data: {
        bookingRef: Number(scheduled!.id),
        playGroup: "Large Dogs",
        rateType: "full-day",
      },
    });
    expect(first.status(), await first.text()).toBe(201);

    const after = (await day(page)).visits.find((v) => v.id === scheduled!.id);
    expect(after!.status).toBe("checked-in");
    expect(after!.playGroup).toBe("Large Dogs");
    const arrivedAt = after!.checkInTime;

    // Pressing it again is somebody making sure, not the dog arriving twice.
    const second = await page.request.post("/api/daycare/attendance", {
      data: { bookingRef: Number(scheduled!.id) },
    });
    expect(second.status(), await second.text()).toBe(201);

    const again = (await day(page)).visits.find((v) => v.id === scheduled!.id);
    expect(again!.checkInTime, "the arrival time did not move").toBe(arrivedAt);
  });

  test("checking out is a timestamp, and the status follows", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const present = (await day(page)).visits.find(
      (v) => v.status === "checked-in",
    );
    expect(present, "a dog on the floor").toBeTruthy();

    const out = await page.request.patch(
      `/api/daycare/attendance/${present!.id}`,
      { data: { checkOut: true } },
    );
    expect(out.status(), await out.text()).toBe(204);

    const after = (await day(page)).visits.find((v) => v.id === present!.id);
    expect(after!.status).toBe("checked-out");
    expect(after!.checkOutTime, "with a time on it").not.toBeNull();

    // The wrong dog was collected.
    const reopened = await page.request.patch(
      `/api/daycare/attendance/${present!.id}`,
      { data: { reopen: true } },
    );
    expect(reopened.status()).toBe(204);
    const back = (await day(page)).visits.find((v) => v.id === present!.id);
    expect(back!.status).toBe("checked-in");
    expect(back!.checkOutTime).toBeNull();
  });

  test("a dog cannot be collected before it arrives", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = (await (
      await page.request.post("/api/bookings", { data: bookingBody() })
    ).json()) as BookingPayload;

    // No attendance row at all: there is nothing to check out of.
    const res = await page.request.patch(
      `/api/daycare/attendance/${created.id}`,
      { data: { checkOut: true } },
    );
    expect(res.status(), "refused, not silently ignored").toBe(403);

    const visit = (await day(page)).visits.find(
      (v) => v.id === String(created.id),
    );
    expect(visit!.status).toBe("scheduled");
  });

  test("a boarding booking cannot be checked in to daycare", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const start = new Date();
    start.setDate(start.getDate() + 200);
    const end = new Date(start);
    end.setDate(end.getDate() + 2);
    const boarding = (await (
      await page.request.post("/api/bookings", {
        data: {
          ...bookingBody(),
          service: "boarding",
          startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10),
        },
      })
    ).json()) as BookingPayload;

    // The table would hold it happily. A boarding stay on the daycare floor is
    // the kind of thing found by a headcount that will not reconcile.
    const res = await page.request.post("/api/daycare/attendance", {
      data: { bookingRef: boarding.id },
    });
    expect(res.status()).toBe(422);
    expect(((await res.json()) as { error?: string }).error).toContain(
      "not a daycare booking",
    );
  });

  test("the dashboard counts the floor, not a fixture", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const payload = await day(page);
    const present = payload.visits.filter(
      (v) => v.status === "checked-in",
    ).length;

    await page.goto("/facility/dashboard/services/daycare");
    await expect(
      page.getByText(/spots filled/i).first(),
      "the capacity line renders",
    ).toBeVisible({ timeout: 60_000 });

    // The capacity is configuration (`daycare_config`), the count is a sum over
    // the visits. The fixture had a hardcoded 50 and a `Giant / 5` typed into
    // the JSX with no band behind it.
    await expect(
      page.getByText(
        new RegExp(`${present} of ${payload.capacity.total} spots filled`, "i"),
      ),
    ).toBeVisible();
  });
});
