// View-model types for the overdue-invoice dunning sequence.

export type DunningStep = 1 | 7 | 14;

export type DunningJobStatus = "sent" | "pending";

/** One scheduled dunning email for a specific invoice + step. */
export interface DunningJob {
  /** Idempotency key — unique per (invoice, step); an email fires once. */
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  facilityId: number;
  facilityName: string;
  amount: number;
  currency: string;
  step: DunningStep;
  templateId: string;
  templateName: string;
  /** Day the email is/was scheduled to send (due date + step days). */
  scheduledAt: string; // YYYY-MM-DD
  status: DunningJobStatus;
  /** Set to scheduledAt once sent, else null. */
  sentAt: string | null;
}

/** The full dunning ladder for a single overdue invoice. */
export interface DunningSequence {
  invoiceId: string;
  invoiceNumber: string;
  facilityId: number;
  facilityName: string;
  amount: number;
  currency: string;
  dueDate: string; // YYYY-MM-DD (now-relative)
  daysPastDue: number;
  jobs: DunningJob[];
  /** True once the Day-14 step has fired. */
  flaggedForSuspension: boolean;
  /** The next pending job, or null if the ladder is exhausted. */
  nextJob: DunningJob | null;
}

/** A facility flagged for suspension by the Day-14 dunning step. */
export interface FacilitySuspensionFlag {
  facilityId: number;
  facilityName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  daysPastDue: number;
  /** Day the facility was flagged (due date + 14 days). */
  flaggedAt: string; // YYYY-MM-DD
}

export interface DunningSummary {
  overdueCount: number;
  scheduledCount: number; // pending jobs
  sentCount: number; // sent jobs
  flaggedCount: number;
}

export interface DunningState {
  sequences: DunningSequence[];
  jobs: DunningJob[];
  flags: FacilitySuspensionFlag[];
  summary: DunningSummary;
}
