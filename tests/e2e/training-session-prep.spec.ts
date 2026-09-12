import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A trainer's briefing and plan are kept on the session (2026-09-12).
//
// The pre-session briefing's "Mark briefed" and the planned exercises were
// query-cache entries: "Briefing reviewed. Have a great session!" was
// toasted, and the reminder came back on reload; a plan made at the desk was
// not on the floor tablet. They are columns on training_series_sessions now
// (20260912170021), written through PATCH /api/training/sessions/[id]. This
// pins:
//
//   1. A briefing and a plan written are read back through the book, and
//      un-briefing clears it.
//   2. A plan that is not a list of exercise ids is refused.
//   3. A customer cannot write either (RLS: check_in_out or
//      training_manage_programs).
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// The test makes its own one-session series and afterAll deletes it as
// service_role, matched by MARKER (its sessions cascade).
// ============================================================================

const MARKER = "[e2e training-session-prep]";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type BookSession = {
  id: string;
  classId: string;
  briefedAt?: string;
  plannedExerciseIds?: string[];
};

async function sessionOf(page: Page, seriesId: string): Promise<BookSession> {
  const res = await page.request.get("/api/training/book");
  expect(res.ok(), await res.text()).toBe(true);
  const book = (await res.json()) as { sessions: BookSession[] };
  const session = book.sessions.find((s) => s.classId === seriesId);
  expect(session, "the series' session is in the book").toBeTruthy();
  return session!;
}

async function patch(page: Page, sessionId: string, data: unknown) {
  return page.request.patch(`/api/training/sessions/${sessionId}`, { data });
}

test.describe.configure({ mode: "serial" });

let seriesId = "";
let sessionId = "";

test.afterAll(async () => {
  const { count } = await admin()
    .from("training_series")
    .delete({ count: "exact" })
    .like("name", `${MARKER}%`);
  console.log(`cleanup: ${count ?? 0} training series deleted`);
});

test.describe("a session's preparation is saved", () => {
  test("a briefing and a plan are read back, and un-briefing clears it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const today = new Date();
    const created = await page.request.post("/api/training/series", {
      data: {
        name: `${MARKER} ${Date.now()}`,
        dayOfWeek: today.getUTCDay(),
        startTime: "18:00",
        durationMinutes: 60,
        startDate: today.toISOString().slice(0, 10),
        numberOfSessions: 1,
        capacity: 4,
        totalPrice: 0,
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    seriesId = ((await created.json()) as { id: string }).id;
    sessionId = (await sessionOf(page, seriesId)).id;

    const planned = ["ex-sit", "ex-down", "ex-sit"];
    const saved = await patch(page, sessionId, {
      briefed: true,
      plannedExerciseIds: planned,
    });
    expect(saved.ok(), await saved.text()).toBe(true);

    const back = await sessionOf(page, seriesId);
    expect(back.briefedAt).toBeTruthy();
    // In the order planned, each once.
    expect(back.plannedExerciseIds).toEqual(["ex-sit", "ex-down"]);

    const cleared = await patch(page, sessionId, { briefed: false });
    expect(cleared.ok(), await cleared.text()).toBe(true);
    expect((await sessionOf(page, seriesId)).briefedAt).toBeFalsy();
  });

  test("a plan that is not a list of exercise ids is refused", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await patch(page, sessionId, { plannedExerciseIds: [42] });
    expect(res.status()).toBe(422);
    const empty = await patch(page, sessionId, {});
    expect(empty.status()).toBe(422);
  });

  test("a customer cannot mark a session briefed", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await patch(page, sessionId, { briefed: true });
    expect(res.ok()).toBe(false);
  });
});
