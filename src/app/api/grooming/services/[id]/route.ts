import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deleteWasRefused, deniedIfUntouched } from "@/lib/api/rls-write";
import {
  SERVICE_SELECT,
  rowToService,
  serviceToRow,
  sizePricesToRows,
  type ServiceRow,
} from "@/lib/api/mappers/grooming";

// ============================================================================
// One service: edit it, retire it.
//
// ADDRESSED BY THE APP ID, which is `legacy_id` when the row has one and the
// uuid when it does not — the same rule the mapper applies on the way out, so a
// service created through this API is addressable immediately instead of
// needing a legacy id nothing mints.
//
// DELETE IS A REAL DELETE, and it is safe because appointments do not depend on
// it: grooming_appointments snapshots the name and price and its FK is
// `on delete set null` (20260805140000). Retiring a service therefore removes
// it from the menu without touching a single past sale. That is the whole
// reason the snapshot exists, and it is why this is not a soft delete.
// ============================================================================

export const dynamic = "force-dynamic";

/** Resolve the app id to a uuid through a read the caller must be able to make,
 *  so an unreadable service is a 404 rather than an RLS error further down. */
async function resolveService(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  appId: string,
): Promise<{ id: string; facilityId: string } | null> {
  const byLegacy = await supabase
    .from("grooming_services")
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
    .from("grooming_services")
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
  const input = (await request.json().catch(() => null)) as
    | (Record<string, unknown> & {
        sizePricing?: Record<string, number>;
        /** Which branch these sizePricing values are FOR, when set. Absent
         *  (or null) means the facility-wide price -- unchanged behaviour. */
        locationId?: string | null;
      })
    | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const resolved = await resolveService(supabase, id);
  if (!resolved) {
    return NextResponse.json(
      { error: "That service does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // The FK alone would not stop a location belonging to another facility
  // being written here -- checked explicitly, same as every other location
  // write this session, since there is no RLS on `locations` that could
  // refuse the value at the point it is merely used as an id.
  const locationId = input.locationId ?? null;
  if (locationId) {
    const { data: location } = await supabase
      .from("locations")
      .select("facility_id")
      .eq("id", locationId)
      .maybeSingle();
    if (!location || location.facility_id !== resolved.facilityId) {
      return NextResponse.json(
        { error: "That location doesn't belong to this business." },
        { status: 422 },
      );
    }
  }

  const patch = serviceToRow(input);
  if (Object.keys(patch).length > 0) {
    const { data: touched, error } = await supabase
      .from("grooming_services")
      .update(patch as never)
      .eq("id", resolved.id)
      .select("id");
    if (error) {
      return writeFailure(error, {
        denied: "Not allowed to edit services at this facility.",
        duplicate: "A service with that id already exists.",
      });
    }
    const denied = deniedIfUntouched(
      touched,
      "Not allowed to edit services at this facility.",
    );
    if (denied) return denied;
  }

  // Prices are REPLACED, not merged: the editor sends the whole size table,
  // and a merge would leave a tier the manager deleted still priced. Scoped
  // to ONE location (or the facility-wide row, when locationId is absent) --
  // editing one branch's prices must never touch another branch's, or the
  // facility-wide row every unset branch still falls back to.
  let pricesWritten = true;
  if (input.sizePricing !== undefined) {
    const rows = sizePricesToRows(input.sizePricing);
    const scope = supabase
      .from("grooming_service_size_prices")
      .select("service_id", { count: "exact", head: true })
      .eq("service_id", resolved.id);
    const { count: existingPrices } = await (locationId
      ? scope.eq("location_id", locationId)
      : scope.is("location_id", null));

    // rls-write-ok: the rows ARE counted first (`existingPrices` above) and the
    // delete DOES select them back — but `.select("service_id")` is applied to
    // the awaited ternary a few lines down rather than chained onto `.delete()`
    // here, which is the one shape the guard cannot follow.
    // `deleteWasRefused(existingPrices, clearedPrices)` below is exactly the
    // check it is asking for.
    const clear = supabase
      .from("grooming_service_size_prices")
      .delete()
      .eq("service_id", resolved.id);
    const { data: clearedPrices, error: delError } = await (
      locationId
        ? clear.eq("location_id", locationId)
        : clear.is("location_id", null)
    ).select("service_id");
    if (delError) {
      pricesWritten = false;
    } else if (deleteWasRefused(existingPrices, clearedPrices)) {
      // Refused. `pricesWritten: false` is how this route already tells the
      // caller the prices did not move, and the service patch above stands.
      pricesWritten = false;
    } else if (rows.length > 0) {
      const { error: insError } = await supabase
        .from("grooming_service_size_prices")
        .insert(
          rows.map((p) => ({
            ...p,
            service_id: resolved.id,
            facility_id: resolved.facilityId,
            location_id: locationId,
          })) as never,
        );
      if (insError) pricesWritten = false;
    }
  }

  const { data: full, error: readError } = await supabase
    .from("grooming_services")
    .select(SERVICE_SELECT)
    .eq("id", resolved.id)
    .single();

  if (readError || !full) {
    return NextResponse.json(
      { error: "Could not read that service back." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    service: rowToService(full as unknown as ServiceRow, { locationId }),
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
  const resolved = await resolveService(supabase, id);
  if (!resolved) {
    return NextResponse.json(
      { error: "That service does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data: removed, error } = await supabase
    .from("grooming_services")
    .delete()
    .eq("id", resolved.id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove services at this facility.",
      duplicate: "That service could not be removed.",
    });
  }
  const denied = deniedIfUntouched(
    removed,
    "Not allowed to remove services at this facility.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}
