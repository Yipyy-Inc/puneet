"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { reputationQueries } from "@/lib/api/reputation";
import type { ReputationStaffStat, ReputationServiceStat } from "@/types/reputation";

// ─── Star display ─────────────────────────────────────────────────────────────

function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} className={`h-4 w-4 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`} />
      ))}
    </div>
  );
}

// ─── Rank medal ───────────────────────────────────────────────────────────────

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-white font-bold text-sm shadow-md">
      <Trophy className="h-4 w-4" />
    </div>
  );
  if (rank === 2) return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-300 text-slate-700 font-bold text-sm shadow">
      2
    </div>
  );
  if (rank === 3) return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700/80 text-white font-bold text-sm shadow">
      3
    </div>
  );
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold text-sm">
      {rank}
    </div>
  );
}

// ─── Rating bar ───────────────────────────────────────────────────────────────

function MiniRatingBar({ value }: { value: number }) {
  const pct = (value / 5) * 100;
  const color = value >= 4.5 ? "bg-emerald-500" : value >= 4 ? "bg-blue-500" : value >= 3 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-8">{value.toFixed(1)}</span>
    </div>
  );
}

// ─── Staff card ───────────────────────────────────────────────────────────────

function StaffCard({ stat, rank }: { stat: ReputationStaffStat; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const deltaColor = stat.ratingDelta > 0 ? "text-emerald-600" : stat.ratingDelta < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <Card className={`transition-shadow hover:shadow-md ${rank === 1 ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <RankMedal rank={rank} />

          {/* Avatar */}
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-base font-bold text-primary shrink-0">
            {stat.staffName.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold leading-tight">{stat.staffName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.role}</p>
              </div>
              <div className="flex items-center gap-1">
                {stat.ratingDelta > 0 && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                {stat.ratingDelta < 0 && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                {stat.ratingDelta === 0 && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={`text-xs font-medium ${deltaColor}`}>
                  {stat.ratingDelta > 0 ? `+${stat.ratingDelta}` : stat.ratingDelta === 0 ? "Stable" : stat.ratingDelta}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <MiniRatingBar value={stat.averageRating} />
            </div>

            <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {stat.totalReviews} reviews
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <ThumbsUp className="h-3 w-3" />
                {stat.positiveCount} positive
              </span>
              {stat.negativeCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <ThumbsDown className="h-3 w-3" />
                  {stat.negativeCount} negative
                </span>
              )}
            </div>

            {/* Praise comments */}
            {stat.praiseComments.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setExpanded((e) => !e)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Award className="h-3.5 w-3.5" />
                  {expanded ? "Hide" : "Show"} praise comments ({stat.praiseComments.length})
                </button>
                {expanded && (
                  <div className="mt-2 space-y-1.5">
                    {stat.praiseComments.map((c, i) => (
                      <p key={i} className="text-xs bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-lg px-3 py-1.5 italic text-muted-foreground">
                        "{c}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ stat, rank }: { stat: ReputationServiceStat; rank: number }) {
  const SERVICE_ICONS: Record<string, string> = {
    grooming: "✂️",
    boarding: "🏠",
    training: "🎓",
    daycare: "☀️",
  };
  const icon = SERVICE_ICONS[stat.service] ?? "🐾";
  const responseColor = stat.responseRate >= 80 ? "text-emerald-600" : stat.responseRate >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <Card className={`transition-shadow hover:shadow-md ${rank === 1 ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200 dark:ring-amber-800" : ""}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <RankMedal rank={rank} />
          <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-2xl">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{stat.serviceLabel}</p>

            <div className="mt-2.5 flex items-center gap-3">
              <MiniRatingBar value={stat.averageRating} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{stat.totalRequests} requests sent</span>
              <span>{stat.totalRatings} rated</span>
              <span className={`font-medium ${responseColor}`}>{stat.responseRate}% response rate</span>
              <span className="text-red-600">{stat.negativeCount} negative</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold">{stat.averageRating.toFixed(1)}</div>
            <Stars rating={stat.averageRating} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Performance tab ─────────────────────────────────────────────────────────

export function ReputationPerformanceTab() {
  const { data: staffStats = [] } = useQuery(reputationQueries.staffStats());
  const { data: serviceStats = [] } = useQuery(reputationQueries.serviceStats());

  const sortedStaff = [...staffStats].sort((a, b) => b.averageRating - a.averageRating);
  const sortedServices = [...serviceStats].sort((a, b) => b.averageRating - a.averageRating);

  const topStaff = sortedStaff[0];
  const topService = sortedServices[0];

  return (
    <div className="space-y-6">
      {/* Hero spotlight */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {topStaff && (
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">⭐ Top Rated Staff</p>
                <p className="text-lg font-bold mt-0.5">{topStaff.staffName}</p>
                <div className="flex items-center gap-2">
                  <Stars rating={topStaff.averageRating} />
                  <span className="text-sm font-semibold">{topStaff.averageRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">· {topStaff.totalReviews} reviews</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {topService && (
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-400/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">🏆 Highest Rated Service</p>
                <p className="text-lg font-bold mt-0.5">{topService.serviceLabel}</p>
                <div className="flex items-center gap-2">
                  <Stars rating={topService.averageRating} />
                  <span className="text-sm font-semibold">{topService.averageRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">· {topService.responseRate}% response rate</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Leaderboards */}
      <Tabs defaultValue="staff">
        <TabsList className="h-9">
          <TabsTrigger value="staff" className="gap-2 text-sm">
            <Users className="h-4 w-4" /> Staff Leaderboard
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2 text-sm">
            <Award className="h-4 w-4" /> Service Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="mt-4 space-y-3">
          <CardDescription className="text-xs">
            Ranked by average rating — updated in real time as ratings arrive.
          </CardDescription>
          {sortedStaff.map((stat, i) => (
            <StaffCard key={stat.staffId} stat={stat} rank={i + 1} />
          ))}
        </TabsContent>

        <TabsContent value="services" className="mt-4 space-y-3">
          <CardDescription className="text-xs">
            Ranked by average rating across all review requests per service.
          </CardDescription>
          {sortedServices.map((stat, i) => (
            <ServiceCard key={stat.service} stat={stat} rank={i + 1} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
