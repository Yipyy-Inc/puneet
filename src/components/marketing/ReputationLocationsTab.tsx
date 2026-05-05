"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, AlertTriangle, ThumbsUp, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocationContext } from "@/hooks/use-location-context";

// Mock per-location reputation metrics
const LOCATION_METRICS: Record<
  string,
  {
    avgRating: number;
    totalReviews: number;
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
    flaggedNegative: number;
    requestsSent: number;
    requestsConverted: number;
    responseRate: number;
  }
> = {
  "loc-dv-main": {
    avgRating: 4.9,
    totalReviews: 184,
    fiveStar: 162,
    fourStar: 16,
    threeStar: 4,
    twoStar: 1,
    oneStar: 1,
    flaggedNegative: 2,
    requestsSent: 312,
    requestsConverted: 184,
    responseRate: 59,
  },
  "loc-dv-ouest": {
    avgRating: 4.7,
    totalReviews: 96,
    fiveStar: 78,
    fourStar: 12,
    threeStar: 4,
    twoStar: 1,
    oneStar: 1,
    flaggedNegative: 2,
    requestsSent: 198,
    requestsConverted: 96,
    responseRate: 48,
  },
  "loc-dv-laval": {
    avgRating: 4.4,
    totalReviews: 71,
    fiveStar: 48,
    fourStar: 14,
    threeStar: 5,
    twoStar: 2,
    oneStar: 2,
    flaggedNegative: 4,
    requestsSent: 241,
    requestsConverted: 71,
    responseRate: 29,
  },
};

export function ReputationLocationsTab() {
  const { locations, isMultiLocation } = useLocationContext();

  const ranked = useMemo(() => {
    return locations
      .map((loc) => ({
        loc,
        metrics: LOCATION_METRICS[loc.id] ?? null,
      }))
      .filter((r): r is { loc: typeof r.loc; metrics: NonNullable<typeof r.metrics> } => r.metrics !== null)
      .sort((a, b) => b.metrics.avgRating - a.metrics.avgRating);
  }, [locations]);

  const networkAvg =
    ranked.reduce((sum, r) => sum + r.metrics.avgRating * r.metrics.totalReviews, 0) /
    Math.max(
      ranked.reduce((sum, r) => sum + r.metrics.totalReviews, 0),
      1,
    );

  const totalReviews = ranked.reduce((sum, r) => sum + r.metrics.totalReviews, 0);
  const totalFiveStar = ranked.reduce((sum, r) => sum + r.metrics.fiveStar, 0);
  const totalFlagged = ranked.reduce((sum, r) => sum + r.metrics.flaggedNegative, 0);

  if (!isMultiLocation) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-12 text-center">
          <MapPin className="mx-auto mb-3 size-10 opacity-30" />
          <p className="font-medium">Single location</p>
          <p className="text-sm">
            Multi-location reputation comparison appears once you have 2+ branches.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Network summary */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          icon={Star}
          label="Network rating"
          value={networkAvg.toFixed(2)}
          sub="Weighted across all locations"
          accent="text-amber-600 bg-amber-100"
        />
        <SummaryTile
          icon={ThumbsUp}
          label="5-star reviews"
          value={totalFiveStar.toLocaleString()}
          sub={`${((totalFiveStar / totalReviews) * 100).toFixed(0)}% of total`}
          accent="text-emerald-600 bg-emerald-100"
        />
        <SummaryTile
          icon={Trophy}
          label="Top location"
          value={ranked[0]?.loc.shortCode ?? "—"}
          sub={`${ranked[0]?.metrics.avgRating.toFixed(2) ?? "—"}★ avg`}
          accent="text-violet-600 bg-violet-100"
        />
        <SummaryTile
          icon={AlertTriangle}
          label="Flagged negative"
          value={totalFlagged.toLocaleString()}
          sub="Require manager review"
          accent="text-rose-600 bg-rose-100"
        />
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location Leaderboard</CardTitle>
          <p className="text-muted-foreground text-xs">
            Ranked by average rating · click any location to dig in
          </p>
        </CardHeader>
        <CardContent className="px-0">
          <div className="divide-y">
            {ranked.map((row, idx) => {
              const m = row.metrics;
              const isTop = idx === 0;
              const isBottom = idx === ranked.length - 1 && ranked.length > 1;
              const conversionRate = (m.requestsConverted / m.requestsSent) * 100;

              return (
                <div
                  key={row.loc.id}
                  className={cn(
                    "flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30",
                    isTop && "bg-amber-50/40 dark:bg-amber-900/10",
                    isBottom && "bg-rose-50/40 dark:bg-rose-900/10",
                  )}
                >
                  {/* Rank */}
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold",
                      isTop
                        ? "bg-amber-500 text-white"
                        : isBottom
                          ? "bg-rose-500 text-white"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isTop ? <Trophy className="size-5" /> : `#${idx + 1}`}
                  </div>

                  {/* Identity */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: row.loc.color }}
                      />
                      <p className="text-sm font-semibold">{row.loc.name}</p>
                      {isBottom && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-rose-300 bg-rose-50 text-[10px] text-rose-700"
                        >
                          <AlertTriangle className="size-3" />
                          Needs attention
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      {m.totalReviews} review{m.totalReviews === 1 ? "" : "s"} ·
                      {" "}{m.requestsSent} requests sent · {conversionRate.toFixed(0)}% conversion
                    </p>
                  </div>

                  {/* Star bar */}
                  <div className="flex w-44 items-center gap-1 text-amber-500">
                    <span className="text-base font-bold tabular-nums">
                      {m.avgRating.toFixed(2)}
                    </span>
                    <Star className="size-4" fill="currentColor" />
                  </div>

                  {/* Histogram */}
                  <div className="hidden w-48 space-y-0.5 lg:block">
                    {[
                      { stars: 5, count: m.fiveStar, color: "bg-emerald-500" },
                      { stars: 4, count: m.fourStar, color: "bg-emerald-400" },
                      { stars: 3, count: m.threeStar, color: "bg-amber-400" },
                      { stars: 2, count: m.twoStar, color: "bg-orange-500" },
                      { stars: 1, count: m.oneStar, color: "bg-rose-500" },
                    ].map((s) => {
                      const pct = (s.count / Math.max(m.totalReviews, 1)) * 100;
                      return (
                        <div
                          key={s.stars}
                          className="flex items-center gap-1.5 text-[10px]"
                        >
                          <span className="text-muted-foreground w-3">
                            {s.stars}★
                          </span>
                          <div className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
                            <div
                              className={cn("h-full rounded-full", s.color)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground tabular-nums w-6 text-right">
                            {s.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Flagged */}
                  {m.flaggedNegative > 0 && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-rose-300 bg-rose-50 text-[10px] text-rose-700"
                    >
                      <AlertTriangle className="size-3" />
                      {m.flaggedNegative} flagged
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-[11px]">
        Tip: Drill into the lowest-ranked location and look at flagged reviews
        to find systemic issues — one bad shift, one staffing gap, one process.
      </p>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("flex size-10 items-center justify-center rounded-lg", accent)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-muted-foreground text-[10px]">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}
