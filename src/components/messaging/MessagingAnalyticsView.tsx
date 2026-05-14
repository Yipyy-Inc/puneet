"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageSquare,
  Smartphone,
  Mail,
  MessageCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Star,
  Users,
  Activity,
  Target,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { messagingAnalytics } from "@/data/messaging";

const ChartsBundle = dynamic(
  () => import("./MessagingAnalyticsCharts").then((m) => m.MessagingAnalyticsCharts),
  { ssr: false },
);

const STATUS_LABELS: Record<string, string> = {
  resolved: "Resolved",
  open: "Open",
  pending_client: "Pending Client",
  follow_up: "Follow-up",
  archived: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  resolved: "#10b981",
  open: "#3b82f6",
  pending_client: "#f59e0b",
  follow_up: "#8b5cf6",
  archived: "#cbd5e1",
};

const CHANNEL_COLORS_HEX: Record<string, string> = {
  SMS: "#3b82f6",
  Email: "#8b5cf6",
  Chat: "#10b981",
};

const TAG_COLORS: Record<string, string> = {
  boarding_now: "bg-blue-100 text-blue-700",
  vaccine_expired: "bg-amber-100 text-amber-700",
  overdue_payment: "bg-red-100 text-red-700",
  new_lead: "bg-emerald-100 text-emerald-700",
  high_priority: "bg-orange-100 text-orange-700",
  vip: "bg-purple-100 text-purple-700",
  needs_follow_up: "bg-violet-100 text-violet-700",
};

function KpiCard({
  label,
  value,
  delta,
  trendUp,
  icon: Icon,
  tone = "blue",
  sub,
}: {
  label: string;
  value: string;
  delta?: string;
  trendUp?: boolean;
  icon: typeof MessageSquare;
  tone?: "blue" | "violet" | "emerald" | "amber" | "rose" | "slate";
  sub?: string;
}) {
  const palette = {
    blue: { ring: "bg-blue-50", text: "text-blue-600" },
    violet: { ring: "bg-violet-50", text: "text-violet-600" },
    emerald: { ring: "bg-emerald-50", text: "text-emerald-600" },
    amber: { ring: "bg-amber-50", text: "text-amber-600" },
    rose: { ring: "bg-rose-50", text: "text-rose-600" },
    slate: { ring: "bg-slate-50", text: "text-slate-600" },
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex size-9 items-center justify-center rounded-xl", palette.ring)}>
            <Icon className={cn("size-4", palette.text)} />
          </div>
          {delta && (
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                trendUp
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700",
              )}
            >
              {trendUp ? (
                <TrendingUp className="size-2.5" />
              ) : (
                <TrendingDown className="size-2.5" />
              )}
              {delta}
            </span>
          )}
        </div>
        <p className="mt-3 text-[11px] font-semibold tracking-wider uppercase text-slate-400">
          {label}
        </p>
        <p className={cn("mt-0.5 text-2xl font-bold tabular-nums text-slate-800")}>
          {value}
        </p>
        {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
      </CardContent>
    </Card>
  );
}

type DateRange = "7d" | "30d" | "3m";

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "3m", label: "Last 3 months" },
];

