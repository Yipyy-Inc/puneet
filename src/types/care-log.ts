// ============================================================================
// Care Log — shared types for the Guest Journal (per-reservation) and
// the Daily Care List (facility-wide). Both screens read/write the same
// underlying TaskExecution records, so a log entered in one appears in
// the other.
// ============================================================================

export type ShiftType = "morning" | "afternoon" | "evening";

export type CareTaskType =
  | "potty"
  | "feeding"
  | "medication"
  | "addon"
  | "care";

export type CareSubType =
  | "water_refill"
  | "kennel_clean"
  | "bedding_change"
  | "monitoring"
  | "heat_tracking";

// ── Outcome enums ───────────────────────────────────────────────────────────

export type PottyOutcome =
  | "pee"
  | "poop"
  | "both"
  | "nothing"
  | "diarrhea"
  | "soft_stool"
  | "vomit_noticed";

export type FeedingOutcome =
  | "ate_all"
  | "ate_half"
  | "refused"
  | "vomited_after"
  | "slow_eater";

export type MedicationOutcome =
  | "administered"
  | "refused"
  | "spit_out"
  | "delayed"
  | "missed";

export type AddonOutcome =
  | "completed"
  | "partial"
  | "skipped"
  | "dog_refused"
  | "rescheduled";

export type CareOutcome = "completed" | "skipped" | "issue_reported";

export type AnyOutcome =
  | PottyOutcome
  | FeedingOutcome
  | MedicationOutcome
  | AddonOutcome
  | CareOutcome;

// ── Scheduled task (derived from facility config + reservation data) ────────

export type ScheduledTask = {
  id: string;
  guestId: string;
  bookingId?: string;
  petName: string;
  petPhotoUrl?: string;
  kennelName: string;
  packageType?: string;
  taskType: CareTaskType;
  subType?: string;
  scheduledTime: string; // "HH:MM"
  shift: ShiftType;
  details: string;
  subDetails?: string[];
  requiresPhotoProof?: boolean;
  frequencyNote?: string;
  behaviorTags: string[];
  alertTags: string[];
  /** Source step from FacilityDailyCareConfig, when applicable */
  sourceStepId?: string;
};

// ── Task execution (the log record itself) ──────────────────────────────────

export type TaskExecution = {
  id: string;
  taskId: string;
  guestId: string;
  bookingId?: string;
  taskType: CareTaskType;
  /** ISO date "YYYY-MM-DD" — calendar day this log belongs to */
  date: string;
  /** "HH:MM" — time within that day */
  executedAt: string;
  staffInitials: string;
  outcome: AnyOutcome | string;
  /** For feeding: time food was served (separate from outcome time) */
  servedAt?: string;
  notes?: string;
  /** Reason the task was missed/skipped, if applicable */
  missedReason?: string;
  /** Photo proof URL (e.g. for medications that require it) */
  photoUrl?: string;
};

// ── Alerts surfaced to the manager ──────────────────────────────────────────

export type GuestAlert = {
  id: string;
  guestId: string;
  petName: string;
  kennelName: string;
  severity: "warning" | "critical";
  message: string;
  time: string;
};

// ── Modal state for logging a task ──────────────────────────────────────────

export type LogModalState = {
  open: boolean;
  task: ScheduledTask | null;
  /** Two-step flow for feeding: serve first, outcome later */
  feedingStep: "serve" | "outcome" | null;
};
