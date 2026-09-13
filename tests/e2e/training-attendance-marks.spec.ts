import { test, expect, type APIRequestContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A training absence is recorded, and attendance is read from the bookings
// (20260913100835).
//
// Every attendance screen in training read `sessionAttendances`, a fixture,
// and the session view wrote nothing for a dog marked absent. This pins:
//
//   1. An ended session nobody recorded reads as absent; one ahead is not in
//      the history.
//   2. Staff record an absence and a late arrival, and a plain check-in clears
//      an absence recorded by mistake.
//   3. The owner reads their dog's history and cannot record it.
//   4. Through the student's History tab: the late arrival reads "Late" after
//      a reload, with the exercise it was rated on.
//
// And (20260913104649) a late arrival keeps its exercise ratings, a malformed
// rating is refused, and a dog can be excused.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// beforeAll gives Buddy, through the service role, a MARKER series with two
// sessions that have ended and one ahead, enrolls him, and books him into all
// three. afterAll deletes those bookings (their attendance goes with them) and
// then the series.
// ============================================================================

const MARKER = "[e2e training-attendance-marks]";
const API = "/api/training/attendance";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer.
const HISTORY = `${API}/history?petRef=${BUDDY}`;
const SIT = `${MARKER} Sit`;

interface Attendance {
  sessionId: string;
  status: string;
  checkInTime: string | null;
  exercises?: { exerciseName: string; rating: number }[];
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

let seriesId = "";
/** By session number: 1 and 2 have ended, 3 is ahead. */
const sessionIds: string[] = [];
const bookingRefs: number[] = [];

async function history(request: APIRequestContext) {
  const res = await request.get(HISTORY);
  expect(res.ok(), await res.text()).toBe(true);
  const rows = (await res.json()) as Attendance[];
  return (n: number) => rows.find((r) => r.sessionId === sessionIds[n - 1]);
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
    .insert({
      facility_id: facilityId,
      name: `${MARKER} Puppy basics`,
      course_type_name: `${MARKER} Puppy basics`,
      day_of_week: 2,
      start_time: "18:00",
      duration_minutes: 60,
      start_date: new Date().toISOString().slice(0, 10),
      number_of_sessions: 3,
      capacity: 4,
      status: "active",
    })
    .select("id")
    .single();
  expect(seriesError?.message ?? null).toBeNull();
  seriesId = series!.id as string;

  const windows = [
    [-73, -72, "completed"],
    [-49, -48, "completed"],
    [72, 73, "scheduled"],
  ] as const;
  for (const [i, [from, to, status]] of windows.entries()) {
    const { data: session, error } = await db
      .from("training_series_sessions")
      .insert({
        series_id: seriesId,
        facility_id: facilityId,
        session_number: i + 1,
        start_at: hoursFromNow(from),
        end_at: hoursFromNow(to),
        status,
      })
      .select("id")
      .single();
    expect(error?.message ?? null).toBeNull();
    sessionIds.push(session!.id as string);

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .insert({
        facility_id: facilityId,
        client_id: pet!.client_id,
        service: "training",
        service_type: `${MARKER} Puppy basics`,
        status: "confirmed",
        start_at: hoursFromNow(from),
        end_at: hoursFromNow(to),
        base_price: 0,
        total_cost: 0,
        training_series_session_id: session!.id,
        special_requests: MARKER,
      })
      .select("id, ref")
      .single();
    expect(bookingError?.message ?? null).toBeNull();
    bookingRefs.push(Number(booking!.ref));
    const { error: petLinkError } = await db
      .from("booking_pets")
      .insert({ booking_id: booking!.id, pet_id: pet!.id });
    expect(petLinkError?.message ?? null).toBeNull();
  }

  const { error: enrollError } = await db
    .from("training_series_enrollments")
    .insert({
      series_id: seriesId,
      facility_id: facilityId,
      pet_id: pet!.id,
      client_id: pet!.client_id,
      status: "enrolled",
    });
  expect(enrollError?.message ?? null).toBeNull();
});

test.afterAll(async () => {
  const db = admin();
  if (sessionIds.length > 0) {
    const { error } = await db
      .from("bookings")
      .delete()
      .in("training_series_session_id", sessionIds);
    if (error) console.log(`cleanup bookings: ${error.message}`);
  }
  if (seriesId) await db.from("training_series").delete().eq("id", seriesId);
  await db.from("training_series").delete().like("name", `${MARKER}%`);
});

test.describe("a training absence is recorded", () => {
  test("an ended session nobody recorded reads as absent, and one ahead is not listed", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const session = await history(page.request);
    expect(session(1)?.status).toBe("absent");
    expect(session(2)?.status).toBe("absent");
    expect(session(3)).toBeUndefined();
  });

  test("staff record an absence and a late arrival, and an arrival clears an absence", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const absent = await page.request.post(API, {
      data: { bookingRef: bookingRefs[1], mark: "absent", notes: MARKER },
    });
    expect(absent.status(), await absent.text()).toBe(201);
    let session = await history(page.request);
    expect(session(2)?.status).toBe("absent");
    expect(session(2)?.checkInTime).toBeNull();

    const late = await page.request.post(API, {
      data: {
        bookingRef: bookingRefs[0],
        mark: "late",
        exercises: [{ exerciseName: SIT, rating: 4 }],
      },
    });
    expect(late.status(), await late.text()).toBe(201);

    const arrived = await page.request.post(API, {
      data: { bookingRef: bookingRefs[1] },
    });
    expect(arrived.status(), await arrived.text()).toBe(201);

    session = await history(page.request);
    expect(session(1)?.status).toBe("late");
    expect(session(1)?.checkInTime).toBeTruthy();
    expect(session(2)?.status).toBe("present");
    expect(session(1)?.exercises).toEqual([{ exerciseName: SIT, rating: 4 }]);

    const excused = await page.request.post(API, {
      data: { bookingRef: bookingRefs[2], mark: "excused" },
    });
    expect(excused.status(), await excused.text()).toBe(201);
    expect((await history(page.request))(3)?.status).toBe("excused");

    const unrated = await page.request.post(API, {
      data: {
        bookingRef: bookingRefs[0],
        exercises: [{ exerciseName: SIT, rating: 9 }],
      },
    });
    expect(unrated.status()).toBe(422);

    const unknown = await page.request.post(API, {
      data: { bookingRef: bookingRefs[1], mark: "sick" },
    });
    expect(unknown.status()).toBe(422);
  });

  test("the owner reads the history and cannot record it", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const session = await history(page.request);
    expect(session(1)?.status).toBe("late");

    const refused = await page.request.post(API, {
      data: { bookingRef: bookingRefs[0], mark: "absent" },
    });
    expect(refused.status()).toBe(403);
    expect((await history(page.request))(1)?.status).toBe("late");
  });

  test("through the student's History tab: late reads late after a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    await page.goto(
      `/facility/dashboard/services/training/students/${BUDDY}?tab=history`,
    );
    await expect(page.getByText(`${MARKER} Puppy basics`).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.reload();
    await expect(page.getByText(`${MARKER} Puppy basics`).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText("Late", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(SIT).first()).toBeVisible();
  });
});
