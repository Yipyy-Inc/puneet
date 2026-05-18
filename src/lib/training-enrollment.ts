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

/** A training Report Card is a *cumulative* progress summary — distinct from
 *  the daycare/boarding/grooming `ReportCard` which is a single-session
 *  recap. Each card spans every session in the enrollment up to
 *  `throughSessionNumber`. Two kinds:
 *   - `"session"`: drafted after each session, summarizes everything through
 *     that session. Sent to the owner so they see progression.
 *   - `"series-completion"`: drafted when the enrollment finishes — a
 *     graduation-style wrap-up. */
export type TrainingReportCardKind = "session" | "series-completion";

/** The dog's current spot on Yipyy's overall training journey. Selected by
 *  the trainer when they write the overall assessment — distinct from the
 *  per-exercise `DifficultyLevel` tiers, which describe an exercise's place
 *  in the curriculum rather than the dog's own level. */
export type TrainingLevel =
  | "foundation"
  | "progressing"
  | "developing"
  | "proficient"
  | "excellent";

export interface TrainingReportCardExerciseSummary {
  /** Display name of the exercise (matches what was logged in the session). */
  name: string;
  /** Average rating across every session the exercise was logged in. */
  avgRating: number;
  /** How many session-ratings rolled up into the average. */
  ratingsCount: number;
}

/** Snapshot of a homework assignment included in the report card so the
 *  owner can see what to work on between sessions. Mirrors a stripped-down
 *  TrainingHomework — we keep our own copy so historic cards still read
 *  correctly even if the underlying homework is later edited or deleted. */
export interface TrainingReportCardHomework {
  id: string;
  title: string;
  frequency?: string;
}

/** Trainer-uploaded photo from the session. Reserved for the future
 *  session-photo-upload flow — cards seeded today carry an empty array. */
export interface TrainingReportCardPhoto {
  url: string;
  caption?: string;
  takenAt?: string;
}

export interface TrainingReportCard {
  id: string;
  petId: number;
  petName: string;
  /** Resolved at card-creation time so the trainer + customer card UIs can
   *  show the dog's avatar without a second pet lookup. */
  petImageUrl?: string;
  enrollmentId: string;
  seriesId: string;
  /** The series-instance name, e.g. "Basic Obedience — Saturday Morning". */
  seriesName: string;
  /** The catalog course-type name, e.g. "Basic Obedience". Distinct from
   *  `seriesName` so cards read cleanly: "Basic Obedience · Saturday Mornings". */
  courseName: string;
  /** Drives the title + which footer copy is rendered. */
  kind: TrainingReportCardKind;
  /** ISO date the card was drafted (= the session date that triggered it,
   *  or the series end date for series-completion cards). */
  date: string;
  /** Only set on `series-completion` cards — the bracketing date range that
   *  spans every session this graduation summary covers. Used to render
   *  "Mar 7 → Apr 11" in the header. */
  seriesStartDate?: string;
  seriesEndDate?: string;
  /** The latest session this card covers. For series-completion cards this
   *  equals `totalSessions`. */
  throughSessionNumber: number;
  totalSessions: number;
  sessionsAttended: number;
  attendanceBreakdown: {
    present: number;
    absent: number;
    late: number;
    excused: number;
  };
  /** Every exercise rated across the sessions this card covers — used as
   *  the source-of-truth "exercises covered" grid with star icons. */
  exercisesCovered: TrainingReportCardExerciseSummary[];
  /** Top 3 exercises by avg rating — a quick-scan subset. */
  topExercises: TrainingReportCardExerciseSummary[];
  /** Bottom 3 exercises by avg rating — the "needs work" panel. */
  needsWorkExercises: TrainingReportCardExerciseSummary[];
  /** Session-summary text pulled from the completion log (`trainerNotes`
   *  on the triggering attendance). For series-completion cards this is an
   *  aggregated wrap-up. Owner-facing — keep it readable. */
  sessionSummary: string;
  /** A short 2-3 sentence narrative auto-drafted from per-session trainer
   *  notes describing the progression arc — distinct from `sessionSummary`
   *  which is the literal text the trainer typed. */
  progressNarrative: string;
  /** Homework the trainer assigned alongside this report card so the owner
   *  sees what to work on between sessions. */
  assignedHomework: TrainingReportCardHomework[];
  /** Optional before/after photos from the session. Empty by default —
   *  reserved for the upcoming session-photo-upload flow. */
  photos: TrainingReportCardPhoto[];
  /** The trainer's 1-2 sentence overall assessment, paired with a Training
   *  Level badge. Editable by the trainer before sending. Surfaced
   *  prominently on both the trainer and customer views — the level badge
   *  is what gives owners a clear "where is my dog at" snapshot. */
  overallAssessment: string;
  /** Current spot on the training journey. Defaults to `progressing` for
   *  auto-drafted cards; the trainer adjusts before sending. */
  trainingLevel: TrainingLevel;
  /** Visual theme applied to the customer-facing card. Reuses the existing
   *  `ReportCardTheme` enum (`everyday | halloween | christmas | …`) so
   *  facility-wide theme rotations work the same across services. */
  theme: import("@/types/pet").ReportCardTheme;
  /** When set, the card is queued for delivery at this ISO timestamp.
   *  `sentToOwner` stays `false` until the schedule fires (or the trainer
   *  hits Send now). Mutually exclusive with a past `sentAt`. */
  scheduledSendAt: string | null;
  createdBy: string;
  createdById: number;
  createdAt: string;
  /** When true, the customer portal surfaces the card with a "New" badge
   *  until they open it. False = still a trainer-side draft. */
  sentToOwner: boolean;
  sentAt: string | null;
  /** ISO timestamp the owner opened the card on the customer portal —
   *  drives the engagement signal trainers see ("Owner viewed Mar 14"). */
  viewedByOwner: string | null;
}

