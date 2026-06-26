// View-model types for the trials management page.

export type TrialStatus = "active" | "converted" | "expired" | "cancelled";

export type TrialReminderStep = 14 | 7 | 3;

/** An automated trial-expiry reminder email (idempotent, keyed off trial end). */
export interface TrialReminder {
  step: TrialReminderStep;
  templateId: string;
  scheduledAt: string; // YYYY-MM-DD (trial end − step days)
  status: "sent" | "pending";
}

export interface Trial {
  id: string;
  facilityName: string;
  tierId: string;
  plan: string; // tier name
  adminName: string;
  adminEmail: string;
  trialStart: string; // YYYY-MM-DD
  trialEnd: string; // YYYY-MM-DD
  /** trialEnd − now, in days (≤ 0 once expired). */
  daysRemaining: number;
  status: TrialStatus;
  /** Access is restricted to read-only once the trial has expired. */
  readOnly: boolean;
  reminders: TrialReminder[];
}

export interface TrialsSummary {
  activeCount: number;
  expiringIn7: number;
  /** Conversion rate (%) for trials that ended in the current quarter. */
  conversionRateQuarter: number;
  convertedThisQuarter: number;
  endedThisQuarter: number;
}

export interface TrialsState {
  trials: Trial[];
  summary: TrialsSummary;
}
