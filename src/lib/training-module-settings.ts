/**
 * Training Module Settings — the configuration the facility owner manages
 * from Settings → Training. Covers everything that's currently scattered
 * across hardcoded constants in the page code (`AUTO_REPORT_CARD_ENABLED`,
 * `FACILITY_ALLOWS_DROPINS`) plus a handful of new fields the spec
 * explicitly calls out.
 *
 * The settings UI writes locally on save (toast confirmation only for the
 * mock); a follow-up refactor will rewire the page-level constants to read
 * from this catalog so changes propagate end-to-end.
 */
import type { MilestoneKind } from "@/lib/pet-milestones";

/** Physical training room or outdoor area — distinct from a facility
 *  `Location` (which represents a whole branch). One facility can have many
 *  rooms: "Training Room A", "Outdoor Field", "Indoor Arena", etc. */
export interface TrainingLocation {
  id: string;
  name: string;
  type: "indoor" | "outdoor";
  /** Optional max occupancy hint surfaced as "max N dogs" when set. */
  capacity?: number;
  isActive: boolean;
}

/** How the facility wants new training report cards delivered to owners. */
export type ReportCardSendMode =
  | "immediate" // Sent the moment the session completion saves.
  | "after_review" // Sits as a draft until the trainer manually sends.
  | "scheduled_batch"; // Auto-sent in a daily batch (mock: end of day).

/** Granular event-level toggles for owner-facing notifications. */
export interface TrainingNotificationToggles {
  emailEnabled: boolean;
  smsEnabled: boolean;
  /** Send a reminder this many hours before each upcoming session. */
  reminderLeadHours: number;
  /** Notify the owner when fresh homework is assigned. */
  homeworkAssigned: boolean;
  /** Notify the owner when a new report card is sent. */
  reportCardSent: boolean;
  /** Notify the owner when a series session is cancelled. */
  seriesCancelled: boolean;
}

export interface TrainingModuleSettings {
  /** Master switch — when off, the entire Training module is hidden from
   *  the customer portal and the facility's left-nav. */
  enabled: boolean;
  /** When true, customers see the Training section in their portal and can
   *  browse the catalog. When false, training is staff-only. */
  visibleToCustomers: boolean;

  /** Physical training rooms / outdoor areas. */
  locations: TrainingLocation[];

  /** Default session length when creating new series. */
  defaultSessionDurationMinutes: number;
  /** Default group-class size when creating new series. */
  defaultClassSize: number;

  /** Allow customers to enroll online (vs. staff-only enrollment). */
  allowOnlineEnrollment: boolean;
  /** Facility-wide drop-in toggle (each series can still opt out via
   *  `enrollmentRules.allowDropIns`; this gates the whole capability). */
  allowDropIns: boolean;
  /** Default cap on drop-in bookings per session — used as the prefill on
   *  the Create Series modal. Series can override per-instance. */
  defaultDropInMaxPerSession: number;
  /** Default per-session drop-in price — used as the prefill on the Create
   *  Series modal. Series can override per-instance. */
  defaultDropInPrice: number;
  /** When true, customers must complete an evaluation before they can
   *  enroll in advanced programs. */
  requireEvaluationBeforeEnrollment: boolean;
  /** Message sent to new students when they enroll. Used in the
   *  enrollment-confirmation email + toast. */
  defaultEnrollmentMessage: string;

  /** Per-waiver "required" override. Key = waiver id (from
   *  `defaultTrainingWaivers`); value = the facility's policy. Unlisted
   *  waivers fall back to the catalog's own `required` flag. */
  waiverRequiredOverrides: Record<string, boolean>;

  /** Whether the session-completion flow auto-drafts a report card. */
  autoCreateReportCardOnSessionComplete: boolean;
  /** When to deliver fresh report cards to owners. */
  reportCardSendMode: ReportCardSendMode;

  /** When true, owners must attach a video before the "Mark as Done" button
   *  activates on their portal. Defaults off so existing facilities aren't
   *  surprised by stricter behavior — each facility opts in. */
  requireVideoForHomeworkSubmission: boolean;

  /** How long a waitlist Offer Spot invitation holds before auto-moving the
   *  spot to the next person on the list. The half-window mark fires a
   *  reminder. Spec calls for a 24-hour default. */
  waitlistHoldHours: number;

