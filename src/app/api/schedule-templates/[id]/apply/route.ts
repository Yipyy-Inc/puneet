import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Putting a template's week on the calendar.
//
// ── THE STEP THE FIXTURE ONLY CLAIMED ─────────────────────────────────────
//
// The screen's Apply button said the template had been "applied as draft
// shifts, review and publish when ready" and created nothing whatsoever. This
// route makes that sentence true.
//
// ── SAFE TO PRESS TWICE ───────────────────────────────────────────────────
//
// `schedule_template_applications` is unique on (template, week), so a second
// press creates the week zero more times. The function returns the shifts it
// ACTUALLY created, so `created: 0` means "already applied" rather than
// "nothing happened" — and the screen says so.
//
// ── SHIFTS ARRIVE AS DRAFTS ───────────────────────────────────────────────
//
// Applying a template proposes a week. Publishing it is a separate decision
// somebody makes, and `/api/scheduling/shifts/publish` already exists to make
// it. A template that published straight to the roster would be a button that
// tells thirty people when they are working.
//
// ── AND IT IS NOT A WAY ROUND THE POLICIES ────────────────────────────────
//
// `apply_schedule_template` is SECURITY INVOKER, so `staff_shifts_insert`
// still asks the caller for `scheduling_create_shifts`. A supervisor may edit
// the roster and may not conjure one; that holds here too.
// ============================================================================

export const dynamic = "force-dynamic";

export interface ApplyTemplateResult {
  /** How many shifts this call created. Zero means the week already existed. */
  created: number;
  /** The Sunday the week starts on, echoed so a screen can name the week. */
  weekStart: string;
  /** The shift ids, so a caller could undo exactly this application. */
  shiftIds: string[];
}

/** A plain calendar date. Not parsed with `new Date`, which would apply an offset. */
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    weekStart?: string;
  } | null;

  const weekStart = body?.weekStart;
  if (!weekStart || !DATE.test(weekStart)) {
    return NextResponse.json(
      { error: "Name the week to apply, as YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("apply_schedule_template", {
    p_template_id: id,
    p_week_start: weekStart,
  });

  if (error) {
    // 42501 is the function refusing a template the caller cannot see, which
    // is the same answer as one that does not exist — deliberately.
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "You are not allowed to apply that template." },
        { status: 403 },
      );
    }
    // 22023 is the function's own sentence, written for a person.
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data ?? []) as { id: string }[];

  const result: ApplyTemplateResult = {
    created: rows.length,
    weekStart,
    shiftIds: rows.map((row) => row.id),
  };
  return NextResponse.json(result);
}
