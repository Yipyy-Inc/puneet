import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A missed training session can be made up (20260913090803).
//
// The facility's Make-up sessions page read the attendance fixture and kept
// its offers in the query cache; the owner's tab was mock data with timers.
// This pins:
//
//   1. A session Buddy was booked into, that ended, and that he never checked
//      in to, is a missed session the owner can see.
//   2. Through the owner's tab: "Ask for a make-up" is still asked after a
//      reload.
//   3. Through the facility's page: "Book this seat" books a confirmed $0 seat
//      in another series of the same course, still booked after a reload.
//   4. The owner declines the seat and its booking is cancelled; staff mark
//      the session ineligible with a reason, and the owner can no longer ask.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// beforeAll gives Buddy, through the service role, two MARKER series of one
// MARKER course — one with a session that has ended, one with a session
// ahead — and a booking for the ended one that never checked in. The offer
// test also reads the host session's roster and its Make-up badge. afterAll
// deletes every booking on those sessions (the make-ups go with the missed
// one) and then the series.
// ============================================================================

const MARKER = "[e2e training-makeups]";
const API = "/api/training/makeups";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer.

interface MissedSession {
  bookingId: string;
  petId: number;
  seriesName: string;
  makeup: {
    id: string;
    status: string;
    ineligibleReason: string | null;
    seat: { sessionId: string; bookingStatus: string | null } | null;
  } | null;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 3_600_000).toISOString();

let seriesIds: string[] = [];
let sessionIds: string[] = [];
let hostSessionId = "";
let missedBookingId = "";

async function missedFor(
  request: import("@playwright/test").APIRequestContext,
): Promise<MissedSession | undefined> {
  const res = await request.get(API);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as MissedSession[]).find(
    (m) => m.bookingId === missedBookingId,
  );
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const db = admin();
  const { data: pet, error: petError } = await db
    .from("pets")
    .select("id, client_id, clients!inner(facility_id)")
    .eq("ref", BUDDY)
    .single();
  expect(petError?.message ?? null).toBeNull();
  const facilityId = (pet as unknown as { clients: { facility_id: string } })
    .clients.facility_id;

  const { data: series, error: seriesError } = await db
    .from("training_series")
    .insert(
      ["Tuesday", "Saturday"].map((day, i) => ({
        facility_id: facilityId,
        name: `${MARKER} Puppy basics ${day}`,
        course_type_name: `${MARKER} Puppy basics`,
        day_of_week: i === 0 ? 2 : 6,
        start_time: "18:00",
        duration_minutes: 60,
        start_date: new Date().toISOString().slice(0, 10),
        number_of_sessions: 4,
        capacity: 4,
        status: "active",
      })),
    )
    .select("id, name");
  expect(seriesError?.message ?? null).toBeNull();
  const own = series!.find((s) => s.name.endsWith("Tuesday"))!;
  const other = series!.find((s) => s.name.endsWith("Saturday"))!;
  seriesIds = series!.map((s) => s.id as string);

  const { data: sessions, error: sessionError } = await db
    .from("training_series_sessions")
    .insert([
      {
        series_id: own.id,
        facility_id: facilityId,
        session_number: 1,
        start_at: hoursFromNow(-49),
        end_at: hoursFromNow(-48),
        status: "completed",
      },
      {
        series_id: other.id,
        facility_id: facilityId,
        session_number: 1,
        start_at: hoursFromNow(72),
        end_at: hoursFromNow(73),
        status: "scheduled",
      },
    ])
    .select("id, series_id");
  expect(sessionError?.message ?? null).toBeNull();
  sessionIds = sessions!.map((s) => s.id as string);
  const missedSessionId = sessions!.find((s) => s.series_id === own.id)!.id;
  hostSessionId = sessions!.find((s) => s.series_id === other.id)!.id;

  const { error: enrollError } = await db
    .from("training_series_enrollments")
    .insert({
      series_id: own.id,
      facility_id: facilityId,
      pet_id: pet!.id,
      client_id: pet!.client_id,
      status: "enrolled",
    });
  expect(enrollError?.message ?? null).toBeNull();

  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .insert({
      facility_id: facilityId,
      client_id: pet!.client_id,
      service: "training",
      service_type: `${MARKER} Puppy basics`,
      status: "confirmed",
      start_at: hoursFromNow(-49),
      end_at: hoursFromNow(-48),
      base_price: 0,
      total_cost: 0,
      training_series_session_id: missedSessionId,
      special_requests: MARKER,
    })
    .select("id")
    .single();
  expect(bookingError?.message ?? null).toBeNull();
  missedBookingId = booking!.id as string;

  const { error: petLinkError } = await db
    .from("booking_pets")
    .insert({ booking_id: missedBookingId, pet_id: pet!.id });
  expect(petLinkError?.message ?? null).toBeNull();
});

