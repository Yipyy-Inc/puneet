"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Info, Activity } from "lucide-react";
import type {
  Insight,
  InsightCategory,
  InsightPriority,
  InsightTrend,
} from "@/types/smart-insights";
import { INSIGHT_CATEGORY_LABELS } from "@/types/smart-insights";
import { MetricChip } from "@/components/smart-insights/MetricChip";
import { LocationTag } from "@/components/smart-insights/LocationTag";

interface Props {
  insight: Insight;
  showLocation?: boolean;
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
  if (trend === "up") {
    return <TrendingUp className="size-4 text-emerald-600" aria-label="up" />;
  }
  if (trend === "down") {
    return <TrendingDown className="size-4 text-red-600" aria-label="down" />;
  }
  return <Minus className="size-4 text-gray-500" aria-label="stable" />;
}

function StatusBadge({ insight }: { insight: Insight }) {
  if (insight.status === "monitoring") {
    return (
      <Badge
        variant="outline"
        className="border-blue-300 bg-blue-50 text-blue-800"
      >
        Monitoring
      </Badge>
    );
  }
  if (insight.status === "action_taken") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-50 text-emerald-800"
      >
        Action taken
      </Badge>
    );
  }
  if (insight.status === "resolved") {
    return (
      <Badge
        variant="outline"
        className="border-emerald-300 bg-emerald-50 text-emerald-800"
      >
        Resolved
      </Badge>
    );
  }
  return null;
}

function OutcomeStrip({ insight }: { insight: Insight }) {
  if (!insight.outcome) return null;
  const { trackedMetric, current, target, windowDays, evaluatedAt } =
    insight.outcome;
  const takenAt = insight.actionTakenAt
    ? new Date(insight.actionTakenAt).getTime()
    : Date.now();
  const dayMs = 86_400_000;
  const elapsedDays = Math.max(0, (Date.now() - takenAt) / dayMs);
  const daysRemaining = Math.max(0, Math.ceil(windowDays - elapsedDays));
  const pct =
    target && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const isResolved = insight.status === "resolved";

  return (
    <div
      className={`space-y-2 rounded-lg border p-3 ${
        isResolved
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-blue-200 bg-blue-50/60"
      }`}
    >
      <div
        className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
          isResolved ? "text-emerald-900" : "text-blue-900"
        }`}
      >
        <Activity className="size-3.5" />
        {isResolved ? "Outcome — window closed" : "Monitoring outcome"}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span>
          <span className="text-muted-foreground">{trackedMetric}: </span>
          <span className="font-semibold">
            {current}
            {target ? ` / ${target}` : ""}
          </span>
        </span>
        <span className="text-muted-foreground text-xs">
          {isResolved
            ? `Closed after ${windowDays} days`
            : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
        </span>
      </div>

      {target ? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white">
          <div
            data-resolved={isResolved}
            className="h-full rounded-full bg-blue-500 transition-all data-[resolved=true]:bg-emerald-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}

      <p className="text-muted-foreground text-[11px]">
        Updated {new Date(evaluatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function InsightCard({
  insight,
  showLocation,
  onDismiss,
  onTakeAction,
}: Props) {
  const inactive =
    insight.status === "resolved" || insight.status === "action_taken";

  return (
    <Card
      data-priority={insight.priority}
      data-status={insight.status}
      className="group space-y-2.5 rounded-xl border-2 border-border/80 bg-card p-3 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_-2px_rgba(0,0,0,0.04)] transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_20px_-4px_rgba(0,0,0,0.06)]"
    >
      {/* Top row: category badge (left) + priority + trend + status (right) */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={CATEGORY_CLASSES[insight.category]}>
            {INSIGHT_CATEGORY_LABELS[insight.category]}
          </Badge>
          {showLocation && <LocationTag locationName={insight.locationName} />}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge insight={insight} />
          <Badge
            variant="outline"
            className={PRIORITY_CLASSES[insight.priority]}
          >
            {insight.priority.charAt(0).toUpperCase() +
              insight.priority.slice(1)}{" "}
            Priority
          </Badge>
          <span className="inline-flex items-center rounded-md border border-gray-200 bg-white p-1">
            <TrendIcon trend={insight.trend} />
          </span>
        </div>
      </div>

      {/* Title + description */}
      <div className="space-y-0.5">
        <h3 className="text-sm font-bold leading-tight">{insight.title}</h3>
        <p className="text-muted-foreground text-xs leading-snug">
          {insight.description}
        </p>
      </div>

      {/* Impact + Recommendation */}
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-900">
            💡 Impact
          </p>
          <p className="text-[12.5px] leading-snug text-blue-900">
            {insight.impactText}
          </p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
            ✨ Recommendation
          </p>
          <p className="text-[12.5px] leading-snug text-emerald-900">
            {insight.recommendationText}
          </p>
        </div>
      </div>

      {/* Metric chips */}
      {insight.metrics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {insight.metrics.map((metric, idx) => (
            <MetricChip key={`${insight.insightId}-m-${idx}`} chip={metric} />
          ))}
        </div>
      )}

      {/* Outcome tracking — visible once an action has been taken on a campaign-style insight */}
      {insight.outcome &&
        (insight.status === "monitoring" || insight.status === "resolved") && (
          <OutcomeStrip insight={insight} />
        )}

      {/* Optional disclaimer (e.g. pricing insight 4.2) */}
      {insight.disclaimer && (
        <div className="text-muted-foreground flex items-start gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50/50 p-2 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
          <span className="text-amber-900">{insight.disclaimer}</span>
        </div>
      )}

      {/* Footer: timestamp + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-1.5">
        <p className="text-muted-foreground text-[10px]">
          Generated {formatTimestamp(insight.generatedAt)}
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(insight)}
            disabled={inactive}
            className="h-6 px-2 text-[11px]"
          >
            Dismiss
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onTakeAction(insight)}
            disabled={inactive}
            className="h-6 px-2 text-[11px]"
          >
            Take Action
          </Button>
        </div>
      </div>
    </Card>
  );
}
