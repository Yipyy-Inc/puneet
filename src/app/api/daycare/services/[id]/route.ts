import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfExpectedRowsSurvived } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  DAYCARE_SERVICE_SELECT,
  daycareServiceToRow,
  rowToDaycareService,
  type DaycareServiceInput,
  type DaycareServiceRow,
} from "@/lib/api/mappers/daycare-service";
import { writeBranchPrices } from "@/lib/api/daycare-service-prices";

// ============================================================================
// One daycare service: edit it, or take it off the menu.
//
// A PATCH sends only what changed. `daycareServiceToRow` builds the write key
// by key, so a request of `{ isActive: false }` does not wipe the eligibility
// a facility spent an afternoon on.
// ============================================================================

export const dynamic = "force-dynamic";

/** Resolve the app id to a uuid through a read the caller must be able to
 *  make, so an unreadable service is a 404 rather than an RLS error later. */
async function resolveService(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  appId: string,
): Promise<{ id: string; facilityId: string } | null> {
  const byLegacy = await supabase
    .from("daycare_services")
    .select("id, facility_id")
    .eq("legacy_id", appId)
    .maybeSingle();
  if (byLegacy.data) {
    return {
      id: byLegacy.data.id as string,
      facilityId: byLegacy.data.facility_id as string,
    };
  }

  // Not a legacy id — try it as a uuid. Guarded, because passing a non-uuid to
  // an `eq` on a uuid column is a 400 from PostgREST, not an empty result.
  if (!/^[0-9a-f-]{36}$/i.test(appId)) return null;

  const byId = await supabase
    .from("daycare_services")
    .select("id, facility_id")
    .eq("id", appId)
    .maybeSingle();
  if (!byId.data) return null;
  return {
    id: byId.data.id as string,
    facilityId: byId.data.facility_id as string,
  };
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
  const body = (await request.json().catch(() => null)) as
    | (DaycareServiceInput & { branchPrices?: Record<string, number> })
    | null;
  if (!body) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const service = await resolveService(supabase, id);
  if (!service) {
    return NextResponse.json({ error: "No such service." }, { status: 404 });
  }

  const patch = daycareServiceToRow(body);

  // A service pointing at itself would never settle at check-out. The table
  // refuses it too; this says so in words rather than as a constraint name.
  if (patch.rollover_to_service_id === service.id) {
    return NextResponse.json(
      { error: "A service cannot roll over into itself." },
      { status: 422 },
    );
  }

  let updated: DaycareServiceRow | null = null;
  if (Object.keys(patch).length > 0) {
    const { data, error } = await supabase
      .from("daycare_services")
      .update(patch)
      .eq("id", service.id)
      .select(DAYCARE_SERVICE_SELECT)
      .maybeSingle();

    if (error) {
      return writeFailure(error, {
        duplicate: "There is already a service with that name.",
        denied: "You do not have permission to edit this service.",
      });
    }
    // An UPDATE refused by RLS affects zero rows and returns SUCCESS, with no
    // error at all — which is why this second branch exists beside the first.
    if (!data) {
      return NextResponse.json(
        { error: "You do not have permission to edit this service." },
        { status: 403 },
      );
    }
    updated = data as unknown as DaycareServiceRow;
  }

  const pricesWritten = await writeBranchPrices(
    supabase,
    service.id,
    service.facilityId,
    body.branchPrices,
  );

  if (!updated) {
    const { data } = await supabase
      .from("daycare_services")
      .select(DAYCARE_SERVICE_SELECT)
      .eq("id", service.id)
      .maybeSingle();
    updated = data as unknown as DaycareServiceRow | null;
  }

  return NextResponse.json({
    service: updated ? rowToDaycareService(updated) : null,
    pricesWritten,
  });
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
  const service = await resolveService(supabase, id);
  if (!service) {
    return NextResponse.json({ error: "No such service." }, { status: 404 });
  }

  // Count first: a DELETE refused by RLS removes zero rows and reports
  // success, which is indistinguishable from one that had nothing to remove.
  const { count } = await supabase
    .from("daycare_services")
    .select("id", { count: "exact", head: true })
    .eq("id", service.id);

  const { data: removed, error } = await supabase
    .from("daycare_services")
    .delete()
    .eq("id", service.id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already a service with that name.",
      denied: "You do not have permission to remove this service.",
    });
  }

  const denied = deniedIfExpectedRowsSurvived(
    count,
    removed,
    "You do not have permission to remove this service.",
  );
  if (denied) return denied;

  return NextResponse.json({ removed: removed?.length ?? 0 });
}
