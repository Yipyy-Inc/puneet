export type InsightCategory =
  | "revenue"
  | "operations"
  | "customers"
  | "staff"
  | "marketing";

export type InsightPriority = "high" | "medium" | "low";

export type InsightTrend = "up" | "down" | "stable";

export type InsightCadence = "nightly" | "realtime_30min";

export type InsightStatus =
  | "active"
  | "dismissed"
  | "action_taken"
  | "monitoring"
  | "resolved"
  | "expired";

export type InsightActionType =
  // Operations
  | "add_shift"
  | "week_schedule_gap"
  | "cancellations_review"
  | "missed_tasks_review"
  | "deposit_request"
  | "stations_board"
  | "missed_calls"
  // Revenue
  | "staff_training_note"
  | "service_rate_edit"
  | "package_campaign"
  | "service_utilization"
  | "no_show_policy"
  | "revenue_report"
  // Customers
  | "churn_winback_campaign"
  | "welcome_back_campaign"
  | "repeat_no_show"
  | "seasonal_campaign"
  | "expiring_package"
  // Staff
  | "overtime_report"
  | "unfilled_shift"
  | "staff_attendance_record"
  | "onboarding_reminder"
  | "groomer_profile"
  // Marketing
  | "duplicate_campaign"
  | "list_health"
  | "new_campaign_suggestions"
  | "messaging_analytics"
  // Communication
  | "voicemail_backlog"
  | "slow_reply_inbox"
  // Calling intelligence (sourced from calling analytics)
  | "call_missed_spike"
  | "call_sentiment_drop"
  | "call_peak_hour_gap"
  | "call_keyword_trend"
  | "call_upsell_untaken"
  // Inventory
  | "reorder"
  | "inventory_item_edit";

export interface MetricChip {
  label: string;
  value: string | number;
}

export interface InsightOutcome {
  trackedMetric: string;
  baseline: number;
  current: number;
  /** Target population being tracked (e.g. 12 at-risk clients in a churn campaign). */
  target?: number;
  evaluatedAt: string;
  windowDays: number;
}

export interface Insight {
  insightId: string;
  facilityId: number;
  locationId: string;
  locationName: string;
  category: InsightCategory;
  priority: InsightPriority;
  trend: InsightTrend;
  title: string;
  description: string;
  impactText: string;
  recommendationText: string;
  metrics: MetricChip[];
  generatedAt: string;
  cadence: InsightCadence;
  actionType: InsightActionType;
  status: InsightStatus;
  dismissedAt?: string;
  dismissedBy?: string;
  actionTakenAt?: string;
  outcome?: InsightOutcome;
  /** Optional copy shown only on insights that need a disclaimer (e.g. 4.2 pricing). */
  disclaimer?: string;
}

export interface InsightSettings {
  enabled: boolean;
  dailyDigestEmail: boolean;
  categoriesEnabled: Record<InsightCategory, boolean>;
  thresholdOverrides: {
    churnDaysMultiplier?: number;
    overtimeOverBudget?: number;
    cancellationRatePct?: number;
    depositExposure?: number;
    monthlyNoShowLoss?: number;
    missedCallsPerDay?: number;
    voicemailBacklogCount?: number;
    voicemailAgeHours?: number;
    messageResponseHours?: number;
    stationCleaningMinutes?: number;
    missedTaskRatePct?: number;
  };
}

export const DEFAULT_INSIGHT_SETTINGS: InsightSettings = {
  enabled: true,
  dailyDigestEmail: true,
  categoriesEnabled: {
    revenue: true,
    operations: true,
    customers: true,
    staff: true,
    marketing: true,
  },
  thresholdOverrides: {},
};

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  revenue: "Revenue",
  operations: "Operations",
  customers: "Customers",
  staff: "Staff",
  marketing: "Marketing",
};
