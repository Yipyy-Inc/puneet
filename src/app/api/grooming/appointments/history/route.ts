import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// Appending to the appointment history trail.
//
// POST ONLY. There is no PATCH and no DELETE here, and that is not an omission
// to be filled in later — the table refuses both for every role including the
// owner (20260806160000). A route that offered them would be a route that
// always returns an error.
//
// ── THE UNION IS RESOLVED HERE, NOT GUESSED AT THE DATABASE ────────────────
//
// A caller sends either a `description` or a `fieldChange`, and this picks the
// `kind` from which one arrived rather than accepting a kind alongside a
// payload that might not match it. The CHECK constraint is still what makes a
// mismatch impossible; this is what makes the error message useful.
//
// ── THE AUTHOR AND THE FACILITY ARE NOT IN THE PAYLOAD ─────────────────────
//
// Both are stamped by trigger from the session and the parent appointment. On
// an audit trail this matters more than anywhere else: an entry whose author
// the client could choose is an entry that proves nothing.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    appointmentId?: string;
    description?: string;
    fieldChange?: {
      field?: string;
      before?: string | null;
      after?: string | null;
    };
  } | null;

  if (!body?.appointmentId) {
    return NextResponse.json(
      { error: "An appointment is required." },
      { status: 422 },
    );
  }

  const hasDescription = !!body.description?.trim();
  const hasFieldChange = !!body.fieldChange?.field?.trim();

  if (hasDescription === hasFieldChange) {
    return NextResponse.json(
      {
        error:
          "A history entry is either a description or a field change, not both and not neither.",
      },
      { status: 422 },
    );
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

  // `facility_id` is a placeholder the trigger overwrites — the column is NOT
  // NULL and the derivation runs before the constraint. It also raises 23503
  // when the booking has no grooming appointment, which is what stands in for
  // the foreign key this table deliberately does not have.
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

  const { data, error } = await supabase
    .from("grooming_appointment_history")
    .insert({
      booking_id: booking.id,
      facility_id: parent.facility_id,
      ...(hasDescription
        ? { kind: "event", description: body.description!.trim() }
        : {
            kind: "field_change",
            field: body.fieldChange!.field!.trim(),
            before_value: body.fieldChange!.before ?? null,
            after_value: body.fieldChange!.after ?? null,
          }),
    } as never)
    .select(
      "id, kind, description, field, before_value, after_value, author_name, created_at",
    )
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to record history on this appointment.",
      duplicate: "That entry already exists.",
    });
  }

  const row = data as Record<string, string | null>;
  return NextResponse.json(
    {
      id: row.id,
      at: row.created_at,
      staff: row.author_name,
      ...(row.kind === "field_change"
        ? {
            fieldChange: {
              field: row.field ?? "",
              before: row.before_value,
              after: row.after_value,
            },
          }
        : { description: row.description ?? "" }),
    },
    { status: 201 },
  );
}
