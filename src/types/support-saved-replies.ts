// Saved replies for the Super Admin Support chat composer. These mirror the
// facility-portal SavedReply shape but use SUPPORT categories (Technical /
// Billing / Onboarding / General) and platform merge fields such as
// {{facility_name}}. Kept separate from the facility saved-replies type, which
// is scoped to service categories (boarding/grooming/…).

export type SupportReplyCategory =
  | "technical"
  | "billing"
  | "onboarding"
  | "general"
  | "custom";

export interface SupportSavedReply {
  id: string;
  /** Hashtag slug shown on the card, e.g. "password-reset". */
  shortcut: string;
  title: string;
  /** Body text; may contain merge fields like {{facility_name}}. */
  body: string;
  category: SupportReplyCategory;
  useCount: number;
}

export const SUPPORT_REPLY_CATEGORY_LABELS: Record<
  SupportReplyCategory,
  string
> = {
  technical: "Technical",
  billing: "Billing",
  onboarding: "Onboarding",
  general: "General",
  custom: "Custom",
};

export const SUPPORT_REPLY_CATEGORY_COLORS: Record<
  SupportReplyCategory,
  string
> = {
  technical: "bg-blue-100 text-blue-700 border-blue-200",
  billing: "bg-amber-100 text-amber-700 border-amber-200",
  onboarding: "bg-emerald-100 text-emerald-700 border-emerald-200",
  general: "bg-slate-100 text-slate-600 border-slate-200",
  custom: "bg-violet-100 text-violet-700 border-violet-200",
};