/** A purchased training-package balance — distinct from `TrainingEnrollment`
 *  (which binds a pet to one specific series) and from the generic
 *  `CustomerPackagePurchase` (which has no per-pet binding). Used for the
 *  "Sessions Remaining" badge on the trainer profile + customer portal, and
 *  drives the auto-renewal reminder when the balance gets low. */
export interface ClientTrainingPackage {
  id: string;
  clientId: number;
  petId: number;
  petName: string;
  /** References `TrainingPackage.id` from the program catalog. */
  packageId: string;
  /** Snapshot of the catalog name so historic records stay correct even if
   *  the catalog entry is later renamed. */
  packageName: string;
  /** Class type at purchase time — drives the iconography (group vs private). */
  classType: "group" | "private";
  sessionsPurchased: number;
  sessionsUsed: number;
  purchaseDate: string;
  /** ISO date — past this point the remaining sessions are considered
   *  expired. Null = no expiry (rare; some lifetime memberships). */
  expiresAt: string | null;
  pricePaid: number;
  status: "active" | "expired" | "exhausted" | "refunded";
  /** ISO timestamp of the most recent renewal reminder. Used to throttle the
   *  auto-reminder so we don't email the owner every page load. */
  lastRenewalReminderAt: string | null;
  /** Optional staff note attached at purchase time. */
  notes?: string;
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

/** Rich media attached by the trainer — shown inline on the client portal so
 *  owners can watch a demo of the cue or see a reference photo instead of
 *  parsing the instructions. Trainers will eventually upload these from the
 *  Session Completion homework editor. */
export interface TrainingHomeworkMedia {
  url: string;
  type: "video" | "image";
  caption?: string;
}

/** A single "marked as done" event by the owner. We log the date the owner
 *  was practicing for (so trainers can see compliance per-day) plus the wall
 *  time of the click (so the trainer sees when the owner actually opened
 *  their portal). */
export interface HomeworkPracticeEntry {
  /** YYYY-MM-DD — the day the owner is reporting practice for. */
  date: string;
  /** ISO timestamp of the click — useful for "marked just now". */
  markedAt: string;
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
  /** Trainer-attached media — videos and reference images. Distinct from
   *  `resources` so we can render them inline on the portal instead of just
   *  linking out. */
  media?: TrainingHomeworkMedia[];
  /** Short, human-readable cadence — "Daily, 5 minutes" / "3x per day".
   *  Surfaced as a chip on the Homework tab so owners know how often to
   *  practice without parsing the instructions. */
  frequency?: string;
  /** ISO date (YYYY-MM-DD) for the next practice session. Drives the
   *  Overdue / Due Soon / Active status on the standalone Homework board
   *  and the "due next" column. Cleared when homework is completed. */
  nextDueDate?: string | null;
  /** Owner check-ins — one entry per day the owner clicked "Mark as Done"
   *  in their portal. Drives the practice streak / compliance signals the
   *  trainer sees on the standalone Homework board. */
  practiceLog?: HomeworkPracticeEntry[];
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
