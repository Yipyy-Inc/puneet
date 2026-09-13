import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import type { SessionAttendance } from "@/lib/training-enrollment";

// ============================================================================
// A dog's training attendance (20260913100835 a_training_absence_is_recorded).
//
// training_attendance_history() returns one row per session booking of an
// enrolled dog that has ended or been recorded. It is mapped onto
// SessionAttendance — the shape of the `sessionAttendances` fixture every
// attendance screen already draws — so those screens read Postgres without
// being rewritten. `petId` is the dog's REF.
// ============================================================================

export interface TrainingAttendanceHistoryRow {
  booking_id: string;
  booking_ref: number;
  facility_id: string;
  timezone: string | null;
  session_id: string;
  session_number: number;
  session_start_at: string;
  session_end_at: string;
  series_id: string;
  enrollment_id: string;
  pet_ref: number;
  pet_name: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  mark: string | null;
  session_notes: string | null;
  recorded_at: string | null;
  updated_at: string | null;
}

/** The mark wins; then the times. A session that ended with nothing recorded
 *  is an absence — the dog was booked and nobody checked it in, which is what
 *  make-ups already count as missed. */
export function attendanceStatusOf(
  row: Pick<TrainingAttendanceHistoryRow, "mark" | "checked_in_at">,
): SessionAttendance["status"] {
  if (row.mark === "absent" || row.mark === "excused") return row.mark;
  if (row.checked_in_at) return row.mark === "late" ? "late" : "present";
  return "absent";
}

export function rowToSessionAttendance(
  row: TrainingAttendanceHistoryRow,
): SessionAttendance {
  const status = attendanceStatusOf(row);
  return {
    id: `att-${row.booking_id}`,
    enrollmentId: row.enrollment_id,
    sessionId: row.session_id,
    sessionNumber: row.session_number,
    // The facility's day: an evening class in Montréal is tomorrow in UTC.
    sessionDate: wallClockParts(
      row.session_start_at,
      row.timezone ?? DEFAULT_TIMEZONE,
    ).date,
    petId: Number(row.pet_ref),
    petName: row.pet_name,
    status,
    checkInTime: row.checked_in_at,
    checkOutTime: row.checked_out_at,
    trainerNotes: row.session_notes ?? "",
    homeworkUnlocked: status === "present" || status === "late",
    certificateGenerated: false,
    createdAt: row.recorded_at ?? row.session_end_at,
    updatedAt: row.updated_at ?? row.session_end_at,
  };
}
