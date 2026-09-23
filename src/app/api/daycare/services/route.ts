import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeBranchPrices } from "@/lib/api/daycare-service-prices";
import { writeFailure } from "@/lib/api/write-failure";
import {
  DAYCARE_SERVICE_SELECT,
  daycareServiceToRow,
  rowToDaycareService,
  type DaycareServiceInput,
  type DaycareServiceRow,
} from "@/lib/api/mappers/daycare-service";

// ============================================================================
// The daycare menu (daycare_services — 20260924120000).
//
// GET IS DELIBERATELY UNFILTERED BY is_active. RLS already draws that line —
// staff see drafts, a signed-in CLIENT sees only live services — so filtering
// here would either duplicate the rule or contradict it. The same request
// returns different rows to different callers, which is the point.
//
// THE BRANCH PRICE IS A SEPARATE WRITE, because it is a separate table with a
// separate permission: `manage_services` creates the service, `manage_rates`
// prices it. A caller holding only the first gets a service and a refusal on
// the price, which is the correct outcome — so POST reports what it managed
// rather than failing the whole request. Grooming's route says the same.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Absent for every caller except the editor's branch selector, and then the
  // answer is the facility-wide price — unchanged from before branch pricing.
  const locationId = request.nextUrl.searchParams.get("locationId");

  const supabase = await createServerClient();
  // Scoped, not left to RLS alone: for a platform admin or somebody in two
  // facilities, RLS returns every facility they can see, merged.
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("daycare_services")
    .select(DAYCARE_SERVICE_SELECT)
    .match(inFacility(scope))
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data as unknown as DaycareServiceRow[]).map((row) =>
      rowToDaycareService(row, { locationId }),
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | (DaycareServiceInput & { branchPrices?: Record<string, number> })
    | null;

  if (!body?.name || !String(body.name).trim()) {
    return NextResponse.json(
      { error: "A service needs a name." },
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
    .from("daycare_services")
    .insert({
      ...daycareServiceToRow(body),
      // Both are required by the table and neither may come from the body:
      // the facility is the session's, and the name was validated above.
      facility_id: facility.facilityId,
      name: String(body.name).trim().slice(0, 200),
    })
    .select(DAYCARE_SERVICE_SELECT)
    .maybeSingle();

  if (error) {
    // 42501 is an RLS refusal, and PostgREST RAISES it on an insert rather
    // than returning no row — so the `!data` branch below never sees it. A
    // groomer creating a service lands here, and 403 is the honest answer.
    return writeFailure(error, {
      duplicate: "There is already a service with that name.",
      denied: "You do not have permission to add a daycare service.",
    });
  }
  // And an insert refused WITHOUT an error returns no row.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to add a daycare service." },
      { status: 403 },
    );
  }

  const created = data as unknown as DaycareServiceRow;
  const pricesWritten = await writeBranchPrices(
    supabase,
    created.id,
    facility.facilityId,
    body.branchPrices,
  );

  return NextResponse.json(
    { service: rowToDaycareService(created), pricesWritten },
    { status: 201 },
  );
}
