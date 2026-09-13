import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  rowToYipyyGoSubmission,
  yipyyGoDraftBodySchema,
  type YipyyGoSubmissionRow,
} from "@/lib/api/mappers/yipyy-go";
import {
  bookingNotFound,
  resolveYipyyGoBooking,
  yipyyGoFailure,
} from "@/lib/yipyy-go/route-helpers";
import type { Json } from "@/types/database";

// ============================================================================
// /api/customer/yipyy-go/bookings/[ref]/pets/[petRef] — one dog's form.
//
// PUT  save it as a draft, through save_yipyy_go_draft(): the owner's, while
//      it can still change. A sent form is sent again, not saved back to a
//      draft (…/submit).
// ============================================================================

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ref: string; petRef: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = yipyyGoDraftBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a pre-arrival form.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  const { ref, petRef } = await params;
  const supabase = await createServerClient();
  const booking = await resolveYipyyGoBooking(supabase, ref);
  if (!booking) return bookingNotFound();
  const pet = booking.pets.find((p) => p.ref === Number(petRef));
  if (!pet) {
    return NextResponse.json(
      { error: "That dog is not on this booking." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase.rpc("save_yipyy_go_draft", {
    p_booking_id: booking.id,
    p_pet_id: pet.id,
    p_answers: parsed.data.answers as unknown as Json,
    p_add_on_requests: parsed.data.addOnRequests as unknown as Json,
  });
  if (error) return yipyyGoFailure(error);

  const row = data as unknown as YipyyGoSubmissionRow | null;
  if (!row?.id) {
    return NextResponse.json(
      { error: "That form could not be saved." },
      { status: 500 },
    );
  }
  return NextResponse.json(rowToYipyyGoSubmission(row, pet));
}
