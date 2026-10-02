import { NextResponse } from "next/server";

import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { parseOfferedClasses } from "@/lib/training/offered-classes";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The training classes of the facility a member of staff is working in, with
// the places left — the staff booking wizard's "Pick a class" (the client's
// mock, 2026-10-01).
//
// The same projection a customer reads (`offered_training_classes()`), so a
// receptionist and a client are shown one count — with the trainer's FULL
// name for staff, read from the classes themselves under their own RLS.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const scope = await activeFacilityIdForStaff();
  if (!scope) {
    return NextResponse.json({ error: "No facility." }, { status: 403 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("offered_training_classes", {
    p_facility_id: scope,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const classes = parseOfferedClasses(data);
  if (classes.length === 0) return NextResponse.json(classes);

  const { data: trainers } = await supabase
    .from("training_series")
    .select("id, staff ( first_name, last_name )")
    .match(inFacility(scope))
    .in(
      "id",
      classes.map((c) => c.id),
    );
  const nameOf = new Map(
    (
      (trainers ?? []) as unknown as Array<{
        id: string;
        staff: { first_name: string; last_name: string } | null;
      }>
    ).map((row) => [
      row.id,
      row.staff
        ? `${row.staff.first_name} ${row.staff.last_name}`.trim()
        : null,
    ]),
  );
  return NextResponse.json(
    classes.map((c) => ({ ...c, trainerName: nameOf.get(c.id) ?? null })),
  );
}
