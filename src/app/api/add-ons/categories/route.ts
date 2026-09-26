import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import {
  ADD_ON_CATEGORY_SELECT,
  rowToAddOnCategory,
  type AddOnCategoryRow,
} from "@/lib/api/mappers/add-on";

// ============================================================================
// The headings the add-ons list is grouped under, in the facility's order
// (20260926223644). Deleting one leaves its add-ons Uncategorized — the
// foreign key is `on delete set null` (service-add-ons A2).
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("service_add_on_categories")
    .select(ADD_ON_CATEGORY_SELECT)
    .match(inFacility(scope))
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data as unknown as AddOnCategoryRow[]).map(rowToAddOnCategory),
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
    .from("service_add_on_categories")
    .insert({
      facility_id: facility.facilityId,
      name: name.slice(0, 80),
      display_order: Math.round(Number(body?.displayOrder ?? 0)) || 0,
    })
    .select(ADD_ON_CATEGORY_SELECT)
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already a category with that name.",
      denied: "You do not have permission to add a category.",
    });
  }
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to add a category." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    rowToAddOnCategory(data as unknown as AddOnCategoryRow),
    { status: 201 },
  );
}
