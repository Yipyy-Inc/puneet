"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  PhoneOff,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  PhoneMissed,
  BarChart3,
  Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallAnalytics } from "@/types/calling";

interface CallAnalyticsDashboardProps {
  data: CallAnalytics;
}

function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-2 border-green-500/25 bg-green-50/40")}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("mt-1 text-3xl font-bold tabular-nums", color)}>{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={cn("rounded-xl p-2.5", highlight ? "bg-green-100" : "bg-muted")}>
            <Icon className={cn("size-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeatMap({ hourlyVolume }: { hourlyVolume: CallAnalytics["hourlyVolume"] }) {
  const max = Math.max(...hourlyVolume.map((h) => h.calls));

  const intensity = (calls: number) => {
    if (calls === 0) return "bg-muted/40";
    const pct = calls / max;
    if (pct < 0.15) return "bg-blue-100";
    if (pct < 0.35) return "bg-blue-200";
    if (pct < 0.55) return "bg-blue-300";
    if (pct < 0.75) return "bg-blue-400";
    if (pct < 0.90) return "bg-blue-500";
    return "bg-blue-600";
  };

  const label = (h: number) => {
    if (h === 0) return "12a";
    if (h < 12) return `${h}a`;
    if (h === 12) return "12p";
    return `${h - 12}p`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="size-4 text-blue-600" />
          Call Volume Heat Map — by Hour
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Darker = more calls. Based on last 30 days.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
          {hourlyVolume.map(({ hour, calls }) => (
            <div key={hour} className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                {calls > 0 ? calls : ""}
              </span>
              <div
                title={`${label(hour)}: ${calls} calls`}
                className={cn(
                  "w-8 rounded-md transition-all",
                  intensity(calls),
                )}
                style={{ height: `${Math.max(8, (calls / max) * 80)}px` }}
              />
              <span className="text-[9px] text-muted-foreground">{label(hour)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            {["bg-blue-100","bg-blue-200","bg-blue-300","bg-blue-400","bg-blue-500","bg-blue-600"].map((c) => (
              <div key={c} className={cn("h-3 w-4 rounded-sm", c)} />
            ))}
          </div>
          Low → High volume
        </div>
      </CardContent>
    </Card>
  );
}

function TopReasonsChart({ reasons }: { reasons: CallAnalytics["topCallReasons"] }) {
  const max = Math.max(...reasons.map((r) => r.count));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="size-4 text-purple-600" />
          Top Call Reasons
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reasons.map(({ reason, count }) => (
          <div key={reason}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{reason}</span>
              <span className="font-semibold tabular-nums text-muted-foreground">{count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-purple-500 transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function StaffTable({ staff }: { staff: CallAnalytics["staffPerformance"] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-teal-600" />
          Staff Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="pb-2 text-left font-medium">Staff Member</th>
                <th className="pb-2 text-right font-medium">Handled</th>
                <th className="pb-2 text-right font-medium">Avg Response</th>
                <th className="pb-2 text-right font-medium">Missed</th>
                <th className="pb-2 text-right font-medium">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map((s) => (
                <tr key={s.name}>
                  <td className="py-2.5 font-medium">{s.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{s.callsHandled}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {s.avgResponseTime}s
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={cn(
                        "font-semibold tabular-nums",
                        s.missedCalls > 8 ? "text-red-600" : s.missedCalls > 5 ? "text-amber-600" : "text-green-600",
                      )}
                    >
                      {s.missedCalls}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <Badge
                      variant={s.conversionRate >= 35 ? "default" : "secondary"}
                      className="tabular-nums"
                    >
                      {s.conversionRate}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function CallAnalyticsDashboard({ data }: CallAnalyticsDashboardProps) {
  const answerRate = Math.round(((data.totalCalls - data.missedCalls) / data.totalCalls) * 100);
  const avgDurMin = Math.floor(data.avgCallDuration / 60);
  const avgDurSec = data.avgCallDuration % 60;

  return (
    <div className="space-y-6">
      {/* Period badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Call Analytics</h2>
          <p className="text-sm text-muted-foreground">Business intelligence for your phone system</p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
          <Clock className="size-3.5" />
          {data.period}
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KPICard
          label="Total Calls"
          value={data.totalCalls.toString()}
          sub="Inbound &amp; outbound"
          icon={Phone}
          color="text-foreground"
        />
        <KPICard
          label="Answer Rate"
          value={`${answerRate}%`}
          sub={`${data.missedCalls} missed`}
          icon={PhoneOff}
          color={answerRate >= 90 ? "text-green-600" : answerRate >= 75 ? "text-amber-600" : "text-red-600"}
          highlight={answerRate >= 90}
        />
        <KPICard
          label="Avg Answer Time"
          value={`${data.avgAnswerTime}s`}
          sub="Time to pick up"
          icon={Clock}
          color={data.avgAnswerTime <= 15 ? "text-green-600" : "text-amber-600"}
        />
        <KPICard
          label="Conversion Rate"
          value={`${data.conversionRate}%`}
          sub="Call → booking"
          icon={TrendingUp}
          color="text-blue-600"
        />
        <KPICard
          label="Revenue from Calls"
          value={`$${data.revenueFromCalls.toLocaleString()}`}
          sub="This period"
          icon={DollarSign}
          color="text-green-600"
          highlight
        />
        <KPICard
          label="Avg Call Duration"
          value={`${avgDurMin}:${avgDurSec.toString().padStart(2, "0")}`}
          sub="Minutes per call"
          icon={Clock}
          color="text-foreground"
        />
        <KPICard
          label="Abandoned Calls"
          value={data.abandonedCalls.toString()}
          sub="Hung up in queue"
          icon={PhoneMissed}
          color={data.abandonedCalls > 20 ? "text-red-600" : "text-amber-600"}
        />
        <KPICard
          label="Repeat Callers"
          value={data.repeatCallers.toString()}
          sub={`${data.leadConversionRate}% lead conversion`}
          icon={Repeat}
          color="text-purple-600"
        />
      </div>

      {/* Heat Map */}
      <HeatMap hourlyVolume={data.hourlyVolume} />

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopReasonsChart reasons={data.topCallReasons} />
        <StaffTable staff={data.staffPerformance} />
      </div>
    </div>
  );
}
