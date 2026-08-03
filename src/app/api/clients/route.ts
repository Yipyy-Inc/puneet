import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CLIENT_SELECT,
  clientToRow,
  rowToClient,
} from "@/lib/api/mappers/client";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { Client } from "@/types/client";

// ============================================================================
// Clients, with their pets nested — the shape Client already has.
//
// One query with a join rather than two and a stitch: `client.pets` is how
// every consumer reads it, and doing the join per caller is the same work done
// worse, N times.
//
// RLS decides what comes back. Staff need `view_clients`; a customer sees the
// single record linked to their account. Neither is enforced here.
//
// WHAT MAY BE WRITTEN is decided BELOW this file, in the database
// (20260803090000). `clients_update` admits the record's owner, and RLS gates
// rows rather than columns — so without the trigger there, a blocked customer
// could clear their own balance and unblock themselves. PostgREST is reachable
// directly with the anon key and a session cookie; this file is a convenience,
// not a gate.
// ============================================================================

export const dynamic = "force-dynamic";

/** The mock Client identifies its facility by NAME, so resolve it once. */
async function facilityName(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<string> {
  const { data } = await supabase
    .from("facilities")
    .select("name")
    .eq("legacy_id", "11")
    .maybeSingle();
  return data?.name ?? "Example Pet Care Facility";
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const [{ data, error }, name] = await Promise.all([
    supabase.from("clients").select(CLIENT_SELECT).order("ref"),
    facilityName(supabase),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.map((row) => rowToClient(row, name)));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as Partial<Client>;

  if (!input.name?.trim() || !input.email?.trim()) {
    return NextResponse.json(
      { error: "A name and an email address are required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // The facility comes from the server's context, never from the request.
  // `clients_insert` checks create_clients AT THE ROW'S facility, so trusting a
  // request field here would let a caller aim the check at a facility they do
  // hold it for and write the row into one they do not.
  const row = clientToRow(input, { facilityId: facility.facilityId });

  const { data: created, error } = await supabase
    .from("clients")
    .insert(row as never)
    .select(CLIENT_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to add clients at this facility.",
      duplicate: "Someone with that email is already a client here.",
    });
  }

  return NextResponse.json(rowToClient(created, await facilityName(supabase)), {
    status: 201,
  });
}
