"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Voicemail,
  Timer,
  Clock,
  CheckCircle2,
  Smile,
  BarChart3,
  Hash,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { DateRangeFilter } from "@/components/calling/DateRangeFilter";
import { MissedCallRecovery } from "@/components/calling/MissedCallRecovery";
import { OutcomeBreakdown } from "@/components/calling/OutcomeBreakdown";
import { TagFrequencyChart } from "@/components/calling/TagFrequencyChart";
import { StaffPerformanceReport } from "@/components/calling/StaffPerformanceReport";
import { LocationScopePicker } from "@/components/hq/LocationScopePicker";
import { useLocationContext } from "@/hooks/use-location-context";
import { deriveLocationId } from "@/data/locations";
import {
  dateRangeBounds,
  previousPeriodBounds,
  PREVIOUS_PERIOD_LABEL,
  type DateRange,
} from "@/lib/calling/date-range";
import {
  computeCallMetrics,
  formatMinSec,
  HEATMAP_DAYS,
  HEATMAP_HOURS,
} from "@/lib/calling/call-metrics";
import { INQUIRY_TAG_META, IVR_KEY_TO_INQUIRY_TAG } from "@/lib/calling/inquiry-tags";
import type { CallLog } from "@/types/communications";
import type { AICallSummary, InquiryTag } from "@/types/calling";

const PERIOD_LABEL: Record<DateRange, string> = {
  all: "All time",
  today: "Today",
  week: "This week",
  month: "Last 30 days",
  custom: "Custom range",
};

// Solid bar colour per IVR option (label/pill live in INQUIRY_TAG_META).
const TAG_BAR: Record<InquiryTag, string> = {
  reception: "bg-gray-400",
  grooming: "bg-purple-500",
  boarding: "bg-green-500",
  billing: "bg-orange-500",
  emergency: "bg-red-500",
  training: "bg-blue-500",
};

// Reverse the IVR key map so each option can show the key callers press.
const TAG_KEY: Partial<Record<InquiryTag, string>> = Object.fromEntries(
  Object.entries(IVR_KEY_TO_INQUIRY_TAG).map(([k, tag]) => [tag, k]),
);

function hourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function intensity(v: number, max: number): string {
  if (v === 0) return "bg-muted/40";
  const pct = max > 0 ? v / max : 0;
  if (pct <= 0.2) return "bg-indigo-100 dark:bg-indigo-950";
  if (pct <= 0.4) return "bg-indigo-200 dark:bg-indigo-900";
  if (pct <= 0.6) return "bg-indigo-300 dark:bg-indigo-800";
  if (pct <= 0.8) return "bg-indigo-400 dark:bg-indigo-700";
  return "bg-indigo-600 dark:bg-indigo-500";
}

