import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { ownStaffId } from "@/lib/api/own-staff";
import {
  toAvailabilityRequest,
  toAvailabilityWeek,
  type AvailabilityDay,
  type AvailabilityDayRow,
  type AvailabilityRequest,
  type AvailabilityRequestRow,
} from "@/lib/api/mappers/scheduling";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// When people can actually work.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `employeeAvailabilities` in src/data/scheduling.ts, keyed on `emp-1`,
// `emp-2` … — legacy ids matching no staff row since the conversion to uuids.
// The scheduling conflict checker takes that array and asks "is this person
// free then"; the answer has been "no such person" for everybody, so the
// draft-review warnings were about nobody and the screen said "Schedule looks
// clean".
//
// ── ONE ROUTE FOR THE PATTERN AND THE PROPOSALS ───────────────────────────
//
// Every screen that draws one wants the other: the approval queue compares a
// proposal against what is live, and the calendar wants the live patterns to
// check shifts against. Two endpoints would be two round trips and a moment
// where the page has half an answer.
//
// ── AND THE PATTERN IS ALWAYS A WHOLE WEEK ────────────────────────────────
//
// Somebody with no rows has not filled this in — which is different from being
// unavailable. `toAvailabilityWeek` fills the gaps as available-with-no-window,
// the reading that produces no conflict either way. Returning a partial week
// would make "unstated" mean whatever each caller happened to assume.
// ============================================================================

export const dynamic = "force-dynamic";

const PATTERN_SELECT =
  "staff_id, day_of_week, is_available, available_from, available_to, notes";

const REQUEST_SELECT =
  "id, staff_id, previous, proposed, effective_from, reason, status, " +
  "requested_at, reviewed_by, reviewed_at, review_notes, " +
  "staff:staff!staff_id(first_name, last_name), " +
  "reviewer:profiles!reviewed_by(full_name)";

const STATUSES = ["pending", "approved", "denied", "cancelled"] as const;

export interface AvailabilityPayload {
  /** Keyed by staff row uuid — the whole week for each. */
  patterns: Record<string, AvailabilityDay[]>;
  requests: AvailabilityRequest[];
  /** False when the caller may not approve — so a screen can say so. */
  canDecide: boolean;
  /**
   * The caller's own staff row, when they have one.
   *
   * `patterns` is keyed by staff uuid and the browser has no other way to get
   * from a session to one, so without this the personal screen cannot find
   * which of these weeks is its own.
   */
  myStaffId?: string;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const asked = new URL(request.url).searchParams.get("status");
  const status = STATUSES.find((s) => s === asked);

  const supabase = await createServerClient();

  let requestQuery = supabase
    .from("staff_availability_requests")
    .select(REQUEST_SELECT)
    .order("requested_at", { ascending: false });

  if (status) requestQuery = requestQuery.eq("status", status);

  const [patterns, requests, permissions, myStaffId] = await Promise.all([
    supabase.from("staff_availability").select(PATTERN_SELECT),
    requestQuery,
    supabase.rpc("my_permissions"),
    ownStaffId(supabase, viewer, context.facilityId),
  ]);

  if (patterns.error) {
    return NextResponse.json(
      { error: patterns.error.message },
      { status: 500 },
    );
  }

  const byStaff = new Map<string, AvailabilityDayRow[]>();
  for (const row of (patterns.data ?? []) as (AvailabilityDayRow & {
    staff_id: string;
  })[]) {
    const list = byStaff.get(row.staff_id) ?? [];
    list.push(row);
    byStaff.set(row.staff_id, list);
  }

  return NextResponse.json({
    patterns: Object.fromEntries(
      [...byStaff].map(([staffId, rows]) => [
        staffId,
        toAvailabilityWeek(rows),
      ]),
    ),
    requests: (
      (requests.data ?? []) as unknown as AvailabilityRequestRow[]
    ).map(toAvailabilityRequest),
    // The SCOPE, not the presence of the key — `my_permissions()` returns a row
    // for every permission in the catalogue, `none` included.
    canDecide: (
      (permissions.data ?? []) as { permission_key: string; scope: string }[]
    ).some(
      (entry) =>
        entry.permission_key === "scheduling_manage_availability" &&
        entry.scope !== "none",
    ),
    myStaffId,
  } satisfies AvailabilityPayload);
}

