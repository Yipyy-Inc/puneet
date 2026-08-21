import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { ownStaffId } from "@/lib/api/own-staff";
import {
  toTimeOffRequest,
  type RequestStatus,
  type TimeOffRequest,
  type TimeOffRow,
  type TimeOffType,
} from "@/lib/api/mappers/scheduling";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Time off.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// A `useState` over `enhancedTimeOffRequests`. Approving stamped
// `reviewedBy: "emp-1"` — one hardcoded person, whoever was signed in — and the
// decision was gone on reload. Nobody's holiday was ever actually booked.
//
// ── APPROVING IS NOT THE END OF THE STORY ─────────────────────────────────
//
// Somebody can be granted leave they are still rostered to work. That is the
// mistake this feature exists to prevent and neither the screen nor the fixture
// could see it, so a PATCH that approves comes back with the shifts that now
// clash, from `time_off_shift_conflicts` — which does the date-to-instant
// conversion in the facility's own timezone.
//
// It does NOT refuse. A manager approving leave over a shift they intend to
// re-cover is doing their job; a manager doing it without being told is not.
//
// ── THE FACILITY IS NEVER SENT ────────────────────────────────────────────
//
// RLS scopes the table, and it decides more than that: an approver sees every
// request, and everybody else sees their own. Same query, different answers, no
// branch in this file.
// ============================================================================

export const dynamic = "force-dynamic";

// `staff!staff_id` and `profiles!reviewed_by` are TO-ONE embeds and arrive as
// objects. Reading one as an array is silent — see the mapper.
const SELECT =
  "id, staff_id, type, starts_on, ends_on, reason, status, requested_at, " +
  "reviewed_by, reviewed_at, review_notes, " +
  "staff:staff!staff_id(first_name, last_name), " +
  "reviewer:profiles!reviewed_by(full_name)";

const STATUSES = ["pending", "approved", "denied", "cancelled"] as const;

export interface TimeOffPayload {
  requests: TimeOffRequest[];
  /** False when the caller may only see their own — so a screen can say so. */
  canDecide: boolean;
}

/** A conflicting shift, named rather than counted, so a screen can show which. */
export interface ShiftConflict {
  shiftId: string;
  startsAt: string;
  endsAt: string;
}

export interface TimeOffDecision extends TimeOffRequest {
  /** Shifts this person is still rostered for during leave just approved. */
  conflicts?: ShiftConflict[];
}