export function CallMetricsOverview({
  logs,
  summaries,
  canViewStaffReport = false,
}: {
  logs: CallLog[];
  summaries: AICallSummary[];
  /** Per-staff performance report is manager/owner only. */
  canViewStaffReport?: boolean;
}) {
  const { locations, isMultiLocation } = useLocationContext();
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [locationFilter, setLocationFilter] = useState<string[]>([]);

  // Location filter only — drives the weekly recovery trend (which spans a
  // trailing window independent of the selected period).
  const locationLogs = useMemo(
    () =>
      locationFilter.length === 0
        ? logs
        : logs.filter((c) => locationFilter.includes(deriveLocationId(c.id))),
    [logs, locationFilter],
  );

  // Location + period filtered — drives every period metric.
  const filtered = useMemo(() => {
    const { from, to } = dateRangeBounds(dateRange, customFrom, customTo);
    if (from === null && to === null) return locationLogs;
    return locationLogs.filter((c) => {
      const t = new Date(c.timestamp).getTime();
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    });
  }, [locationLogs, dateRange, customFrom, customTo]);

  // Immediately-preceding period (same length) for outcome comparison.
  const previousLogs = useMemo(() => {
    const b = previousPeriodBounds(dateRange, customFrom, customTo);
    if (!b) return [];
    return locationLogs.filter((c) => {
      const t = new Date(c.timestamp).getTime();
      return t >= b.from && t < b.to;
    });
  }, [locationLogs, dateRange, customFrom, customTo]);

  const m = useMemo(
    () => computeCallMetrics(filtered, summaries),
    [filtered, summaries],
  );

  const sentimentTone =
    m.avgSentiment === null
      ? "slate"
      : m.avgSentiment >= 7
        ? "emerald"
        : m.avgSentiment >= 5
          ? "amber"
          : "rose";

  const ivrMax = m.byIvrOption[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Call Metrics</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Live from the call log · {PERIOD_LABEL[dateRange]} ·{" "}
            <span className="font-medium text-foreground">{m.total}</span> call
            {m.total === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isMultiLocation && (
            <LocationScopePicker
              locations={locations}
              value={locationFilter}
              onChange={setLocationFilter}
              compact
            />
          )}
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            customFrom={customFrom}
            onCustomFrom={setCustomFrom}
            customTo={customTo}
            onCustomTo={setCustomTo}
          />
        </div>
      </div>

      {/* Headline business metric: missed-call recovery rate + weekly trend */}
      <MissedCallRecovery
        periodLogs={filtered}
        trendLogs={locationLogs}
        periodLabel={PERIOD_LABEL[dateRange]}
      />

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Total Calls"
          value={m.total}
          hint="In selected period"
          icon={Phone}
          tone="indigo"
        />
        <KpiTile
          label="Missed Call Rate"
          value={`${Math.round(m.missedRate)}%`}
          hint={`${m.missed} missed`}
          icon={PhoneOff}
          tone="rose"
        />
        <KpiTile
          label="Avg Queue Wait"
          value={m.avgQueueWait >= 60 ? formatMinSec(m.avgQueueWait) : `${m.avgQueueWait}s`}
          hint={`${m.queueWaitSamples} call${m.queueWaitSamples === 1 ? "" : "s"} queued`}
          icon={Timer}
          tone="amber"
        />
        <KpiTile
          label="Avg Call Duration"
          value={formatMinSec(m.avgDuration)}
          hint={`${m.answeredSamples} answered`}
          icon={Clock}
          tone="slate"
        />
        <KpiTile
          label="Voicemail Rate"
          value={`${Math.round(m.voicemailRate)}%`}
          hint={`${m.voicemail} voicemail${m.voicemail === 1 ? "" : "s"}`}
          icon={Voicemail}
          tone="violet"
        />
        <KpiTile
          label="Follow-up Completion"
          value={`${Math.round(m.followUpRate)}%`}
          hint={`${m.followUpResolved} of ${m.followUpTotal} missed resolved`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label="Avg AI Sentiment"
          value={m.avgSentiment === null ? "—" : `${m.avgSentiment.toFixed(1)}/10`}
          hint={`${m.sentimentSamples} call${m.sentimentSamples === 1 ? "" : "s"} analyzed`}
          icon={Smile}
          tone={sentimentTone}
        />
      </div>

      {/* Outcome breakdown donut + period-over-period comparison */}
      <OutcomeBreakdown
        logs={filtered}
        previousLogs={previousLogs}
        comparisonLabel={PREVIOUS_PERIOD_LABEL[dateRange]}
      />

      {/* Call-tag frequency + spike detection */}
      <TagFrequencyChart
        logs={filtered}
        previousLogs={previousLogs}
        comparisonLabel={PREVIOUS_PERIOD_LABEL[dateRange]}
      />

      {/* IVR option breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="size-4 text-indigo-600" />
            Calls by IVR Menu Option
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            What inbound callers press most — reveals demand by department.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {m.byIvrOption.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tagged inbound calls in this period.
            </p>
          )}
          {m.byIvrOption.map(({ tag, count }) => (
            <div key={tag}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px] tabular-nums">
                    {TAG_KEY[tag] ? `Press ${TAG_KEY[tag]}` : "—"}
                  </Badge>
                  <span className="font-medium">{INQUIRY_TAG_META[tag].label}</span>
                </span>
                <span className="font-semibold tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-2 rounded-full transition-all", TAG_BAR[tag])}
                  style={{ width: `${(count / ivrMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Calls-by-hour heatmap (7 × 24) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4 text-indigo-600" />
            Calls by Hour of Day
          </CardTitle>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            Day × hour volume — darker means busier. Reveals understaffed hours.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-1">
            <div className="inline-block min-w-max">
              {/* Hour header */}
              <div className="flex">
                <div className="w-9 shrink-0" />
                {HEATMAP_HOURS.map((h) => (
                  <div
                    key={h}
                    className="w-6 shrink-0 text-center text-[9px] text-muted-foreground"
                  >
                    {h % 3 === 0 ? hourLabel(h) : ""}
                  </div>
                ))}
              </div>
              {/* Day rows */}
              {HEATMAP_DAYS.map((day, di) => (
                <div key={day} className="flex items-center">
                  <div className="w-9 shrink-0 pr-1.5 text-right text-[11px] font-medium text-muted-foreground">
                    {day}
                  </div>
                  {HEATMAP_HOURS.map((h) => {
                    const v = m.heatmap[di][h];
                    return (
                      <div key={h} className="w-6 shrink-0 p-0.5">
                        <div
                          title={`${day} ${hourLabel(h)} — ${v} call${v === 1 ? "" : "s"}`}
                          className={cn(
                            "h-5 w-full rounded-sm",
                            intensity(v, m.heatmapMax),
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Fewer</span>
            <div className="flex items-center gap-0.5">
              {[
                "bg-muted/40",
                "bg-indigo-100 dark:bg-indigo-950",
                "bg-indigo-200 dark:bg-indigo-900",
                "bg-indigo-300 dark:bg-indigo-800",
                "bg-indigo-400 dark:bg-indigo-700",
                "bg-indigo-600 dark:bg-indigo-500",
              ].map((c) => (
                <div key={c} className={cn("size-3 rounded-sm", c)} />
              ))}
            </div>
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* Per-staff performance — manager/owner only */}
      {canViewStaffReport && (
        <StaffPerformanceReport
          logs={filtered}
          summaries={summaries}
          periodLabel={PERIOD_LABEL[dateRange]}
        />
      )}
    </div>
  );
}
