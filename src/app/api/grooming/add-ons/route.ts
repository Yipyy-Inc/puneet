import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";

// ============================================================================
// The facility's grooming add-ons, from `grooming_add_ons`.
//
// Both grooming booking screens offered `GROOMING_ADD_ONS` from
// `@/data/grooming-add-ons` — eight invented extras at invented prices. The
// booking RPC resolves add-ons against THIS table by legacy id, so an add-on
// the fixture named and the facility does not sell made the whole booking
// fail with "This facility has 0 of the 1 grooming add-ons requested."
//
// The id is the legacy id when there is one, else the uuid — the rule every
// catalogue route uses, and what `create_booking` accepts for either.
// ============================================================================

export const dynamic = "force-dynamic";

export interface GroomingAddOnOption {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("grooming_add_ons")
    .select(
      "id, legacy_id, name, price, duration_min, is_active, display_order",
    )
    .match(inFacility(scope))
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const options: GroomingAddOnOption[] = (data ?? []).map((row) => ({
    id: row.legacy_id ?? row.id,
    name: row.name,
    price: Number(row.price),
    duration: row.duration_min ?? 0,
  }));
  return NextResponse.json(options);
}
