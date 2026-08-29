"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Inbox,
  Loader2,
  MessageSquare,
  Send,
  ShieldOff,
  Star,
  ThumbsUp,
} from "lucide-react";

import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { ReportRangePicker } from "@/components/reports/report-range-picker";
import {
  defaultReportRange,
  type ReportRange,
} from "@/components/reports/report-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  asPercent,
  denominatorLabel,
  reputationAnalyticsQueries,
  type ReputationAnalytics,
} from "@/lib/api/reputation-analytics";
import { cn } from "@/lib/utils";

// ============================================================================
// Overview and Performance, collapsed into one screen over one dataset.
//
// ── WHY THEY ARE ONE THING NOW ────────────────────────────────────────────
//
// They were three screens over three datasets: Overview and Performance
// described one location, Locations described the network, and nothing on
// screen said which. Overview reported 312 requests and 247 ratings; Locations
// reported 351 reviews for the same period. Both were internally consistent and
// they were not the same question.
//
// A scope control cannot fix that on its own, because the underlying figures
// were computed in different places. So there is one query, and every number
// here is a field of its answer.
//
// ── EVERY CARD PRINTS ITS DENOMINATOR ─────────────────────────────────────
//
// "Public conversions 41.3%" was unresolvable from the shipped screen: 41.3% of
// 247 is 102, of 312 is 129, and nothing said which. The subtitle under each
// figure is not decoration — it is the fix, and it comes from the payload
// rather than from anything this file computes.
//
// ── AND NO NUMBER IS INVENTED WHEN THERE IS NO DATA ───────────────────────
//
// A null value renders as an em dash. A facility with no reviews this month
// sees "—", never "0%", because 0% reads as a failure and is a false statement
// about an empty set.
// ============================================================================

export function ReputationAnalyticsTab() {
  const [range, setRange] = useState<ReportRange>(defaultReportRange("30d"));

  const { data, isPending, error } = useQuery(
    reputationAnalyticsQueries.forRange({ from: range.from, to: range.to }),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Reviews in this period
          </h2>
          <p className="text-muted-foreground text-sm">
            Every figure below is drawn from the same set of requests, and says
            what it is a share of.
          </p>
        </div>
        <ReportRangePicker value={range} onChange={setRange} />
      </div>

      {error ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            {error instanceof Error
              ? error.message
              : "Could not read the review figures."}
          </CardContent>
        </Card>
      ) : isPending ? (
        <div className="flex justify-center py-16">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : (
        <Analytics data={data} />
      )}
    </div>
  );
}

