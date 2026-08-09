import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  FACILITY_PROFILE_SELECT,
  businessProfileToRow,
  rowToBusinessProfile,
} from "@/lib/api/mappers/facility-profile";
import { businessProfileSchema } from "@/types/facility";
import type { Tables } from "@/types/database";

// ============================================================================
// A facility's own name, contact details and address.
//
// This is what the settings screen used to read out of `src/data/settings.ts`,
// where it was "PawCare Facility / contact@pawcare.com / +1 (555) 123-4567" for
// every facility on the platform — and, through the estimate pages, for every
// facility's CUSTOMERS.
//
// ── THE FACILITY COMES FROM THE SESSION ───────────────────────────────────
//
// `getFacilityContext()` reads it from the caller's membership. Never from the
// request: a body field would let a caller aim the permission check at a
// facility they hold `settings_general` for and write the row of one they do
// not. (`check:facility-from-session` fails the build on that shape.)
//
// ── AND RLS DECIDES, NOT THIS FILE ────────────────────────────────────────
//
// `facilities_update_own_profile` admits `settings_general`; the columns that
// must not move — org_id, slug, legacy_id, business_types — are pinned by
// `private.enforce_facility_profile_scope()`. Both live in
// 20260809120000. PostgREST is reachable directly with a session cookie, so
// this route is a convenience, not a gate.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facilities")
    .select(FACILITY_PROFILE_SELECT)
    .eq("id", context.facilityId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  return NextResponse.json(rowToBusinessProfile(data as Tables<"facilities">));
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  // `.partial()` because a screen may save one section at a time, and
  // `.strict()` because a field this does not know about is a mistake worth
  // surfacing rather than dropping in silence — the settings screen has
  // twenty-odd domains and only this one lives here yet.
  const parsed = businessProfileSchema
    .partial()
    .strict()
    .safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid profile." },
      { status: 422 },
    );
  }

  const patch = businessProfileToRow(parsed.data);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 422 });
  }

  // A business without a name is not a saved profile, it is a broken screen.
  if (patch.name !== undefined && !String(patch.name).trim()) {
    return NextResponse.json(
      { error: "A business name is required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("facilities")
    .update(patch as never)
    .eq("id", context.facilityId)
    .select(FACILITY_PROFILE_SELECT);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to edit this facility's details.",
      // `slug` is the only unique column a facility could collide on, and the
      // trigger pins it — so this is unreachable today and stays as the honest
      // answer if that ever changes.
      duplicate: "Another facility is already using that address.",
    });
  }

  // A refused UPDATE affects zero rows and returns success, so silence here
  // would report a save that did not happen — on the screen whose entire
  // purpose is showing a facility its own details.
  const denied = deniedIfUntouched(
    data,
    "Not allowed to edit this facility's details.",
  );
  if (denied) return denied;

  // The STORED row, not the request. The trigger silently restores protected
  // columns, so echoing the payload back would show a caller a slug change that
  // did not happen.
  return NextResponse.json(
    rowToBusinessProfile(data![0] as Tables<"facilities">),
  );
}
