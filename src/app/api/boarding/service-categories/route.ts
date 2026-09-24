import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";

// ============================================================================
// How a facility groups its boarding menu (MoéGo's "Category").
//
// Presentation, never eligibility or price: a category decides where a service
// sits on the list and nothing else. A service whose category is deleted keeps
// working — the FK is `on delete set null`, so it falls to the ungrouped
// section rather than disappearing with the heading.
//
// NOT the lodging type. A category groups the MENU; `room_categories` groups
// the building. Phase 5 separated those and this is the menu's half.
// ============================================================================

export const dynamic = "force-dynamic";

interface CategoryRow {
  id: string;
  name: string;
  display_order: number;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("boarding_service_categories")
    .select("id, name, display_order")
    .match(inFacility(scope))
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data as unknown as CategoryRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      displayOrder: row.display_order,
    })),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    displayOrder?: number;
  } | null;

  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "A category needs a name." },
      { status: 422 },
    );
  }

  // THE FACILITY COMES FROM THE SESSION. Never from the request.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("boarding_service_categories")
    .insert({
      facility_id: facility.facilityId,
      name: name.slice(0, 200),
      display_order: Math.round(Number(body?.displayOrder ?? 0)),
    })
    .select("id, name, display_order")
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already a category with that name.",
      denied: "You do not have permission to add a category.",
    });
  }
  // An RLS-refused INSERT returns no row and no error.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to add a category." },
      { status: 403 },
    );
  }

  const row = data as unknown as CategoryRow;
  return NextResponse.json(
    { id: row.id, name: row.name, displayOrder: row.display_order },
    { status: 201 },
  );
}
