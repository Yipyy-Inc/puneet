"use client";

import { Users, Clock, DollarSign, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleStatsProps {
  totalEmployees: number;
  scheduledToday: number;
  totalHoursThisWeek: number;
  laborCost: number;
  pendingTimeOff: number;
  pendingSwaps: number;
  overtimeAlerts: number;
}

interface StatPillProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent: string;
}

function StatPill({ icon: Icon, label, value, accent }: StatPillProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2 shadow-sm">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          accent,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-[10px] font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="truncate text-sm font-semibold leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function ScheduleStats({
  totalEmployees,
  scheduledToday,
  totalHoursThisWeek,
  laborCost,
  pendingTimeOff,
  pendingSwaps,
}: ScheduleStatsProps) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 px-6 pb-2 sm:grid-cols-4">
      <StatPill
        icon={Users}
        label="Working today"
        value={`${scheduledToday}/${totalEmployees}`}
        accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
      />
      <StatPill
        icon={Clock}
        label="Scheduled"
        value={`${totalHoursThisWeek.toFixed(0)}h`}
        accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
      />
      <StatPill
        icon={DollarSign}
        label="Labor cost"
        value={`$${laborCost.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })}`}
        accent="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
      />
      <StatPill
        icon={CalendarOff}
        label="Pending"
        value={pendingTimeOff + pendingSwaps}
        accent="bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
      />
    </div>
  );
}