interface ProposalInput {
  /** Omitted means "me" — resolved from the membership, never sent. */
  employeeId?: string;
  proposed?: AvailabilityDay[];
  effectiveFrom?: string;
  reason?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** A proposal has to be a whole week, and each day has to make sense. */
function invalidWeek(week: AvailabilityDay[] | undefined): string | null {
  if (!Array.isArray(week) || week.length !== 7) {
    return "A proposal is a whole week — seven days, Sunday to Saturday.";
  }

  const seen = new Set<number>();
  for (const day of week) {
    if (
      typeof day?.dayOfWeek !== "number" ||
      day.dayOfWeek < 0 ||
      day.dayOfWeek > 6
    ) {
      return "Each day needs a `dayOfWeek` from 0 (Sunday) to 6.";
    }
    if (seen.has(day.dayOfWeek)) return "That week names a day twice.";
    seen.add(day.dayOfWeek);

    if (typeof day.isAvailable !== "boolean") {
      return "Each day needs `isAvailable`.";
    }
    if (!day.isAvailable) continue;

    // Half a window is not a window — the table refuses it, and saying so here
    // means a form gets a sentence rather than a constraint name.
    const hasStart = Boolean(day.startTime);
    const hasEnd = Boolean(day.endTime);
    if (hasStart !== hasEnd) {
      return "A day needs both a start and an end time, or neither for all day.";
    }
    if (hasStart && (!TIME.test(day.startTime!) || !TIME.test(day.endTime!))) {
      return "Times are HH:MM.";
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as ProposalInput;

  const problem = invalidWeek(input.proposed);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 422 });
  }
  if (!input.effectiveFrom || !DATE.test(input.effectiveFrom)) {
    return NextResponse.json(
      { error: "An `effectiveFrom` date as YYYY-MM-DD." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  let staffId = input.employeeId;
  if (!staffId) {
    staffId = await ownStaffId(supabase, viewer, context.facilityId);
  }

  if (!staffId) {
    return NextResponse.json(
      {
        error:
          "You are not on this facility's staff, so you have no availability to change.",
      },
      { status: 422 },
    );
  }

  // ── SNAPSHOTTED HERE, NOT DERIVED AT READ TIME ─────────────────────────
  //
  // The approval screen shows current against proposed. Reading "current" live
  // would mean a decided request shows a diff nobody ever agreed to, once the
  // pattern moves on — so what it would replace is captured now.
  const { data: current } = await supabase
    .from("staff_availability")
    .select(PATTERN_SELECT)
    .eq("staff_id", staffId);

  const { data, error } = await supabase
    .from("staff_availability_requests")
    .insert({
      facility_id: context.facilityId,
      staff_id: staffId,
      previous: toAvailabilityWeek((current ?? []) as AvailabilityDayRow[]),
      proposed: input.proposed,
      effective_from: input.effectiveFrom,
      reason: input.reason ?? "",
    } as never)
    .select(REQUEST_SELECT)
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate:
        "There is already an open request to change that person's availability.",
      denied: "You do not have permission to propose this change.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to propose this change." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    toAvailabilityRequest(data as unknown as AvailabilityRequestRow),
    { status: 201 },
  );
}

interface DecisionInput {
  id?: string;
  status?: "approved" | "denied" | "cancelled";
  notes?: string;
}

export interface AvailabilityDecision extends AvailabilityRequest {
  /** The week as it now stands. Only present on approval. */
  applied?: AvailabilityDay[];
}

/**
 * Approve, deny, or withdraw.
 *
 * Approval is the RPC, because it has to apply the week and mark the request in
 * one transaction — the same lesson as the shift swap. Denying and withdrawing
 * are ordinary RLS-governed updates: there is nothing else to change.
 */
export async function PATCH(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => ({}))) as DecisionInput;

  if (
    !input.id ||
    !input.status ||
    !["approved", "denied", "cancelled"].includes(input.status)
  ) {
    return NextResponse.json(
      { error: "An `id` and a `status` of approved, denied or cancelled." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  if (input.status === "approved") {
    const { data: applied, error } = await supabase.rpc(
      "approve_availability_request",
      { p_request_id: input.id, p_notes: input.notes ?? undefined },
    );

    if (error) {
      if (error.code === "22023") {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.code === "P0002") {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return writeFailure(error, {
        duplicate: "That change could not be applied.",
        denied: "You do not have permission to decide availability.",
      });
    }

    const { data } = await supabase
      .from("staff_availability_requests")
      .select(REQUEST_SELECT)
      .eq("id", input.id)
      .maybeSingle();

    const decision = toAvailabilityRequest(
      data as unknown as AvailabilityRequestRow,
    ) as AvailabilityDecision;

    decision.applied = toAvailabilityWeek(
      (applied ?? []) as AvailabilityDayRow[],
    );

    return NextResponse.json(decision);
  }

  const { data, error } = await supabase
    .from("staff_availability_requests")
    .update({
      status: input.status,
      review_notes: input.notes ?? null,
    } as never)
    .eq("id", input.id)
    .select(REQUEST_SELECT);

  if (error) {
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return writeFailure(error, {
      duplicate: "That request could not be updated.",
      denied: "You do not have permission to decide this request.",
    });
  }

  // 0 rows and no error is an RLS refusal, not a success — see check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    "No request you can decide with that id.",
  );
  if (refused) return refused;

  return NextResponse.json(
    toAvailabilityRequest((data as unknown as AvailabilityRequestRow[])[0]!),
  );
}

/**
 * Remove a request outright, or clear somebody's stated pattern.
 *
 * `?id=` removes a REQUEST. Not the same as withdrawing — that is a status, and
 * it keeps the record that somebody asked. This is for a row that should never
 * have existed.
 *
 * `?staff=` clears a PATTERN back to unstated, which is a different thing from
 * stating "available all week": unstated produces no conflict either way, while
 * a stated all-week pattern is a claim that this person is free at 3am on a
 * Sunday. A manager needs to be able to say "forget what we had" when somebody
 * changes role, and without this the only move is to assert a new week.
 */
export async function DELETE(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const staffId = params.get("staff");

  if (staffId) {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("staff_availability")
      .delete()
      .eq("staff_id", staffId)
      .select("day_of_week");

    if (error) {
      return writeFailure(error, {
        duplicate: "That pattern could not be cleared.",
        denied: "You do not have permission to change availability.",
      });
    }

    // Zero rows here is NOT a refusal — it is somebody who never stated a
    // pattern, which is an ordinary thing to clear twice. `deniedIfUntouched`
    // would turn "nothing to do" into "you may not", and the RLS policy on this
    // table is the same one that just ran.
    return NextResponse.json({ cleared: (data ?? []).length });
  }

  const id = params.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "An `id` (a request) or a `staff` (a pattern) is required." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("staff_availability_requests")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "That request could not be removed.",
      denied: "You do not have permission to remove availability requests.",
    });
  }

  const refused = deniedIfUntouched(
    data,
    "No request you can remove with that id.",
  );
  if (refused) return refused;

  return NextResponse.json({ removed: id });
}
