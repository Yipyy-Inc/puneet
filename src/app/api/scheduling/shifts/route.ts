import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import {
  shiftInstants,
  toShift,
  type ShiftRow,
} from "@/lib/api/mappers/scheduling";
import { instantFromWallClock } from "@/lib/time/facility-time";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import type { ScheduleShift } from "@/types/scheduling";

// ============================================================================
// The roster.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `scheduleShifts` in src/data/scheduling.ts, imported straight into
// RosterView. A roster built on one browser did not exist on another, and the
// shift you assigned somebody was gone when the cache cleared.
//
// ── THE WINDOW IS REQUIRED, AND THAT IS DELIBERATE ────────────────────────
//
// A roster is always looking at a week or a day. Without `from`/`to` this would
// happily return every shift a facility has ever had, which is fine on the
// demo seed and ruinous after a year — the kind of endpoint that is fast right
// up until it is the reason the page times out.
//
// ── THE FACILITY IS NEVER SENT ────────────────────────────────────────────
//
// RLS scopes `staff_shifts` to the caller's own facilities, and it decides more
// than that: `scheduling_view_all` returns the whole roster, and without it a
// caller sees only their own shifts plus the open ones. So a groomer and a
// manager asking the same question get different answers, from the same query,
// and no code here has to know which is which.
// ============================================================================

export const dynamic = "force-dynamic";

const SELECT =
  "id, staff_id, department_id, position_id, starts_at, ends_at, break_minutes, notes, status, recurrence_id, required_skills, urgent, slots";

export interface ShiftsPayload {
  from: string;
  to: string;
  shifts: ScheduleShift[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");

  if (!from || !to || !DATE.test(from) || !DATE.test(to)) {
    return NextResponse.json(
      { error: "`from` and `to` are required, as YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();

  // ── THE WINDOW IS IN THE FACILITY'S TIME, NOT UTC ──────────────────────
  //
  // `${from}T00:00:00Z` looks like the start of the day and is not: a shift at
  // 22:00 in Toronto is stored as 02:00 UTC the NEXT day, so a UTC-bounded
  // window silently dropped every night shift out of its own date. The spec
  // caught exactly that — a 22:00 shift created successfully and then absent
  // from the day it was created for.
  //
  // The same helper the mapper uses on the way out, so the boundary of a day
  // means one thing in this file.
  const { data, error } = await supabase
    .from("staff_shifts")
    .select(SELECT)
    .gte("starts_at", instantFromWallClock(from, "00:00", context.timeZone))
    .lte("starts_at", instantFromWallClock(to, "23:59", context.timeZone))
    .order("starts_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    from,
    to,
    shifts: ((data ?? []) as ShiftRow[]).map((row) =>
      toShift(row, context.timeZone),
    ),
  } satisfies ShiftsPayload);
}

interface ShiftInput {
  employeeId?: string | null;
  departmentId?: string;
  positionId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  notes?: string | null;
  status?: ScheduleShift["status"];
  requiredSkills?: string[];
  urgent?: boolean;
  slots?: number;
}

const TIME = /^\d{2}:\d{2}$/;

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as ShiftInput;

  if (
    !input.departmentId ||
    !input.positionId ||
    !input.date ||
    !DATE.test(input.date) ||
    !input.startTime ||
    !TIME.test(input.startTime) ||
    !input.endTime ||
    !TIME.test(input.endTime)
  ) {
    return NextResponse.json(
      {
        error:
          "A shift needs a department, a position, a date and a start and end time.",
      },
      { status: 422 },
    );
  }

  // The only place clock times become instants. `endTime <= startTime` is an
  // overnight shift and takes the next day — see the mapper.
  const window = shiftInstants(
    input.date,
    input.startTime,
    input.endTime,
    context.timeZone,
  );

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("staff_shifts")
    .insert({
      facility_id: context.facilityId,
      staff_id: input.employeeId ?? null,
      department_id: input.departmentId,
      position_id: input.positionId,
      starts_at: window.starts_at,
      ends_at: window.ends_at,
      break_minutes: input.breakMinutes ?? 0,
      notes: input.notes ?? null,
      status: input.status ?? "draft",
      required_skills: input.requiredSkills ?? [],
      urgent: input.urgent ?? false,
      slots: input.slots ?? 1,
    } as never)
    .select(SELECT)
    .maybeSingle();

  if (error) {
    // 23P01 is the exclusion constraint — this person is already working then.
    // A sentence rather than a constraint name, because the person reading it
    // is holding a rota and needs to know what to do about it.
    if (error.code === "23P01") {
      return NextResponse.json(
        {
          error:
            "That person is already on a shift that overlaps this one. Move or cancel the other shift first.",
        },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      duplicate: "That shift already exists.",
      denied: "You do not have permission to create shifts.",
    });
  }

  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to create shifts." },
      { status: 403 },
    );
  }

