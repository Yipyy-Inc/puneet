import { Send, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import type { Estimate } from "@/types/booking";

/** Shared status → badge/icon config for the estimate card and detail drawer. */
export const STATUS_CONFIG = {
  draft: {
    label: "Draft",
    color: "bg-slate-100 text-slate-700",
    icon: FileText,
  },
  sent: {
    label: "Sent",
    color: "bg-blue-100 text-blue-700",
    icon: Send,
  },
  accepted: {
    label: "Accepted",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  declined: {
    label: "Declined",
    color: "bg-rose-100 text-rose-700",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    color: "bg-amber-100 text-amber-700",
    icon: Clock,
  },
  converted: {
    label: "Converted",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
};

export type EstimateStatusKey = keyof typeof STATUS_CONFIG;

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(d: string) {
  const dt = new Date(d);
  const date = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = dt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

export function daysUntil(d: string) {
  const diff = new Date(d).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * An estimate past its expiry that hasn't reached a terminal outcome
 * (accepted/declined/converted) is shown as "Expired" even when its stored
 * status is still "sent"/"draft".
 */
export function getEffectiveStatus(estimate: Estimate): EstimateStatusKey {
  const expiryDays = estimate.expiresAt ? daysUntil(estimate.expiresAt) : null;
  const isEffectivelyExpired =
    expiryDays !== null &&
    expiryDays <= 0 &&
    estimate.status !== "accepted" &&
    estimate.status !== "declined" &&
    estimate.status !== "converted";
  return isEffectivelyExpired ? "expired" : estimate.status;
}
