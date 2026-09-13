import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFormTemplateForService } from "@/data/yipyygo-config";
import { yipyyGoOff, yipyyGoSettingsSchema } from "@/lib/settings/yipyy-go";
import {
  parseOfferedAddOns,
  parseStoredAnswers,
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
// /api/customer/yipyy-go/bookings/[ref] — one booking's pre-arrival form, as
// its owner fills it in.
//
// GET  the booking, the facility's template for its service, whether each
//      dog's form can still change and until when (yipyy_go_form_state — the
//      one place that decides), each dog's form with its photos, the add-ons
//      the booking may take (priced by the same SQL that charges them), what
//      the forms have put on the bill, and each dog's last sent answers, for
//      "use the same as last time".
//
// It replaces a page that looked the booking up in src/data/bookings and
// showed "Booking not found" for every real one.
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

  const [stateRes, settingsRes, submissionsRes, offerRes, chargesRes, lastRes] =
    await Promise.all([
      supabase.rpc("yipyy_go_form_state", { p_booking_id: booking.id }),
      supabase
        .from("facility_settings")
        .select("value")
        .eq("facility_id", booking.facilityId)
        .eq("domain", "yipyy_go_config")
        .maybeSingle(),
      supabase
        .from("yipyy_go_submissions")
        .select("*")
        .eq("booking_id", booking.id),
      supabase.rpc("yipyy_go_offered_add_ons", { p_booking_id: booking.id }),
      supabase
        .from("yipyy_go_charges")
        .select("charge_key, kind, name, unit_price, quantity, line_item_id")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("yipyy_go_submissions")
        .select("pet_id, answers, submitted_at")
        .in(
          "pet_id",
          booking.pets.map((pet) => pet.id),
        )
        .neq("booking_id", booking.id)
        .in("status", ["submitted", "approved"])
        .order("submitted_at", { ascending: false })
        .limit(50),
    ]);

  if (stateRes.error) return yipyyGoFailure(stateRes.error);
  if (offerRes.error) return yipyyGoFailure(offerRes.error);

  const parsedSettings = yipyyGoSettingsSchema.safeParse(
    settingsRes.data?.value,
  );
  const config = parsedSettings.success ? parsedSettings.data : yipyyGoOff();

  const submissions = (submissionsRes.data ?? []) as YipyyGoSubmissionRow[];
  const photos = await signYipyyGoPhotos(
    supabase,
    submissions.map((row) => row.id),
  );

  const lastByPet = new Map<string, unknown>();
  for (const row of (lastRes.data ?? []) as {
    pet_id: string;
    answers: unknown;
  }[]) {
    if (!lastByPet.has(row.pet_id)) lastByPet.set(row.pet_id, row.answers);
  }

  const state = (stateRes.data ?? {}) as {
    requirement?: string | null;
    deadline?: string | null;
    pets?: { petId: string; status: string; editable: boolean }[];
  };
  const stateByPet = new Map((state.pets ?? []).map((p) => [p.petId, p]));

  return NextResponse.json({
    booking: {
      ref: booking.ref,
      service: booking.service,
      status: booking.status,
      startAt: booking.startAt,
      endAt: booking.endAt,
      totalCost: booking.totalCost,
      tipAmount: booking.tipAmount,
    },
    requirement:
      state.requirement === "mandatory" || state.requirement === "optional"
        ? state.requirement
        : null,
    deadline: state.deadline ?? null,
    template: getFormTemplateForService(config, booking.service),
    addOnsApproval: config.addOnsApproval,
    medicationFee: config.medicationFee ?? null,
    tipPopup: config.tipPopup ?? null,
    pets: booking.pets.map((pet) => {
      const row = submissions.find((s) => s.pet_id === pet.id);
      const last = lastByPet.get(pet.id);
      return {
        ref: pet.ref,
        name: pet.name,
        editable: stateByPet.get(pet.id)?.editable ?? false,
        submission: row
          ? rowToYipyyGoSubmission(row, pet, photos.get(row.id) ?? [])
          : null,
        lastAnswers: last === undefined ? null : parseStoredAnswers(last),
      };
    }),
    offeredAddOns: parseOfferedAddOns(offerRes.data),
    charges: ((chargesRes.data ?? []) as YipyyGoChargeRow[]).map(
      rowToYipyyGoCharge,
    ),
  });
}
