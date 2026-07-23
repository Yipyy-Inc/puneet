// ============================================================================
// Care Log — shared types for the Guest Journal (per-reservation) and
// the Daily Care List (facility-wide). Both screens read/write the same
// underlying TaskExecution records, so a log entered in one appears in
// the other.
// ============================================================================

import type { MedAdminMethod, CustomLogType } from "@/types/boarding";

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
  | "ate_most"
  | "ate_some"
  | "ate_little"
  | "refused";

export type MedicationOutcome = "given" | "skipped" | "refused" | "vomited";

export type AddonOutcome =
  | "completed"
  | "partial"
  | "skipped"
  | "dog_refused"
  | "rescheduled";

export type CareOutcome = "completed" | "skipped" | "issue_reported";

// ── Health observation (raised from a log when a concern is noted) ──────────

export type HealthObservationType =
  | "limping"
  | "lethargy"
  | "abnormal_stool"
  | "vomiting"
  | "coughing"
  | "eye"
  | "ear"
  | "skin"
  | "other";

export type HealthObservationSeverity =
  | "monitoring"
  | "needs_attention"
  | "urgent";

/** A health concern captured alongside a care log. Also raises a pet flag
 *  (A4.3) and notifies the on-shift manager. */
export type HealthObservation = {
  type: HealthObservationType;
  severity: HealthObservationSeverity;
  notes?: string;
};

// ── Kennel cleaning detail (from the dedicated clean log) ───────────────────

export type CleaningType = "full" | "quick" | "spot";

/** Kennel-cleaning specifics captured by the clean log modal. The
 *  `conditionNote`, when present, feeds the maintenance log. */
export type CleaningDetail = {
  type: CleaningType;
  products?: string;
  conditionNote?: string;
};

// ── Add-on delivery detail (from the dedicated add-on log) ──────────────────

export type AddonGroupInteraction =
  | "thrived"
  | "good"
  | "needed_monitoring"
  | "separated";

export type AddonEnergyLevel = "high" | "normal" | "low" | "lethargic";

export type AddonIncidentSeverity = "minor" | "notable" | "serious";

/** How an add-on service was actually delivered. Play-session-only fields
 *  (group interaction, energy, incident) are present only for those services. */
export type AddonLogDetail = {
  actualMinutes?: number;
  deliveredByStaffId?: string;
  deliveredByName?: string;
  groupInteraction?: AddonGroupInteraction;
  energyLevel?: AddonEnergyLevel;
  incident?: { severity: AddonIncidentSeverity; note: string };
};

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
  /** Allergens to avoid for this pet (from guest allergy data). Rendered as a
   *  red "Avoid: …" line on every task row when non-empty. */
  avoidList?: string[];
  /** Per-pet care note that persists for the stay (from the guest record /
   *  check-in, A6.6). Surfaced as a sticky-note indicator on the row. */
  careNote?: string;
  /** Source step from FacilityDailyCareConfig, when applicable */
  sourceStepId?: string;
  /** In-stay care origin (2B): set when the task was auto-generated from an
   *  incident's care action or medication. Logging it writes back an incident
   *  careLog (2B.4). Exactly one of careActionId / medicationId is set. */
  sourceIncidentId?: string;
  careActionId?: string;
  medicationId?: string;
  /** Structured medication detail for the dedicated medication log modal —
   *  read-only, sourced from the booking. Present only on medication tasks. */
  medDetail?: {
    name: string;
    dosage: string;
    method: MedAdminMethod;
    timingNote?: string;
  };
  /** Structured add-on detail for the dedicated add-on log modal — read-only,
   *  from the booking. Present only on add-on tasks. */
  addonDetail?: {
    name: string;
    bookedMinutes: number;
    instructions?: string;
    isPlaySession: boolean;
  };
  /** For custom steps: the declared Log Type (A7.5) that drives the Custom log
   *  modal's minimal UI. Absent custom steps fall back to the enrichment log. */
  customLogType?: CustomLogType;
  /** Feeding tasks only: doses to give with this meal. Staff serve the food and
   *  give these in the same pass, so no separate medication task is emitted. */
  withMeds?: FeedingMedication[];
};

/** A medication dose the parent asked to be given WITH a meal, folded onto the
 *  feeding task by the scheduler. `taskId` is the id the dose would have had as
 *  a standalone medication task — the medication log is still written against
 *  it, so med history, photo proof and compliance reporting are unchanged. */
export type FeedingMedication = {
  medicationId: string;
  taskId: string;
  name: string;
  dosage: string;
  method: MedAdminMethod;
  /** The dose's own scheduled time, which may differ from the meal's. */
  scheduledTime: string;
  instructions?: string;
  requiresPhotoProof?: boolean;
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
  /** Full display name of the staff member (single-source current user).
   *  Optional for back-compat with legacy records that only carry initials. */
  staffName?: string;
  outcome: AnyOutcome | string;
  /** For feeding: time food was served (separate from outcome time) */
  servedAt?: string;
  notes?: string;
  /** Reason the task was missed/skipped, if applicable */
  missedReason?: string;
  /** First attached photo — kept for back-compat; new writes also set photoUrls. */
  photoUrl?: string;
  /** Up to 3 photos attached to the log (camera / library). */
  photoUrls?: string[];
  /** Health concern noted during this log — persisted with the record and
   *  mirrored to a pet flag (A4.3). */
  healthObservation?: HealthObservation;
  /** Kennel-cleaning specifics (type, products, maintenance condition note). */
  cleaning?: CleaningDetail;
  /** Optional volume noted on a water-refill log (e.g. "Full bowl", "1 L"). */
  waterVolume?: string;
  /** Add-on delivery specifics (actual duration, deliverer, play-session
   *  interaction/energy, incident). */
  addon?: AddonLogDetail;
  /** Enrichment / custom-care specifics (activity, duration, engagement). */
  enrichment?: EnrichmentDetail;
};

// ── Enrichment / custom-care detail (from the dedicated enrichment log) ─────

export type EngagementLevel = "high" | "normal" | "low";

export type EnrichmentDetail = {
  activityType?: string;
  durationMinutes?: number;
  engagement?: EngagementLevel;
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
