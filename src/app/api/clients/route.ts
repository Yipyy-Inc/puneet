import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { CLIENT_SELECT, rowToClient } from "@/lib/api/mappers/client";

// ============================================================================
// Clients, with their pets nested — the shape Client already has.
//
// One query with a join rather than two and a stitch: `client.pets` is how
// every consumer reads it, and doing the join per caller is the same work done
// worse, N times.
//
// RLS decides what comes back. Staff need `view_clients`; a customer sees the
// single record linked to their account. Neither is enforced here.
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
