import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// The intake record: one row per appointment, upserted.
//
// UPSERT RATHER THAN CREATE-THEN-UPDATE, because the screens do not know which
// they want. The check-in dialog writes the arrival fields, the session panel
// later writes the session notes and mood tags, and either may be first —
// asking the client to track whether a row exists yet would put that state in
// the one place guaranteed to lose it.
//
// `booking_id` being the primary key is what makes this safe: two staff
// submitting at once conflict on the key rather than creating two intakes.
//
// ── PARTIAL BY DESIGN ──────────────────────────────────────────────────────
//
// Every field is optional and only what arrives is written. A session panel
// saving mood tags must not blank the coat condition the check-in recorded an
// hour earlier, which is exactly what a full-row upsert would do.
//
// ── completedAt IS A CLAIM, NOT A CLOCK ────────────────────────────────────
//
// It is set only when the caller says the intake is complete, and stamped
// server-side at that moment. A row that exists because the session panel
// opened is not a completed intake, and the screens use this to decide whether
// to prompt for one.
// ============================================================================

export const dynamic = "force-dynamic";

interface IntakeInput {
  appointmentId?: string;
  coatCondition?: string;
  behaviorNotes?: string;
  arrivalCoatCondition?: string | null;
  arrivalBehavior?: string | null;
  arrivalHealthFlags?: string[];
  allergies?: string[];
  specialInstructions?: string;
  mattingFeeWarning?: boolean;
  mattingFeeAmount?: number | null;
  dropOffObservations?: string | null;
  sessionNotes?: string | null;
  moodTags?: string[];
  sessionStartedAt?: string | null;
  complete?: boolean;
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as IntakeInput | null;
  if (!body?.appointmentId) {
    return NextResponse.json(
      { error: "An appointment is required." },
      { status: 422 },
    );
  }

  // The matting fee is checked here as well as in the database, because the
  // CHECK reports a constraint name and this reports the actual problem: a
  // warning with no amount is a warning about nothing, and an amount with no
  // warning is a charge nobody was told about.
  if (
    body.mattingFeeWarning !== undefined ||
    body.mattingFeeAmount !== undefined
  ) {
    const warned = body.mattingFeeWarning === true;
    const amount = body.mattingFeeAmount ?? null;
    if (warned !== (amount !== null)) {
      return NextResponse.json(
        {
          error:
            "A matting fee needs both the warning and the amount, or neither.",
        },
        { status: 422 },
      );
    }
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      return NextResponse.json(
        { error: "A matting fee cannot be negative." },
        { status: 422 },
      );
    }
  }

  const ref = Number(body.appointmentId);
  if (!Number.isFinite(ref)) {
    return NextResponse.json(
      { error: "That is not an appointment reference." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", ref)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json(
      { error: "That appointment does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data: parent } = await supabase
    .from("grooming_appointments")
    .select("facility_id")
    .eq("booking_id", booking.id)
    .maybeSingle();

  if (!parent) {
    return NextResponse.json(
      { error: "That booking is not a grooming appointment." },
      { status: 422 },
    );
  }

  // Only what arrived. `undefined` means "not mentioned" and is left alone;
  // `null` means "cleared" and is written. Collapsing those two would make it
  // impossible to erase an observation once recorded.
  const patch: Record<string, unknown> = {
    booking_id: booking.id,
    facility_id: parent.facility_id,
  };
  const put = (column: string, value: unknown) => {
    if (value !== undefined) patch[column] = value;
  };

  put("coat_condition", body.coatCondition);
  put("behavior_notes", body.behaviorNotes);
  put("arrival_coat_condition", body.arrivalCoatCondition);
  put("arrival_behavior", body.arrivalBehavior);
  put("arrival_health_flags", body.arrivalHealthFlags);
  put("allergies", body.allergies);
  put("special_instructions", body.specialInstructions);
  put("matting_fee_warning", body.mattingFeeWarning);
  put("matting_fee_amount", body.mattingFeeAmount);
  put("drop_off_observations", body.dropOffObservations);
  put("session_notes", body.sessionNotes);
  put("mood_tags", body.moodTags);
  put("session_started_at", body.sessionStartedAt);

  // Stamped here, not accepted. See the header.
  if (body.complete === true) patch.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("grooming_intake")
    .upsert(patch as never, { onConflict: "booking_id" })
    .select(
      `coat_condition, behavior_notes, arrival_coat_condition, arrival_behavior,
       arrival_health_flags, allergies, special_instructions,
       matting_fee_warning, matting_fee_amount, drop_off_observations,
       session_notes, mood_tags, session_started_at, author_name, completed_at`,
    )
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to record intake for this appointment.",
      duplicate: "That intake already exists.",
    });
  }

  return NextResponse.json(data);
}
