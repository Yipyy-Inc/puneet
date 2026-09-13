import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import {
  rowToSessionAttendance,
  type TrainingAttendanceHistoryRow,
} from "@/lib/api/mappers/training-attendance-history";

// ============================================================================
// /api/training/attendance/history — every training session a dog was booked
// into that has ended or been recorded: present, late, absent or excused.
//
// GET  training_attendance_history(). Staff read the facility on screen
//      (p_facility_id); an owner reads their own dogs' (RLS). `?petRef=`
//      narrows to one dog.
//
// It was `sessionAttendances`, a fixture. Writes: POST /api/training/attendance.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("petRef");
  const petRef = raw === null ? undefined : Number(raw);
  if (petRef !== undefined && !Number.isSafeInteger(petRef)) {
    return NextResponse.json(
      { error: "That is not a pet reference." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase.rpc("training_attendance_history", {
    p_facility_id: scope ?? undefined,
    p_pet_ref: petRef,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data ?? []) as TrainingAttendanceHistoryRow[]).map(
      rowToSessionAttendance,
    ),
  );
}
