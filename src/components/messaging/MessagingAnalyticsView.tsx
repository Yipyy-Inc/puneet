"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Smartphone,
  Mail,
  MessageCircle,
  Clock,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { messagingAnalytics } from "@/data/messaging";

const CHANNEL_COLORS = {
  SMS: "bg-blue-500",
  Email: "bg-violet-500",
  Chat: "bg-emerald-500",
};

const STATUS_COLORS: Record<string, string> = {
  resolved: "bg-emerald-500",
  open: "bg-blue-500",
  pending_client: "bg-amber-500",
  follow_up: "bg-violet-500",
  archived: "bg-slate-300",
};

const STATUS_LABELS: Record<string, string> = {
  resolved: "Resolved",
  open: "Open",
  pending_client: "Pending Client",
  follow_up: "Follow-up",
  archived: "Archived",
};

const TAG_COLORS: Record<string, string> = {
  boarding_now: "bg-blue-100 text-blue-700",
  vaccine_expired: "bg-amber-100 text-amber-700",
  overdue_payment: "bg-red-100 text-red-700",
  new_lead: "bg-emerald-100 text-emerald-700",
  high_priority: "bg-orange-100 text-orange-700",
  vip: "bg-purple-100 text-purple-700",
};

const PEAK_HOUR = messagingAnalytics.hourlyVolume.reduce(
  (max, h) => (h.messages > max.messages ? h : max),
  messagingAnalytics.hourlyVolume[0],
);

const maxHourlyMessages = Math.max(...messagingAnalytics.hourlyVolume.map((h) => h.messages));

export function MessagingAnalyticsView() {
  const data = messagingAnalytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Messaging Analytics</h2>
        <p className="mt-1 text-sm text-slate-500">{data.period} · All channels combined</p>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Total Messages",
            value: data.totalSent.toLocaleString(),
            icon: MessageSquare,
            color: "text-slate-700",
            sub: `SMS + Email + Chat`,
          },
          {
            label: "Email Open Rate",
            value: `${data.emailOpenRate}%`,
            icon: Mail,
            color: "text-violet-600",
            sub: "Avg across campaigns",
          },
          {
            label: "Avg Response Time",
            value: `${data.avgResponseTimeMin}m`,
            icon: Clock,
            color: "text-blue-600",
            sub: "Staff reply time",
          },
          {
            label: "Revenue Influenced",
            value: `$${data.revenueInfluenced.toLocaleString()}`,
            icon: DollarSign,
            color: "text-emerald-600",
            sub: "Msg → booking conversion",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <Icon className={cn("size-4", kpi.color)} />
                  {kpi.label}
                </div>
                <p className={cn("mt-1 text-3xl font-bold", kpi.color)}>{kpi.value}</p>
                <p className="mt-1 text-xs text-slate-400">{kpi.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Conversion Rate",
            value: `${data.conversionRate}%`,
            sub: "Message → booking",
            color: "text-blue-600",
          },
          {
            label: "Avg Resolution",
            value: `${data.avgResolutionTimeHours}h`,
            sub: "Ticket close time",
            color: "text-slate-700",
          },
          {
            label: "Missed Chats",
            value: data.missedChats,
            sub: "Unanswered live chats",
            color: data.missedChats > 10 ? "text-red-600" : "text-slate-700",
          },
          {
            label: "SMS Sent",
            value: data.smsSent.toLocaleString(),
            sub: `${data.emailSent.toLocaleString()} emails · ${data.chatMessages} chats`,
            color: "text-slate-700",
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-5">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className={cn("mt-1 text-3xl font-bold", kpi.color)}>{kpi.value}</p>
              <p className="mt-1 text-xs text-slate-400">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hourly heat map */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Message Volume by Hour</CardTitle>
            <Badge variant="outline" className="text-xs">
              Peak: {PEAK_HOUR.hour}:00 ({PEAK_HOUR.messages} messages)
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-0.5 h-32">
            {data.hourlyVolume.map((h) => {
              const pct = maxHourlyMessages > 0 ? (h.messages / maxHourlyMessages) * 100 : 0;
              const isPeak = h.hour === PEAK_HOUR.hour;
              return (
                <div
                  key={h.hour}
                  className="group relative flex flex-1 flex-col items-center"
                >
                  <div
                    className={cn(
                      "w-full rounded-t transition-all",
                      isPeak ? "bg-blue-500" : pct > 50 ? "bg-blue-400" : pct > 20 ? "bg-blue-300" : "bg-slate-200",
                    )}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-[10px] text-white group-hover:flex whitespace-nowrap">
                    {h.hour}:00 · {h.messages}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>11pm</span>
          </div>
        </CardContent>
      </Card>

      {/* Channel breakdown + Status breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.channelBreakdown.map((ch) => (
              <div key={ch.channel}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{ch.channel}</span>
                  <span className="text-slate-500">
                    {ch.count.toLocaleString()} ({ch.pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      CHANNEL_COLORS[ch.channel as keyof typeof CHANNEL_COLORS] ?? "bg-slate-400",
                    )}
                    style={{ width: `${ch.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.statusBreakdown.map((s) => {
              const total = data.statusBreakdown.reduce((acc, x) => acc + x.count, 0);
              const pct = Math.round((s.count / total) * 100);
              return (
                <div key={s.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                    <span className="text-slate-500">
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        STATUS_COLORS[s.status] ?? "bg-slate-400",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Top tags + Staff performance */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Thread Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.topThreadTags.map((tag) => (
                <div
                  key={tag.tag}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                    TAG_COLORS[tag.tag] ?? "bg-slate-100 text-slate-600",
                  )}
                >
                  <span>{tag.tag.replace(/_/g, " ")}</span>
                  <span className="rounded-full bg-white/60 px-1.5 py-0.5 text-xs font-bold">
                    {tag.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.staffPerformance
                .sort((a, b) => b.replied - a.replied)
                .map((staff) => (
                  <div key={staff.name} className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {staff.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">{staff.name}</span>
                        {staff.csat && (
                          <span className="flex items-center gap-0.5 text-xs text-amber-500">
                            <Star className="size-3 fill-current" />
                            {staff.csat}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-[11px] text-slate-400">
                        <span>
                          <strong className="text-slate-600">{staff.replied}</strong> replied
                        </span>
                        <span>
                          <strong className="text-slate-600">{staff.avgResponseMin}m</strong> avg
                        </span>
                        <span>
                          <strong className="text-slate-600">{staff.resolved}</strong> resolved
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
