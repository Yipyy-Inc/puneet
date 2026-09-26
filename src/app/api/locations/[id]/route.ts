import { forgettingIdentities } from "@/lib/auth/identity-cache";
import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import {
  LOCATION_SELECT,
  locationPatchSchema,
  locationPatchToUpdate,
  rowToLocation,
  type LocationRow,
} from "@/lib/api/mappers/location";

// ============================================================================
// One branch: edit it, or close it.
//
// ── NO FACILITY FILTER, DELIBERATELY ──────────────────────────────────────
//
// Neither handler checks that the id belongs to the caller's facility.
// `locations_update` and `locations_delete` both require
// `private.has_permission(facility_id, 'manage_services')`, so naming another
// business's location touches zero rows — which `deniedIfUntouched` turns into
// the 403 it actually was. Adding a filter here would be a second opinion that
// drifts from the policy, and the policy is the one that is enforced.
//
// ── AND A REFUSED UPDATE DOES NOT RAISE ───────────────────────────────────
//
// An UPDATE that fails a `using` policy affects zero rows and PostgREST returns
// success. Without the `.select()` below there is nothing to count, and the
// screen would say "Location saved" over a row that never changed. See
// lib/api/rls-write.ts; `check:rls-writes` fails the build on a write that
// cannot tell a refusal from a no-op.
// ============================================================================

export const dynamic = "force-dynamic";

export async function PATCH(...args: Parameters<typeof handlePATCH>) {
  return forgettingIdentities(() => handlePATCH(...args));
}

async function handlePATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const parsed = locationPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not a location.", detail: parsed.error.issues },
      { status: 422 },
    );
  }

  const update = locationPatchToUpdate(parsed.data);
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("locations")
    .update(update)
    .eq("id", id)
    .select(LOCATION_SELECT);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Another location already uses that short code." },
        { status: 409 },
      );
    }
    // 23001 is `restrict_violation`, raised by
    // `private.locations_single_primary` when the last primary would be
    // cleared. The message it carries is written for a person, so send it.
    if (error.code === "23001") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const denied = deniedIfUntouched(
    data,
    "You do not have permission to change this location.",
  );
  if (denied) return denied;

  // The count is no longer embedded in the row (see LOCATION_SELECT), so it is
  // fetched for this branch rather than defaulted. Defaulting would put
  // `bookingCount: 0` on a branch that has bookings — nothing reads it on this
  // path today, because the mutation invalidates and refetches the list rather
  // than patching the cache from this response, and the delete guard that
  // matters is the 409 the DATABASE raises. A number that is wrong only while
  // nobody looks is still wrong, and this is one RPC on a write.
  // This route has no facility context — it scopes by RLS on the id alone — so
  // the count is asked for this ONE branch rather than through
  // `location_booking_counts`, which takes a facility. `head: true` returns the
  // number without the rows. It is not the shape that was slow: what cost
  // 1.6-2.2 s was PostgREST evaluating a count EMBED per location inside a
  // joined select, not a standalone count of one.
  const row = (data as unknown as LocationRow[])[0];
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("location_id", row.id);

  return NextResponse.json(rowToLocation(row, { [row.id]: count ?? 0 }));
}

export async function DELETE(...args: Parameters<typeof handleDELETE>) {
  return forgettingIdentities(() => handleDELETE(...args));
}

async function handleDELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("locations")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    // 23001 is `private.guard_location_delete`: the branch has bookings against
    // it, or it is the primary while others exist. Both messages are written to
    // be read by the person who clicked, and both carry a HINT naming the thing
    // to do instead — so they are forwarded rather than flattened to "failed".
    if (error.code === "23001") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const denied = deniedIfUntouched(
    data,
    "You do not have permission to remove this location.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}
