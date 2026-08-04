import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";

// ============================================================================
// The session record's writes: safety alerts and the handoff thread.
//
// ── ONE ROUTE, TWO TABLES, BECAUSE THEY ARE ONE SCREEN ─────────────────────
//
// `kind` picks the table. The tables are deliberately separate (20260806140000,
// Decision 1) — they diverge on carry-forward and on whether they can be
// removed — but the HTTP surface does not need to: both writes come from the
// same panel on the same page, take an appointment plus a line of text, and
// fail for the same reasons. Two route files would duplicate the ref lookup and
// the auth check to express a distinction the caller does not have.
//
// ── THE AUTHOR IS NOT IN THE PAYLOAD, AND CANNOT BE ────────────────────────
//
// No `staff` or `createdBy` field is accepted. The trigger takes both from the
// session, so a forged author is not rejected — it is impossible to express.
//
// ── DELETE IS ALERTS-ONLY ──────────────────────────────────────────────────
//
// The comment thread has no delete policy at all, so a DELETE against one is
// refused by the database, not by a check here. This route does not even offer
// the kind, which turns a 403 into a 422 that says why.
// ============================================================================

export const dynamic = "force-dynamic";

/** ref → the booking uuid, through a read the caller must be able to make, so
 *  an appointment they cannot see is a 404 rather than an RLS error later. */
async function resolveBooking(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  appointmentId: string,
): Promise<string | null> {
  const ref = Number(appointmentId);
  if (!Number.isFinite(ref)) return null;
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", ref)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    appointmentId?: string;
    kind?: "alert" | "comment";
    text?: string;
    appliesToFuture?: boolean;
  } | null;

  if (!body?.appointmentId || !body.text?.trim()) {
    return NextResponse.json(
      { error: "An appointment and some text are required." },
      { status: 422 },
    );
  }
  if (body.kind !== "alert" && body.kind !== "comment") {
    return NextResponse.json(
      { error: "A note is either an alert or a comment." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const bookingId = await resolveBooking(supabase, body.appointmentId);
  if (!bookingId) {
    return NextResponse.json(
      { error: "That appointment does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // `facility_id` is sent as a placeholder the trigger overwrites — it is NOT
  // NULL on both tables, and the derivation runs BEFORE the constraint. The
  // value here is never the one stored (proved by T5 of the RLS test).
  const { data: parent } = await supabase
    .from("grooming_appointments")
    .select("facility_id")
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (!parent) {
    return NextResponse.json(
      { error: "That booking is not a grooming appointment." },
      { status: 422 },
    );
  }
  const facilityId = parent.facility_id as string;

  const { data, error } =
    body.kind === "alert"
      ? await supabase
          .from("grooming_alert_notes")
          .insert({
            booking_id: bookingId,
            facility_id: facilityId,
            body: body.text.trim(),
            applies_to_future: body.appliesToFuture ?? false,
          } as never)
          .select("id, body, applies_to_future, author_name, created_at")
          .single()
      : await supabase
          .from("grooming_ticket_comments")
          .insert({
            booking_id: bookingId,
            facility_id: facilityId,
            message: body.text.trim(),
          } as never)
          .select("id, message, author_name, created_at")
          .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to write notes on this appointment.",
      duplicate: "That note already exists.",
    });
  }

  // The row as stored, so the screen renders the SERVER's author and timestamp
  // rather than the optimistic "You" it used to invent.
  const row = data as Record<string, unknown>;
  return NextResponse.json(
    body.kind === "alert"
      ? {
          id: row.id,
          text: row.body,
          createdBy: row.author_name,
          createdAt: row.created_at,
          appliesToFuture: row.applies_to_future,
        }
      : {
          id: row.id,
          staff: row.author_name,
          message: row.message,
          at: row.created_at,
        },
    { status: 201 },
  );
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Which note?" }, { status: 422 });
  }

  const supabase = await createServerClient();
  const { data: touched, error } = await supabase
    .from("grooming_alert_notes")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove alerts on this appointment.",
      duplicate: "",
    });
  }
  const denied = deniedIfUntouched(
    touched,
    "Not allowed to remove alerts on this appointment.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}
