"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildTodayTasks } from "@/lib/today-tasks";
import { getTemplatesForModule } from "@/data/task-templates";
import type { TrainingSession } from "@/types/training";
import {
  DAY_INITIALS,
  formatISODate,
} from "./training-calendar-utils";

export function TrainingCalendarSidebar({
  selectedDate,
  todayStr,
  sessions,
  onDateChange,
  onOpenSmartScheduling,
}: {
  selectedDate: string;
  todayStr: string;
  sessions: TrainingSession[];
  onDateChange: (dateStr: string) => void;
  onOpenSmartScheduling: () => void;
}) {
  const selectedDateObj = useMemo(
    () => new Date(selectedDate + "T00:00:00"),
    [selectedDate],
  );
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1),
  );

  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [displayMonth]);

  const eventCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of sessions) {
      if (s.status === "cancelled") continue;
      map[s.date] = (map[s.date] ?? 0) + 1;
    }
    return map;
  }, [sessions]);

  // Daily summary — drawn from today's session list rather than the selected
  // date's, because the spec is "for today" specifically.
  const todaySessions = useMemo(
    () => sessions.filter((s) => s.date === todayStr),
    [sessions, todayStr],
  );

  const summary = useMemo(() => {
    const active = todaySessions.filter((s) => s.status !== "cancelled");
    return {
      total: active.length,
      confirmed: todaySessions.filter((s) => s.status === "scheduled").length,
      completed: todaySessions.filter((s) => s.status === "completed").length,
    };
  }, [todaySessions]);

  // Pending tasks come from the auto-create task templates registered for the
  // training module. Refresh once a minute so a tile that says "3 pending" at
  // 9am rolls over correctly as the morning progresses.
  const [pendingTasks, setPendingTasks] = useState(0);
  useEffect(() => {
    function refresh() {
      const tasks = buildTodayTasks(getTemplatesForModule("training"));
      setPendingTasks(tasks.filter((t) => t.status === "pending").length);
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const monthLabel = displayMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const summaryTiles = [
    {
      label: "Total Sessions",
      value: summary.total,
      icon: CalendarDays,
      bg: "bg-indigo-50",
      ring: "ring-indigo-100",
      text: "text-indigo-600",
      iconColor: "text-indigo-500",
    },
    {
      label: "Confirmed",
      value: summary.confirmed,
      icon: CalendarCheck2,
      bg: "bg-sky-50",
      ring: "ring-sky-100",
      text: "text-sky-600",
      iconColor: "text-sky-500",
    },
    {
      label: "Completed",
      value: summary.completed,
      icon: CheckCircle2,
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      text: "text-emerald-600",
      iconColor: "text-emerald-500",
    },
    {
      label: "Pending Tasks",
      value: pendingTasks,
      icon: ClipboardList,
      bg: pendingTasks > 0 ? "bg-amber-50" : "bg-slate-50",
      ring: pendingTasks > 0 ? "ring-amber-100" : "ring-slate-100",
      text: pendingTasks > 0 ? "text-amber-600" : "text-slate-600",
      iconColor: pendingTasks > 0 ? "text-amber-500" : "text-slate-400",
    },
  ];

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto rounded-2xl border border-slate-200/60 bg-white">
      <div className="border-b border-slate-100 px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200/60">
            <Sparkles className="size-4 text-indigo-600" />
          </div>
          <div>
            <span className="block text-sm/none font-black tracking-tight text-slate-800">
              Schedule
            </span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              Training Calendar
            </span>
          </div>
        </div>
      </div>

      {/* Mini calendar ────────────────────────────────────────────────────── */}
      <div className="p-4 pb-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() =>
              setDisplayMonth(
                new Date(
                  displayMonth.getFullYear(),
                  displayMonth.getMonth() - 1,
                  1,
                ),
              )
            }
            aria-label="Previous month"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-[12px] font-bold tracking-tight text-slate-700">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() =>
              setDisplayMonth(
                new Date(
                  displayMonth.getFullYear(),
                  displayMonth.getMonth() + 1,
                  1,
                ),
              )
            }
            aria-label="Next month"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        <div className="mb-1.5 grid grid-cols-7">
          {DAY_INITIALS.map((d, i) => (
            <div key={i} className="flex h-6 items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {d}
              </span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={idx} className="h-7" />;
            const ds = formatISODate(day);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const count = eventCountByDate[ds] ?? 0;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onDateChange(ds)}
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-colors",
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : isToday
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-100",
                )}
              >
                {day.getDate()}
                {count > 0 && !isSelected && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 size-1 rounded-full",
                      isToday ? "bg-indigo-600" : "bg-indigo-400",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mx-4 h-px bg-slate-200/70" />

      {/* Quick Jump — teleport N weeks ahead ─────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <p className="mb-2 text-[9px] font-black tracking-widest text-slate-400 uppercase">
          Quick Jump
        </p>
        <Select
          value=""
          onValueChange={(v) => {
            const n = Number(v);
            if (!Number.isFinite(n) || n <= 0) return;
            const d = new Date(selectedDate + "T00:00:00");
            d.setDate(d.getDate() + n * 7);
            onDateChange(formatISODate(d));
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Jump N weeks ahead…" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                +{n} week{n === 1 ? "" : "s"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mx-4 mt-1 h-px bg-slate-200/70" />

      {/* Smart Scheduling button ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <Button
          type="button"
          onClick={onOpenSmartScheduling}
          className="w-full justify-start gap-2 bg-linear-to-r from-indigo-500 to-purple-500 text-white shadow-sm hover:from-indigo-600 hover:to-purple-600"
        >
          <Sparkles className="size-4" />
          Smart Scheduling
        </Button>
        <p className="mt-1.5 text-[10px] leading-snug text-slate-400">
          Find available 1-on-1 slots across private trainers.
        </p>
      </div>

      <div className="mx-4 mt-1 h-px bg-slate-200/70" />

      {/* Daily Summary ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-4">
        <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
          Daily Summary
        </p>
        <div className="grid grid-cols-2 gap-2">
          {summaryTiles.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className={cn(
                  "rounded-xl px-3 py-2.5 ring-1",
                  t.bg,
                  t.ring,
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {t.label}
                  </span>
                  <Icon className={cn("size-3.5", t.iconColor)} />
                </div>
                <p
                  className={cn(
                    "mt-1 text-lg/none font-bold tabular-nums",
                    t.text,
                  )}
                >
                  {t.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