function Analytics({ data }: { data: ReputationAnalytics }) {
  const m = data.metrics;
  const asked = m.requestsSent.numerator;

  if (asked === 0 && m.suppressionRate.numerator === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
            <Inbox className="size-6" />
          </div>
          <div>
            <p className="font-medium">Nobody has been asked yet</p>
            {/* The likeliest cause by a wide margin, and it costs one click.
                Seeded automation rules ship disabled, so a facility that has
                never opened Automations sends nothing and has nothing here. */}
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Review requests go out after check-out, once the “Review Request”
              automation is switched on. Until then this stays empty.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Asked"
          value={asked}
          hint={m.requestsSent.definition}
          icon={Send}
          tone="indigo"
        />
        <KpiTile
          label="Response rate"
          value={asPercent(m.responseRate)}
          hint={denominatorLabel(m.responseRate, "asked")}
          icon={MessageSquare}
          tone="violet"
        />
        <KpiTile
          label="Average rating"
          value={m.averageRating.value ?? "—"}
          hint={denominatorLabel(m.averageRating, "responses")}
          icon={Star}
          tone="amber"
        />
        <KpiTile
          label="Escalated"
          value={asPercent(m.detractorRate)}
          hint={denominatorLabel(m.detractorRate, "responses")}
          icon={AlertTriangle}
          tone={m.detractorRate.numerator > 0 ? "rose" : "emerald"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Five stars"
          value={asPercent(m.fiveStarShare)}
          hint={denominatorLabel(m.fiveStarShare, "responses")}
          icon={ThumbsUp}
          tone="emerald"
        />
        <KpiTile
          label="Went public"
          value={asPercent(m.publicClickRate)}
          hint={denominatorLabel(m.publicClickRate, "responses")}
          icon={Star}
          tone="violet"
        />
        <KpiTile
          label="Nudge recovery"
          value={asPercent(m.nudgeRecovery)}
          hint={denominatorLabel(m.nudgeRecovery, "nudges")}
          icon={MessageSquare}
          tone="indigo"
        />
        <KpiTile
          label="Not asked"
          value={asPercent(m.suppressionRate)}
          hint={denominatorLabel(m.suppressionRate, "visits")}
          icon={ShieldOff}
          tone="slate"
        />
      </div>

      <SentimentBar data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <StaffTable data={data} />
        <ServiceTable data={data} />
      </div>
    </div>
  );
}

/**
 * The three buckets, as one bar.
 *
 * Rendered from the counts, never from stored percentages. The shipped screen's
 * distribution summed to 99% because four percentages were typed separately;
 * here the widths are shares of a total that is by construction their sum.
 */
function SentimentBar({ data }: { data: ReputationAnalytics }) {
  const s = data.metrics.sentiment;
  if (s.total === 0) return null;

  const bands = [
    {
      key: "positive",
      label: "4–5★",
      count: s.positive,
      cls: "bg-emerald-500",
    },
    { key: "neutral", label: "3★", count: s.neutral, cls: "bg-amber-400" },
    { key: "negative", label: "1–2★", count: s.negative, cls: "bg-rose-500" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">How people rated</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
          {bands.map((band) => (
            <div
              key={band.key}
              className={band.cls}
              style={{ width: `${(band.count / s.total) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {bands.map((band) => (
            <div key={band.key} className="flex items-center gap-2 text-xs">
              <span className={cn("size-2 rounded-full", band.cls)} />
              <span className="font-medium">{band.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {band.count}
              </span>
            </div>
          ))}
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {s.total} responses in total
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Per staff, with the two columns kept apart.
 *
 * `Reviews` is single-valued and sums to the response total. `Mentions` counts
 * every response whose visit included this person and may legitimately exceed
 * it. The shipped screen showed one number, computed the second way, labelled
 * the first — 323 against 247 ratings — and the header here says which is which
 * so the same number cannot be read as the other again.
 */
function StaffTable({ data }: { data: ReputationAnalytics }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">By staff member</CardTitle>
        <p className="text-muted-foreground text-xs">
          <span className="font-medium">Reviews</span> are ratings attributed to
          one person and add up to the total.{" "}
          <span className="font-medium">Mentions</span> count every visit they
          were on, so they can add up to more.
        </p>
      </CardHeader>
      <CardContent>
        {data.staff.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No ratings attributed yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs">
                <th className="py-2 text-left font-medium">Staff</th>
                <th className="py-2 text-right font-medium">Reviews</th>
                <th className="py-2 text-right font-medium">Mentions</th>
                <th className="py-2 text-right font-medium">Average</th>
                <th className="py-2 text-right font-medium">Praise</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((row) => (
                <tr key={row.staff_id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{row.staff_name}</td>
                  <td className="py-2 text-right tabular-nums">
                    {row.reviews}
                  </td>
                  <td className="text-muted-foreground py-2 text-right tabular-nums">
                    {row.mentions}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.average_rating ?? "—"}
                  </td>
                  <td className="text-muted-foreground py-2 text-right tabular-nums">
                    {row.praise}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function ServiceTable({ data }: { data: ReputationAnalytics }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">By service</CardTitle>
        <p className="text-muted-foreground text-xs">
          {/* A groom inside a boarding stay is ONE visit and one request, and it
              appears under both services. So these rows deliberately do not add
              up to the number asked, and saying so is cheaper than a footnote
              somebody reads after drawing a conclusion. */}
          A visit covering two services is counted under both, so these can add
          up to more than the number asked.
        </p>
      </CardHeader>
      <CardContent>
        {data.services.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nothing yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-xs">
                <th className="py-2 text-left font-medium">Service</th>
                <th className="py-2 text-right font-medium">Asked</th>
                <th className="py-2 text-right font-medium">Answered</th>
                <th className="py-2 text-right font-medium">Average</th>
                <th className="py-2 text-right font-medium">Escalated</th>
              </tr>
            </thead>
            <tbody>
              {data.services.map((row) => (
                <tr key={row.service_type} className="border-b last:border-0">
                  <td className="py-2 font-medium capitalize">
                    {row.service_type}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.requests}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.responses}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.average_rating ?? "—"}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {row.detractors}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
