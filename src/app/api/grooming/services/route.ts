import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { getFacilityContext } from "@/lib/api/facility-context";
import {
  SERVICE_SELECT,
  rowToService,
  serviceToRow,
  sizePricesToRows,
  type ServiceRow,
} from "@/lib/api/mappers/grooming";

// ============================================================================
// The grooming menu.
//
// GET IS DELIBERATELY UNFILTERED BY is_active. RLS already draws that line —
// staff see drafts, a signed-in CLIENT sees only live services (20260805100000)
// — so filtering here would either duplicate the rule or contradict it. The
// same request returns different rows to different callers, which is the point.
//
// SIZE PRICES ARE A SEPARATE WRITE, because they are a separate table with a
// separate permission: `manage_services` creates the service, `manage_rates`
// prices it. A caller with only the first gets a service and a 403 on the
// prices, which is the correct outcome and the reason POST does not fail the
// whole request when the price write is refused — see the note on the insert.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("grooming_services")
    .select(SERVICE_SELECT)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json((data as unknown as ServiceRow[]).map(rowToService));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as
    | (Record<string, unknown> & { sizePricing?: Record<string, number> })
    | null;

  if (!input?.name || typeof input.duration !== "number") {
    return NextResponse.json(
      { error: "A name and a duration are required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }
  const facilityId = context.facilityId;

  const { data: created, error } = await supabase
    .from("grooming_services")
    .insert({
      ...serviceToRow(input),
      facility_id: facilityId,
    } as never)
    .select("id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to add services at this facility.",
      duplicate: "A service with that id already exists.",
    });
  }

  // Prices second, and NOT fatal if refused. `manage_services` and
  // `manage_rates` are separate keys, so "created the service, could not set
  // the prices" is a real and legitimate outcome — reporting it as a failed
  // creation would be a lie about a row that exists.
  const priceRows = sizePricesToRows(input.sizePricing);
  let pricesWritten = true;
  if (priceRows.length > 0) {
    const { error: priceError } = await supabase
      .from("grooming_service_size_prices")
      .insert(
        priceRows.map((p) => ({
          ...p,
          service_id: created.id,
          // Sent to satisfy NOT NULL; the trigger overwrites it with the
          // service's own facility. See 20260805100000.
          facility_id: facilityId,
        })) as never,
      );
    if (priceError) pricesWritten = false;
  }

  const { data: full } = await supabase
    .from("grooming_services")
    .select(SERVICE_SELECT)
    .eq("id", created.id)
    .single();

  return NextResponse.json(
    {
      service: rowToService(full as unknown as ServiceRow),
      pricesWritten,
    },
    { status: 201 },
  );
}
