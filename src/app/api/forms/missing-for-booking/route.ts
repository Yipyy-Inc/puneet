import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import type { MissingForm } from "@/lib/forms/requirements";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The forms a facility requires that a booking would still be missing — asked
// BEFORE it is made, so the booking wizard's Confirm can list them beside the
// agreements (the client's mock, 2026-10-02): a customer opens each one; staff
// say why it goes ahead without them, inline, instead of a dialog stacked on
// the wizard after the save was refused.
//
// The database answers, as it does for the gate inside `create_booking`:
// `client_missing_forms(client, pets, service, 'before_booking')`, under the
// caller's own RLS. Staff name the client by ref within their facility; a
// customer is always their own client row.
// ============================================================================

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  clientRef: z.number().int().positive().optional(),
  petRefs: z.array(z.number().int().positive()).max(20),
  service: z.string().trim().min(1).max(60),
});

export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Which client, pets and service?" },
      { status: 422 },
    );
  }
  const input = parsed.data;
  const supabase = await createServerClient();

  const isStaff = viewer.memberships.length > 0 || viewer.isPlatformAdmin;
  let clientId: string | null = null;
  if (isStaff && input.clientRef) {
    const context = await getFacilityContext();
    if (!context) {
      return NextResponse.json(
        { error: "Facility not found." },
        { status: 403 },
      );
    }
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("facility_id", context.facilityId)
      .eq("ref", input.clientRef)
      .maybeSingle();
    clientId = data?.id ?? null;
  } else if (viewer.userId) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", viewer.userId)
      .limit(1)
      .maybeSingle();
    clientId = data?.id ?? null;
  }
  if (!clientId) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  const { data: pets } = input.petRefs.length
    ? await supabase
        .from("pets")
        .select("id")
        .eq("client_id", clientId)
        .in("ref", input.petRefs)
    : { data: [] as Array<{ id: string }> };

  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: "client_missing_forms",
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  const { data, error } = await rpc("client_missing_forms", {
    p_client_id: clientId,
    p_pet_ids: (pets ?? []).map((pet) => pet.id),
    p_service: input.service,
    p_stage: "before_booking",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ missing: (data ?? []) as MissingForm[] });
}
