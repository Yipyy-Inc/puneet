import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getFacilityContext } from "@/lib/api/facility-context";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { grantLessonPack } from "@/lib/training/lesson-pack.server";

// ============================================================================
// A lesson pack's sessions still to book (the booking wizard, 2026-10-01).
//
// "3-session pack · $270": the first session is booked at the pack's price,
// so the money sits on a booking — where a deposit, the checkout and the
// invoice already find it. The other two are passes, written here: a package
// the client owns, at $0 (it was paid on the first session's booking), with
// a training pool of the program's sessions still to book — one pool per
// dog, a pass per session. "Book the next session" on the booking page and
// Confirm's "Package passes" spend them as they spend any other pass.
//
// The sessions are the PROGRAM's own: a pack the facility does not sell is
// refused, whatever the request says (lib/training/lesson-pack.server.ts).
// Staff only — RLS lets a write through for `financial_take_payment`, as for
// any package sale.
// ============================================================================

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  /** The client's ref. */
  clientId: z.number().int().positive(),
  programId: z.string().min(1).max(120),
  /** The pack's sessions: 3 for a 3-session pack. */
  sessions: z.number().int().min(2).max(100),
  /** The dogs who bought it, each a pack of their own. */
  pets: z.number().int().min(1).max(20),
  /** "Private lesson · 3-session pack", in the words of whoever sold it. */
  packageName: z.string().trim().min(1).max(160),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A pack needs a client, a program and its sessions." },
      { status: 422 },
    );
  }
  const input = parsed.data;

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("facility_id", facility.facilityId)
    .eq("ref", input.clientId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  const granted = await grantLessonPack({
    supabase: supabase as unknown as SupabaseClient,
    facilityId: facility.facilityId,
    clientId: client.id,
    programId: input.programId,
    sessions: input.sessions,
    pets: input.pets,
    packageName: input.packageName,
  });
  if (!granted.ok) {
    return NextResponse.json(
      { error: granted.error },
      { status: granted.status },
    );
  }
  return NextResponse.json(
    { id: granted.id, passes: granted.passes },
    { status: 201 },
  );
}
