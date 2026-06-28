import type { ComponentStatus } from "@/data/status-page";

export interface StatusMeta {
  label: string;
  dot: string; // bg-* for the status dot
  text: string; // text-* for the label
  bar: string; // fill-* for SVG uptime bars
  banner: string; // banner background + border
  bannerText: string;
}

export const STATUS_META: Record<ComponentStatus, StatusMeta> = {
  operational: {
    label: "Operational",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    bar: "fill-emerald-500",
    banner: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40",
    bannerText: "text-emerald-700 dark:text-emerald-300",
  },
  degraded: {
    label: "Degraded Performance",
    dot: "bg-amber-500",
    text: "text-amber-600",
    bar: "fill-amber-500",
    banner: "bg-amber-50 border-amber-200 dark:bg-amber-950/40",
    bannerText: "text-amber-700 dark:text-amber-300",
  },
  partial_outage: {
    label: "Partial Outage",
    dot: "bg-orange-500",
    text: "text-orange-600",
    bar: "fill-orange-500",
    banner: "bg-orange-50 border-orange-200 dark:bg-orange-950/40",
    bannerText: "text-orange-700 dark:text-orange-300",
  },
  major_outage: {
    label: "Major Outage",
    dot: "bg-rose-500",
    text: "text-rose-600",
    bar: "fill-rose-500",
    banner: "bg-rose-50 border-rose-200 dark:bg-rose-950/40",
    bannerText: "text-rose-700 dark:text-rose-300",
  },
  maintenance: {
    label: "Under Maintenance",
    dot: "bg-sky-500",
    text: "text-sky-600",
    bar: "fill-sky-500",
    banner: "bg-sky-50 border-sky-200 dark:bg-sky-950/40",
    bannerText: "text-sky-700 dark:text-sky-300",
  },
};

export const OVERALL_HEADLINE: Record<ComponentStatus, string> = {
  operational: "All Systems Operational",
  degraded: "Some Systems Degraded",
  partial_outage: "Partial Service Outage",
  major_outage: "Major Service Outage",
  maintenance: "Maintenance In Progress",
};

const INCIDENT_STATUS_META: Record<string, { label: string; dot: string }> = {
  investigating: { label: "Investigating", dot: "bg-rose-500" },
  identified: { label: "Identified", dot: "bg-orange-500" },
  monitoring: { label: "Monitoring", dot: "bg-amber-500" },
  resolved: { label: "Resolved", dot: "bg-emerald-500" },
};

export function incidentStatusMeta(status: string): {
  label: string;
  dot: string;
} {
  return INCIDENT_STATUS_META[status] ?? { label: status, dot: "bg-slate-400" };
}

const IMPACT_META: Record<string, { label: string; cls: string }> = {
  minor: {
    label: "Minor",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950",
  },
  major: {
    label: "Major",
    cls: "bg-orange-100 text-orange-700 dark:bg-orange-950",
  },
  critical: {
    label: "Critical",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-950",
  },
  maintenance: {
    label: "Maintenance",
    cls: "bg-sky-100 text-sky-700 dark:bg-sky-950",
  },
};

export function impactMeta(impact: string): { label: string; cls: string } {
  return (
    IMPACT_META[impact] ?? { label: impact, cls: "bg-slate-100 text-slate-700" }
  );
}

/** Compact, locale-stable UTC formatting (deterministic for SSR). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${date}, ${time} UTC`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
