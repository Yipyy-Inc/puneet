import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  BOOKING_SELECT,
  bookingToRow,
  rowToBooking,
} from "@/lib/api/mappers/booking";
import { getFacilityContext } from "@/lib/api/facility-context";
import type { NewBooking } from "@/types/booking";

// ============================================================================
// Bookings.
//
// A Route Handler rather than a browser query, deliberately — see the note in
// lib/supabase/client.ts. Business reads and writes go through the server
// client so RLS evaluates against the session cookie, and so the domain
// invariants RLS cannot express (capacity, ledger balance, handover) have
// somewhere to live.
//
// Scoped entirely by RLS: staff see their facility's bookings, a customer sees
// their own, and nobody has to pass a facility id for that to hold. A filter
// here narrows what you asked for; it is not what keeps you out. Likewise the
// POST below is authorised by the `bookings_insert` policy, not by this file.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 401 rather than an empty list. An unauthenticated caller getting `[]` is
  // indistinguishable from a facility with no bookings, and that ambiguity is
  // exactly how "the data disappeared" bugs start.
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);

  let query = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .order("start_at", { ascending: false });

  const clientRef = searchParams.get("clientRef");
  if (clientRef) {
    query = query.eq("clients.ref", Number(clientRef));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.map(rowToBooking));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as NewBooking;
  const supabase = await createServerClient();

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // The client arrives as the app's numeric ref; the row needs the uuid.
  // Resolved through RLS, so a caller who cannot see a client cannot book for
  // them — the lookup simply returns nothing.
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", input.clientId)
    .maybeSingle();

  if (!client) {
    return NextResponse.json(
      { error: `No client ${input.clientId} you can book for.` },
      { status: 422 },
    );
  }

  const row = bookingToRow(input, {
    facilityId: facility.facilityId,
    clientRowId: client.id,
    locationId: facility.locationId,
    timeZone: facility.timeZone,
  });

  const { data: created, error } = await supabase
    .from("bookings")
    .insert(row as never)
    .select("id, ref")
    .single();

  if (error) {
    // 403 for a policy refusal, because "you may not do this" is not a bug in
    // the request body and should not read as one in the client.
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: denied ? "Not allowed to create bookings." : error.message },
      { status: denied ? 403 : 500 },
    );
  }

  // Pets are a join table. Written after the booking so a rejected insert
  // above leaves nothing behind.
  const petRefs = Array.isArray(input.petId) ? input.petId : [input.petId];
  const wanted = petRefs.filter((ref): ref is number => ref != null);

  if (wanted.length > 0) {
    const { data: pets } = await supabase
      .from("pets")
      .select("id")
      .in("ref", wanted);

    if (pets?.length) {
      await supabase
        .from("booking_pets")
        .insert(pets.map((p) => ({ booking_id: created.id, pet_id: p.id })));
    }
  }

  const { data: full } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", created.id)
    .single();

  return NextResponse.json(full ? rowToBooking(full) : null, { status: 201 });
}
