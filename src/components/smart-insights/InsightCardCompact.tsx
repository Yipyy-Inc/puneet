"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type {
  Insight,
  InsightCategory,
  InsightPriority,
  InsightTrend,
} from "@/types/smart-insights";

interface Props {
  insight: Insight;
  onDismiss: (insight: Insight) => void;
  onTakeAction: (insight: Insight) => void;
}

const CATEGORY_CLASSES: Record<InsightCategory, string> = {
  revenue: "bg-blue-100 text-blue-800 border-blue-200",
  operations: "bg-gray-100 text-gray-800 border-gray-200",
  customers: "bg-green-100 text-green-800 border-green-200",
  staff: "bg-purple-100 text-purple-800 border-purple-200",
  marketing: "bg-teal-100 text-teal-800 border-teal-200",
};

const PRIORITY_CLASSES: Record<InsightPriority, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

function TrendIcon({ trend }: { trend: InsightTrend }) {
  if (trend === "up") return <TrendingUp className="size-3.5 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="size-3.5 text-red-600" />;
  return <Minus className="size-3.5 text-gray-500" />;
}

/**
 * Compact card variant for the dashboard widget. Per spec 10.1: title,
 * priority badge, one-line description, Dismiss + Take Action buttons.
 */
export function InsightCardCompact({
  insight,
  onDismiss,
  onTakeAction,
}: Props) {
  const inactive =
    insight.status === "resolved" || insight.status === "action_taken";

  return (
    <div
      data-priority={insight.priority}
      className="space-y-1 rounded-xl border-2 border-border/80 bg-card p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_20px_-4px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant="outline"
            className={`text-[10px] ${CATEGORY_CLASSES[insight.category]}`}
          >
            {insight.category}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${PRIORITY_CLASSES[insight.priority]}`}
          >
            {insight.priority}
          </Badge>
          <TrendIcon trend={insight.trend} />
        </div>
      </div>

      <h4 className="text-sm font-semibold leading-tight">{insight.title}</h4>
      <p className="text-muted-foreground line-clamp-1 text-xs">
        {insight.description}
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(insight)}
          disabled={inactive}
          className="h-7 px-2 text-xs"
        >
          Dismiss
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onTakeAction(insight)}
          disabled={inactive}
          className="h-7 px-2.5 text-xs"
        >
          Take Action
        </Button>
      </div>
    </div>
  );
}
