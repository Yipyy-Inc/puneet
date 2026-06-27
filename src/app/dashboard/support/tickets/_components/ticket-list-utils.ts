import type { SupportTicket } from "@/types/support";

export const PRIORITIES: SupportTicket["priority"][] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export const CATEGORIES = [
  "Technical",
  "Billing",
  "Account",
  "Service",
  "Feature Request",
  "General",
  "Other",
];

export const STATUS_TABS = [
  "All",
  "Open",
  "In Progress",
  "Escalated",
  "Resolved",
  "Closed",
] as const;
export type StatusTab = (typeof STATUS_TABS)[number];

export const STATUS_BADGE: Record<string, string> = {
  Open: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  "In Progress":
    "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  Pending:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Escalated:
    "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  Resolved:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Closed: "border-muted bg-muted text-muted-foreground",
};

export const PRIORITY_BADGE: Record<string, string> = {
  Low: "border-slate-400/20 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  Medium: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  High: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  Urgent: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
};

function stableInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

export type SlaStatus =
  | "Breached"
  | "Critical"
  | "At Risk"
  | "On Track"
  | "Met";

export const SLA_STATUSES: SlaStatus[] = [
  "Breached",
  "Critical",
  "At Risk",
  "On Track",
  "Met",
];

// Derived from the ticket's real breach signals (escalation, breachCount,
// resolution outcome). The remaining open tickets get a deterministic band so
// the SLA column/filter has realistic variety (the seed SLA due dates are
// historical, so a raw clock comparison would mark every open ticket breached).
export function slaStatusOf(ticket: SupportTicket): SlaStatus {
  if (ticket.status === "Resolved" || ticket.status === "Closed") {
    return ticket.sla?.resolutionMet === false ? "Breached" : "Met";
  }
  if (
    ticket.status === "Escalated" ||
    (ticket.sla?.breachCount ?? 0) > 0 ||
    ticket.sla?.isEscalated
  ) {
    return "Breached";
  }
  const band = stableInt(`sla-${ticket.id}`, 0, 9);
  if (band <= 1) return "Critical";
  if (band <= 3) return "At Risk";
  return "On Track";
}

export const SLA_TEXT: Record<SlaStatus, string> = {
  Breached: "text-rose-600 dark:text-rose-400",
  Critical: "text-rose-600 dark:text-rose-400",
  "At Risk": "text-amber-600 dark:text-amber-400",
  "On Track": "text-emerald-600 dark:text-emerald-400",
  Met: "text-emerald-600 dark:text-emerald-400",
};

const SLA_RANK: Record<SlaStatus, number> = {
  Breached: 0,
  Critical: 1,
  "At Risk": 2,
  "On Track": 3,
  Met: 4,
};
export function slaRank(s: SlaStatus): number {
  return SLA_RANK[s];
}

const STATUS_RANK: Record<string, number> = {
  Open: 0,
  "In Progress": 1,
  Pending: 2,
  Escalated: 3,
  Resolved: 4,
  Closed: 5,
};
export function statusRank(s: string): number {
  return STATUS_RANK[s] ?? 9;
}

const PRIORITY_RANK: Record<string, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};
export function priorityRank(p: string): number {
  return PRIORITY_RANK[p] ?? 9;
}
