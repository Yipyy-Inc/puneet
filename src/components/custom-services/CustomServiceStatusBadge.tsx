"use client";

import { Badge } from "@/components/ui/badge";
import type { CustomServiceStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CustomServiceStatusBadgeProps {
  status: CustomServiceStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  CustomServiceStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  },
  active: {
    label: "Active",
    className:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  disabled: {
    label: "Disabled",
    className:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  archived: {
    label: "Archived",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
  },
};

export function CustomServiceStatusBadge({
  status,
  className,
}: CustomServiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge
      role="status"
      variant="outline"
      className={cn(config.className, className)}
    >
      <span className="sr-only">Status: </span>
      {config.label}
    </Badge>
  );
}
