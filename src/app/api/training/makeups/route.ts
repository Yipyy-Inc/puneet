import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import {
  rowToMissedSession,
  type TrainingMissedSessionRow,
} from "@/lib/api/mappers/training-makeups";

// ============================================================================
// /api/training/makeups — missed training sessions, each with its make-up.
//
// GET  training_missed_sessions() — sessions a dog was booked into, that have
//      ended, and that it never checked in to — with what happened next.
//      Staff read the facility on screen (p_facility_id); an owner reads their
//      own dogs' (RLS, since activeFacilityIdForStaff() is null for them).
//
// It was the `sessionAttendances` fixture and a cache-only list of offers.
// Writes: /api/training/makeups/[bookingId].
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase.rpc("training_missed_sessions", {
    p_facility_id: scope ?? undefined,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data ?? []) as TrainingMissedSessionRow[]).map(rowToMissedSession),
  );
}
