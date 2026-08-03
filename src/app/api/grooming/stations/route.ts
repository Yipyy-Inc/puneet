import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getFacilityContext } from "@/lib/api/facility-context";
import type { GroomingStation } from "@/types/rooms";

// ============================================================================
// Grooming stations, with LIVE OCCUPANCY COMPUTED HERE.
//
// The table stores no `currentPetName` / `currentStylistName` /
// `estimatedCompletionAt` (Decision 2 of 20260805180000) — those are facts
// about the appointment at the station, and storing them twice is how a board
// ends up showing a pet that went home an hour ago.
//
// So the route joins. One extra query for every station on the screen, not one
// per station: the appointments are fetched in a single call and matched in
// memory, because a facility has a handful of tables and dozens of appointments
// a day, and N+1 over eight rows is still N+1.
//
// OCCUPANCY WINS THE "IN-USE" READING, and this was a correction. The first
// cut kept the stored status independent of occupancy, on the theory that
// "needs cleaning" and "who is here" answer different questions. Reading the
// actual payload killed it: a tub with a pet on it came back
// `status: "available"` next to `currentPetName: "Rex"`, which on the board is
// a free table with somebody's dog on it.
//
// So `in-use` is DERIVED and never trusted from the column: occupied → in-use,
// otherwise whatever the staff set. `needs-cleaning` and `out-of-service` are
// still the station's own state and survive untouched while empty — they are
// assertions no appointment implies. What is gone is the ability for the stored
// value to contradict a pet that is physically present.
// ============================================================================

export const dynamic = "force-dynamic";

interface StationRow {
  id: string;
  legacy_id: string | null;
  name: string;
  type: string;
  active: boolean;
  status: string;
  status_changed_at: string | null;
  allowed_pet_sizes: string[] | null;
  pet_types: string[] | null;
  max_weight_lbs: number | null;
  staff_notes: string;
  image_url: string | null;
  display_order: number;
}

/** The app id is legacy_id when present, else the uuid — a station created
 *  through this API has no legacy id, and would otherwise be unaddressable. */
function appId(row: { legacy_id: string | null; id: string }): string {
  return row.legacy_id ?? row.id;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("grooming_stations")
    .select(
      `id, legacy_id, name, type, active, status, status_changed_at,
       allowed_pet_sizes, pet_types, max_weight_lbs, staff_notes,
       image_url, display_order`,
    )
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const rows = data as unknown as StationRow[];

  // Who is on a table right now. RLS scopes this to the caller's facilities
  // exactly as it scopes the stations, so the two lists cannot disagree about
  // which facility they describe.
  const { data: occupancy } = await supabase
    .from("grooming_appointments")
    .select(
      `station_id, estimated_ready_at,
       booking:booking_id ( status, assigned_staff_name,
                            booking_pets ( pets ( name ) ) )`,
    )
    .not("station_id", "is", null);

  type OccRow = {
    station_id: string;
    estimated_ready_at: string | null;
    booking: {
      status: string;
      assigned_staff_name: string | null;
      booking_pets: { pets: { name: string } | null }[] | null;
    } | null;
  };

  const byStation = new Map<string, OccRow>();
  for (const row of (occupancy ?? []) as unknown as OccRow[]) {
    // Only the statuses that mean "the pet is physically here". A confirmed
    // booking for 3pm does not occupy a tub at 9am.
    if (
      row.booking?.status === "checked_in" ||
      row.booking?.status === "in_progress"
    ) {
      byStation.set(row.station_id, row);
    }
  }

  return NextResponse.json(
    rows.map((row): GroomingStation => {
      const occ = byStation.get(row.id);
      const petName = occ?.booking?.booking_pets?.[0]?.pets?.name;
      return {
        id: appId(row),
        // The screens still pass `facilityId: 11`. Reported as the legacy
        // number rather than the uuid so the existing filters keep matching;
        // this is display plumbing, never a security boundary — RLS already
        // decided which rows are here.
        facilityId: 11,
        name: row.name,
        type: row.type as GroomingStation["type"],
        active: row.active,
        // See the header: a station with a pet on it reads `in-use`, whatever
        // the column says.
        status: (occ ? "in-use" : row.status) as GroomingStation["status"],
        allowedPetSizes: (row.allowed_pet_sizes ??
          []) as GroomingStation["allowedPetSizes"],
        petTypes: (row.pet_types ?? []) as GroomingStation["petTypes"],
        ...(row.max_weight_lbs !== null
          ? { maxWeightLbs: Number(row.max_weight_lbs) }
          : {}),
        staffNotes: row.staff_notes,
        ...(row.image_url ? { imageUrl: row.image_url } : {}),
        ...(row.status_changed_at
          ? { statusChangedAt: row.status_changed_at }
          : {}),
        // Derived, every request. Absent when nobody is on the table — which is
        // the honest answer, and the reason these are optional in the type.
        ...(petName ? { currentPetName: petName } : {}),
        ...(occ?.booking?.assigned_staff_name
          ? { currentStylistName: occ.booking.assigned_staff_name }
          : {}),
        ...(occ?.estimated_ready_at
          ? { estimatedCompletionAt: occ.estimated_ready_at }
          : {}),
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as {
    name?: string;
    type?: string;
    active?: boolean;
    allowedPetSizes?: string[];
    petTypes?: string[];
    maxWeightLbs?: number | null;
    staffNotes?: string;
    imageUrl?: string | null;
  } | null;

  if (!input?.name || !input.type) {
    return NextResponse.json(
      { error: "A name and a type are required." },
      { status: 422 },
    );
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("grooming_stations")
    .insert({
      facility_id: context.facilityId,
      name: input.name,
      type: input.type,
      active: input.active ?? true,
      allowed_pet_sizes: input.allowedPetSizes ?? [],
      pet_types: input.petTypes ?? [],
      max_weight_lbs: input.maxWeightLbs ?? null,
      staff_notes: input.staffNotes ?? "",
      image_url: input.imageUrl ?? null,
      // `status` and `status_changed_at` are NOT accepted. A new station is
      // available, and the clock is the trigger's.
    } as never)
    .select("id, legacy_id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to add stations at this facility.",
      duplicate: "A station with that id already exists.",
    });
  }

  return NextResponse.json({ id: appId(data as never) }, { status: 201 });
}
