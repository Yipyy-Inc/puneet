"use client";

import Link from "next/link";
import { Phone, Lightbulb, ExternalLink, TrendingUp } from "lucide-react";
import { DrawerFooter } from "../shared/DrawerFooter";
import { insightLinks } from "@/lib/smart-insights/links";
import type { InsightActionType } from "@/types/smart-insights";
import type { InsightPanelProps } from "../panel-types";

/**
 * Shared drawer for all calling-sourced insights (missed-call spike, sentiment
 * drop, peak-hour gap, keyword trend, upsell untaken). Fully insight-driven —
 * renders the insight's own metrics + recommendation and deep-links to the
 * relevant module to act. One panel for all five types (no per-type duplication).
 */

const ACTION_LINK: Partial<
  Record<InsightActionType, { href: string; label: string }>
> = {
  call_missed_spike: { href: insightLinks.calling("missed"), label: "Open missed calls in Calling" },
  call_sentiment_drop: { href: insightLinks.calling(), label: "Open call analytics" },
  call_peak_hour_gap: { href: insightLinks.schedule(), label: "Open staff schedule" },
  call_keyword_trend: { href: insightLinks.calling(), label: "Open call recordings" },
  call_upsell_untaken: { href: insightLinks.calling(), label: "Open call analytics" },
};

export function CallingInsightPanel({ insight, onComplete, onCancel }: InsightPanelProps) {
  const link = ACTION_LINK[insight.actionType] ?? {
    href: insightLinks.calling(),
    label: "Open Calling module",
  };

  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-sky-50 p-3 text-sm dark:bg-sky-950/30">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-sky-900 dark:text-sky-200">
          <Phone className="size-3.5" />
          Sourced from calling analytics
        </div>
        <p className="text-sky-900 dark:text-sky-100">{insight.description}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {insight.metrics.map((m) => (
          <div key={m.label} className="rounded-md border bg-card px-3 py-2">
            <p className="text-base font-semibold tabular-nums">{m.value}</p>
            <p className="text-muted-foreground text-[11px]">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Why it matters */}
      <div className="flex items-start gap-2 text-sm">
        <TrendingUp className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <p className="text-muted-foreground">{insight.impactText}</p>
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/30">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-900 dark:text-amber-100">
          {insight.recommendationText}
        </p>
      </div>

      <Link
        href={link.href}
        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 self-start text-xs hover:underline"
      >
        <ExternalLink className="size-3" />
        {link.label}
      </Link>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Mark reviewed"
          onPrimary={() => onComplete()}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
