"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Gauge,
  Minus,
  Phone,
  PhoneForwarded,
  PhoneMissed,
  Timer,
  TrendingDown,
  TrendingUp,
  Voicemail,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import { useSupportCallLog } from "@/lib/support-call-log-store";
import { useSupportRecordings } from "@/lib/support-recording-store";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  buildSupportCallAnalytics,
} from "@/lib/support-call-analytics";
import { formatDuration } from "./call-log-utils";
import { OutcomeDonut } from "./outcome-donut";
import { RecoveryTrendChart } from "./recovery-trend-chart";
import { TagFrequencyBars } from "./tag-frequency-bars";

function sentimentTone(score: number | null): "emerald" | "amber" | "rose" {
  if (score == null || score < 5) return "rose";
  if (score >= 7) return "emerald";
  return "amber";
}

export function AnalyticsTab() {
  const callLog = useSupportCallLog();
  const recordings = useSupportRecordings();
  const hydrated = useHydrated();
  const [nowMs] = useState(() => Date.now());

  const [location, setLocation] = useState("all");
  const [range, setRange] = useState<AnalyticsRange>("30d");

  const teams = useMemo(
    () => [...new Set(callLog.map((c) => c.team))].sort(),
    [callLog],
  );

  const a = useMemo(
    () =>
      buildSupportCallAnalytics(callLog, recordings, nowMs, range, location),
    [callLog, recordings, nowMs, range, location],
  );

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const firstWeek = a.weeklyTrend[0]?.rate ?? 0;
  const lastWeek = a.weeklyTrend[a.weeklyTrend.length - 1]?.rate ?? 0;
  const delta = lastWeek - firstWeek;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {teams.length > 1 && (
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={range}
          onValueChange={(v) => setRange(v as AnalyticsRange)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {ANALYTICS_RANGES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Missed Call Recovery Rate + 8-week trend */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-muted-foreground text-sm font-medium">
                Missed Call Recovery Rate
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round(a.recovery.rate)}%
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    delta > 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : delta < 0
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  <DeltaIcon className="size-3" />
                  {delta > 0 ? "+" : ""}
                  {delta}pp · 8 wks
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                {a.recovery.recovered} of {a.recovery.totalMissed} missed calls
                called back &amp; resolved
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <PhoneForwarded className="size-5" />
            </span>
          </div>

          <div className="mt-4">
            <p className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-wide uppercase">
              8-week recovery trend
            </p>
            <RecoveryTrendChart weeks={a.weeklyTrend} />
          </div>
        </CardContent>
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Total Calls"
          value={a.kpis.totalCalls}
          hint="In selected period"
          icon={Phone}
          tone="indigo"
        />
        <KpiTile
          label="Missed Call Rate"
          value={`${Math.round(a.kpis.missedCallRate)}%`}
          icon={PhoneMissed}
          tone="rose"
        />
        <KpiTile
          label="Avg Queue Wait"
          value={`${a.kpis.avgQueueWaitSeconds}s`}
          icon={Timer}
          tone="amber"
        />
        <KpiTile
          label="Avg Call Duration"
          value={formatDuration(a.kpis.avgDurationSeconds)}
          icon={Clock}
          tone="slate"
        />
        <KpiTile
          label="Voicemail Rate"
          value={`${Math.round(a.kpis.voicemailRate)}%`}
          icon={Voicemail}
          tone="violet"
        />
        <KpiTile
          label="Follow-Up Completion"
          value={`${Math.round(a.kpis.followUpCompletionRate)}%`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Avg AI Sentiment"
          value={
            a.kpis.avgSentiment != null
              ? `${a.kpis.avgSentiment.toFixed(1)}/10`
              : "—"
          }
          hint="Below 5 flags for review"
          icon={Gauge}
          tone={sentimentTone(a.kpis.avgSentiment)}
        />
      </div>

      {/* Outcome donut + tag frequency */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Call Outcome Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <OutcomeDonut outcomes={a.outcomes} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Call Tag Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            <TagFrequencyBars tags={a.tagFrequency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
