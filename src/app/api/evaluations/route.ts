import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import { evaluationsBoard } from "@/lib/evaluations/board-server";
import { evaluationFailure } from "@/lib/evaluations/rpc-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// /api/evaluations — Operations › Evaluations (the client's mock, 2026-10-02).
//
// GET   the page: today's evaluations, the cards to review and the ones sent,
//       every evaluation, and what the viewer may do — for the ONE facility
//       the portal is showing (lib/evaluations/board-server.ts).
// POST  { petId | petRef, bookingId? } — start an evaluation, or open the one already
//       started for that pet on that booking (public.start_evaluation). The
//       facility is the pet's; the database checks the caller runs
//       evaluations there.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const scope = await activeFacilityIdForStaff();
  if (!scope) {
    return NextResponse.json({ error: "No facility." }, { status: 403 });
  }
  const supabase = await createServerClient();
  return NextResponse.json(await evaluationsBoard(supabase, scope));
}

const startSchema = z
  .object({
    petId: z.string().uuid().optional(),
    /** The pet by its number — the pet profile knows no other. */
    petRef: z.number().int().positive().optional(),
    bookingId: z.string().uuid().nullable().optional(),
  })
  .refine((body) => Boolean(body.petId) !== (body.petRef !== undefined));

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Name the pet to evaluate." },
      { status: 422 },
    );
  }
  const supabase = await createServerClient();
  let petId = parsed.data.petId;
  if (!petId) {
    // A number is a pet of the facility the portal is showing — never one
    // the request could aim at another facility.
    const scope = await activeFacilityIdForStaff();
    const { data: pet } = scope
      ? await supabase
          .from("pets")
          .select("id")
          .eq("facility_id", scope)
          .eq("ref", parsed.data.petRef!)
          .maybeSingle()
      : { data: null };
    petId = (pet as { id: string } | null)?.id;
    if (!petId) {
      return NextResponse.json({ error: "Pet not found." }, { status: 404 });
    }
  }
  const { data, error } = await supabase.rpc("start_evaluation", {
    p_pet_id: petId,
    p_booking_id: parsed.data.bookingId ?? undefined,
  });
  if (error) return evaluationFailure(error);
  return NextResponse.json({ id: data as string }, { status: 201 });
}
