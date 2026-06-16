// ============================================================================
// Reputation Booster — Type Definitions
// ============================================================================

export type ReputationRating = 1 | 2 | 3 | 4 | 5;

export type ReputationChannel = "sms" | "email";

export type ReputationPublicPlatform =
  | "google"
  | "facebook"
  | "yelp"
  | "nextdoor"
  | "tripadvisor";

export type ReputationRequestStatus =
  | "not_sent"
  | "scheduled"
  | "sent"
  | "reminder_sent"
  | "rating_received"
  | "public_push_sent"
  | "escalated"
  | "closed";

export type ReputationDelay =
  | "immediate"
  | "30min"
  | "1hour"
  | "3hours"
  | "24hours"
  | "custom";

export type ReputationNotifyOn =
  | "all"
  | "under_3_stars"
  | "5_stars_only"
  | "mention_only";

// ─── Trigger ─────────────────────────────────────────────────────────────────

export interface ReputationTriggerConfig {
  event: string; // "boarding_checkout" | "daycare_checkout" | … | custom slug
  label: string;
  enabled: boolean;
  serviceType: "core" | "custom";
}

// ─── Platform link ───────────────────────────────────────────────────────────

export interface ReputationPlatformConfig {
  enabled: boolean;
  url: string;
  reviewCount?: number;
  avgRating?: number;
  /** Relative display weight (%) used when channel weighting is on. */
  weight?: number;
}

// ─── Outreach sequence (multi-step) ──────────────────────────────────────────

export interface ReputationSequenceStep {
  id: string;
  channel: ReputationChannel;
  /** Minutes after checkout (T0) this step fires. */
  delayMinutes: number;
  /** Backup step — fires only if the client still hasn't responded. */
  onlyIfNoResponse: boolean;
  /** Authored content (kept per channel so switching medium is non-destructive). */
  smsBody?: string;
  emailSubject?: string;
  emailBody?: string;
  /** Per-locale overrides (base fields above are the default language). */
  localized?: Record<
    string,
    { smsBody?: string; emailSubject?: string; emailBody?: string }
  >;
}

// ─── Template storage schema (JSON object) ───────────────────────────────────

export interface ReputationTemplateTouchpoint {
  /** Sequence step id. */
  id: string;
  /** Stable key — "initial" | "followup-1" | … */
  key: string;
  label: string;
  channel: ReputationChannel;
  delayMinutes: number;
  onlyIfNoResponse: boolean;
  /** Multilingual content variations, keyed by locale (default locale included). */
  content: Record<
    string,
    { smsBody?: string; emailSubject?: string; emailBody?: string }
  >;
}

/**
 * One JSON object per facility entity holding every outreach touchpoint and all
 * its language variations — a single fast lookup the automation loop reads from.
 */
export interface ReputationTemplate {
  /** Unique entity id (`tmpl-<facilityId>`). */
  templateId: string;
  /** Facility entity lookup key. */
  facilityId: number;
  defaultLocale: string;
  locales: string[];
  updatedAt: string;
  touchpoints: ReputationTemplateTouchpoint[];
}

// ─── Role-based escalation routing ───────────────────────────────────────────

export interface ReputationEscalationRoute {
  /** Service slug ("grooming", "training", …) or "default". */
  service: string;
  staffIds: string[];
  staffNames: string[];
}

// ─── Staff notification prefs ────────────────────────────────────────────────

export interface ReputationStaffNotificationSetting {
  staffId: number;
  staffName: string;
  notifyOn: ReputationNotifyOn;
}

// ─── Protection rules ────────────────────────────────────────────────────────

export interface ReputationProtectionRules {
  blockOnCancelled: boolean;
  blockOnRefundInProgress: boolean;
  blockOnCriticalIncident: boolean;
  blockOnOptOut: boolean;
  blockOnOpenDispute: boolean;
  cooldownDays: number;
}

// ─── Reminder config ─────────────────────────────────────────────────────────

export interface ReputationReminderConfig {
  noResponseReminderEnabled: boolean;
  noResponseReminder1Hours: number;
  noResponseReminder2Hours: number;
  maxReminders: 0 | 1 | 2;
  happyNoClickReminderEnabled: boolean;
  happyNoClickReminderHours: number;
}

// ─── Main settings ───────────────────────────────────────────────────────────

