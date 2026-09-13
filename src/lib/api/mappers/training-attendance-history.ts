import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import type {
  DistractionLevel,
  SessionAttendance,
  SessionConditions,
  SessionExerciseRating,
  WeatherCondition,
} from "@/lib/training-enrollment";

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
  /** [{exerciseName, rating}] — 20260913104649. */
  exercises: unknown;
  /** {weather, distractionLevel} or null — 20260913112156. */
  conditions: unknown;
  /** A make-up seat, read under the missed series' enrollment. */
  makeup?: boolean | null;
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

/** Exercise ratings as the database keeps them — at most 50, each a name of 1
 *  to 200 characters and a whole rating from 1 to 5
 *  (training_exercise_ratings_are_valid, 20260913104649). Null when the value
 *  is not that, so a route can refuse it before the constraint does. */
export function parseExerciseRatings(
  value: unknown,
): SessionExerciseRating[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const ratings: SessionExerciseRating[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const { exerciseName, rating } = item as Record<string, unknown>;
    if (typeof exerciseName !== "string") return null;
    const name = exerciseName.trim();
    if (name.length < 1 || name.length > 200) return null;
    if (
      typeof rating !== "number" ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return null;
    }
    ratings.push({
      exerciseName: name,
      rating: rating as SessionExerciseRating["rating"],
    });
  }
  return ratings;
}

const WEATHER_CONDITIONS: readonly WeatherCondition[] = [
  "sunny",
  "cloudy",
  "rain",
  "hot",
  "cold",
  "windy",
];
const DISTRACTION_LEVELS: readonly DistractionLevel[] = [
  "low",
  "medium",
  "high",
];

/** Session conditions as the database keeps them — only `weather` (known
 *  flags, each once) and `distractionLevel` (low, medium or high)
 *  (training_session_conditions_are_valid). Null when the value is not that,
 *  so a route can refuse it before the constraint does. */
export function parseSessionConditions(
  value: unknown,
): SessionConditions | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some((k) => k !== "weather" && k !== "distractionLevel")
  ) {
    return null;
  }
  const weather = record.weather ?? [];
  if (!Array.isArray(weather)) return null;
  const flags: WeatherCondition[] = [];
  for (const flag of weather) {
    if (!WEATHER_CONDITIONS.includes(flag as WeatherCondition)) return null;
    if (!flags.includes(flag as WeatherCondition)) {
      flags.push(flag as WeatherCondition);
    }
  }
  const level = record.distractionLevel;
  if (
    level !== undefined &&
    !DISTRACTION_LEVELS.includes(level as DistractionLevel)
  ) {
    return null;
  }
  return level === undefined
    ? { weather: flags }
    : { weather: flags, distractionLevel: level as DistractionLevel };
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
    exercises: parseExerciseRatings(row.exercises) ?? [],
    conditions:
      row.conditions == null
        ? undefined
        : (parseSessionConditions(row.conditions) ?? undefined),
    ...(row.makeup ? { isMakeup: true } : {}),
    homeworkUnlocked: status === "present" || status === "late",
    certificateGenerated: false,
    createdAt: row.recorded_at ?? row.session_end_at,
    updatedAt: row.updated_at ?? row.session_end_at,
  };
}
