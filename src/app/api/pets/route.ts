import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { PET_SELECT, petToRow, rowToPet } from "@/lib/api/mappers/client";
import { writeFailure } from "@/lib/api/write-failure";
import type { Pet } from "@/types/pet";

// ============================================================================
// Pets.
//
// Separate from /api/clients even though clients carry their pets nested: the
// pet screens want a flat list, and asking them to flatten a client list to
// get it would pull every client's billing details along for the ride.
//
// RLS decides what comes back — staff need `view_pet_records`, a customer sees
// only their own animals.
//
// WHAT MAY BE WRITTEN is decided BELOW this file, in the database
// (20260803090000). An owner may register and describe their pet; the
// facility's assessment of it — `details.evaluations`, and `status`, which
// includes 'deceased' — is not theirs to write. The facility a pet belongs to
// is derived from its owner by a trigger and never accepted from a request.
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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as Partial<Pet> & { clientId?: number };

  if (!input.name?.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 422 });
  }
  if (input.clientId === undefined) {
    return NextResponse.json(
      { error: "A pet needs an owner." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  // The owner is resolved through a READ the caller has to be able to make.
  // A customer can only see their own client record and staff only their own
  // facility's, so an unreadable owner is refused here rather than becoming an
  // RLS error further down that says less.
  const { data: owner } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", input.clientId)
    .maybeSingle();

  if (!owner) {
    return NextResponse.json(
      { error: "That owner does not exist, or is not yours to add pets for." },
      { status: 404 },
    );
  }

  const row = petToRow(input, { clientId: owner.id });

  const { data: created, error } = await supabase
    .from("pets")
    .insert(row as never)
    .select(PET_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to add a pet for this owner.",
      duplicate: "That pet already exists.",
    });
  }

  // From the stored row: the trigger strips an evaluation a caller attached and
  // forces the status, so echoing the request back would report a pet the
  // database did not store.
  return NextResponse.json(rowToPet(created), { status: 201 });
}