export function MessagingAnalyticsView() {
  const data = messagingAnalytics;
  const [range, setRange] = useState<DateRange>("30d");
  const rangeLabel =
    DATE_RANGES.find((r) => r.key === range)?.label ?? data.period;

  const hourlySeries = useMemo(
    () =>
      data.hourlyVolume.map((h) => ({
        hour: `${h.hour.toString().padStart(2, "0")}:00`,
        messages: h.messages,
      })),
    [data.hourlyVolume],
  );

  const channelSeries = useMemo(
    () =>
      data.channelBreakdown.map((ch) => ({
        name: ch.channel,
        value: ch.count,
        pct: ch.pct,
        color: CHANNEL_COLORS_HEX[ch.channel] ?? "#94a3b8",
      })),
    [data.channelBreakdown],
  );

  const statusSeries = useMemo(() => {
    const total = data.statusBreakdown.reduce((acc, x) => acc + x.count, 0);
    return data.statusBreakdown.map((s) => ({
      name: STATUS_LABELS[s.status] ?? s.status,
      key: s.status,
      value: s.count,
      pct: Math.round((s.count / total) * 100),
      color: STATUS_COLORS[s.status] ?? "#94a3b8",
    }));
  }, [data.statusBreakdown]);

  const staffSeries = useMemo(
    () =>
      [...data.staffPerformance]
        .sort((a, b) => b.replied - a.replied)
        .map((s) => ({
          name: s.name.split(" ")[0],
          replied: s.replied,
          resolved: s.resolved,
          responseMin: s.avgResponseMin,
        })),
    [data.staffPerformance],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Messaging Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">
            {rangeLabel} · all locations · all channels
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
          {DATE_RANGES.map(({ key, label }) => {
            const active = range === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setRange(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Total messages"
          value={data.totalSent.toLocaleString()}
          delta="+12.4%"
          trendUp
          icon={MessageSquare}
          tone="blue"
          sub="vs prior period"
        />
        <KpiCard
          label="Avg response"
          value={`${data.avgResponseTimeMin}m`}
          delta="-8%"
          trendUp
          icon={Clock}
          tone="emerald"
          sub="staff first reply"
        />
        <KpiCard
          label="Email open rate"
          value={`${data.emailOpenRate}%`}
          delta="+3.2%"
          trendUp
          icon={Mail}
          tone="violet"
          sub="campaign average"
        />
        <KpiCard
          label="Revenue influenced"
          value={`$${(data.revenueInfluenced / 1000).toFixed(1)}k`}
          delta="+18%"
          trendUp
          icon={DollarSign}
          tone="amber"
          sub="message → booking"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Conversion rate"
          value={`${data.conversionRate}%`}
          icon={Target}
          tone="blue"
          sub="msg to booking"
        />
        <KpiCard
          label="Resolution time"
          value={`${data.avgResolutionTimeHours}h`}
          icon={Activity}
          tone="slate"
          sub="ticket close avg"
        />
        <KpiCard
          label="Missed chats"
          value={data.missedChats.toString()}
          icon={AlertTriangle}
          tone={data.missedChats > 10 ? "rose" : "slate"}
          sub="unanswered live"
        />
        <KpiCard
          label="Total reach"
          value={`${data.smsSent + data.emailSent}`}
          icon={Users}
          tone="emerald"
          sub={`${data.smsSent.toLocaleString()} SMS · ${data.emailSent.toLocaleString()} email`}
        />
      </div>

      {/* Charts bundle (lazy loaded) */}
      <ChartsBundle
        hourlySeries={hourlySeries}
        channelSeries={channelSeries}
        statusSeries={statusSeries}
        staffSeries={staffSeries}
      />

      {/* Channel callouts */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="size-4 text-blue-500" />
              SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">
              {data.smsSent.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Delivered this period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Mail className="size-4 text-violet-500" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">
              {data.emailSent.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {data.emailOpenRate}% open rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageCircle className="size-4 text-emerald-500" />
              Customer portal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-800">
              {data.chatMessages.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">In-app chat messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Top tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.topThreadTags.map((tag) => (
              <div
                key={tag.tag}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize",
                  TAG_COLORS[tag.tag] ?? "bg-slate-100 text-slate-600",
                )}
              >
                <span>{tag.tag.replace(/_/g, " ")}</span>
                <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                  {tag.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Staff csat list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...data.staffPerformance]
              .sort((a, b) => b.replied - a.replied)
              .map((staff) => (
                <div key={staff.name} className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {staff.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        {staff.name}
                      </span>
                      {staff.csat && (
                        <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                          <Star className="size-3 fill-current" />
                          {staff.csat}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-[11px] text-slate-400">
                      <span>
                        <strong className="text-slate-700">{staff.replied}</strong>{" "}
                        replied
                      </span>
                      <span>
                        <strong className="text-slate-700">
                          {staff.avgResponseMin}m
                        </strong>{" "}
                        avg
                      </span>
                      <span>
                        <strong className="text-slate-700">{staff.resolved}</strong>{" "}
                        resolved
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
