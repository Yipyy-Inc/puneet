"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  ThumbsUp,
  Globe,
  MessageSquare,
  Bell,
  ArrowRight,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { reputationQueries } from "@/lib/api/reputation";
import { useReputation } from "@/hooks/use-reputation";
import type {
  ReputationRequest,
  ReputationRequestStatus,
} from "@/types/reputation";

// ─── Star display ─────────────────────────────────────────────────────────────

function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const cls = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${cls} ${i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<
  ReputationRequestStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  not_sent: {
    label: "Not Sent",
    icon: <Minus className="h-3 w-3" />,
    color: "bg-muted text-muted-foreground",
  },
  scheduled: {
    label: "Scheduled",
    icon: <Clock className="h-3 w-3" />,
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  },
  sent: {
    label: "Sent",
    icon: <Send className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  reminder_sent: {
    label: "Reminder Sent",
    icon: <RotateCcw className="h-3 w-3" />,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  rating_received: {
    label: "Rating Received",
    icon: <Star className="h-3 w-3" />,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  public_push_sent: {
    label: "Public Push Sent",
    icon: <Globe className="h-3 w-3" />,
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  escalated: {
    label: "Escalated",
    icon: <AlertCircle className="h-3 w-3" />,
    color: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
  closed: {
    label: "Closed",
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "bg-muted text-muted-foreground",
  },
};

function StatusPill({ status }: { status: ReputationRequestStatus }) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 opacity-5 ${accent}`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {label}
            </p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
          </div>
          <div className={`rounded-xl p-2.5 ${accent} bg-opacity-15`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            {trend === "up" && (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            )}
            {trend === "down" && (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            {trend === "flat" && (
              <Minus className="text-muted-foreground h-3.5 w-3.5" />
            )}
            <span
              className={`text-xs font-medium ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"}`}
            >
              {trend === "up"
                ? "Up from last month"
                : trend === "down"
                  ? "Down from last month"
                  : "Stable vs last month"}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Rating distribution bar ──────────────────────────────────────────────────

function RatingBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-16 text-right text-xs">
        {label}
      </span>
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-medium">{pct}%</span>
    </div>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────

function ActivityItem({ req }: { req: ReputationRequest }) {
  const isNegative = req.rating !== undefined && req.rating <= 2;
  const isPositive = req.rating !== undefined && req.rating >= 4;

  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isNegative ? "bg-red-100 text-red-700" : isPositive ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
      >
        {req.clientName.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">
            {req.clientName} · {req.petName}
          </p>
          <StatusPill status={req.status} />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {req.serviceLabel}
          </span>
          {req.rating && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <StarRating rating={req.rating} />
            </>
          )}
        </div>
        {req.clientComment && (
          <p className="text-muted-foreground mt-1 line-clamp-1 text-xs italic">
            &ldquo;{req.clientComment}&rdquo;
          </p>
        )}
        {isNegative && req.feedbackText && (
          <div className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="truncate">{req.feedbackText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

export function ReputationOverviewTab({
  onTabChange,
}: {
  onTabChange: (tab: string) => void;
}) {
  const { data: stats } = useQuery(reputationQueries.stats());
  // Live provider data (runtime + overlays) so escalations/activity match the
  // Shell badges and the Requests tab.
  const { requests } = useReputation();

  if (!stats) return null;

  const recentActivity = [...requests]
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
    .slice(0, 6);

  const totalRatings = stats.totalRatings;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Requests Sent"
          value={stats.totalSent.toLocaleString()}
          sub={`+${stats.requestsThisMonth} this month`}
          trend={stats.rateTrend}
          icon={Send}
          accent="bg-blue-500"
        />
        <KpiCard
          label="Response Rate"
          value={`${stats.responseRate}%`}
          sub={`${stats.totalRatings} ratings received`}
          trend={stats.rateTrend}
          icon={MessageSquare}
          accent="bg-purple-500"
        />
        <KpiCard
          label="Average Rating"
          value={stats.averageRating.toFixed(1)}
          sub="Out of 5.0 stars"
          trend={stats.ratingTrend}
          icon={Star}
          accent="bg-amber-500"
        />
        <KpiCard
          label="5-Star Reviews"
          value={`${stats.fiveStarPercentage}%`}
          sub={`${stats.fiveStarCount} total`}
          trend={stats.ratingTrend}
          icon={ThumbsUp}
          accent="bg-emerald-500"
        />
        <KpiCard
          label="Public Conversions"
          value={`${stats.publicConversionRate}%`}
          sub="Clicked a review link"
          icon={Globe}
          accent="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rating distribution */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rating Distribution</CardTitle>
            <CardDescription>
              Based on {totalRatings} ratings received
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RatingBar
              label="5 stars"
              count={Math.round(
                (totalRatings * stats.fiveStarPercentage) / 100,
              )}
              total={totalRatings}
              color="bg-emerald-500"
            />
            <RatingBar
              label="4 stars"
              count={Math.round(
                (totalRatings * stats.fourStarPercentage) / 100,
              )}
              total={totalRatings}
              color="bg-blue-400"
            />
            <RatingBar
              label="3 stars"
              count={Math.round(
                (totalRatings * stats.threeStarPercentage) / 100,
              )}
              total={totalRatings}
              color="bg-amber-400"
            />
            <RatingBar
              label="1–2 stars"
              count={Math.round(
                (totalRatings * stats.negativePercentage) / 100,
              )}
              total={totalRatings}
              color="bg-red-400"
            />

            <div className="bg-muted/50 mt-4 space-y-2 rounded-xl p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Avg rating
                </span>
                <span className="font-semibold">
                  {stats.averageRating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-purple-500" /> Reminder
                  recovery
                </span>
                <span className="font-semibold">
                  {stats.reminderResponseRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500" /> Negative
                  rate
                </span>
                <span className="font-semibold text-red-600">
                  {stats.negativePercentage}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <CardDescription>
                Latest review requests and responses
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => onTabChange("requests")}
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0 px-6">
            {recentActivity.map((req) => (
              <ActivityItem key={req.id} req={req} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Platform health */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Review Platform Health</CardTitle>
          <CardDescription>
            Public profiles connected to your Reputation Booster
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                name: "Google",
                icon: "G",
                color: "text-blue-600 bg-blue-50",
                count: 312,
                avg: 4.8,
                connected: true,
              },
              {
                name: "Facebook",
                icon: "f",
                color: "text-indigo-600 bg-indigo-50",
                count: 147,
                avg: 4.7,
                connected: true,
              },
              {
                name: "Yelp",
                icon: "Y",
                color: "text-red-600 bg-red-50",
                count: 89,
                avg: 4.6,
                connected: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`flex items-center gap-4 rounded-xl border p-4 ${!p.connected ? "opacity-50" : ""}`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${p.color}`}
                >
                  {p.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{p.name}</p>
                    <Badge
                      variant={p.connected ? "default" : "secondary"}
                      className="h-4 text-xs"
                    >
                      {p.connected ? "Active" : "Off"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <StarRating rating={Math.round(p.avg)} />
                    <span className="text-muted-foreground text-xs">
                      {p.avg} · {p.count} reviews
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {requests.filter((r) => r.escalatedToManager && r.status !== "closed")
        .length > 0 && (
        <Card className="border-red-200 bg-red-50/30 dark:border-red-900 dark:bg-red-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-red-700 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              Negative Escalations Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests
              .filter((r) => r.escalatedToManager && r.status !== "closed")
              .map((req) => (
                <div
                  key={req.id}
                  className="bg-background flex items-center justify-between rounded-lg border border-red-200 p-3 dark:border-red-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                      {req.rating}★
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {req.clientName} · {req.petName}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {req.serviceLabel} ·{" "}
                        {new Date(req.ratedAt!).toLocaleDateString("en-CA")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      Escalated
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onTabChange("requests")}
                    >
                      <Clock className="mr-1 h-3 w-3" /> Review
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
