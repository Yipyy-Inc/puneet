import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  deniedIfUntouched,
  deniedIfExpectedRowsSurvived,
} from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// A branch's own full-day daycare rate — 20260826160000.
//
// Daycare has no catalog item the way boarding (kennel classes) or grooming
// (services) do, so this is the whole resource: one row per (facility,
// location), no `[id]` segment needed, because the pair IS the id.
// ============================================================================

export const dynamic = "force-dynamic";

interface LocationPriceRow {
  location_id: string;
  base_price: number;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("daycare_location_prices")
    .select("location_id, base_price")
    .eq("facility_id", facility.facilityId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as LocationPriceRow[];
  return NextResponse.json(
    rows.map((row) => ({
      locationId: row.location_id,
      basePrice: Number(row.base_price),
    })),
  );
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as {
    locationId?: string;
    /** A price sets this branch's own rate; `null` clears it back to the
     *  facility-wide default. */
    basePrice?: number | null;
  } | null;

  if (!input || typeof input.locationId !== "string") {
    return NextResponse.json(
      { error: "A location is required." },
      { status: 422 },
    );
  }

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  const supabase = await createServerClient();

  // The FK alone would not stop a location belonging to another facility
  // being written here -- checked explicitly, same as every other location
  // write this session.
  const { data: location } = await supabase
    .from("locations")
    .select("facility_id")
    .eq("id", input.locationId)
    .maybeSingle();
  if (!location || location.facility_id !== facility.facilityId) {
    return NextResponse.json(
      { error: "That location doesn't belong to this business." },
      { status: 422 },
    );
  }

  if (input.basePrice === null || input.basePrice === undefined) {
    // Clear it back to the facility-wide default. "Nothing to clear" is a
    // legitimate outcome, not a refusal, so this counts what was there first.
    const { count: existing } = await supabase
      .from("daycare_location_prices")
      .select("id", { count: "exact", head: true })
      .eq("facility_id", facility.facilityId)
      .eq("location_id", input.locationId);

    const { data: removed, error } = await supabase
      .from("daycare_location_prices")
      .delete()
      .eq("facility_id", facility.facilityId)
      .eq("location_id", input.locationId)
      .select("id");

    if (error) {
      return writeFailure(error, {
        denied: "Not allowed to change daycare pricing at this facility.",
        duplicate: "That price could not be cleared.",
      });
    }
    const denied = deniedIfExpectedRowsSurvived(
      existing,
      removed,
      "Not allowed to change daycare pricing at this facility.",
    );
    if (denied) return denied;

    return new NextResponse(null, { status: 204 });
  }

  if (typeof input.basePrice !== "number" || input.basePrice < 0) {
    return NextResponse.json(
      { error: "The daily rate must be a positive number." },
      { status: 422 },
    );
  }

  const { data: written, error } = await supabase
    .from("daycare_location_prices")
    .upsert(
      {
        facility_id: facility.facilityId,
        location_id: input.locationId,
        base_price: input.basePrice,
      } as never,
      { onConflict: "facility_id,location_id" },
    )
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change daycare pricing at this facility.",
      duplicate: "That price could not be saved.",
    });
  }
  const denied = deniedIfUntouched(
    written,
    "Not allowed to change daycare pricing at this facility.",
  );
  if (denied) return denied;

  return NextResponse.json({
    locationId: input.locationId,
    basePrice: input.basePrice,
  });
}
