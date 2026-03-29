"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  type:
    | "status"
    | "plan"
    | "role"
    | "inventory"
    | "adminRole"
    | "accessLevel"
    | "severity";
  value: string;
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
}

// Dot colors — muted, professional palette
const DOT_COLORS: Record<string, string> = {
  // Positive states
  active: "bg-emerald-500",
  completed: "bg-emerald-500",
  confirmed: "bg-emerald-500",
  paid: "bg-emerald-500",
  approved: "bg-emerald-500",
  in_stock: "bg-emerald-500",
  online: "bg-emerald-500",
  available: "bg-emerald-500",

  // Warning / pending states
  pending: "bg-amber-400",
  low_stock: "bg-amber-400",
  busy: "bg-amber-400",
  medium: "bg-amber-400",

  // Neutral / inactive states
  inactive: "bg-zinc-400",
  cancelled: "bg-zinc-400",
  offline: "bg-zinc-400",
  out_of_stock: "bg-zinc-400",

  // Negative states
  refunded: "bg-sky-400",
  suspended: "bg-red-400",
  denied: "bg-red-400",
  high: "bg-red-400",

  // Roles & plans (no dot)
  low: "bg-emerald-500",
};

const DISPLAY_VALUES: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
  suspended: "Suspended",
  online: "Online",
  offline: "Offline",
  busy: "Busy",
  available: "Available",
  completed: "Completed",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  paid: "Paid",
  refunded: "Refunded",
  request_submitted: "Requested",
  waitlisted: "Waitlisted",
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  free: "Free",
  basic: "Basic",
  premium: "Premium",
  enterprise: "Enterprise",
  system_administrator: "System Admin",
  account_manager: "Account Manager",
  sales_team: "Sales Team",
  technical_support: "Technical Support",
  financial_auditor: "Financial Auditor",
  full: "Full Access",
  read_write: "Read/Write",
  read_only: "Read Only",
  restricted: "Restricted",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function StatusBadge({
  type,
  value,
  size = "default",
}: StatusBadgeProps) {
  const key = value.toLowerCase();
  const displayValue =
    DISPLAY_VALUES[key] ??
    value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
  const dotColor = DOT_COLORS[key];

  const sizeClass =
    size === "sm"
      ? "text-[10px] px-1.5 py-0"
      : size === "lg"
        ? "text-sm px-3 py-1"
        : "text-xs px-2 py-0.5";

  // For roles and plans, use slightly different styling
  if (type === "plan" || type === "role" || type === "adminRole") {
    return (
      <Badge variant="secondary" className={cn("font-normal", sizeClass)}>
        {displayValue}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border/60 gap-1.5 bg-transparent font-normal",
        sizeClass,
      )}
    >
      {dotColor && (
        <span className={cn("size-1.5 shrink-0 rounded-full", dotColor)} />
      )}
      {displayValue}
    </Badge>
  );
}
