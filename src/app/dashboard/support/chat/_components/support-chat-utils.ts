import type { ConversationStatus } from "@/types/support-chat";

/**
 * Resolve {{merge_field}} tokens in a saved reply / email template against the
 * active conversation. Unknown tokens are left intact. `primary_admin_name` /
 * `owner_name` alias the contact name so email-template tokens resolve too.
 */
export function applySupportMergeFields(
  body: string,
  ctx: { facilityName: string; contactName: string; contactEmail: string },
): string {
  const values: Record<string, string> = {
    facility_name: ctx.facilityName,
    contact_name: ctx.contactName,
    contact_email: ctx.contactEmail,
    primary_admin_name: ctx.contactName,
    owner_name: ctx.contactName,
  };
  return body.replace(/\{\{(\w+)\}\}/g, (whole, token: string) =>
    Object.prototype.hasOwnProperty.call(values, token) ? values[token] : whole,
  );
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const STATUS_META: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  in_progress: {
    label: "In Progress",
    className:
      "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  waiting: {
    label: "Waiting on Facility",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  closed: {
    label: "Closed",
    className:
      "border-zinc-500/20 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
  },
};

/** Display order for the status dropdown. */
export const STATUS_ORDER: ConversationStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
];

export type FacilityHealth = "healthy" | "at_risk" | "suspended";

export const HEALTH_META: Record<
  FacilityHealth,
  { label: string; className: string }
> = {
  healthy: {
    label: "Healthy",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  at_risk: {
    label: "At Risk",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  suspended: {
    label: "Suspended",
    className:
      "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
};

/** Ticket statuses that count as an open/unresolved ticket. */
export const OPEN_TICKET_STATUSES = new Set([
  "Open",
  "In Progress",
  "Escalated",
  "Pending",
]);
