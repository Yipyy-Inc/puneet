import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { PET_SELECT, rowToPet } from "@/lib/api/mappers/client";

// ============================================================================
// Pets.
//
// Separate from /api/clients even though clients carry their pets nested: the
// pet screens want a flat list, and asking them to flatten a client list to
// get it would pull every client's billing details along for the ride.
//
// RLS decides what comes back — staff need `view_pet_records`, a customer sees
// only their own animals.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { searchParams } = new URL(request.url);

  let query = supabase.from("pets").select(PET_SELECT).order("ref");

  const clientRef = searchParams.get("clientRef");
  if (clientRef) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", Number(clientRef))
      .maybeSingle();

    // No readable client means no readable pets — an empty list, not an error:
    // the caller asked a legitimate question and the answer is "none".
    if (!client) return NextResponse.json([]);
    query = query.eq("client_id", client.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.map(rowToPet));
}
