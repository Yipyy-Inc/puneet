import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import {
  VACCINATION_SELECT,
  rowToVaccination,
  vaccinationWriteSchema,
  type VaccinationRow,
} from "@/lib/api/mappers/vaccination";

// ============================================================================
// Vaccination records — the client file, the pet profile, the list filters.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// Every facility screen read `vaccinationRecords` from `@/data/pet-data`, keyed
// by a numeric pet id. A real pet whose ref happened to match a fixture pet
// wore that pet's rabies certificate; every other real pet had none, and
// "Approve" edited the module array under the name "Sarah (Staff)".
//
// `public.pet_vaccinations` has existed since 20260828134018 with its policies
// in place (read: members of the facility; write: `edit_pet_medical`) and no
// route. So this adds no table and no policy — it is the route.
//
// ── SCOPE ─────────────────────────────────────────────────────────────────
//
// `?clientRef=` or `?petRef=` narrows to one owner or one animal; neither
// returns the facility's whole register, which the list filters need. The
// facility comes from the session (check:facility-scoped-reads), and the
// `pets_set_facility`-style trigger on the table stamps the facility from the
// pet on every insert, so a write cannot place a record elsewhere.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const clientRef = params.get("clientRef");
  const petRef = params.get("petRef");

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  let query = supabase
    .from("pet_vaccinations")
    .select(VACCINATION_SELECT)
    .match(inFacility(scope));

  if (petRef !== null) {
    const ref = Number(petRef);
    if (!Number.isInteger(ref) || ref <= 0) {
      return NextResponse.json({ error: "Invalid pet." }, { status: 422 });
    }
    query = query.eq("pets.ref", ref);
  } else if (clientRef !== null) {
    const ref = Number(clientRef);
    if (!Number.isInteger(ref) || ref <= 0) {
      return NextResponse.json({ error: "Invalid client." }, { status: 422 });
    }
    query = query.eq("pets.clients.ref", ref);
  }

  const { data, error } = await query
    .order("expires_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data ?? []) as unknown as VaccinationRow[]).map(rowToVaccination),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = vaccinationWriteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "That is not a vaccination record.",
        detail: parsed.error.issues,
      },
      { status: 422 },
    );
  }
  const write = parsed.data;

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("id")
    .eq("ref", write.petRef)
    .match(inFacility(facility.facilityId))
    .maybeSingle();
  if (!pet) {
    return NextResponse.json(
      { error: "That pet does not exist at this facility." },
      { status: 404 },
    );
  }

  const viewer = await getViewer().catch(() => null);
  const actor = viewer?.fullName ?? viewer?.email ?? null;
  const status = write.status ?? "approved";

  const { data, error } = await supabase
    .from("pet_vaccinations")
    .insert({
      pet_id: pet.id,
      // Overwritten by the trigger from the pet; present because the column
      // is not null.
      facility_id: facility.facilityId,
      vaccine_name: write.vaccineName,
      administered_on: write.administeredDate ?? null,
      expires_on: write.expiryDate ?? null,
      veterinarian_name: write.veterinarianName || null,
      veterinary_clinic: write.veterinaryClinic || null,
      notes: write.notes || null,
      status,
      reviewed_by: status === "approved" ? actor : null,
      reviewed_at: status === "approved" ? new Date().toISOString() : null,
      created_by: actor,
    })
    .select(VACCINATION_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "That record already exists.",
      denied: "You do not have permission to edit medical records.",
    });
  }

  return NextResponse.json(
    rowToVaccination(data as unknown as VaccinationRow),
    { status: 201 },
  );
}