export interface ReputationSettings {
  enabled: boolean;
  triggers: ReputationTriggerConfig[];
  delay: ReputationDelay;
  customDelayMinutes?: number;
  dailySendLimitPerClient: number;
  channels: { sms: boolean; email: boolean };
  reviewPlatforms: Record<ReputationPublicPlatform, ReputationPlatformConfig>;
  /**
   * The facility's added channels, in priority order — the source of truth for
   * which platforms appear in the channel manager and the survey. Platforms not
   * listed here are "available to add".
   */
  platformOrder?: ReputationPublicPlatform[];
  /**
   * When true, the featured public channel is chosen by weighted random using
   * each platform's `weight` (e.g. Google 60% / Yelp 40%) instead of fixed order.
   */
  channelWeighting?: boolean;
  /**
   * How feedback is routed after a rating:
   * - "open"   — everyone is invited to review publicly AND privately (default;
   *              avoids review-gating which violates FTC / Google / Yelp policy).
   * - "gated"  — only clients at/above the happy threshold see public links;
   *              lower ratings are intercepted privately.
   */
  feedbackRouting?: "open" | "gated";
  /** Reviews at/above this score go public; below it stay private (intercepted). */
  happyThreshold: ReputationRating;
  /** Multi-step outreach sequence (initial send + backup reminders). */
  outreachSequence?: ReputationSequenceStep[];
  /** Multilingual message authoring. `locales[0]` is the default language. */
  localization?: { enabled: boolean; locales: string[] };
  /** Service-based escalation routing for negative reviews. */
  escalationRoutes?: ReputationEscalationRoute[];
  protectionRules: ReputationProtectionRules;
  reminders: ReputationReminderConfig;
  negativePauseDays: number;
  managerAlertEmails: string[];
  staffNotifications: ReputationStaffNotificationSetting[];
}

// ─── Audit trail ─────────────────────────────────────────────────────────────

export interface ReputationAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  details?: string;
}

// ─── Review request ──────────────────────────────────────────────────────────

export interface ReputationRequest {
  id: string;
  bookingId: number;
  clientId: number;
  clientName: string;
  petName: string;
  service: string;
  serviceLabel: string;
  staffId?: number;
  staffName?: string;
  channel: ReputationChannel;
  status: ReputationRequestStatus;
  sentAt: string;
  rating?: ReputationRating;
  ratedAt?: string;
  publicLinkClicked: boolean;
  publicLinkClickedAt?: string;
  publicPlatform?: ReputationPublicPlatform;
  remindersCount: number;
  lastReminderAt?: string;
  feedbackText?: string;
  clientComment?: string;
  escalatedToManager: boolean;
  taskCreated: boolean;
  isApprovedForPublicDisplay: boolean;
  isPubliclyDisplayed: boolean;
  auditLog: ReputationAuditEntry[];
  // ─── Step 1: Automated Post-Service Trigger ──────────────────────────────────
  /** Which trigger event produced this request, e.g. "boarding_checkout". */
  triggerEvent?: string;
  /** T0 — when the checkout / post-service event was logged. */
  checkoutAt?: string;
  /** T0 + Δt — when the outreach is (or was) scheduled to fire. */
  scheduledSendAt?: string;
  /** When a manager resolved the escalation ticket (Step 3B). */
  resolvedAt?: string;
  /** Apology store credit granted to the client (Step 3B). */
  apologyCreditAmount?: number;
  /** When the one-time "happy but hasn't clicked" nudge was sent. */
  happyReminderSentAt?: string;
  /** Client's preferred language locale, resolved at send time. */
  locale?: string;
  /** Stacked bilingual fallback locales (Condition Beta). */
  stackLocales?: string[];
}

// ─── Checkout trigger event (Step 1 input) ───────────────────────────────────

/**
 * Emitted by the core ledger when a pet status switches to "Checked Out"
 * (Boarding, Daycare, Grooming, Training). Fed to the trigger engine, which
 * decides whether to schedule an automated review request.
 */
export interface ReputationCheckoutEvent {
  bookingId: number;
  clientId: number;
  clientName: string;
  petName: string;
  service: string;
  serviceLabel: string;
  staffId?: number;
  staffName?: string;
  /** Matches a ReputationTriggerConfig.event slug. */
  triggerEvent: string;
  /** T0 — checkout timestamp (ISO). */
  checkoutAt: string;
  /** Client's preferred outreach channel, if known. */
  channelPref?: ReputationChannel;
  /** Client has opted out of review requests. */
  clientOptedOut?: boolean;
  /** Client's preferred language locale (e.g. "fr"), for localized messages. */
  locale?: string;
  /** Stacked bilingual fallback — render these locales together (Condition Beta). */
  stackLocales?: string[];
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────

export interface ReputationDashboardStats {
  totalSent: number;
  totalRatings: number;
  responseRate: number;
  averageRating: number;
  fiveStarCount: number;
  fiveStarPercentage: number;
  fourStarPercentage: number;
  threeStarPercentage: number;
  negativePercentage: number;
  publicConversionRate: number;
  reminderResponseRate: number;
  requestsThisMonth: number;
  requestsLastMonth: number;
  ratingTrend: "up" | "down" | "flat";
  rateTrend: "up" | "down" | "flat";
}

// ─── Staff leaderboard ───────────────────────────────────────────────────────

export interface ReputationStaffStat {
  staffId: number;
  staffName: string;
  role: string;
  averageRating: number;
  totalReviews: number;
  positiveCount: number;
  negativeCount: number;
  praiseComments: string[];
  ratingDelta: number; // compared to last period (+/-)
}

// ─── Service leaderboard ─────────────────────────────────────────────────────

export interface ReputationServiceStat {
  service: string;
  serviceLabel: string;
  totalRequests: number;
  totalRatings: number;
  averageRating: number;
  responseRate: number;
  fiveStarCount: number;
  negativeCount: number;
}
