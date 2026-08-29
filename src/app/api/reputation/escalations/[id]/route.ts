import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Working one recovery ticket.
//
// ── EVERY ACTION WRITES AN EVENT, AND THE EVENT IS THE RECORD ─────────────
//
// A resolution code is only worth having if it summarises something. So
// acknowledging, logging a call and resolving all append to
// `review_escalation_events`, which grants insert and select and nothing else —
// there is no update or delete for anybody, because a recovery log that can be
// rewritten is not a log.
//
// ── THE PERMISSION IS RLS's, AND THE REFUSAL IS DETECTED ──────────────────
//
// `review_escalations_update` requires `marketing_manage_reviews`. A caller
// without it gets an UPDATE that matches no rows and returns success — the
// silent-denial shape `deniedIfUntouched` exists for, and the reason this route
// selects back rather than trusting a 204.
//
// ── RESOLVING NEEDS A CODE, AND THE DATABASE SAYS SO ──────────────────────
//
// `review_escalations_resolved_says_how` pairs `resolved_at` with
// `resolution_code`. The zod schema below asks for one too, so the caller gets
// a 422 with a readable message rather than a constraint violation — but the
// constraint is the guarantee, and it is what a future second caller will meet.
// ============================================================================

export const dynamic = "force-dynamic";

const RESOLUTION_CODES = [
  "contacted_apologised",
  "credit_issued",
  "refunded",
  "policy_change",
  "staff_coached",
  "no_contact_possible",
  "client_satisfied",
] as const;

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("acknowledge") }),
  z.object({
    action: z.literal("log"),
    kind: z.enum(["call", "message", "note", "credit", "refund"]),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("resolve"),
    resolutionCode: z.enum(RESOLUTION_CODES),
    note: z.string().max(2000).optional(),
  }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "That is not an action on a ticket.",
        detail: parsed.error.issues,
      },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const supabase = await createServerClient();

  // Read it through RLS first: a ticket the caller cannot see must 404 rather
  // than 403, so the queue of another facility's complaints is not enumerable.
  const { data: existing } = await supabase
    .from("review_escalations")
    .select("id, facility_id, state")
    .eq("id", id)
    .maybeSingle();

  const ticket = existing as {
    id: string;
    facility_id: string;
    state: string;
  } | null;
  if (!ticket) {
    return NextResponse.json({ error: "No such ticket." }, { status: 404 });
  }

  const now = new Date().toISOString();
  let patch: Record<string, unknown> = {};
  let eventKind: string = input.action;
  let payload: Record<string, unknown> = {};

  if (input.action === "acknowledge") {
    patch = {
      state: "acknowledged",
      acknowledged_at: now,
      acknowledged_by: user.id,
    };
    eventKind = "acknowledged";
  } else if (input.action === "log") {
    // Logging a recovery action moves the ticket into recovery, but never
    // BACKWARDS out of resolved: somebody adding a note to a closed ticket is
    // adding a note, not reopening it.
    patch =
      ticket.state === "resolved" || ticket.state === "closed"
        ? {}
        : { state: "in_recovery" };
    eventKind = input.kind;
    payload = input.note ? { note: input.note } : {};
  } else {
    patch = {
      state: "resolved",
      resolved_at: now,
      resolved_by: user.id,
      resolution_code: input.resolutionCode,
      resolution_note: input.note ?? null,
    };
    eventKind = "resolved";
    payload = { resolutionCode: input.resolutionCode };
  }

  if (Object.keys(patch).length > 0) {
    const { data: touched, error } = await supabase
      .from("review_escalations")
      .update(patch as never)
      .eq("id", id)
      .select("id");

    if (error) {
      return writeFailure(error, {
        denied: "You do not have permission to work recovery tickets.",
        duplicate: "That change conflicts with the current state.",
      });
    }
    const denied = deniedIfUntouched(
      touched,
      "You do not have permission to work recovery tickets.",
    );
    if (denied) return denied;
  }

  // The event LAST, so a refused update does not leave a log line claiming
  // something happened. If this insert is the thing that fails, the ticket has
  // moved and the log is short by one — the less damaging way round.
  const { error: eventError } = await supabase
    .from("review_escalation_events")
    .insert({
      facility_id: ticket.facility_id,
      escalation_id: id,
      kind: eventKind,
      actor: user.id,
      payload,
    } as never);

  if (eventError) {
    return writeFailure(eventError, {
      denied: "You do not have permission to work recovery tickets.",
      duplicate: "That entry is already in the log.",
    });
  }

  return new NextResponse(null, { status: 204 });
}
