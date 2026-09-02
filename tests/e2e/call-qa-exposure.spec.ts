import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A QA score is an assessment of a colleague, and /api/facility/calling/calls
// does not hand it to people who may not see one.
//
// `call_record_read` requires `calling_view`. Reception holds it — measured,
// not assumed: `resolve_permission` answers 'operating_hours' for
// reception@yipyy.dev and NULL for view_staff_performance. RLS gates ROWS, so
// the same policy that lets a receptionist see the call handed them the
// manager's rating of whoever took it, sitting on the same row.
//
// The screen did gate the score, with `getFacilityRole() === "owner" |
// "manager"` — a cookie the browser can write, returning "owner" when absent.
// So the default path granted it to everyone. Either way the number was in the
// response, and, as staff-field-exposure.spec.ts says of the same defect in
// /api/staff: a hidden tab is not a control.
//
// ── WHY THIS SEEDS A ROW ──────────────────────────────────────────────────
//
// "reception sees no qa_score" passes against an empty table, a broken route
// and a deleted one. So the manager's read is the POSITIVE control: if the
// seed did not land, that assertion fails first and the negative one cannot
// pass vacuously.
//
// The row goes in as `service_role` because there is no other door —
// `call_record` is a projection with no insert policy, maintained by trigger
// from `call_event`, and the webhook that would fill it resolves its facility
// from `communication_numbers`, which provisioning has not written to yet.
//
// TO CONFIRM THIS FAILS WITHOUT THE FIX: drop the `canSeeQa` map in
// src/app/api/facility/calling/calls/route.ts and re-run. The reception
// expectation should go red while the manager one stays green.
//
// THE DATABASE IS PRODUCTION. The seeded row carries an [e2e] marker in its
// notes and its sid, and `afterAll` deletes it and asserts nothing of that
// shape survives.
// ============================================================================

const SID = "CAe2e0000000000000000000000000qa01";
const MARKER = "[e2e] call-qa-exposure";
const SEEDED_SCORE = 4;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Not a skip. CI hard-fails on a missing secret before the suite starts, and
  // a spec that quietly does nothing is the failure mode this file is about.
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface CallRow {
  id: string;
  provider_call_sid: string;
  qa_score: number | null;
  notes: string | null;
}

async function callsAs(page: Page, email: string): Promise<CallRow[]> {
  await signIn(page, email);
  const res = await page.request.get("/api/facility/calling/calls");
  expect(res.status(), `${email} should reach the calls route`).toBe(200);
  const body = (await res.json()) as { calls: CallRow[] };
  return body.calls;
}

function seeded(rows: CallRow[]): CallRow | undefined {
  return rows.find((r) => r.provider_call_sid === SID);
}

test.describe.configure({ mode: "serial" });

test.describe("call QA score exposure", () => {
  test.beforeAll(async () => {
    const db = admin();

    const { data: facility, error: lookupError } = await db
      .from("facilities")
      .select("id")
      .eq("slug", "yipyy-demo-facility")
      .single();
    expect(lookupError, "the demo facility must exist").toBeNull();

    // Delete first: a run killed between the seed and the teardown would
    // otherwise collide with the unique sid and fail here rather than where the
    // problem is.
    await db.from("call_record").delete().eq("provider_call_sid", SID);

    const { error } = await db.from("call_record").insert({
      facility_id: facility!.id,
      provider_call_sid: SID,
      direction: "inbound",
      status: "completed",
      from_number: "+15145550199",
      to_number: "+15145550100",
      started_at: new Date(Date.now() - 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      duration_s: 60,
      qa_score: SEEDED_SCORE,
      notes: MARKER,
    });
    expect(
      error,
      "the seed must land or every assertion below is vacuous",
    ).toBeNull();
  });

  test.afterAll(async () => {
    const db = admin();
    await db.from("call_record").delete().eq("provider_call_sid", SID);

    const { data } = await db
      .from("call_record")
      .select("id")
      .eq("provider_call_sid", SID);
    expect(
      data ?? [],
      "the seeded call must not outlive this file",
    ).toHaveLength(0);
  });

  test("a manager sees the score — the control that proves the seed landed", async ({
    page,
  }) => {
    const row = seeded(await callsAs(page, ACCOUNTS.manager));
    expect(
      row,
      "the seeded call should be readable by a manager",
    ).toBeDefined();
    expect(row!.qa_score).toBe(SEEDED_SCORE);
  });

  test("reception reads the same call and gets no score", async ({ page }) => {
    const rows = await callsAs(page, ACCOUNTS.reception);
    const row = seeded(rows);

    // Reception holds calling_view, so the CALL is theirs to see. The point is
    // not that the row is hidden — hiding it would break the call log for the
    // people who answer the phone.
    expect(
      row,
      "reception holds calling_view and should see the call",
    ).toBeDefined();
    expect(row!.notes).toBe(MARKER);

    // …and the score is gone. Null, not zero: a zero is a bad score.
    expect(row!.qa_score).toBeNull();
  });

  test("a groomer holds no calling_view and reads nothing", async ({
    page,
  }) => {
    // RLS, not the route. `call_record_read` is the boundary; the page gate
    // added alongside this only decides whether a screen is drawn.
    const rows = await callsAs(page, ACCOUNTS.groomer);
    expect(
      seeded(rows),
      "a groomer without calling_view sees no calls",
    ).toBeUndefined();
  });
});
