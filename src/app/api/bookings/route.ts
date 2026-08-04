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

  // Pets are resolved and checked BEFORE the booking is written.
  //
  // booking_pets refuses a pet that does not belong to the booking's client
  // (20260802120000), and there is no DELETE policy on bookings — by design,
  // a booking is cancelled, not erased. So a rejection discovered after the
  // insert cannot be tidied up: it would leave a booking with no animals on
  // it and no way to withdraw it. Checking first is what keeps that row from
  // existing at all.
  const petRefs = Array.isArray(input.petId) ? input.petId : [input.petId];
  const wanted = petRefs.filter((ref): ref is number => ref != null);

  // RLS-scoped, so a caller who cannot see a pet gets nothing back for it and
  // the count check below is what turns that into a refusal.
  const { data: pets } = wanted.length
    ? await supabase.from("pets").select("id, client_id").in("ref", wanted)
    : { data: [] };

  const resolved = pets ?? [];
  if (resolved.length !== wanted.length) {
    return NextResponse.json(
      { error: "One or more of those pets could not be found." },
      { status: 422 },
    );
  }
  if (resolved.some((p) => p.client_id !== client.id)) {
    // The attack the database also refuses: attaching somebody else's animal
    // to your own booking, which the facility would read as consent to hand
    // that animal over.
    return NextResponse.json(
      { error: "Those pets are not registered to this client." },
      { status: 403 },
    );
  }

  const row = bookingToRow(input, {
    facilityId: facility.facilityId,
    clientRowId: client.id,
    locationId: facility.locationId,
    timeZone: facility.timeZone,
  });

  // THE BOOKING, ITS PETS AND — FOR GROOMING — ITS APPOINTMENT, IN ONE
  // TRANSACTION.
  //
  // This used to be three sequential writes from here, and a grooming booking
  // got only the first two: `grooming_appointments` is what the board reads,
  // nothing wrote it, and so a groom booked in this app was invisible to the
  // person who had to do it. The appointments route has no POST at all — every
  // row in that table arrived through a backfill migration.
  //
  // Sequential writes were also why the pet check above has to happen first:
  // `bookings` has no DELETE policy, so a refusal on write two left a booking
  // that could not be withdrawn. create_booking (20260806560000) is SECURITY
  // INVOKER, so RLS still judges every insert as this caller, and a refusal
  // anywhere rolls back the lot. The pre-check stays because it produces a far
  // better message than a constraint name — but it is no longer the thing
  // standing between us and an orphan row.
  //
  // The grooming payload carries CHOICES, not money: which service, which
  // add-ons, which station. The RPC reads the prices from the catalogue,
  // because a price in a request body is a suggestion.
  const grooming =
    input.service === "grooming"
      ? {
          serviceId: input.serviceType ?? null,
          addOnIds: input.groomingAddOns ?? [],
          stationId: input.stationAssignment ?? null,
          durationOverrideMin: input.groomingDurationOverrideMin ?? null,
        }
      : null;

  const { data: createdRows, error } = await supabase.rpc("create_booking", {
    p_booking: row,
    p_pet_ids: resolved.map((p) => p.id),
    p_grooming: grooming,
  });

  if (error) {
    // 403 for a policy refusal, because "you may not do this" is not a bug in
    // the request body and should not read as one in the client. 422 for the
    // RPC's own rejections — an unknown service or add-on is a bad request,
    // not a server fault and not a permission problem.
    const denied = error.code === "42501";
    const badRequest = error.code === "23503" || error.code === "22023";
    return NextResponse.json(
      { error: denied ? "Not allowed to create bookings." : error.message },
      { status: denied ? 403 : badRequest ? 422 : 500 },
    );
  }

  const created = createdRows?.[0];
  if (!created) {
    return NextResponse.json(
      { error: "The booking could not be created." },
      { status: 500 },
    );
  }

  const { data: full } = await supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .eq("id", created.booking_id)
    .single();

  return NextResponse.json(full ? rowToBooking(full) : null, { status: 201 });
}
