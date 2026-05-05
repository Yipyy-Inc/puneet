"use client";

import { useMemo } from "react";
import { AlertTriangle, DollarSign, Send, TrendingUp } from "lucide-react";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  formatRevenue,
  lapsedClients,
  rebookReminders,
  type RebookReminder,
} from "@/data/rebook-reminders";

const monthLabel = (d: Date) =>
  d.toLocaleString("en-US", { month: "short", year: "numeric" });

const inSameMonth = (iso: string | undefined, ref: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};

interface RebookAnalyticsRowProps {
  /** Override the runtime "now" — useful for tests/storybook. */
  now?: Date;
  /** Source data — defaults to the mock list so the row works standalone. */
  reminders?: RebookReminder[];
}

export function RebookAnalyticsRow({
  now,
  reminders = rebookReminders,
}: RebookAnalyticsRowProps) {
  const stats = useMemo(() => {
    const today = now ?? new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const sentThisMonth = reminders.filter(
      (r) =>
        (r.status === "sent" || r.status === "rebooked") &&
        inSameMonth(r.sentAt, today),
    ).length;

    const sentLastMonth = reminders.filter(
      (r) =>
        (r.status === "sent" || r.status === "rebooked") &&
        inSameMonth(r.sentAt, lastMonth),
    ).length;

    const monthDelta = sentThisMonth - sentLastMonth;

    const totalSentEver = reminders.filter(
      (r) => r.status === "sent" || r.status === "rebooked",
    ).length;
    const totalRebookedEver = reminders.filter(
      (r) => r.status === "rebooked",
    ).length;
    const responseRate =
      totalSentEver === 0
        ? 0
        : Math.round((totalRebookedEver / totalSentEver) * 100);

    const lapsedCount = lapsedClients.length;
    const severeLapsed = lapsedClients.filter((l) => l.daysOverdue > 30).length;

    const recoveredThisMonth = reminders
      .filter(
        (r) => r.status === "rebooked" && inSameMonth(r.rebookedAt, today),
      )
      .reduce((sum, r) => sum + (r.recoveredRevenue ?? 0), 0);

    return {
      sentThisMonth,
      sentLastMonth,
      monthDelta,
      responseRate,
      totalRebookedEver,
      totalSentEver,
      lapsedCount,
      severeLapsed,
      recoveredThisMonth,
      currentMonthLabel: monthLabel(today),
    };
  }, [now, reminders]);

  const monthDeltaHint =
    stats.monthDelta === 0
      ? `Same as ${monthLabel(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1))}`
      : stats.monthDelta > 0
        ? `+${stats.monthDelta} vs last month`
        : `${stats.monthDelta} vs last month`;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiTile
        label="Sent this month"
        value={stats.sentThisMonth}
        hint={monthDeltaHint}
        icon={Send}
        tone="violet"
      />
      <KpiTile
        label="Response rate"
        value={`${stats.responseRate}%`}
        hint={`${stats.totalRebookedEver} of ${stats.totalSentEver} rebooked`}
        icon={TrendingUp}
        tone="emerald"
      />
      <KpiTile
        label="Lapsed now"
        value={stats.lapsedCount}
        hint={
          stats.severeLapsed > 0
            ? `${stats.severeLapsed} over 30 days overdue`
            : "All under 30 days"
        }
        icon={AlertTriangle}
        tone="amber"
      />
      <KpiTile
        label="Revenue recovered"
        value={formatRevenue(stats.recoveredThisMonth)}
        hint={`Within 14d of reminder · ${stats.currentMonthLabel}`}
        icon={DollarSign}
        tone="indigo"
      />
    </div>
  );
}
