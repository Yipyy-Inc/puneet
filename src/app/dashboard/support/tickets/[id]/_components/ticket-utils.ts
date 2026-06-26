import { facilities } from "@/data/facilities";
import { slaConfigs } from "@/data/support-tickets";
import type { SupportTicket } from "@/types/support";

export const STATUSES: SupportTicket["status"][] = [
  "Open",
  "In Progress",
  "Pending",
  "Escalated",
  "Resolved",
  "Closed",
];

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

export function bumpPriority(
  p: SupportTicket["priority"],
): SupportTicket["priority"] {
  const i = PRIORITIES.indexOf(p);
  return PRIORITIES[Math.min(i + 1, PRIORITIES.length - 1)];
}

export function stableInt(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return min + (h % (max - min + 1));
}

/** SLA resolution target (hours) for a ticket, from its config or priority. */
export function slaTargetHours(ticket: SupportTicket): number {
  const byId = slaConfigs.find((c) => c.id === ticket.sla?.configId);
  if (byId) return byId.resolutionTime;
  const byPriority = slaConfigs.find((c) => c.priority === ticket.priority);
  return byPriority?.resolutionTime ?? 24;
}

export interface ResolvedFacility {
  id: number;
  name: string;
  plan: string;
  status: string;
  phone?: string;
}

export function resolveFacility(
  ticket: SupportTicket,
): ResolvedFacility | null {
  const m = ticket.facilityId?.match(/(\d+)/);
  const id = m ? Number(m[1]) : null;
  const f = id != null ? facilities.find((x) => x.id === id) : null;
  if (!f) return null;
  const contact = (f as { contact?: { phone?: string } }).contact;
  return {
    id: f.id,
    name: f.name,
    plan: f.plan,
    status: f.status,
    phone: contact?.phone,
  };
}

export function facilityHealth(
  facilityId: string,
  status: string,
): { label: string; className: string } {
  if (status === "suspended")
    return {
      label: "Invoice Overdue",
      className:
        "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    };
  if (stableInt(facilityId, 0, 6) === 0)
    return {
      label: "Trial Expiring",
      className:
        "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    };
  return {
    label: "Active",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  };
}

const ATTACHMENT_POOL = [
  "screenshot.png",
  "error-log.txt",
  "invoice.pdf",
  "console-output.png",
];

export function mockAttachments(
  messageId: string,
): { name: string; size: string }[] {
  const h = stableInt(messageId, 0, 9);
  if (h >= 4) return [];
  return [
    {
      name: ATTACHMENT_POOL[h % ATTACHMENT_POOL.length],
      size: `${stableInt(`${messageId}-sz`, 12, 480)} KB`,
    },
  ];
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
