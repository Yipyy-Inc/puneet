"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { YipyyGoDisplayStatus } from "@/data/yipyygo-forms";

const LABELS: Record<YipyyGoDisplayStatus, string> = {
  not_sent: "Not Sent",
  sent: "Sent",
  incomplete: "Incomplete",
  submitted: "Submitted",
  approved: "Approved",
  needs_review: "Needs Review",
  precheck_missing: "PreCheck Missing",
};

const DOT_COLORS: Record<YipyyGoDisplayStatus, string> = {
  not_sent: "bg-zinc-400",
  sent: "bg-sky-400",
  incomplete: "bg-amber-400",
  submitted: "bg-sky-400",
  approved: "bg-emerald-500",
  needs_review: "bg-amber-400",
  precheck_missing: "bg-red-400",
};

interface YipyyGoStatusBadgeProps {
  status: YipyyGoDisplayStatus;
  showIcon?: boolean;
  className?: string;
}

export function YipyyGoStatusBadge({
  status,
  showIcon: _showIcon = true,
  className,
}: YipyyGoStatusBadgeProps) {
  const label = LABELS[status];
  const dotColor = DOT_COLORS[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border/60 gap-1.5 bg-transparent font-normal",
        className,
      )}
      title={`YipyyGo: ${label}`}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dotColor)} />
      {label}
    </Badge>
  );
}

export { LABELS as YIPYYGO_STATUS_LABELS };
