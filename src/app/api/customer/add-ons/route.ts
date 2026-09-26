import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  ADD_ON_CATEGORY_SELECT,
  ADD_ON_SELECT,
  rowToAddOn,
  rowToAddOnCategory,
  type AddOnCategoryRow,
  type AddOnRow,
} from "@/lib/api/mappers/add-on";

// ============================================================================
// The add-ons a pet owner can book (20260926223644).
//
// THE FACILITY IS THE CLIENT'S OWN. `clients` is scoped by RLS to the caller's
// own rows, so the first one names their facility — never a query string, and
// never the staff helpers, which answer a customer with the DEMO facility
// (check:customer-routes). The table's policy then shows a client live add-ons
// only: an inactive or deleted one never leaves the database.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("facility_id")
    .limit(1)
    .maybeSingle();

  if (!client?.facility_id) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const [addOns, categories] = await Promise.all([
    supabase
      .from("service_add_ons")
      .select(ADD_ON_SELECT)
      .eq("facility_id", client.facility_id)
      .eq("is_active", true)
      .is("archived_at", null)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("service_add_on_categories")
      .select(ADD_ON_CATEGORY_SELECT)
      .eq("facility_id", client.facility_id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (addOns.error || categories.error) {
    return NextResponse.json(
      { error: (addOns.error ?? categories.error)?.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    addOns: (addOns.data as unknown as AddOnRow[]).map(rowToAddOn),
    categories: (categories.data as unknown as AddOnCategoryRow[]).map(
      rowToAddOnCategory,
    ),
  });
}
