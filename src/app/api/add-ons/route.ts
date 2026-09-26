import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeAddOnOverrides } from "@/lib/api/add-on-overrides";
import {
  ADD_ON_SELECT,
  addOnInputToRow,
  rowToAddOn,
  type AddOnRow,
} from "@/lib/api/mappers/add-on";
import { addOnInputSchema } from "@/types/add-on";

// ============================================================================
// The one add-ons list — Settings > Services > Add-ons (20260926223644).
//
// Staff read it with `view_services` and write it with `manage_services`; the
// table's policies are the gate, and this route only makes sure a refusal is
// reported as one. Archived (deleted) add-ons are not listed: they exist only
// so the bookings that used them still resolve.
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
    .from("service_add_ons")
    .select(ADD_ON_SELECT)
    .match(inFacility(scope))
    .is("archived_at", null)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data as unknown as AddOnRow[]).map(rowToAddOn));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = addOnInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That add-on is not valid.", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const input = parsed.data;
  if (!input.name) {
    return NextResponse.json(
      { error: "An add-on needs a name." },
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
    .from("service_add_ons")
    .insert({
      ...addOnInputToRow(input),
      facility_id: facility.facilityId,
      name: input.name,
    })
    .select(ADD_ON_SELECT)
    .maybeSingle();

  if (error) {
    // 42501 is an RLS refusal, which PostgREST RAISES on an insert.
    return writeFailure(error, {
      duplicate: "There is already an add-on with that id.",
      denied: "You do not have permission to add an add-on.",
    });
  }
  // And an insert refused WITHOUT an error returns no row.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to add an add-on." },
      { status: 403 },
    );
  }

  let created = data as unknown as AddOnRow;
  const overridesWritten = await writeAddOnOverrides(
    supabase,
    created.id,
    facility.facilityId,
    input.overrides,
  );

  // The row above was read before its overrides existed.
  if (input.overrides?.length) {
    const { data: reread } = await supabase
      .from("service_add_ons")
      .select(ADD_ON_SELECT)
      .eq("id", created.id)
      .maybeSingle();
    if (reread) created = reread as unknown as AddOnRow;
  }

  return NextResponse.json(
    { addOn: rowToAddOn(created), overridesWritten },
    { status: 201 },
  );
}
