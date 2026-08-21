import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { ownStaffId } from "@/lib/api/own-staff";
import {
  toClockEntry,
  type ClockEntry,
  type ClockEntryRow,
} from "@/lib/api/mappers/scheduling";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The time clock.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `src/lib/employee/clock-store.ts` — a `Map` in module scope. Not
// localStorage: memory. Somebody clocks in, refreshes, and was never there.
// Two tabs disagree. Closing the laptop ends the shift and no record of it
// ever existed.
//
// Meanwhile `staff_hr_config.require_clock_in_confirm` is real and has been
// settable all along: a confirmation dialog guarding a write that went nowhere.
//
// ── WHO IS CLOCKING IN IS NEVER SENT ──────────────────────────────────────
//
// It is resolved from the session, exactly as filing leave is. A client that
// can name the staff id can clock somebody else in, and attendance is what
// people are paid from.
//
// The one exception is a MANAGER stamping a correction, which needs
// `scheduling_edit_shifts` — RLS decides, and `source` records which of the two
// happened, because a corrected timesheet and a worked one are different facts.
//
// ── AND "AM I CLOCKED IN" IS A ROW, NOT A FLAG ────────────────────────────
//
// `clocked_out_at IS NULL` is the whole state. There is no boolean beside it to
// fall out of step, and the exclusion constraint means there can only ever be
// one such row per person.
// ============================================================================

export const dynamic = "force-dynamic";

const SELECT =
  "id, staff_id, shift_id, clocked_in_at, clocked_out_at, source, notes, " +
  "minutes_worked, staff:staff!staff_id(first_name, last_name)";

export interface ClockPayload {
  entries: ClockEntry[];
  /** The caller's own open entry, if they are on the clock. */
  open: ClockEntry | null;
  /** False when the caller may only see their own — so a screen can say so. */
  canSeeEveryone: boolean;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");

  const supabase = await createServerClient();

  let query = supabase
    .from("staff_time_clock_entries")
    .select(SELECT)
    .order("clocked_in_at", { ascending: false });

  // A window is optional here, unlike the roster's: the common question is
  // "who is on the clock", which has no date. When one IS given it is bounded
  // generously — an entry that STARTED before the window can still be running
  // inside it, and dropping those would show an empty floor during a night
  // shift.
  if (from && DATE.test(from)) {
    query = query.or(
      `clocked_out_at.is.null,clocked_out_at.gte.${from}T00:00:00Z`,
    );
  }
  if (to && DATE.test(to)) {
    query = query.lte("clocked_in_at", `${to}T23:59:59Z`);
  }

