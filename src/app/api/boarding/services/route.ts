import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeBoardingBranchPrices } from "@/lib/api/boarding-service-prices";
import { writeBoardingDefaultAddOns } from "@/lib/api/boarding-default-addons";
import { writeFailure } from "@/lib/api/write-failure";
import {
  BOARDING_SERVICE_SELECT,
  boardingServiceToRow,
  rowToBoardingService,
  type BoardingServiceInput,
  type BoardingServiceRow,
} from "@/lib/api/mappers/boarding-service";

// ============================================================================
// The boarding menu (boarding_services — 20260924210000).
//
// THIS IS THE MENU, NOT THE BUILDING. Until Phase 5 `room_categories` was both:
// the Rooms page and the Rates page were two editors over one table, so
// "Deluxe Suite" was the kennel, the nightly rate and the menu item at once and
// a facility could not offer two priced services in one class. `/api/rooms`
// still owns the lodging types; this owns what may be sold into them.
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
// rather than failing the whole request.
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
    .from("boarding_services")
    .select(BOARDING_SERVICE_SELECT)
    .match(inFacility(scope))
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    (data as unknown as BoardingServiceRow[]).map((row) =>
      rowToBoardingService(row, { locationId }),
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | (BoardingServiceInput & { branchPrices?: Record<string, number> })
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
    .from("boarding_services")
    .insert({
      ...boardingServiceToRow(body),
      // Both are required by the table and neither may come from the body:
      // the facility is the session's, and the name was validated above.
      facility_id: facility.facilityId,
      name: String(body.name).trim().slice(0, 200),
    })
    .select(BOARDING_SERVICE_SELECT)
    .maybeSingle();

  if (error) {
    // 42501 is an RLS refusal, and PostgREST RAISES it on an insert rather
    // than returning no row — so the `!data` branch below never sees it. A
    // caretaker creating a service lands here, and 403 is the honest answer.
    return writeFailure(error, {
      duplicate: "There is already a service with that name.",
      denied: "You do not have permission to add a boarding service.",
    });
  }
  // And an insert refused WITHOUT an error returns no row.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to add a boarding service." },
      { status: 403 },
    );
  }

  let created = data as unknown as BoardingServiceRow;
  const pricesWritten = await writeBoardingBranchPrices(
    supabase,
    created.id,
    facility.facilityId,
    body.branchPrices,
  );
  const defaultsWritten = await writeBoardingDefaultAddOns(
    supabase,
    created.id,
    facility.facilityId,
    body.defaultAddOns,
  );

  // The row above was read before its children existed. Read it again when
  // there were any, so the answer is what is stored.
  if (body.branchPrices !== undefined || body.defaultAddOns?.length) {
    const { data: reread } = await supabase
      .from("boarding_services")
      .select(BOARDING_SERVICE_SELECT)
      .eq("id", created.id)
      .maybeSingle();
    if (reread) created = reread as unknown as BoardingServiceRow;
  }

  return NextResponse.json(
    { service: rowToBoardingService(created), pricesWritten, defaultsWritten },
    { status: 201 },
  );
}
