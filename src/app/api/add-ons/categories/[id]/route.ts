import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfExpectedRowsSurvived } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  ADD_ON_CATEGORY_SELECT,
  rowToAddOnCategory,
  type AddOnCategoryRow,
} from "@/lib/api/mappers/add-on";

// ============================================================================
// Rename an add-on category, or delete it (20260926223644).
//
// Deleting a category does NOT delete its add-ons: `service_add_ons.category_id`
// is `on delete set null` (service-add-ons A2), so they move to Uncategorized
// and keep their price, their services and their bookings.
// ============================================================================

export const dynamic = "force-dynamic";

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
    patch.name = name.slice(0, 80);
  }
  if (body.displayOrder !== undefined) {
    patch.display_order = Math.round(Number(body.displayOrder)) || 0;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("service_add_on_categories")
    .update(patch)
    .eq("id", id)
    .select(ADD_ON_CATEGORY_SELECT)
    .maybeSingle();

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already a category with that name.",
      denied: "You do not have permission to rename this category.",
    });
  }
  // An UPDATE refused by RLS touches zero rows and reports success.
  if (!data) {
    return NextResponse.json(
      { error: "You do not have permission to rename this category." },
      { status: 403 },
    );
  }

  return NextResponse.json(
    rowToAddOnCategory(data as unknown as AddOnCategoryRow),
  );
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
    .from("service_add_on_categories")
    .select("id", { count: "exact", head: true })
    .eq("id", id);

  const { data: removed, error } = await supabase
    .from("service_add_on_categories")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      duplicate: "There is already a category with that name.",
      denied: "You do not have permission to delete this category.",
    });
  }

  const denied = deniedIfExpectedRowsSurvived(
    count,
    removed,
    "You do not have permission to delete this category.",
  );
  if (denied) return denied;

  return NextResponse.json({ removed: removed?.length ?? 0 });
}
