import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// STAFF ANSWER A CUSTOMER'S REQUEST.
//
// POST /api/bookings/[ref]/requests/[noteId]/decision
//   { decision: "approved" | "declined", reply: string }
//
// A customer can ask to change dates, or — where the facility said it cancels
// that service itself — ask it to cancel. Both land as a booking note carrying
// `customer_request`. Until now nothing could answer one: the request sat in
// the notes forever and "has this been dealt with" was a judgement call.
//
// ── APPROVING A CANCELLATION DOES NOT CANCEL ANYTHING ────────────────────
//
// It records that staff agreed. The cancel itself goes through the path that
// already exists, where `cancellation_terms` decides what it costs and the
// figure is on screen before anybody commits it. A second route that cancelled
// would be a second thing to keep in step with the policy engine — the exact
// duplication this area was built to remove.
//
// ── THE REPLY IS WRITTEN FIRST, AND THAT ORDER IS THE POINT ──────────────
//
// Two writes, not one transaction. Reply first, decision second:
//
//   reply fails     nothing is decided, the request still reads as pending,
//                   staff try again — the customer is no worse off
//   decision fails  the customer HAS their answer and the request still reads
//                   as pending, so staff retry and the worst case is a second
//                   reply
//
// The other order loses the explanation and tells nobody. Same reasoning as
// refund-before-cancel in use-cancel-with-refund.ts: when two writes cannot be
// atomic, order them so the failure a person can see is the survivable one.
// ============================================================================

export const dynamic = "force-dynamic";

const DECISIONS = new Set(["approved", "declined"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string; noteId: string }> },
) {
  const { ref, noteId } = await params;
  const viewer = await getViewer();
  if (viewer.source !== "session") {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    decision?: string;
    reply?: string;
  } | null;

  const decision = body?.decision ?? "";
  if (!DECISIONS.has(decision)) {
    return NextResponse.json(
      { error: "Say whether this was approved or declined." },
      { status: 400 },
    );
  }

  // The customer reads this. A decision with no words is a request that
  // vanished, which is what the note rail already did.
  const reply = (body?.reply ?? "").trim();
  if (reply.length < 1 || reply.length > 1000) {
    return NextResponse.json(
      { error: "Write the customer a line saying what you decided." },
      { status: 400 },
    );
  }

  const db = await createServerClient();
  const bookingRef = Number(ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  const { data: booking } = await db
    .from("bookings")
    .select("id, facility_id, status")
    .eq("ref", bookingRef)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  // The request must be one, must be this booking's, and must not already be
  // answered — deciding twice would send the customer a second, contradictory
  // reply.
  const { data: note } = await db
    .from("notes")
    .select("id, customer_request, customer_request_decision")
    .eq("id", noteId)
    .eq("entity_id", booking.id)
    .eq("category", "booking")
    .maybeSingle();

  if (!note || !note.customer_request || note.customer_request === "note") {
    return NextResponse.json(
      { error: "That is not a request on this booking." },
      { status: 404 },
    );
  }
  if (note.customer_request_decision) {
    return NextResponse.json(
      { error: "Somebody has already answered this one." },
      { status: 409 },
    );
  }

  const user = await getCurrentUser();

  // ── 1. THE REPLY ────────────────────────────────────────────────────────
  //
  // A plain shared note. `private.guard_customer_request` nulls
  // `customer_request` on any staff insert, so this cannot become a second
  // request no matter what is passed.
  const { error: replyError } = await db.from("notes").insert({
    facility_id: booking.facility_id,
    category: "booking",
    entity_id: booking.id,
    content: reply,
    visibility: "shared_with_customer",
    created_by: user?.id ?? null,
    created_by_name: viewer.fullName ?? viewer.email ?? null,
  });

  if (replyError) {
    return writeFailure(replyError, {
      duplicate: "That reply is already on the booking.",
      denied: "You cannot write notes on this booking.",
    });
  }

  // ── 2. THE DECISION ─────────────────────────────────────────────────────
  //
  // `.select()` so a zero-row result is distinguishable from a refusal — an
  // update that changed nothing and an update that was not allowed look
  // identical otherwise (check:rls-writes).
  const { data: decided, error: decisionError } = await db
    .from("notes")
    .update({
      customer_request_decision: decision,
      customer_request_decided_at: new Date().toISOString(),
      customer_request_decided_by: user?.id ?? viewer.fullName ?? "staff",
    })
    .eq("id", noteId)
    .is("customer_request_decision", null)
    .select("id");

  if (decisionError) {
    return writeFailure(decisionError, {
      duplicate: "Somebody has already answered this one.",
      denied: "You cannot answer requests on this booking.",
    });
  }
  if (!decided || decided.length === 0) {
    return NextResponse.json(
      {
        error:
          "The reply was posted, but the request was not marked answered. Try again.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    noteId,
    decision,
    // What staff must still do themselves, said plainly rather than implied.
    cancelStillNeeded:
      note.customer_request === "cancel_request" && decision === "approved",
  });
}
