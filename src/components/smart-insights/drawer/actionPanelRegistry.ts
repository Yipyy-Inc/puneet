import type { InsightActionType } from "@/types/smart-insights";
import type { InsightPanelComponent } from "./panel-types";

// Phase 4 reference panels
import { AddShiftPanel } from "./panels/AddShiftPanel";
import { ChurnWinBackCampaignPanel } from "./panels/ChurnWinBackCampaignPanel";
import { ReorderPanel } from "./panels/ReorderPanel";
import { ServiceRateEditPanel } from "./panels/ServiceRateEditPanel";
import { UnfilledShiftPanel } from "./panels/UnfilledShiftPanel";

// Phase 5 — Customers
import { WelcomeBackCampaignPanel } from "./panels/WelcomeBackCampaignPanel";
import { RepeatNoShowPanel } from "./panels/RepeatNoShowPanel";
import { SeasonalCampaignPanel } from "./panels/SeasonalCampaignPanel";
import { ExpiringPackagePanel } from "./panels/ExpiringPackagePanel";

// Phase 5 — Revenue
import { StaffTrainingNotePanel } from "./panels/StaffTrainingNotePanel";
import { PackageCampaignPanel } from "./panels/PackageCampaignPanel";
import { ServiceUtilizationPanel } from "./panels/ServiceUtilizationPanel";
import { NoShowPolicyPanel } from "./panels/NoShowPolicyPanel";
import { RevenueReportPanel } from "./panels/RevenueReportPanel";

// Phase 5 — Operations
import { WeekScheduleGapPanel } from "./panels/WeekScheduleGapPanel";
import { CancellationsReviewPanel } from "./panels/CancellationsReviewPanel";
import { MissedTasksReviewPanel } from "./panels/MissedTasksReviewPanel";
import { DepositRequestPanel } from "./panels/DepositRequestPanel";
import { StationsBoardPanel } from "./panels/StationsBoardPanel";
import { MissedCallsPanel } from "./panels/MissedCallsPanel";

// Phase 5 — Staff
import { OvertimeReportPanel } from "./panels/OvertimeReportPanel";
import { StaffAttendanceRecordPanel } from "./panels/StaffAttendanceRecordPanel";
import { OnboardingReminderPanel } from "./panels/OnboardingReminderPanel";
import { GroomerProfilePanel } from "./panels/GroomerProfilePanel";

// Phase 5 — Marketing
import { DuplicateCampaignPanel } from "./panels/DuplicateCampaignPanel";
import { ListHealthPanel } from "./panels/ListHealthPanel";
import { NewCampaignSuggestionsPanel } from "./panels/NewCampaignSuggestionsPanel";
import { MessagingAnalyticsPanel } from "./panels/MessagingAnalyticsPanel";

// Phase 5 — Communication
import { VoicemailBacklogPanel } from "./panels/VoicemailBacklogPanel";
import { SlowReplyInboxPanel } from "./panels/SlowReplyInboxPanel";

// Calling intelligence — one shared insight-driven panel for all five types
import { CallingInsightPanel } from "./panels/CallingInsightPanel";

// Phase 5 — Inventory
import { InventoryItemEditPanel } from "./panels/InventoryItemEditPanel";

/**
 * Maps insight `actionType` → drawer panel component.
 * All 31 action types now have a dedicated panel.
 */
export const ACTION_PANEL_REGISTRY: Record<
  InsightActionType,
  InsightPanelComponent | null
> = {
  // Operations
  add_shift: AddShiftPanel,
  week_schedule_gap: WeekScheduleGapPanel,
  cancellations_review: CancellationsReviewPanel,
  missed_tasks_review: MissedTasksReviewPanel,
  deposit_request: DepositRequestPanel,
  stations_board: StationsBoardPanel,
  missed_calls: MissedCallsPanel,

  // Revenue
  staff_training_note: StaffTrainingNotePanel,
  service_rate_edit: ServiceRateEditPanel,
  package_campaign: PackageCampaignPanel,
  service_utilization: ServiceUtilizationPanel,
  no_show_policy: NoShowPolicyPanel,
  revenue_report: RevenueReportPanel,

  // Customers
  churn_winback_campaign: ChurnWinBackCampaignPanel,
  welcome_back_campaign: WelcomeBackCampaignPanel,
  repeat_no_show: RepeatNoShowPanel,
  seasonal_campaign: SeasonalCampaignPanel,
  expiring_package: ExpiringPackagePanel,

  // Staff
  overtime_report: OvertimeReportPanel,
  unfilled_shift: UnfilledShiftPanel,
  staff_attendance_record: StaffAttendanceRecordPanel,
  onboarding_reminder: OnboardingReminderPanel,
  groomer_profile: GroomerProfilePanel,

  // Marketing
  duplicate_campaign: DuplicateCampaignPanel,
  list_health: ListHealthPanel,
  new_campaign_suggestions: NewCampaignSuggestionsPanel,
  messaging_analytics: MessagingAnalyticsPanel,

  // Communication
  voicemail_backlog: VoicemailBacklogPanel,
  slow_reply_inbox: SlowReplyInboxPanel,

  // Calling intelligence
  call_missed_spike: CallingInsightPanel,
  call_sentiment_drop: CallingInsightPanel,
  call_peak_hour_gap: CallingInsightPanel,
  call_keyword_trend: CallingInsightPanel,
  call_upsell_untaken: CallingInsightPanel,

  // Inventory
  reorder: ReorderPanel,
  inventory_item_edit: InventoryItemEditPanel,
};

export function getPanelForActionType(
  actionType: InsightActionType,
): InsightPanelComponent | null {
  return ACTION_PANEL_REGISTRY[actionType] ?? null;
}
