// Platform email-template system (shared foundation for the Email Templates
// admin page and any automated sender, e.g. the dunning sequence).

export type EmailTemplateCategory =
  | "Onboarding"
  | "Trial Lifecycle"
  | "Billing"
  | "Account Management"
  | "Support";

export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  body: string;
  /** Merge-tag tokens used in subject/body, e.g. "facility_name". */
  mergeTags: string[];
  /** What fires this email. */
  trigger: string;
  /** Who receives it. */
  recipient: string;
  updatedAt: string;
}
