import { NextResponse } from "next/server";

import { appliesToService } from "@/lib/add-ons/availability";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";

// ============================================================================
// The facility's grooming add-ons: every live add-on of the one add-ons list
// (`service_add_ons`, 20260926223644) that applies to grooming — to all
// services, or to a grooming service by name.
//
// Both grooming booking screens offered `GROOMING_ADD_ONS` from a fixture —
// eight invented extras at invented prices — and an add-on the fixture named
// and the facility does not sell made the whole booking fail.
//
// Read from the table, by the add-on rules' own answer to "does this apply to
// grooming" (`appliesToService`). Until 2026-09-30 it read `grooming_add_ons`,
// a view that answered the same question in SQL, kept from the days when that
// name was a table of its own.
//
// The id is the legacy id when there is one, else the uuid — what a booking
// names an add-on by, and what the database accepts either of.
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
    .from("service_add_ons")
    .select(
      "id, legacy_id, name, price, duration_min, applies_to_all_services, service_refs",
    )
    .match(inFacility(scope))
    .eq("is_active", true)
    .is("archived_at", null)
    .order("display_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const options: GroomingAddOnOption[] = (data ?? [])
    .filter((row) =>
      appliesToService(
        {
          appliesToAllServices: row.applies_to_all_services,
          serviceRefs: row.service_refs ?? [],
        },
        "grooming",
      ),
    )
    .map((row) => ({
      id: row.legacy_id ?? row.id,
      name: row.name,
      price: Number(row.price),
      duration: row.duration_min,
    }));
  return NextResponse.json(options);
}
