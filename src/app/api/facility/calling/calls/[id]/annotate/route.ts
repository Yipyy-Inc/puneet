import { NextResponse } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The only way a person edits a call.
//
// ── WHY A ROUTE AND NOT AN UPDATE ─────────────────────────────────────────
//
// `call_record` has NO update policy, deliberately: a column-blind one would
// let staff edit `status` and `duration_s`, the numbers the answer-rate and QA
// screens publish about them. So the table is read-only to every session, and
// `annotate_call()` — SECURITY DEFINER, permission re-checked inside — is the
// single door for notes, tags, follow-up, assignment and QA score.
//
// The measured fields are not parameters of that function, so this route
// cannot reach them however it is called.
//
// ── UNTIL NOW THE FUNCTION HAD ZERO CALL SITES ────────────────────────────
//
// Which is the state the roadmap warns about for the three telephony RPCs:
// written, granted, and reachable by nothing. Five handlers in
// `CallingWorkspace` wrote a QA score, a note, tags, an assignment and a
// follow-up status into React state and no further — so a manager's
// assessment of a colleague's call survived until the next reload.
// ============================================================================

export const dynamic = "force-dynamic";

interface Body {
  notes?: unknown;
  tags?: unknown;
  followUpStatus?: unknown;
  handledBy?: unknown;
  assignedTo?: unknown;
  qaScore?: unknown;
}

const FOLLOW_UP = ["pending", "in_progress", "completed", "no_action"];

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const followUp = text(body.followUpStatus);
  if (followUp && !FOLLOW_UP.includes(followUp)) {
    return NextResponse.json(
      { error: `Unknown follow-up status: ${followUp}` },
      { status: 422 },
    );
  }

  const qaScore =
    typeof body.qaScore === "number" ? Math.round(body.qaScore) : null;
  if (qaScore !== null && (qaScore < 1 || qaScore > 5)) {
    return NextResponse.json(
      { error: "A QA score is 1 to 5." },
      { status: 422 },
    );
  }

  const tags =
    Array.isArray(body.tags) && body.tags.every((t) => typeof t === "string")
      ? (body.tags as string[])
      : null;

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("annotate_call", {
    p_call_id: id,
    // `?? undefined`, never null: the generated client types optional RPC
    // arguments as `T | undefined`, and the function uses `coalesce`, so an
    // omitted argument and an explicit null mean the same thing to Postgres —
    // leave the column alone.
    p_notes: text(body.notes) ?? undefined,
    p_tags: tags ?? undefined,
    p_follow_up_status: followUp ?? undefined,
    p_handled_by: text(body.handledBy) ?? undefined,
    p_assigned_to: text(body.assignedTo) ?? undefined,
    p_qa_score: qaScore ?? undefined,
  });

  if (error) {
    // 42501 is the function's own permission check refusing — a real answer,
    // not a server fault. 42704 is a call this facility cannot see, which RLS
    // has already made indistinguishable from one that does not exist.
    const status =
      error.code === "42501" ? 403 : error.code === "42704" ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ call: data });
}
