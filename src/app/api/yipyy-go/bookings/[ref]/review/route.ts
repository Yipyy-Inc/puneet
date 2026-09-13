import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import {
  rowToYipyyGoSubmission,
  yipyyGoReviewBodySchema,
  type YipyyGoSubmissionRow,
} from "@/lib/api/mappers/yipyy-go";
import {
  bookingNotFound,
  resolveYipyyGoBooking,
  yipyyGoFailure,
} from "@/lib/yipyy-go/route-helpers";

// ============================================================================
// /api/yipyy-go/bookings/[ref]/review — the facility acts on one dog's form.
//
// POST { action, petRef }
//   approve          a sent form is reviewed (edit_bookings); with add-ons
//                    that need approval, they reach the bill now
//   request_changes  { message } sends it back to the owner, reopened
//   complete         { reason } staff fill the gap — the permission that
//                    checks the dog in, or edit_bookings
//
// Each through its own function, which decides who may. Nothing is sent to the
// owner from here; they read what changed on their booking.
// ============================================================================

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ref: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = yipyyGoReviewBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a review action.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const supabase = await createServerClient();
  const booking = await resolveYipyyGoBooking(supabase, (await params).ref);
  if (!booking) return bookingNotFound();
  const pet = booking.pets.find((p) => p.ref === body.petRef);
  if (!pet) {
    return NextResponse.json(
      { error: "That dog is not on this booking." },
      { status: 404 },
    );
  }

  const viewer = await getViewer().catch(() => null);
  const byName = viewer?.fullName ?? viewer?.email ?? undefined;

  let result;
  if (body.action === "complete") {
    result = await supabase.rpc("complete_yipyy_go_by_staff", {
      p_booking_id: booking.id,
      p_pet_id: pet.id,
      p_reason: body.reason,
      p_by_name: byName,
    });
  } else {
    const { data: submission } = await supabase
      .from("yipyy_go_submissions")
      .select("id")
      .eq("booking_id", booking.id)
      .eq("pet_id", pet.id)
      .maybeSingle();
    if (!submission) {
      return NextResponse.json(
        { error: `${pet.name} has no form to review.` },
        { status: 422 },
      );
    }
    result = await supabase.rpc("review_yipyy_go_submission", {
      p_submission_id: submission.id,
      p_action: body.action,
      p_by_name: byName,
      ...(body.action === "request_changes" ? { p_message: body.message } : {}),
    });
  }

  if (result.error) return yipyyGoFailure(result.error);
  const row = result.data as unknown as YipyyGoSubmissionRow | null;
  if (!row?.id) {
    return NextResponse.json(
      { error: "That form could not be updated." },
      { status: 500 },
    );
  }
  return NextResponse.json(rowToYipyyGoSubmission(row, pet));
}
