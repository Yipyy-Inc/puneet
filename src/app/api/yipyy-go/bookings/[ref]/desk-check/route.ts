import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { yipyyGoDeskCheckBodySchema } from "@/lib/api/mappers/yipyy-go";
import {
  bookingNotFound,
  resolveYipyyGoBooking,
  yipyyGoFailure,
} from "@/lib/yipyy-go/route-helpers";
import type { Json } from "@/types/database";

// ============================================================================
// /api/yipyy-go/bookings/[ref]/desk-check — what the desk confirmed as a
// booking's dogs came in.
//
// POST { source, pets: [{ petRef, medicationsConfirmed, belongingsConfirmed,
//        overrideReason? }] } — every dog on the booking, through
//      record_yipyy_go_desk_check(), which needs the permission that checks
//      that service in. A dog whose mandatory form is missing needs a reason
//      (422, code "override_reason_required").
//
// The arrival itself is the service's own check-in, which the kiosk calls
// after this answers.
// ============================================================================

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ref: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = yipyyGoDeskCheckBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a desk check.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const booking = await resolveYipyyGoBooking(supabase, (await params).ref);
  if (!booking) return bookingNotFound();

  const pets = [];
  for (const entry of parsed.data.pets) {
    const pet = booking.pets.find((p) => p.ref === entry.petRef);
    if (!pet) {
      return NextResponse.json(
        { error: "That dog is not on this booking." },
        { status: 404 },
      );
    }
    pets.push({
      petId: pet.id,
      medicationsConfirmed: entry.medicationsConfirmed,
      belongingsConfirmed: entry.belongingsConfirmed,
      ...(entry.overrideReason ? { overrideReason: entry.overrideReason } : {}),
    });
  }

  const viewer = await getViewer().catch(() => null);
  const { data, error } = await supabase.rpc("record_yipyy_go_desk_check", {
    p_booking_id: booking.id,
    p_pets: pets as unknown as Json,
    p_source: parsed.data.source,
    p_by_name: viewer?.fullName ?? viewer?.email ?? undefined,
  });
  if (error) return yipyyGoFailure(error);

  const refByPetId = new Map(booking.pets.map((pet) => [pet.id, pet.ref]));
  return NextResponse.json(
    (data ?? []).map((check) => ({
      petRef: refByPetId.get(check.pet_id) ?? null,
      formStatus: check.form_status,
      formMissing: check.form_missing,
      overrideReason: check.override_reason,
    })),
    { status: 201 },
  );
}
