import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Training homework is a row, and so is each day it was practised
// (20260912205812).
//
// Every homework screen read `trainingHomeworkRecords`, a fixture, and wrote
// the query cache: homework assigned to a real dog was gone on reload, and an
// owner's "Mark as done" never reached the trainer. This pins:
//
//   1. Staff assign homework on an enrollment, and read it back.
//   2. The owner reads it and logs a day of practice — once a day, moving the
//      next due date — and cannot edit or delete it.
//   3. The trainer's response to that day reaches the owner.
//   4. Through the student's Homework tab: "Mark complete" is still complete
//      after a reload.
//   5. Through the owner's Homework tab: "Mark as done for today" is still
//      done after a reload.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Buddy has no real training enrollment, so beforeAll gives him one on a
// series named with MARKER, through the service role. afterAll deletes that
// series, and the enrollment, homework and practice rows go with it.
// ============================================================================

const MARKER = "[e2e training-homework]";
const API = "/api/training/homework";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer.

interface Homework {
  id: string;
  enrollmentId: string;
  petId?: number;
  title: string;
  nextDueDate: string | null;
  completed: boolean;
  practiceLog?: { date: string; trainerResponse?: string }[];
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

/** A date as the database's `current_date` sees it. */
function isoDay(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

let seriesId = "";
let enrollmentId = "";
let practised: Homework;
let forTheOwner: Homework;

async function assign(page: Page, title: string, extra = {}) {
  const res = await page.request.post(API, {
    data: {
      enrollmentId,
      title: `${MARKER} ${title}`,
      frequency: "Daily, 5 minutes",
      nextDueDate: isoDay(),
      ...extra,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as Homework;
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const db = admin();
  const { data: pet, error: petError } = await db
    .from("pets")
    .select("id, client_id, facility_id")
    .eq("ref", BUDDY)
    .single();
  expect(petError?.message ?? null).toBeNull();

  const { data: series, error: seriesError } = await db
    .from("training_series")
    .insert({
      facility_id: pet!.facility_id,
      name: `${MARKER} Puppy basics`,
      day_of_week: 2,
      start_time: "18:00",
      duration_minutes: 60,
      start_date: isoDay(),
      number_of_sessions: 4,
      status: "active",
    })
    .select("id")
    .single();
  expect(seriesError?.message ?? null).toBeNull();
  seriesId = series!.id as string;

  const { data: enrollment, error: enrollmentError } = await db
    .from("training_series_enrollments")
    .insert({
      series_id: seriesId,
      facility_id: pet!.facility_id,
      pet_id: pet!.id,
      client_id: pet!.client_id,
      status: "enrolled",
    })
    .select("id")
    .single();
  expect(enrollmentError?.message ?? null).toBeNull();
  enrollmentId = enrollment!.id as string;
});

test.afterAll(async () => {
  const db = admin();
  // The series takes its enrollment, homework and practice rows with it.
  if (seriesId) await db.from("training_series").delete().eq("id", seriesId);
  await db.from("training_series").delete().like("name", `${MARKER}%`);
});

test.describe("training homework is a row", () => {
  test("staff assign homework on an enrollment and read it back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    practised = await assign(page, "sit on cue");
    forTheOwner = await assign(page, "loose-leash walk");

    const res = await page.request.get(`${API}?enrollmentIds=${enrollmentId}`);
    expect(res.ok(), await res.text()).toBe(true);
    const rows = (await res.json()) as Homework[];
    const found = rows.find((h) => h.id === practised.id);
    expect(found, "assigned homework is not in the list").toBeTruthy();
    expect(found!.petId).toBe(BUDDY);
  });

  test("the owner logs a practice once a day, and cannot edit or delete", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const mine = await page.request.get(API);
    expect(mine.ok(), await mine.text()).toBe(true);
    expect(
      ((await mine.json()) as Homework[]).some((h) => h.id === practised.id),
    ).toBe(true);

    const first = await page.request.post(`${API}/${practised.id}/practice`, {
      data: { date: isoDay() },
    });
    expect(first.status(), await first.text()).toBe(201);
    const again = await page.request.post(`${API}/${practised.id}/practice`, {
      data: { date: isoDay() },
    });
    expect(again.status(), await again.text()).toBe(201);
    const after = (await again.json()) as Homework;
    expect(after.practiceLog).toHaveLength(1);
    // Daily: due the day after the day it was practised.
    expect(after.nextDueDate).toBe(isoDay(1));

    const edit = await page.request.patch(`${API}/${practised.id}`, {
      data: { title: "Owner edit" },
    });
    expect(edit.status()).toBe(403);
    const remove = await page.request.delete(`${API}/${practised.id}`);
    expect(remove.status()).toBe(403);
  });

  test("the trainer's response to a day reaches the owner", async ({
    browser,
  }) => {
    const staff = await browser.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      const res = await staff.request.patch(`${API}/${practised.id}/practice`, {
        data: { date: isoDay(), response: `${MARKER} lovely sits` },
      });
      expect(res.ok(), await res.text()).toBe(true);
    } finally {
      await staff.close();
    }

    const owner = await browser.newPage();
    try {
      await signIn(owner, ACCOUNTS.customer);
      const res = await owner.request.get(API);
      const row = ((await res.json()) as Homework[]).find(
        (h) => h.id === practised.id,
      );
      expect(row?.practiceLog?.[0]?.trainerResponse).toBe(
        `${MARKER} lovely sits`,
      );
    } finally {
      await owner.close();
    }
  });

  test("through the student's Homework tab: complete stays complete", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    await page.goto(
      `/facility/dashboard/services/training/students/${BUDDY}?tab=homework`,
    );
    const card = page
      .locator("li")
      .filter({ hasText: practised.title })
      .filter({ has: page.getByRole("button", { name: "Mark complete" }) });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: "Mark complete" }).click();

    await expect(async () => {
      const res = await page.request.get(
        `${API}?enrollmentIds=${enrollmentId}`,
      );
      const row = ((await res.json()) as Homework[]).find(
        (h) => h.id === practised.id,
      );
      expect(row?.completed).toBe(true);
    }).toPass({ timeout: 15_000 });

    await page.reload();
    await expect(
      page.getByRole("button", { name: /completed homework/i }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("through the owner's Homework tab: done for today stays done", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.customer);
    await page.goto("/customer/training?tab=homework");
    const card = page.locator("li").filter({ hasText: forTheOwner.title });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole("button", { name: "Mark as done for today" }).click();
    await expect(
      card.getByRole("button", { name: "Done for today" }),
    ).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(
      page
        .locator("li")
        .filter({ hasText: forTheOwner.title })
        .getByRole("button", { name: "Done for today" }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
