// ============================================================================
// Reputation Booster — Type Definitions
// ============================================================================

export type ReputationRating = 1 | 2 | 3 | 4 | 5;

export type ReputationChannel = "sms" | "email";

export type ReputationPublicPlatform = "google" | "facebook" | "yelp";

export type ReputationRequestStatus =
  | "not_sent"
  | "sent"
  | "reminder_sent"
  | "rating_received"
  | "public_push_sent"
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
  reviewPlatforms: {
    google: ReputationPlatformConfig;
    facebook: ReputationPlatformConfig;
    yelp: ReputationPlatformConfig;
  };
  happyThreshold: ReputationRating;
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