test.afterAll(async () => {
  const db = admin();
  if (sessionIds.length > 0) {
    // The missed booking takes its make-up with it; the seat's booking goes too.
    const { error } = await db
      .from("bookings")
      .delete()
      .in("training_series_session_id", sessionIds);
    if (error) console.log(`cleanup bookings: ${error.message}`);
  }
  if (seriesIds.length > 0) {
    await db.from("training_series").delete().in("id", seriesIds);
  }
  await db.from("training_series").delete().like("name", `${MARKER}%`);
});

test.describe("a missed training session can be made up", () => {
  test("the owner sees the session Buddy missed", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const missed = await missedFor(page.request);
    expect(missed, "the missed session is not listed").toBeTruthy();
    expect(missed!.petId).toBe(BUDDY);
    expect(missed!.makeup).toBeNull();
  });

  test("through the owner's tab: asking for a make-up stays asked", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.customer);
    await page.goto("/customer/training?tab=makeup");
    const card = page
      .locator("li")
      .filter({ hasText: `${MARKER} Puppy basics Tuesday` });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: /Ask for a make-up for/ }).click();
    await page.getByRole("button", { name: "Ask for the make-up" }).click();
    await expect(card.getByText(/You asked for a make-up/)).toBeVisible({
      timeout: 15_000,
    });

    await page.reload();
    await expect(
      page
        .locator("li")
        .filter({ hasText: `${MARKER} Puppy basics Tuesday` })
        .getByText(/You asked for a make-up/),
    ).toBeVisible({ timeout: 30_000 });
    expect((await missedFor(page.request))?.makeup?.status).toBe("requested");
  });

  test("through the facility's page: a booked seat stays booked", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);

    // An owner cannot book the seat.
    const refused = await page.context().browser()!.newPage();
    try {
      await signIn(refused, ACCOUNTS.customer);
      const res = await refused.request.post(`${API}/${missedBookingId}`, {
        data: { action: "offer", hostSessionId },
      });
      expect(res.status()).toBe(403);
    } finally {
      await refused.close();
    }

    await page.goto("/facility/dashboard/services/training/makeup");
    const row = page
      .locator("li")
      .filter({ hasText: `${MARKER} Puppy basics Tuesday` });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByRole("button", { name: /Book a make-up seat for/ }).click();
    const seat = page
      .getByRole("dialog")
      .locator("li")
      .filter({ hasText: `${MARKER} Puppy basics Saturday` });
    await expect(seat).toBeVisible({ timeout: 30_000 });
    await seat.getByRole("button", { name: "Book this seat" }).click();
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await page.getByRole("tab", { name: /Seat booked/ }).click();
    await expect(
      page.locator("li").filter({ hasText: `${MARKER} Puppy basics Tuesday` }),
    ).toBeVisible({ timeout: 30_000 });

    const missed = await missedFor(page.request);
    expect(missed?.makeup?.status).toBe("offered");
    expect(missed?.makeup?.seat?.sessionId).toBe(hostSessionId);
    expect(missed?.makeup?.seat?.bookingStatus).toBe("confirmed");

    // Buddy is on the host session's roster, as a make-up
    // (20260913122341), and the session view says so.
    const book = await page.request.get("/api/training/book");
    expect(book.ok(), await book.text()).toBe(true);
    const host = (
      (await book.json()) as {
        sessions: {
          id: string;
          attendees: string[];
          makeupAttendees?: string[];
        }[];
      }
    ).sessions.find((s) => s.id === hostSessionId);
    expect(host?.makeupAttendees).toHaveLength(1);
    expect(host?.attendees).toContain(host?.makeupAttendees?.[0]);

    await page.goto(
      `/facility/dashboard/services/training/session/${hostSessionId}`,
    );
    await expect(
      page.getByText("Make-up", { exact: true }).first(),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("the owner declines, and staff close it with a reason", async ({
    browser,
  }) => {
    const owner = await browser.newPage();
    const staff = await browser.newPage();
    try {
      await signIn(owner, ACCOUNTS.customer);
      const before = await missedFor(owner.request);
      const declined = await owner.request.post(`${API}/${missedBookingId}`, {
        data: { action: "decline", makeupId: before!.makeup!.id },
      });
      expect(declined.ok(), await declined.text()).toBe(true);
      const after = await missedFor(owner.request);
      expect(after?.makeup?.status).toBe("declined");
      expect(after?.makeup?.seat?.bookingStatus).toBe("cancelled");

      await signIn(staff, ACCOUNTS.owner);
      const closed = await staff.request.post(`${API}/${missedBookingId}`, {
        data: { action: "ineligible", reason: `${MARKER} no notice given` },
      });
      expect(closed.ok(), await closed.text()).toBe(true);

      const seen = await missedFor(owner.request);
      expect(seen?.makeup?.status).toBe("ineligible");
      expect(seen?.makeup?.ineligibleReason).toBe(`${MARKER} no notice given`);
      const again = await owner.request.post(`${API}/${missedBookingId}`, {
        data: { action: "request" },
      });
      expect(again.status()).toBe(422);
    } finally {
      await owner.close();
      await staff.close();
    }
  });
});