  const [{ data, error }, permissions] = await Promise.all([
    query,
    supabase.rpc("my_permissions"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data as unknown as ClockEntryRow[]).map(toClockEntry);

  // Which of these is MINE. Resolved server-side so the client never has to
  // know its own staff uuid to answer "am I clocked in".
  const myStaffId = await ownStaffId(supabase, viewer, context.facilityId);

  return NextResponse.json({
    entries,
    open:
      entries.find(
        (entry) => entry.employeeId === myStaffId && !entry.clockedOutAt,
      ) ?? null,
    canSeeEveryone: (
      (permissions.data ?? []) as { permission_key: string; scope: string }[]
    ).some(
      (entry) =>
        entry.permission_key === "scheduling_view_all" &&
        entry.scope !== "none",
    ),
  } satisfies ClockPayload);
}

interface ClockInInput {
  /** Omitted means "me". Naming somebody else is a manager's correction. */
  employeeId?: string;
  shiftId?: string;
  /** ISO instant. Omitted means now — the ordinary case. */
  at?: string;
  notes?: string;
}

/** Clock in. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const input = (await request.json().catch(() => ({}))) as ClockInInput;

  const supabase = await createServerClient();

  let staffId = input.employeeId;
  const stampingForSomebodyElse = Boolean(staffId);

  if (!staffId) {
    staffId = await ownStaffId(supabase, viewer, context.facilityId);
  }

  if (!staffId) {
    return NextResponse.json(
      {
        error:
          "You are not on this facility's staff, so you cannot clock in here.",
      },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from("staff_time_clock_entries")
    .insert({
      facility_id: context.facilityId,
      staff_id: staffId,
      shift_id: input.shiftId ?? null,
      ...(input.at ? { clocked_in_at: input.at } : {}),
      // The record says who stamped it. A manager closing somebody's shift for
      // them and that person clocking out are different facts, and a pay
      // dispute turns on which one happened.
      source: stampingForSomebodyElse ? "manager" : "self",
      notes: input.notes ?? null,
    } as never)
    .select(SELECT)
    .maybeSingle();

  if (error) {
    // 23P01 is the exclusion constraint. For an ordinary clock-in that means
    // they are already on the clock — which is not a fault, it is an answer,
    // and the honest one is "you already are" rather than a constraint name.
    if (error.code === "23P01") {
      return NextResponse.json(
        {
          error: stampingForSomebodyElse
            ? "That overlaps a session this person already has. Close or correct the other one first."
            : "You are already clocked in.",
        },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      duplicate: "That clock-in was not recorded.",
      denied: "You do not have permission to clock in here.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to clock in here." },
      { status: 403 },
    );
  }

  return NextResponse.json(toClockEntry(data as unknown as ClockEntryRow), {
    status: 201,
  });
}

interface ClockOutInput {
  /** The entry to close. Omitted means the caller's own open one. */
  id?: string;
  /** ISO instant. Omitted means now. */
  at?: string;
  notes?: string;
  /**
   * Undo a clock-out — put the session back on the clock.
   *
   * RLS allows this for your OWN entry within two minutes of the stamp, and
   * for a manager at any time. Beyond the window it stops being "I mis-tapped"
   * and becomes editing a timesheet.
   */
  reopen?: boolean;
}

/**
 * Clock out — close an open entry.
 *
 * A PATCH rather than a DELETE, obviously, but also a PATCH rather than a
 * second POST: there is one row per session, and the clock-out is the end of
 * the row that already exists. Two rows would make "how long did they work"
 * a join.
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

  const input = (await request.json().catch(() => ({}))) as ClockOutInput;

  const supabase = await createServerClient();

  let entryId = input.id;
  if (!entryId && input.reopen) {
    // Reopening needs the entry NAMED: by definition there is no open one to
    // find, and guessing the most recent would let a stray Undo reach back into
    // yesterday.
    return NextResponse.json(
      { error: "Undo needs the entry it is undoing." },
      { status: 422 },
    );
  }
  if (!entryId) {
    // The caller's own open entry. Found server-side so a client cannot close
    // somebody else's by guessing an id — and RLS would refuse that anyway,
    // but a route that makes it expressible is a route that invites the try.
    {
      const staffId = await ownStaffId(supabase, viewer, context.facilityId);

      if (staffId) {
        const { data: open } = await supabase
          .from("staff_time_clock_entries")
          .select("id")
          .eq("staff_id", staffId)
          .is("clocked_out_at", null)
          .maybeSingle();
        entryId = (open as { id: string } | null)?.id;
      }
    }
  }

  if (!entryId) {
    return NextResponse.json(
      { error: "You are not clocked in." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("staff_time_clock_entries")
    .update({
      clocked_out_at: input.reopen
        ? null
        : (input.at ?? new Date().toISOString()),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    } as never)
    .eq("id", entryId)
    .select(SELECT);

  if (error) {
    // The check constraint: a clock-out cannot precede the clock-in. Only
    // reachable through a manager's correction, and worth a sentence.
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "A clock-out cannot come before the clock-in." },
        { status: 422 },
      );
    }
    if (error.code === "23P01") {
      return NextResponse.json(
        { error: "That would overlap another session for this person." },
        { status: 409 },
      );
    }
    return writeFailure(error, {
      duplicate: "That clock-out was not recorded.",
      denied: "You do not have permission to change this entry.",
    });
  }

  // An RLS-refused UPDATE affects 0 rows and does NOT raise — and here the
  // refusal that matters is somebody trying to reopen a FINISHED session of
  // their own, which the policy forbids. See check:rls-writes.
  const refused = deniedIfUntouched(
    data,
    input.reopen
      ? "That clock-out is too old to undo. Ask a manager to correct it."
      : "No open entry you can close with that id.",
  );
  if (refused) return refused;

  return NextResponse.json(
    toClockEntry((data as unknown as ClockEntryRow[])[0]!),
  );
}

/**
 * Remove an entry.
 *
 * This erases the record that somebody worked, so it is managers only and
 * exists for the mistaken stamp rather than for tidying up.
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
    .from("staff_time_clock_entries")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "That entry could not be removed.",
      denied: "You do not have permission to remove time-clock entries.",
    });
  }

  const refused = deniedIfUntouched(
    data,
    "No entry you can remove with that id.",
  );
  if (refused) return refused;

  return NextResponse.json({ removed: id });
}
