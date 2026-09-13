import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFormTemplateForService } from "@/data/yipyygo-config";
import { yipyyGoOff, yipyyGoSettingsSchema } from "@/lib/settings/yipyy-go";
import {
  rowToYipyyGoSubmission,
  yipyyGoSubmitBodySchema,
  type YipyyGoCharge,
  type YipyyGoSubmissionRow,
} from "@/lib/api/mappers/yipyy-go";
import { validateYipyyGoAnswers } from "@/lib/yipyy-go/validate";
import {
  bookingNotFound,
  resolveYipyyGoBooking,
  yipyyGoFailure,
} from "@/lib/yipyy-go/route-helpers";
import type { Json } from "@/types/database";

// ============================================================================
// /api/customer/yipyy-go/bookings/[ref]/pets/[petRef]/submit — send one dog's
// form.
//
// POST  checked against the facility's template for the booking's service
//       first (validateYipyyGoAnswers — required sections, custom questions,
//       a required belongings photo), then submit_yipyy_go_form(), which
//       decides whether it may still change, prices any add-ons and the
//       medication fee from the catalogue onto the bill, and records a pledged
//       tip. The answer carries exactly what reached the bill.
//
// The facility's email and the owner's confirmation are sent by the next
// change; this one says nothing was sent.
// ============================================================================

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ ref: string; petRef: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = yipyyGoSubmitBodySchema.safeParse(
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

  const { data: settingsRow } = await supabase
    .from("facility_settings")
    .select("value")
    .eq("facility_id", booking.facilityId)
    .eq("domain", "yipyy_go_config")
    .maybeSingle();
  const settings = yipyyGoSettingsSchema.safeParse(settingsRow?.value);
  const template = getFormTemplateForService(
    settings.success ? settings.data : yipyyGoOff(),
    booking.service,
  );

  const missing = validateYipyyGoAnswers(template, parsed.data.answers);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Some answers are still needed.", missing },
      { status: 422 },
    );
  }

  const { data, error } = await supabase.rpc("submit_yipyy_go_form", {
    p_booking_id: booking.id,
    p_pet_id: pet.id,
    p_answers: parsed.data.answers as unknown as Json,
    p_add_on_requests: parsed.data.addOnRequests as unknown as Json,
    ...(parsed.data.tip ? { p_tip: parsed.data.tip as unknown as Json } : {}),
  });
  if (error) return yipyyGoFailure(error);

  const result = (data ?? {}) as {
    submission?: YipyyGoSubmissionRow;
    charges?: {
      key: string;
      kind: string;
      name: string;
      unitPrice: number;
      quantity: number;
      onBill: boolean;
    }[];
    tipAmount?: number | null;
  };
  if (!result.submission?.id) {
    return NextResponse.json(
      { error: "That form could not be sent." },
      { status: 500 },
    );
  }

  const charges: YipyyGoCharge[] = (result.charges ?? []).map((charge) => ({
    key: charge.key,
    kind: charge.kind === "medication_fee" ? "medication_fee" : "add_on",
    name: charge.name,
    unitPrice: Number(charge.unitPrice),
    quantity: charge.quantity,
    onBill: charge.onBill,
  }));

  return NextResponse.json({
    submission: rowToYipyyGoSubmission(result.submission, pet),
    charges,
    tipAmount:
      result.tipAmount === null || result.tipAmount === undefined
        ? null
        : Number(result.tipAmount),
    confirmationSent: false,
  });
}
