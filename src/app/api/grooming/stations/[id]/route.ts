import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";

// ============================================================================
// One station: edit it, retire it.
//
// STATUS IS ACCEPTED, OCCUPANCY IS NOT. `setStationStatus(id, status,
// {petName, stylistName})` in the old hook wrote all three. Only the status
// column exists now — who is on a table comes from the appointment assigned to
// it (Decision 2 of 20260805180000), so an occupancy argument has nothing to
// write to and is dropped here rather than silently accepted.
//
// `status_changed_at` is never accepted either: the trigger stamps it, and a
// caller-chosen value would let a filthy tub report as freshly cleaned.
// ============================================================================

export const dynamic = "force-dynamic";

async function resolveStation(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  appId: string,
): Promise<string | null> {
  const byLegacy = await supabase
    .from("grooming_stations")
    .select("id")
    .eq("legacy_id", appId)
    .maybeSingle();
  if (byLegacy.data) return byLegacy.data.id as string;

  // Guarded: passing a non-uuid to an `eq` on a uuid column is a 400 from
  // PostgREST, not an empty result.
  if (!/^[0-9a-f-]{36}$/i.test(appId)) return null;

  const byId = await supabase
    .from("grooming_stations")
    .select("id")
    .eq("id", appId)
    .maybeSingle();
  return (byId.data?.id as string | undefined) ?? null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const input = (await request.json().catch(() => null)) as {
    name?: string;
    type?: string;
    active?: boolean;
    status?: string;
    allowedPetSizes?: string[];
    petTypes?: string[];
    maxWeightLbs?: number | null;
    staffNotes?: string;
    imageUrl?: string | null;
  } | null;

  if (!input) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const stationId = await resolveStation(supabase, id);
  if (!stationId) {
    return NextResponse.json(
      { error: "That station does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (input.active !== undefined) patch.active = input.active;
  if (input.allowedPetSizes !== undefined)
    patch.allowed_pet_sizes = input.allowedPetSizes;
  if (input.petTypes !== undefined) patch.pet_types = input.petTypes;
  if (input.maxWeightLbs !== undefined)
    patch.max_weight_lbs = input.maxWeightLbs;
  if (input.staffNotes !== undefined) patch.staff_notes = input.staffNotes;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;

  // `in-use` IS accepted, and the first cut refused it. Worth explaining,
  // because the refusal was the more principled-looking option and it was wrong
  // for this system today.
  //
  // GET derives `in-use` from a real appointment checked in at the station, so
  // in a fully-migrated world the column never needs the value. But the check-in
  // flow that would create that appointment still writes to the mock query
  // cache (check-in-actions.ts:217), so there is no row for the join to find —
  // and refusing the write here would simply stop check-in marking stations at
  // all. A correct model that silently breaks a working screen is not an
  // improvement.
  //
  // It is not a lie the column can get stuck in, either: the same flow clears
  // it — `needs-cleaning` on mark-ready (:372) and `available` on payment
  // (:504). And when a REAL appointment does occupy the station, GET's derived
  // answer wins over whatever is stored.
  if (input.status !== undefined) patch.status = input.status;

  if (Object.keys(patch).length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const { data: touched, error } = await supabase
    .from("grooming_stations")
    .update(patch as never)
    .eq("id", stationId)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change stations at this facility.",
      duplicate: "A station with that id already exists.",
    });
  }
  const denied = deniedIfUntouched(
    touched,
    "Not allowed to change stations at this facility.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();
  const stationId = await resolveStation(supabase, id);
  if (!stationId) {
    return NextResponse.json(
      { error: "That station does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // Safe as a hard delete: grooming_appointments.station_id is
  // `on delete set null`, so removing a table from the estate keeps every
  // appointment that happened on it.
  const { data: touched1, error } = await supabase
    .from("grooming_stations")
    .delete()
    .eq("id", stationId)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove stations at this facility.",
      duplicate: "That station could not be removed.",
    });
  }
  const denied1 = deniedIfUntouched(
    touched1,
    "Not allowed to remove stations at this facility.",
  );
  if (denied1) return denied1;

  return new NextResponse(null, { status: 204 });
}