  /** When on, the system auto-sends a follow-up message N days after the
   *  graduation card lands if the owner hasn't enrolled in the
   *  recommended next program. Off = no follow-up regardless of timing. */
  graduationFollowUpEnabled: boolean;
  /** How many days after the graduation card sends to fire the follow-up.
   *  Default 3 per the spec; minimum 1, maximum 30. */
  graduationFollowUpDays: number;
  /** Template body used for the follow-up message. The runtime substitutes
   *  `{petName}` and `{programName}` placeholders. */
  graduationFollowUpTemplate: string;

  notifications: TrainingNotificationToggles;

  /** Per-milestone notification opt-outs. Key = milestone kind; `true` means
   *  the customer gets a portal notification (and optional email) when the
   *  milestone unlocks. Unset keys fall back to "on" — the default is to
   *  notify on every milestone unless staff explicitly turn one off. */
  milestoneNotifications: Partial<Record<MilestoneKind, boolean>>;
}

export const defaultTrainingModuleSettings: TrainingModuleSettings = {
  enabled: true,
  visibleToCustomers: true,
  locations: [
    {
      id: "loc-room-a",
      name: "Training Room A",
      type: "indoor",
      capacity: 8,
      isActive: true,
    },
    {
      id: "loc-room-b",
      name: "Training Room B",
      type: "indoor",
      capacity: 6,
      isActive: true,
    },
    {
      id: "loc-arena",
      name: "Indoor Arena",
      type: "indoor",
      capacity: 12,
      isActive: true,
    },
    {
      id: "loc-outdoor",
      name: "Outdoor Training Area",
      type: "outdoor",
      capacity: 10,
      isActive: true,
    },
    {
      id: "loc-agility",
      name: "Agility Course",
      type: "outdoor",
      capacity: 6,
      isActive: true,
    },
  ],
  defaultSessionDurationMinutes: 60,
  defaultClassSize: 8,
  allowOnlineEnrollment: true,
  allowDropIns: true,
  defaultDropInMaxPerSession: 3,
  defaultDropInPrice: 40,
  requireEvaluationBeforeEnrollment: false,
  defaultEnrollmentMessage:
    "Welcome! We can't wait to meet your dog. Please arrive 10 minutes early on the first day with your dog on a 6-foot leash, treats, and proof of vaccinations.",
  waiverRequiredOverrides: {},
  autoCreateReportCardOnSessionComplete: true,
  reportCardSendMode: "after_review",
  requireVideoForHomeworkSubmission: false,
  waitlistHoldHours: 24,
  graduationFollowUpEnabled: true,
  graduationFollowUpDays: 3,
  graduationFollowUpTemplate:
    "{petName} has graduated — have you seen the upcoming {programName} classes? Tap below to enroll.",
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    reminderLeadHours: 24,
    homeworkAssigned: true,
    reportCardSent: true,
    seriesCancelled: true,
  },
  // Default to notifying on every milestone — staff opt out individually.
  // Empty object means "all on" via the fallback rule in
  // `isMilestoneNotificationEnabled`.
  milestoneNotifications: {},
};

/** Resolve the notification policy for a single milestone kind. Returns true
 *  when the customer should receive a notification — unset keys fall back to
 *  the spec's default ("notify on every milestone"). */
export function isMilestoneNotificationEnabled(
  settings: TrainingModuleSettings,
  kind: MilestoneKind,
): boolean {
  const explicit = settings.milestoneNotifications[kind];
  return explicit === undefined ? true : explicit;
}

export const DURATION_OPTIONS: readonly number[] = [
  30, 45, 60, 90, 120,
] as const;

export const REPORT_CARD_SEND_MODE_LABELS: Record<ReportCardSendMode, string> =
  {
    immediate: "Send immediately",
    after_review: "Hold as draft for instructor review",
    scheduled_batch: "Send in a daily batch",
  };

export const REPORT_CARD_SEND_MODE_HELP: Record<ReportCardSendMode, string> = {
  immediate:
    "The owner gets the report card the moment the session completion saves.",
  after_review:
    "Reports stay as drafts until an instructor reviews + clicks Send. Recommended for new trainers.",
  scheduled_batch:
    "All completed cards from the day go out together at the end of business hours.",
};
