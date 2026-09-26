import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { writeAddOnOverrides } from "@/lib/api/add-on-overrides";
import {
  ADD_ON_SELECT,
  addOnInputToRow,
  rowToAddOn,
  type AddOnRow,
} from "@/lib/api/mappers/add-on";
import { addOnInputSchema } from "@/types/add-on";

// ============================================================================
// Change an add-on, or delete it (20260926230000).
//
// ── DELETE ARCHIVES ─────────────────────────────────────────────────────────
//
// Bookings, pre-arrival forms and service defaults written before the one list
// name an add-on by id and carry nothing else — no name, no price. Removing the
// row would leave them pointing at nothing. So a delete stamps `archived_at`:
// the add-on leaves the list, the grooming view and anything new, and the
// bookings that used it still resolve.
// ============================================================================

export const dynamic = "force-dynamic";

/** An add-on's id here is always its uuid, and a non-uuid on a uuid column is
 *  a 400 from PostgREST rather than an empty result — so refuse it as a 404. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "No such add-on." }, { status: 404 });
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
  const patch = addOnInputToRow(input);
  if (Object.keys(patch).length === 0 && input.overrides === undefined) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  const supabase = await createServerClient();

  // No facility in the write: RLS scopes it to what this member may touch.
  // An UPDATE with no columns still has to prove the row is writable before
  // the overrides are replaced, so it touches `updated_at` instead.
  const { data, error } = await supabase
    .from("service_add_ons")
    .update(
      Object.keys(patch).length > 0
        ? patch
        : { updated_at: new Date().toISOString() },
    )
    .eq("id", id)
    .is("archived_at", null)
    .select(ADD_ON_SELECT + ", facility_id")
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already an add-on with that id.",
      denied: "You do not have permission to change this add-on.",
    });
  }
  // An UPDATE refused by RLS touches zero rows and reports success.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to change this add-on." },
      { status: 403 },
    );
  }

  let updated = data as unknown as AddOnRow & { facility_id: string };
  const overridesWritten = await writeAddOnOverrides(
    supabase,
    updated.id,
    updated.facility_id,
    input.overrides,
  );

  if (input.overrides !== undefined) {
    const { data: reread } = await supabase
      .from("service_add_ons")
      .select(ADD_ON_SELECT + ", facility_id")
      .eq("id", updated.id)
      .maybeSingle();
    if (reread) {
      updated = reread as unknown as AddOnRow & { facility_id: string };
    }
  }

  return NextResponse.json({ addOn: rowToAddOn(updated), overridesWritten });
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
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "No such add-on." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("service_add_ons")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already an add-on with that id.",
      denied: "You do not have permission to delete this add-on.",
    });
  }
  // Refused by RLS, or already deleted: either way nothing was archived.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to delete this add-on." },
      { status: 403 },
    );
  }

  return NextResponse.json({ archived: 1 });
}
