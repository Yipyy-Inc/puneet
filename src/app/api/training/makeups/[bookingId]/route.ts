import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import {
  makeupActionSchema,
  rowToHostSession,
  type MakeupHostSessionRow,
} from "@/lib/api/mappers/training-makeups";

// ============================================================================
// /api/training/makeups/[bookingId] — one missed session (the booking that
// never checked in).
//
// GET   the seats a make-up could take: future sessions of the same course,
//       in another series, with room — training_makeup_host_sessions(). Staff
//       who can make bookings only.
// POST  { action } — each through its own function, which decides who may:
//         request     the owner asks for a make-up
//         skip        the owner does not want one
//         offer       staff book the dog a seat, confirmed at $0
//         decline     the seat is turned down; its booking is cancelled
//         ineligible  staff decide there is none, with a reason
//
// Nothing is sent to anybody. The owner reads the make-up on their training
// page, and an offered seat is on the facility's calendar as a booking.
// ============================================================================

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ bookingId: string }> };

/** 42501 is "not yours", and no such session answers the same; 22023 is a
 *  make-up that cannot move that way — full, skipped, already booked. */
function failure(error: { code?: string; message: string }) {
  if (error.code === "42501") {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error.code === "22023") {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
}

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { bookingId } = await params;
  if (!UUID.test(bookingId)) {
    return NextResponse.json(
      { error: "That missed session does not exist." },
      { status: 404 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("training_makeup_host_sessions", {
    p_missed_booking_id: bookingId,
  });
  if (error) return failure(error);

  return NextResponse.json(
    ((data ?? []) as MakeupHostSessionRow[]).map(rowToHostSession),
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { bookingId } = await params;
  if (!UUID.test(bookingId)) {
    return NextResponse.json(
      { error: "That missed session does not exist." },
      { status: 404 },
    );
  }

  const parsed = makeupActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a make-up action.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const supabase = await createServerClient();
  const viewer =
    body.action === "offer" || body.action === "ineligible"
      ? await getViewer().catch(() => null)
      : null;
  const byName = viewer?.fullName ?? viewer?.email ?? undefined;

  const result =
    body.action === "request"
      ? await supabase.rpc("request_training_makeup", {
          p_missed_booking_id: bookingId,
          p_note: body.note || undefined,
        })
      : body.action === "skip"
        ? await supabase.rpc("skip_training_makeup", {
            p_missed_booking_id: bookingId,
          })
        : body.action === "offer"
          ? await supabase.rpc("offer_training_makeup", {
              p_missed_booking_id: bookingId,
              p_host_session_id: body.hostSessionId,
              p_by_name: byName,
            })
          : body.action === "decline"
            ? await supabase.rpc("decline_training_makeup", {
                p_makeup_id: body.makeupId,
              })
            : await supabase.rpc("mark_training_makeup_ineligible", {
                p_missed_booking_id: bookingId,
                p_reason: body.reason,
                p_by_name: byName,
              });

  if (result.error) return failure(result.error);

  const row = result.data as { id: string; status: string } | null;
  // The function returns the make-up it wrote; nothing back is no write.
  if (!row?.id) {
    return NextResponse.json(
      { error: "That make-up could not be saved." },
      { status: 500 },
    );
  }
  return NextResponse.json({ id: row.id, status: row.status });
}