  return NextResponse.json(toShift(data as ShiftRow, context.timeZone), {
    status: 201,
  });
}

/**
 * Remove a shift.
 *
 * A DELETE rather than a status change, because a shift created by mistake is
 * not a cancelled shift — the roster should not carry a record of a row that
 * was never a plan. Cancelling is a status, and the PATCH does that.
 *
 * RLS decides: `scheduling_edit_shifts`, which reaches a supervisor.
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
    .from("staff_shifts")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "That shift could not be removed.",
      denied: "You do not have permission to remove shifts.",
    });
  }

  // An RLS-refused DELETE affects 0 rows and does NOT raise, so the returned
  // rows are the only thing that can tell a refusal from a shift that was
  // already gone. Reporting success either way is a screen claiming something
  // it did not do — see check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    "No shift you can remove with that id.",
  );
  if (refused) return refused;

  return NextResponse.json({ removed: id });
}

interface ShiftPatch {
  id?: string;
  employeeId?: string | null;
  departmentId?: string;
  positionId?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  notes?: string | null;
  status?: ScheduleShift["status"];
}

/**
 * Change one shift.
 *
 * ── THE DOCSTRING BELOW THE DELETE PROMISED THIS AND IT DID NOT EXIST ─────
 *
 * "Cancelling is a status, and the PATCH does that." — written when this route
 * shipped, about a handler nobody wrote. The scheduling module's main calendar
 * could therefore only ever move a shift in component state, which is exactly
 * what it did.
 *
 * ── DATE AND TIMES MOVE TOGETHER ──────────────────────────────────────────
 *
 * A shift is stored as two instants, so changing the day means recomputing
 * both. A caller sending only a new `date` still needs the times to rebuild the
 * range, so the existing row is read first and the change applied on top of it —
 * rather than making every drag send six fields it did not change.
 */
export async function PATCH(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as ShiftPatch;
  if (!input.id) {
    return NextResponse.json({ error: "`id` is required." }, { status: 400 });
  }

  const supabase = await createServerClient();

  const { data: existing } = await supabase
    .from("staff_shifts")
    .select(SELECT)
    .eq("id", input.id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "No shift you can change with that id." },
      { status: 404 },
    );
  }

  const current = toShift(existing as ShiftRow, context.timeZone);

  const date = input.date ?? current.date;
  const startTime = input.startTime ?? current.startTime;
  const endTime = input.endTime ?? current.endTime;

  if (!DATE.test(date) || !TIME.test(startTime) || !TIME.test(endTime)) {
    return NextResponse.json(
      { error: "A date as YYYY-MM-DD and times as HH:MM." },
      { status: 422 },
    );
  }

  const movedInTime =
    input.date !== undefined ||
    input.startTime !== undefined ||
    input.endTime !== undefined;

  const patch: Record<string, unknown> = {};
  if (movedInTime) {
    Object.assign(
      patch,
      shiftInstants(date, startTime, endTime, context.timeZone),
    );
  }
  // `null` is meaningful — it makes the shift OPEN — so the check is against
  // `undefined`, not falsiness. `employeeId: null` treated as "not sent" is how
  // an unassign silently does nothing.
  if (input.employeeId !== undefined) patch.staff_id = input.employeeId;
  if (input.departmentId !== undefined)
    patch.department_id = input.departmentId;
  if (input.positionId !== undefined) patch.position_id = input.positionId;
  if (input.breakMinutes !== undefined)
    patch.break_minutes = input.breakMinutes;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.status !== undefined) patch.status = input.status;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("staff_shifts")
    .update(patch as never)
    .eq("id", input.id)
    .select(SELECT);

  if (error) {
    if (error.code === "23P01") {
      return NextResponse.json(
        {
          error:
            "That person is already on a shift that overlaps this one. Move or cancel the other shift first.",
        },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      duplicate: "That shift could not be changed.",
      denied: "You do not have permission to change shifts.",
    });
  }

  // An RLS-refused UPDATE affects 0 rows and does NOT raise — see
  // check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    "No shift you can change with that id.",
  );
  if (refused) return refused;

  return NextResponse.json(toShift((data as ShiftRow[])[0], context.timeZone));
}
