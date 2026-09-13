import { NextResponse, after, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFormTemplateForService } from "@/data/yipyygo-config";
import { formatDateLong } from "@/lib/i18n/format";
import {
  facilityCustomerLinkOrigin,
  facilityStaffLinkOrigin,
} from "@/lib/public-origin";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import {
  STAFF_EMAIL_LOCALE,
  notifyStaffOfSubmission,
  sendOwnerConfirmation,
} from "@/lib/yipyy-go/notify";
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
// When the facility asks for it, its owners and admins are emailed (after the
// response) and the owner gets the facility's confirmation, whose delivery the
// answer reports.
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
    notifyStaff?: boolean;
    sendConfirmation?: boolean;
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

  // ── Who hears about it ─────────────────────────────────────────────────
  //
  // The facility's notice goes out after the response, with the service role
  // (an owner may not read staff addresses). The owner's confirmation is
  // awaited, so the answer says whether it was actually sent.
  const [{ data: client }, { data: facility }] = await Promise.all([
    supabase
      .from("clients")
      .select("name, email, preferred_language")
      .eq("id", booking.clientId)
      .maybeSingle(),
    supabase
      .from("facilities")
      .select("name, slug, timezone")
      .eq("id", booking.facilityId)
      .maybeSingle(),
  ]);
  const facilityName = facility?.name ?? "";
  // The arrival's date on the facility's calendar, read at noon UTC so no
  // server clock moves it to the day before.
  const arrival = new Date(
    `${wallClockParts(booking.startAt, facility?.timezone ?? DEFAULT_TIMEZONE).date}T12:00:00Z`,
  );

  if (result.notifyStaff) {
    const staffOrigin = facilityStaffLinkOrigin(facility?.slug, request);
    const submissionId = result.submission.id;
    const staffLocale = STAFF_EMAIL_LOCALE;
    after(() =>
      notifyStaffOfSubmission({
        submissionId,
        facilityName,
        clientName: client?.name ?? "",
        petName: pet.name,
        serviceLabel: booking.service,
        arrivalLabel: formatDateLong(arrival, staffLocale),
        bookingUrl: `${staffOrigin}/facility/dashboard/bookings/${booking.ref}#yipyy-go`,
        origin: staffOrigin,
      }),
    );
  }

  let confirmationSent = false;
  const confirmation = settings.success
    ? settings.data.confirmationEmail
    : undefined;
  if (result.sendConfirmation && confirmation && client?.email) {
    const customerOrigin = facilityCustomerLinkOrigin(facility?.slug, request);
    const ownerLocale = client.preferred_language === "fr" ? "fr" : "en";
    const delivery = await sendOwnerConfirmation({
      facilityId: booking.facilityId,
      to: client.email,
      subject: confirmation.subject,
      message: confirmation.message,
      petName: pet.name,
      dateLabel: formatDateLong(arrival, ownerLocale),
      facilityName,
      bookingUrl: `${customerOrigin}/customer/bookings/${booking.ref}`,
      origin: customerOrigin,
      locale: ownerLocale,
    });
    confirmationSent = delivery.sent;
  }

  return NextResponse.json({
    submission: rowToYipyyGoSubmission(result.submission, pet),
    charges,
    tipAmount:
      result.tipAmount === null || result.tipAmount === undefined
        ? null
        : Number(result.tipAmount),
    confirmationSent,
  });
}
