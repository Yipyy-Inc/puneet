import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  rowToYipyyGoCharge,
  rowToYipyyGoSubmission,
  type YipyyGoChargeRow,
  type YipyyGoSubmissionRow,
} from "@/lib/api/mappers/yipyy-go";
import {
  bookingNotFound,
  resolveYipyyGoBooking,
  signYipyyGoPhotos,
  yipyyGoFailure,
} from "@/lib/yipyy-go/route-helpers";

// ============================================================================
// /api/yipyy-go/bookings/[ref] — a booking's pre-arrival forms, as the
// facility reads them.
//
// GET  each dog's form with its photos, what the forms put on the bill, and
//      what the desk confirmed at check-in. Staff with view_bookings — the
//      policies on every table decide; nothing here filters by facility
//      because the booking named is the facility's or it does not resolve.
// ============================================================================

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ref: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const booking = await resolveYipyyGoBooking(supabase, (await params).ref);
  if (!booking) return bookingNotFound();

  const [stateRes, submissionsRes, chargesRes, deskRes] = await Promise.all([
    supabase.rpc("yipyy_go_form_state", { p_booking_id: booking.id }),
    supabase
      .from("yipyy_go_submissions")
      .select("*")
      .eq("booking_id", booking.id),
    supabase
      .from("yipyy_go_charges")
      .select("charge_key, kind, name, unit_price, quantity, line_item_id")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("yipyy_go_desk_checks")
      .select("*")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (stateRes.error) return yipyyGoFailure(stateRes.error);

  const submissions = (submissionsRes.data ?? []) as YipyyGoSubmissionRow[];
  const photos = await signYipyyGoPhotos(
    supabase,
    submissions.map((row) => row.id),
  );
  const state = (stateRes.data ?? {}) as {
    requirement?: string | null;
    deadline?: string | null;
    pets?: { petId: string; editable: boolean }[];
  };
  const refByPetId = new Map(booking.pets.map((pet) => [pet.id, pet.ref]));

  return NextResponse.json({
    booking: {
      ref: booking.ref,
      service: booking.service,
      status: booking.status,
      startAt: booking.startAt,
      endAt: booking.endAt,
      tipAmount: booking.tipAmount,
    },
    requirement:
      state.requirement === "mandatory" || state.requirement === "optional"
        ? state.requirement
        : null,
    deadline: state.deadline ?? null,
    pets: booking.pets.map((pet) => {
      const row = submissions.find((s) => s.pet_id === pet.id);
      return {
        ref: pet.ref,
        name: pet.name,
        editable:
          (state.pets ?? []).find((p) => p.petId === pet.id)?.editable ?? false,
        submission: row
          ? rowToYipyyGoSubmission(row, pet, photos.get(row.id) ?? [])
          : null,
      };
    }),
    charges: ((chargesRes.data ?? []) as YipyyGoChargeRow[]).map(
      rowToYipyyGoCharge,
    ),
    deskChecks: (deskRes.data ?? []).map((check) => ({
      petRef: refByPetId.get(check.pet_id) ?? null,
      source: check.source,
      medicationsConfirmed: check.medications_confirmed,
      belongingsConfirmed: check.belongings_confirmed,
      formStatus: check.form_status,
      formMissing: check.form_missing,
      overrideReason: check.override_reason,
      recordedByName: check.recorded_by_name,
      createdAt: check.created_at,
    })),
  });
}
