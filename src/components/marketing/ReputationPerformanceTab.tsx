"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import {
  Star,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Award,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reputationQueries } from "@/lib/api/reputation";
import type { ReputationStaffStat, ReputationServiceStat } from "@/types/reputation";

type LeaderboardTab = "staff" | "services";

// ─── Star display ─────────────────────────────────────────────────────────────

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

// ─── Rank chip ────────────────────────────────────────────────────────────────

function RankChip({ rank }: { rank: number }) {
  const styles =
    rank === 1
      ? "bg-amber-400 text-white"
      : rank === 2
        ? "bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-100"
        : rank === 3
          ? "bg-amber-700/80 text-white"
          : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        styles,
      )}
    >
      {rank === 1 ? <Trophy className="size-3" /> : rank}
    </span>
  );
}

// ─── Rating pill ──────────────────────────────────────────────────────────────

function RatingPill({ value }: { value: number }) {
  const styles =
    value >= 4.5
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : value >= 4
        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
        : value >= 3
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        styles,
      )}
    >
      <Star className="size-3 fill-current" />
      {value.toFixed(1)}
    </span>
  );
}

// ─── Staff row ────────────────────────────────────────────────────────────────

function StaffRow({
  stat,
  rank,
  expanded,
  onToggle,
}: {
  stat: ReputationStaffStat;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const deltaColor =
    stat.ratingDelta > 0
      ? "text-emerald-600"
      : stat.ratingDelta < 0
        ? "text-red-600"
        : "text-muted-foreground";
  const hasPraise = stat.praiseComments.length > 0;

  return (
    <>
      <tr
        className={cn(
          "border-t transition-colors",
          hasPraise && "cursor-pointer hover:bg-muted/30",
          expanded && "bg-muted/20",
        )}
        onClick={hasPraise ? onToggle : undefined}
      >
        <td className="py-3 pl-5 pr-3">
          <div className="flex items-center gap-2.5">
            <RankChip rank={rank} />
            <div className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {stat.staffName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{stat.staffName}</p>
              <p className="text-muted-foreground truncate text-[11px]">
                {stat.role}
              </p>
            </div>
          </div>
        </td>

        <td className="px-3 py-3">
          <RatingPill value={stat.averageRating} />
        </td>

        <td className="px-3 py-3">
          <span className="text-foreground inline-flex items-center gap-1 text-xs">
            <MessageSquare className="size-3 opacity-60" />
            {stat.totalReviews}
          </span>
        </td>

        <td className="px-3 py-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <ThumbsUp className="size-3" />
              {stat.positiveCount}
            </span>
            {stat.negativeCount > 0 && (
              <span className="inline-flex items-center gap-1 text-red-600">
                <ThumbsDown className="size-3" />
                {stat.negativeCount}
              </span>
            )}
          </div>
        </td>

        <td className="px-3 py-3">
          <div className={cn("inline-flex items-center gap-1 text-xs font-medium", deltaColor)}>
            {stat.ratingDelta > 0 && <TrendingUp className="size-3.5" />}
            {stat.ratingDelta < 0 && <TrendingDown className="size-3.5" />}
            {stat.ratingDelta === 0 && <Minus className="size-3.5" />}
            <span>
              {stat.ratingDelta > 0
                ? `+${stat.ratingDelta}`
                : stat.ratingDelta === 0
                  ? "—"
                  : stat.ratingDelta}
            </span>
          </div>
        </td>

        <td className="py-3 pl-3 pr-5 text-right">
          {hasPraise ? (
            <span className="text-primary inline-flex items-center gap-1 text-[11px] font-medium">
              <Award className="size-3" />
              {stat.praiseComments.length}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>
      </tr>

      {expanded && hasPraise && (
        <tr className="bg-muted/10 border-t">
          <td colSpan={6} className="px-5 py-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Praise comments
            </p>
            <div className="space-y-1.5">
              {stat.praiseComments.map((c, i) => (
                <p
                  key={i}
                  className="text-muted-foreground rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs italic dark:border-emerald-900 dark:bg-emerald-950/30"
                >
                  "{c}"
                </p>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Service row ──────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, string> = {
  grooming: "✂️",
  boarding: "🏠",
  training: "🎓",
  daycare: "☀️",
};

function ServiceRow({ stat, rank }: { stat: ReputationServiceStat; rank: number }) {
  const icon = SERVICE_ICONS[stat.service] ?? "🐾";
  const responseColor =
    stat.responseRate >= 80
      ? "text-emerald-600"
      : stat.responseRate >= 60
        ? "text-amber-600"
        : "text-red-600";

  return (
    <tr className="border-t hover:bg-muted/30 transition-colors">
      <td className="py-3 pl-5 pr-3">
        <div className="flex items-center gap-2.5">
          <RankChip rank={rank} />
          <div className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-lg text-base">
            {icon}
          </div>
          <p className="truncate text-sm font-medium">{stat.serviceLabel}</p>
        </div>
      </td>

      <td className="px-3 py-3">
        <RatingPill value={stat.averageRating} />
      </td>

      <td className="px-3 py-3">
        <span className="text-muted-foreground text-xs">{stat.totalRequests}</span>
      </td>

      <td className="px-3 py-3">
        <span className="text-muted-foreground text-xs">{stat.totalRatings}</span>
      </td>

      <td className="px-3 py-3">
        <span className={cn("text-xs font-medium tabular-nums", responseColor)}>
          {stat.responseRate}%
        </span>
      </td>

      <td className="py-3 pl-3 pr-5 text-right">
        {stat.negativeCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
            <ThumbsDown className="size-3" />
            {stat.negativeCount}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── Performance tab ─────────────────────────────────────────────────────────

const LEADERBOARD_TABS: { value: LeaderboardTab; label: string; icon: typeof Users }[] = [
  { value: "staff", label: "Staff", icon: Users },
  { value: "services", label: "Services", icon: Award },
];

export function ReputationPerformanceTab() {
  const { data: staffStats = [] } = useQuery(reputationQueries.staffStats());
  const { data: serviceStats = [] } = useQuery(reputationQueries.serviceStats());

  const [tab, setTab] = useState<LeaderboardTab>("staff");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const sortedStaff = [...staffStats].sort((a, b) => b.averageRating - a.averageRating);
  const sortedServices = [...serviceStats].sort((a, b) => b.averageRating - a.averageRating);

  const topStaff = sortedStaff[0];
  const topService = sortedServices[0];

  const counts = {
    staff: sortedStaff.length,
    services: sortedServices.length,
  };

  return (
    <div className="space-y-5">
      {/* Hero spotlight */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {topStaff && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="px-3 py-2.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                <Trophy className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider leading-none">
                  Top Rated Staff
                </p>
                <p className="text-sm font-semibold mt-1 truncate">{topStaff.staffName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Stars rating={topStaff.averageRating} />
                  <span className="text-xs font-semibold tabular-nums">
                    {topStaff.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {topStaff.totalReviews} reviews
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {topService && (
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="px-3 py-2.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-400/20 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider leading-none">
                  Highest Rated Service
                </p>
                <p className="text-sm font-semibold mt-1 truncate">{topService.serviceLabel}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Stars rating={topService.averageRating} />
                  <span className="text-xs font-semibold tabular-nums">
                    {topService.averageRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {topService.responseRate}% response rate
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Leaderboard tabs (shift-swaps style) */}
      <div className="flex border-b">
        {LEADERBOARD_TABS.map((t) => {
          const isActive = tab === t.value;
          const count = counts[t.value];
          const Icon = t.icon;
          return (
            <button
              key={t.value}
              onClick={() => {
                setTab(t.value);
                setExpandedId(null);
              }}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
              {count > 0 && (
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="overflow-x-auto">
          {tab === "staff" ? (
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-5 pr-3 text-left">Staff</th>
                  <th className="px-3 py-3 text-left">Avg Rating</th>
                  <th className="px-3 py-3 text-left">Reviews</th>
                  <th className="px-3 py-3 text-left">Sentiment</th>
                  <th className="px-3 py-3 text-left">Trend</th>
                  <th className="py-3 pl-3 pr-5 text-right">Praise</th>
                </tr>
              </thead>
              <tbody>
                {sortedStaff.map((stat, i) => (
                  <StaffRow
                    key={stat.staffId}
                    stat={stat}
                    rank={i + 1}
                    expanded={expandedId === stat.staffId}
                    onToggle={() =>
                      setExpandedId((cur) =>
                        cur === stat.staffId ? null : stat.staffId,
                      )
                    }
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-5 pr-3 text-left">Service</th>
                  <th className="px-3 py-3 text-left">Avg Rating</th>
                  <th className="px-3 py-3 text-left">Sent</th>
                  <th className="px-3 py-3 text-left">Rated</th>
                  <th className="px-3 py-3 text-left">Response Rate</th>
                  <th className="py-3 pl-3 pr-5 text-right">Negative</th>
                </tr>
              </thead>
              <tbody>
                {sortedServices.map((stat, i) => (
                  <ServiceRow key={stat.service} stat={stat} rank={i + 1} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
