/**
 * Training Enrollment and Attendance
 *
 * Defines structures for training enrollments, session attendance, and progress tracking
 */

/** Lifecycle of payment for a series enrollment. */
export type SeriesPaymentStatus =
  | "paid"
  | "deposit"
  | "unpaid"
  | "refunded"
  | "comped";

export interface TrainingEnrollment {
  id: string;
  seriesId: string;
  seriesName: string;
  courseTypeId: string;
  courseTypeName: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  handlerName?: string; // Person dropping off the pet
  enrollmentDate: string;
  status: "enrolled" | "completed" | "dropped" | "waitlisted";
  sessionsAttended: number;
  totalSessions: number;
  currentSessionNumber: number; // Next session to attend
  progress: number; // 0-100 percentage
  /** Payment lifecycle — drives the badge on the Students tab. */
  paymentStatus: SeriesPaymentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Per-exercise rating logged on an attendance record. 1 = needs work,
 *  5 = mastered. Optional inline note for context. */
export interface SessionExerciseRating {
  exerciseName: string;
  rating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

/** Outdoor / environment conditions captured at session-completion time.
 *  Carries forward as context on every attendance record from that session
 *  so a 3-star recall in pouring rain reads very differently from a 3-star
 *  recall on a still day. */
export type WeatherCondition =
  | "sunny"
  | "cloudy"
  | "rain"
  | "hot"
  | "cold"
  | "windy";

export type DistractionLevel = "low" | "medium" | "high";

export interface SessionConditions {
  /** Multi-select — multiple weather flags can apply at once (Hot + Windy). */
  weather: WeatherCondition[];
  /** Single tier describing how much the dog had to work through. */
  distractionLevel?: DistractionLevel;
}

export interface SessionAttendance {
  id: string;
  enrollmentId: string;
  sessionId: string;
  sessionNumber: number;
  sessionDate: string;
  petId: number;
  petName: string;
  status: "present" | "absent" | "late" | "excused";
  checkInTime: string | null;
  checkOutTime: string | null;
  trainerNotes: string;
  /** Exercises covered in this session with their per-exercise rating —
   *  feeds the "exercises covered" rows in the Training History tab. */
  exercises?: SessionExerciseRating[];
  /** Environment context for the session — surfaced on the History tab so
   *  the rating record carries its conditions next to it. */
  conditions?: SessionConditions;
  homeworkUnlocked: boolean;
  certificateGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingCertificate {
  id: string;
  enrollmentId: string;
  seriesId: string;
  courseTypeName: string;
  petId: number;
  petName: string;
  ownerId: number;
  ownerName: string;
  completionDate: string;
  issuedDate: string;
  certificateNumber: string;
  pdfUrl?: string;
  unlockedNextCourse?: string; // Course type ID that is now available
}

export interface TrainingHomework {
  id: string;
  enrollmentId: string;
  sessionNumber: number;
  sessionDate: string;
  title: string;
  description: string;
  instructions: string[];
  resources?: string[]; // URLs to videos, PDFs, etc.
  /** Short, human-readable cadence — "Daily, 5 minutes" / "3x per day".
   *  Surfaced as a chip on the Homework tab so owners know how often to
   *  practice without parsing the instructions. */
  frequency?: string;
  /** ISO date (YYYY-MM-DD) for the next practice session. Drives the
   *  Overdue / Due Soon / Active status on the standalone Homework board
   *  and the "due next" column. Cleared when homework is completed. */
  nextDueDate?: string | null;
  unlocked: boolean;
  unlockedDate: string | null;
  completed: boolean;
  completedDate: string | null;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  sessionsAttended: number,
  totalSessions: number,
): number {
  if (totalSessions === 0) return 0;
  return Math.round((sessionsAttended / totalSessions) * 100);
}

/**
 * Check if session is today
 */
export function isSessionToday(sessionDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const session = new Date(sessionDate);
  session.setHours(0, 0, 0, 0);
  return session.getTime() === today.getTime();
}

/**
 * Generate certificate number
 */
export function generateCertificateNumber(
  courseTypeId: string,
  petId: number,
  completionDate: string,
): string {
  const date = new Date(completionDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const courseCode = courseTypeId.substring(0, 3).toUpperCase();
  return `${courseCode}-${year}${month}-${String(petId).padStart(4, "0")}`;
}
