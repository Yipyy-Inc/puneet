import { announcementPlainText } from "@/lib/announcements/sanitize-html";
import type {
  AnnouncementOptions,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTarget,
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

// What each priority actually does on the facility side (20260918103842).
export const PRIORITY_HELP: Record<AnnouncementPriority, string> = {
  Normal: "Listed in the facility notification bell.",
  High: "Listed in the bell, and counts toward its badge until read.",
  Urgent: "A red banner on every facility page until each person dismisses it.",
};

export const TARGET_OPTIONS: AnnouncementTarget[] = [
  "All Facilities",
  "By Plan Tier",
  "By Business Type",
  "Specific Facilities",
];

/** The values facilities.business_types holds. */
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
export function targetSummary(
  a: Pick<
    EnhancedAnnouncement,
    "target" | "planTierIds" | "businessTypes" | "facilityIds"
  >,
  options?: AnnouncementOptions,
): string {
  switch (a.target) {
    case "All Facilities":
      return "All Facilities";
    case "By Plan Tier":
      return `Plan: ${
        a.planTierIds
          .map((id) => options?.tiers.find((t) => t.id === id)?.name ?? id)
          .join(", ") || "—"
      }`;
    case "By Business Type":
      return `Type: ${
        a.businessTypes
          .map((t) => BUSINESS_TYPES.find((b) => b.value === t)?.label ?? t)
          .join(", ") || "—"
      }`;
    case "Specific Facilities":
      return `${a.facilityIds.length} facilit${
        a.facilityIds.length === 1 ? "y" : "ies"
      }`;
  }
}

/** Plain-text preview for table rows. */
export function bodyPreview(html: string): string {
  return announcementPlainText(html);
}
