import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  hrConfigToRow,
  rowToStaffHrConfig,
} from "@/lib/api/mappers/staff-onboarding";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { StaffHrConfig } from "@/data/staff-onboarding";

// ============================================================================
// The facility's staff & HR config — one row, keyed by the facility itself.
//
// GET returns 404 rather than inventing defaults when no row exists. The
// defaults live in src/data/staff-onboarding.ts (seedConfig) and belong to the
// client, which already has them; synthesising a second copy here would give
// the app two sources for the same values and no way to tell which it got.
//
// PUT rather than PATCH, and an UPSERT rather than an insert-or-update dance:
// there is exactly one row per facility and the settings screen edits it whole,
// so "create if absent" is not a separate operation — it is what saving means
// for a row whose primary key is the facility.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("staff_hr_config")
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "This facility has no HR config yet." },
      { status: 404 },
    );
  }
  return NextResponse.json(rowToStaffHrConfig(data));
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as Partial<StaffHrConfig>;
  const supabase = await createServerClient();
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // Merged onto the stored row rather than replacing it: the screen saves one
  // section at a time, and a PUT of just the clock-in toggles must not reset
  // the notification triggers to their column defaults.
  const { data: existing } = await supabase
    .from("staff_hr_config")
    .select("*")
    .eq("facility_id", facility.facilityId)
    .maybeSingle();

  const merged = existing
    ? { ...rowToStaffHrConfig(existing), ...input }
    : input;

  const { data: saved, error } = await supabase
    .from("staff_hr_config")
    .upsert(hrConfigToRow(merged, facility.facilityId) as never, {
      onConflict: "facility_id",
    })
    .select("*")
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this facility's HR settings.",
      duplicate: "",
    });
  }

  return NextResponse.json(rowToStaffHrConfig(saved));
}