async function canDecide(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<boolean> {
  const { data } = await supabase.rpc("my_permissions");
  // The SCOPE, not the presence of the key: `my_permissions()` returns a row
  // for every permission in the catalogue, `none` included. Phase 1 shipped
  // this as a key-presence check and told a groomer they could see wages.
  return ((data ?? []) as { permission_key: string; scope: string }[]).some(
    (entry) =>
      entry.permission_key === "scheduling_approve_time_off" &&
      entry.scope !== "none",
  );
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

  // Narrowed against the enum rather than passed through: an unrecognised
  // status would otherwise reach PostgREST as a filter on a value the column
  // cannot hold, and come back as a 500 rather than an empty list.
  const params = new URL(request.url).searchParams;
  const asked = params.get("status");
  const status = STATUSES.find((s) => s === asked);

  const supabase = await createServerClient();
  let query = supabase
    .from("staff_time_off_requests")
    .select(SELECT)
    .order("requested_at", { ascending: false });

  if (status) query = query.eq("status", status);

  // `?mine=1` — the personal screen, not the approval queue. An approver reads
  // the whole facility from this endpoint, so without this their own "My
  // requests" panel would list everybody's leave. Not rostered? Then you have
  // filed nothing, and an empty list is the honest answer.
  if (params.get("mine") === "1") {
    const staffId = await ownStaffId(supabase, viewer, context.facilityId);
    if (!staffId) {
      return NextResponse.json({
        requests: [],
        canDecide: false,
      } satisfies TimeOffPayload);
    }
    query = query.eq("staff_id", staffId);
  }

  const [{ data, error }, decide] = await Promise.all([
    query,
    canDecide(supabase),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    requests: (data as unknown as TimeOffRow[]).map(toTimeOffRequest),
    canDecide: decide,
  } satisfies TimeOffPayload);
}

interface TimeOffInput {
  /** The staff row's uuid. Omitted means "me", which is the common case. */
  employeeId?: string;
  type?: TimeOffType;
  startDate?: string;
  endDate?: string;
  reason?: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const TYPES: TimeOffType[] = [
  "vacation",
  "sick_leave",
  "personal",
  "bereavement",
  "parental",
  "unpaid",
  "other",
];

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as TimeOffInput;

  if (
    !input.type ||
    !TYPES.includes(input.type) ||
    !input.startDate ||
    !DATE.test(input.startDate) ||
    !input.endDate ||
    !DATE.test(input.endDate)
  ) {
    return NextResponse.json(
      { error: "Time off needs a type and a start and end date." },
      { status: 422 },
    );
  }

  if (input.endDate < input.startDate) {
    return NextResponse.json(
      { error: "The last day cannot come before the first." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // Filing for yourself is the default, so the client never has to know its own
  // staff uuid. Naming somebody else is a manager entering leave that was
  // phoned in, and RLS decides whether this caller may.
  const staffId =
    input.employeeId ??
    (await ownStaffId(supabase, viewer, context.facilityId));

  if (!staffId) {
    return NextResponse.json(
      {
        error:
          "You are not on this facility's staff, so you cannot file leave here.",
      },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("staff_time_off_requests")
    .insert({
      facility_id: context.facilityId,
      staff_id: staffId,
      type: input.type,
      starts_on: input.startDate,
      ends_on: input.endDate,
      reason: input.reason ?? "",
    } as never)
    .select(SELECT)
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: "That leave has already been granted.",
      denied: "You do not have permission to file this request.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to file this request." },
      { status: 403 },
    );
  }

  return NextResponse.json(toTimeOffRequest(data as unknown as TimeOffRow), {
    status: 201,
  });
}

interface DecisionInput {
  id?: string;
  status?: RequestStatus;
  notes?: string;
}

/**
 * Approve, deny, or withdraw.
 *
 * The UPDATE goes through RLS rather than an RPC, deliberately: the policy is
 * the boundary, and a `security definer` wrapper here would be a second opinion
 * about the same question. A trigger enforces what a status may BECOME —
 * pending is the only thing a decision can be made from, and without the
 * approve permission the only move is withdrawing your own.
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
  const { data, error } = await supabase
    .from("staff_time_off_requests")
    .update({
      status: input.status,
      review_notes: input.notes ?? null,
    } as never)
    .eq("id", input.id)
    .select(SELECT);

  if (error) {
    // 23P01 is the exclusion constraint: this person already has leave granted
    // over those days. "There is already something here" is an ANSWER — it came
    // back as a 500 until the spec caught it, which reads as a fault in the
    // software rather than a fact about the rota.
    if (error.code === "23P01") {
      return NextResponse.json(
        {
          error:
            "That person already has leave granted over those days. Nothing was changed.",
        },
        { status: 409 },
      );
    }
    // 22023 is the transition guard — already decided. 42501 is the trigger
    // refusing a decision to somebody who may only withdraw.
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return writeFailure(error, {
      duplicate: "That leave overlaps leave already granted to this person.",
      denied: "You do not have permission to decide this request.",
    });
  }

  // An RLS-refused UPDATE affects 0 rows and does NOT raise, so the returned
  // rows are the only thing separating a refusal from a request that is not
  // there. See check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    "No request you can decide with that id.",
  );
  if (refused) return refused;

  const decided = toTimeOffRequest(
    (data as unknown as TimeOffRow[])[0],
  ) as TimeOffDecision;

  // Only on approval, and only as information. Somebody granted leave they are
  // still rostered to work is the failure this whole feature exists to catch,
  // and it is the one thing the fixture screen could never have shown.
  if (input.status === "approved") {
    const { data: clashes } = await supabase.rpc("time_off_shift_conflicts", {
      p_request_id: input.id,
    });
    const rows = (clashes ?? []) as {
      shift_id: string;
      starts_at: string;
      ends_at: string;
    }[];
    if (rows.length > 0) {
      decided.conflicts = rows.map((row) => ({
        shiftId: row.shift_id,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
      }));
    }
  }

  return NextResponse.json(decided);
}

/**
 * Remove a request outright.
 *
 * Not the same act as withdrawing — that is a status, and it keeps the record
 * that somebody asked and was refused. This is for a row that should never have
 * existed, and RLS restricts it to whoever may decide requests in the first
 * place.
 */
export async function DELETE(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "`id` is required." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("staff_time_off_requests")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "That request could not be removed.",
      denied: "You do not have permission to remove time-off requests.",
    });
  }

  // 0 rows and no error is an RLS refusal, not a success — see check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    "No request you can remove with that id.",
  );
  if (refused) return refused;

  return NextResponse.json({ removed: id });
}
