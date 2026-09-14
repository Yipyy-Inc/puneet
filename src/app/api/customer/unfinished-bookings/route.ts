import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  UNFINISHED_BOOKING_SELECT,
  rowToUnfinishedBooking,
  unfinishedBookingWriteSchema,
  type UnfinishedBookingRow,
} from "@/lib/api/mappers/unfinished-booking";
import type { Json } from "@/types/database";

// ============================================================================
// A customer's own unfinished bookings, and saving one.
//
// ── WHOSE ─────────────────────────────────────────────────────────────────
//
// The client is resolved from the SESSION: the ref in the body must be one of
// the client records whose `profile_id` is the signed-in user, or it is not
// found. RLS says the same thing again on insert (own_client_ids), and the
// facility comes from the client by trigger.
//
// ── ONE OPEN DRAFT PER SERVICE ────────────────────────────────────────────
//
// Leaving the form twice for the same service updates the open draft rather
// than filing a second abandonment, so the facility's list is people, not
// clicks. A recovered one is left alone and a new draft starts.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id);
  const clientIds = ((clients ?? []) as { id: string }[]).map((c) => c.id);
  if (clientIds.length === 0) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("unfinished_bookings")
    .select(UNFINISHED_BOOKING_SELECT)
    .in("client_id", clientIds)
    .neq("status", "recovered")
    .order("abandoned_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as UnfinishedBookingRow[]).map(
      rowToUnfinishedBooking,
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = unfinishedBookingWriteSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not an unfinished booking." },
      { status: 422 },
    );
  }
  const write = parsed.data;

  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", write.clientRef)
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  const fields = {
    service: write.service ?? null,
    step: write.step,
    requested_start: write.requestedStart ?? null,
    requested_end: write.requestedEnd ?? write.requestedStart ?? null,
    estimated_value: write.estimatedValue ?? null,
    // Validated and stripped by the write schema; stored as the JSON it is.
    draft: write.draft as Json,
  };

  let open = supabase
    .from("unfinished_bookings")
    .select("id")
    .eq("client_id", client.id)
    .neq("status", "recovered");
  open = write.service
    ? open.eq("service", write.service)
    : open.is("service", null);
  const { data: existing } = await open.limit(1).maybeSingle();

  const { data, error } = existing
    ? await supabase
        .from("unfinished_bookings")
        .update(fields)
        .eq("id", (existing as { id: string }).id)
        .select(UNFINISHED_BOOKING_SELECT)
        .single()
    : await supabase
        .from("unfinished_bookings")
        .insert({
          ...fields,
          // Both overwritten by trigger: the facility is the client's, and a
          // new draft is always "abandoned".
          facility_id: "00000000-0000-0000-0000-000000000000",
          client_id: client.id,
        })
        .select(UNFINISHED_BOOKING_SELECT)
        .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "That booking is already saved.",
      denied: "That booking could not be saved for later.",
    });
  }
  return NextResponse.json(
    rowToUnfinishedBooking(data as unknown as UnfinishedBookingRow),
    { status: existing ? 200 : 201 },
  );
}
