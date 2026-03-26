"use client";

import { Badge } from "@/components/ui/badge";
import {
  Send,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  type LucideIcon,
} from "lucide-react";
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

const VARIANTS: Record<
  YipyyGoDisplayStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  not_sent: "secondary",
  sent: "outline",
  incomplete: "outline",
  submitted: "default",
  approved: "default",
  needs_review: "destructive",
  precheck_missing: "destructive",
};

const ICONS: Record<YipyyGoDisplayStatus, LucideIcon> = {
  not_sent: XCircle,
  sent: Send,
  incomplete: FileEdit,
  submitted: Clock,
  approved: CheckCircle2,
  needs_review: AlertCircle,
  precheck_missing: AlertCircle,
};

interface YipyyGoStatusBadgeProps {
  status: YipyyGoDisplayStatus;
  showIcon?: boolean;
  className?: string;
}

export function YipyyGoStatusBadge({
  status,
  showIcon = true,
  className,
}: YipyyGoStatusBadgeProps) {
  const label = LABELS[status];
  const variant = VARIANTS[status];
  const Icon = ICONS[status];

  return (
    <Badge variant={variant} className={className} title={`YipyyGo: ${label}`}>
      {showIcon && <Icon className="mr-1 size-3" />}
      {label}
    </Badge>
  );
}

export { LABELS as YIPYYGO_STATUS_LABELS };
