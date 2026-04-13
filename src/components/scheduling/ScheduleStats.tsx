"use client";

import { Users, Clock, DollarSign, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}

interface ScheduleStatsProps {
  totalEmployees: number;
  scheduledToday: number;
  totalHoursThisWeek: number;
  laborCost: number;
  pendingTimeOff: number;
  pendingSwaps: number;
  overtimeAlerts: number;
}

export function ScheduleStats({
  totalEmployees,
  scheduledToday,
  totalHoursThisWeek,
  laborCost,
  pendingTimeOff,
  pendingSwaps,
  overtimeAlerts,
}: ScheduleStatsProps) {
  const stats: StatItem[] = [
    {
      label: "Working Today",
      value: scheduledToday,
      icon: Users,
      color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
      subtext: `of ${totalEmployees} employees`,
    },
    {
      label: "Scheduled Hours",
      value: `${totalHoursThisWeek.toFixed(0)}h`,
      icon: Clock,
      color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
      subtext: "this period",
    },
    {
      label: "Labor Cost",
      value: `$${laborCost.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
      subtext: "estimated",
    },
    {
      label: "Pending Requests",
      value: pendingTimeOff + pendingSwaps,
      icon: CalendarOff,
      color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      subtext: `${pendingTimeOff} time off, ${pendingSwaps} swaps`,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 px-6 pb-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-card group relative overflow-hidden rounded-xl border p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {stat.value}
                </p>
                {stat.subtext && (
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    {stat.subtext}
                  </p>
                )}
              </div>
              <div
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg",
                  stat.color,
                )}
              >
                <Icon className="size-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
