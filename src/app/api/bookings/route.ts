import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { BOOKING_SELECT, rowToBooking } from "@/lib/api/mappers/booking";

// ============================================================================
// Bookings, read from Postgres.
//
// A Route Handler rather than a browser query, deliberately — see the note in
// lib/supabase/client.ts. Business reads go through the server client so RLS
// evaluates against the session cookie, and so the domain invariants RLS
// cannot express (capacity, ledger balance, handover) have somewhere to live
// when writes follow.
//
// Scoped entirely by RLS: staff see their facility's bookings, a customer sees
// their own, and nobody has to pass a facility id for that to hold. A filter
// here narrows what you asked for; it is not what keeps you out.
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
