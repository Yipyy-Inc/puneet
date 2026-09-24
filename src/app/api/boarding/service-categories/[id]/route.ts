import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfExpectedRowsSurvived } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// Rename a boarding category, or take it off the menu.
//
// ── WHY THESE EXIST ───────────────────────────────────────────────────────
//
// The collection route shipped GET and POST only, so a facility could create a
// category and then live with it forever — a typo was permanent. Client
// feedback, 2026-09-24, on the same pass that gave the field a create button.
//
// No migration was needed: `boarding_service_categories_write` is already
// `for all` to authenticated under `manage_services`, so UPDATE and DELETE were
// permitted by the database the whole time. Only the HTTP verbs were missing.
//
// ── DELETING A CATEGORY DOES NOT DELETE ITS SERVICES ──────────────────────
//
// `boarding_services.category_id` is `on delete set null`, so the services in a
// removed category fall to the ungrouped section and keep their price, their
// eligibility and their bookings. That is the whole reason this is safe to
// offer next to a rename rather than behind a settings page.
// ============================================================================

export const dynamic = "force-dynamic";

/** Categories carry no `legacy_id`, so the id is always a uuid — and passing a
 *  non-uuid to an `eq` on a uuid column is a 400 from PostgREST, not an empty
 *  result. Refuse it here and answer 404 like any other unknown row. */
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
    return NextResponse.json({ error: "No such category." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    displayOrder?: number;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  // Built key by key, so a reorder does not blank the name and a rename does
  // not reset the order.
  const patch: { name?: string; display_order?: number } = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json(
        { error: "A category needs a name." },
        { status: 422 },
      );
    }
    patch.name = name.slice(0, 200);
  }
  if (body.displayOrder !== undefined) {
    patch.display_order = Math.round(Number(body.displayOrder));
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  // No facility in the write. RLS scopes it to what this staff member may
  // touch, which is the same reason the collection route takes the facility
  // from the session rather than the request.
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("boarding_service_categories")
    .update(patch)
    .eq("id", id)
    .select("id, name, display_order")
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already a category with that name.",
      denied: "You do not have permission to rename this category.",
    });
  }
  // An UPDATE refused by RLS touches zero rows and reports SUCCESS with no
  // error — indistinguishable from a row that is not there.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to rename this category." },
      { status: 403 },
    );
  }

  const row = data as unknown as {
    id: string;
    name: string;
    display_order: number;
  };
  return NextResponse.json({
    id: row.id,
    name: row.name,
    displayOrder: row.display_order,
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
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "No such category." }, { status: 404 });
  }

  const supabase = await createServerClient();

  // Count first: a DELETE refused by RLS removes zero rows and reports
  // success, which is indistinguishable from one that had nothing to remove.
  const { count } = await supabase
    .from("boarding_service_categories")
    .select("id", { count: "exact", head: true })
    .eq("id", id);

  const { data: removed, error } = await supabase
    .from("boarding_service_categories")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      // Unreachable for a DELETE — 23505 is a unique violation and removing a
      // row cannot raise one. It is here because the shared helper asks for
      // both, and the services route beside this one does the same.
      duplicate: "There is already a category with that name.",
      denied: "You do not have permission to remove this category.",
    });
  }

  const denied = deniedIfExpectedRowsSurvived(
    count,
    removed,
    "You do not have permission to remove this category.",
  );
  if (denied) return denied;

  return NextResponse.json({ removed: removed?.length ?? 0 });
}
