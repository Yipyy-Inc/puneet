import { NextResponse } from "next/server";

import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { parseSizeTiers } from "@/lib/grooming/size-tier";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The grooming size bands of the facility the member of staff is working in —
// the bands `create_booking` prices by (`grooming_config.pet_size_tiers`), so
// the booking wizard quotes and times the size the booking will carry.
//
// Scoped to ONE facility: RLS admits every facility a person is a member of,
// and two businesses' bands merged would be nonsense
// (`check:facility-scoped-reads`). No row is no bands — what
// `create_booking` finds too.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("grooming_config")
    .select("pet_size_tiers")
    .match(inFacility(scope))
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    tiers: parseSizeTiers(
      (data as { pet_size_tiers?: unknown } | null)?.pet_size_tiers,
    ),
  });
}
