import type {
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTarget,
  DeliveryMethod,
  EnhancedAnnouncement,
} from "@/types/announcement";

export const PRIORITY_BADGE: Record<AnnouncementPriority, string> = {
  Normal: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  High: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Urgent: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

export const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  Draft:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Scheduled:
    "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  Published:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Archived: "border-muted bg-muted text-muted-foreground",
};

export const PRIORITY_OPTIONS: AnnouncementPriority[] = [
  "Normal",
  "High",
  "Urgent",
];

export const PRIORITY_HELP: Record<AnnouncementPriority, string> = {
  Normal: "Shows in the facility notification dropdown only.",
  High: "Adds a yellow badge to the facility notification bell.",
  Urgent: "Full-width red banner on every facility page until dismissed.",
};

export const TARGET_OPTIONS: AnnouncementTarget[] = [
  "All Facilities",
  "By Plan Tier",
  "By Business Type",
  "Specific Facilities",
];

export const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string }[] = [
  { value: "in_platform", label: "In-platform" },
  { value: "email", label: "Email" },
  { value: "both", label: "Both" },
];

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  in_platform: "In-platform",
  email: "Email",
  both: "In-platform + Email",
};

export const PLAN_TIERS = ["Basic", "Premium", "Enterprise"];

export const BUSINESS_TYPES: { value: string; label: string }[] = [
  { value: "daycare", label: "Daycare" },
  { value: "boarding", label: "Boarding" },
  { value: "grooming", label: "Grooming" },
  { value: "training", label: "Training" },
  { value: "vet", label: "Veterinary" },
  { value: "retail", label: "Retail" },
];

export type AnnouncementTab =
  | "all"
  | "Published"
  | "Scheduled"
  | "Draft"
  | "Archived";
export const ANNOUNCEMENT_TABS: { value: AnnouncementTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Published", label: "Published" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Draft", label: "Drafts" },
  { value: "Archived", label: "Archived" },
];

/** Short, human target description for the list/preview. */
export function targetSummary(a: EnhancedAnnouncement): string {
  switch (a.target) {
    case "All Facilities":
      return "All Facilities";
    case "By Plan Tier":
      return `Plan: ${(a.planTiers ?? []).join(", ") || "—"}`;
    case "By Business Type":
      return `Type: ${
        (a.businessTypes ?? [])
          .map((t) => BUSINESS_TYPES.find((b) => b.value === t)?.label ?? t)
          .join(", ") || "—"
      }`;
    case "Specific Facilities":
      return `${(a.facilityIds ?? []).length} facilit${
        (a.facilityIds ?? []).length === 1 ? "y" : "ies"
      }`;
  }
}

/** Strip HTML to a plain-text preview for table rows. */
export function bodyPreview(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
