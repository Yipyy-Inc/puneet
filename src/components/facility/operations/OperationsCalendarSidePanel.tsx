"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type OperationsCalendarEvent,
  type OperationsCalendarView,
  formatDateKey,
  formatTimeLabel,
  getEventsForDay,
  hexToRgba,
} from "@/lib/operations-calendar";

interface OperationsCalendarSidePanelProps {
  anchorDate: Date;
  view: OperationsCalendarView;
  allEvents: OperationsCalendarEvent[];
  visibleEvents: OperationsCalendarEvent[];
  serviceColorMap: Record<string, string>;
  onDateChange: (date: string) => void;
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function OperationsCalendarSidePanel({
  anchorDate,
  view,
  allEvents,
  visibleEvents,
  serviceColorMap,
  onDateChange,
}: OperationsCalendarSidePanelProps) {
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1),
  );

  useEffect(() => {
    setDisplayMonth((prev) => {
      const y = anchorDate.getFullYear();
      const m = anchorDate.getMonth();
      if (prev.getFullYear() !== y || prev.getMonth() !== m) {
        return new Date(y, m, 1);
      }
      return prev;
    });
  }, [anchorDate]);

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

  const eventDotMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of allEvents) {
      if (ev.type === "booking") {
        const key = formatDateKey(ev.start);
        map[key] = (map[key] ?? 0) + 1;
      }
    }
    return map;
  }, [allEvents]);

  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);
  const selectedKey = formatDateKey(anchorDate);

  const todayEvents = useMemo(
    () => getEventsForDay(allEvents, today),
    [allEvents, today],
  );

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return todayEvents
      .filter((ev) => ev.type === "booking" && ev.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 4);
  }, [todayEvents]);

  const serviceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; color: string }> = {};
    for (const ev of visibleEvents) {
      if (ev.type !== "booking") continue;
      const svc = ev.service ?? "Other";
      const color = serviceColorMap[svc] ?? "#64748b";
      if (!map[svc]) map[svc] = { count: 0, color };
      map[svc].count++;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 7);
  }, [visibleEvents, serviceColorMap]);

  const totalVisible = serviceBreakdown.reduce(
    (s, [, { count }]) => s + count,
    0,
  );

  const monthLabel = displayMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () =>
    setDisplayMonth(
      new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1),
    );
  const nextMonth = () =>
    setDisplayMonth(
      new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1),
    );

  const bookingCount = todayEvents.filter((e) => e.type === "booking").length;
  const confirmedCount = todayEvents.filter(
    (e) => e.status === "Confirmed",
  ).length;
  const completedCount = todayEvents.filter(
    (e) => e.status === "Completed",
  ).length;
  const taskCount = todayEvents.filter((e) => e.type === "task").length;

  const stats = [
    {
      label: "Bookings",
      value: bookingCount,
      icon: CalendarDays,
      textColor: "text-sky-600",
      bg: "bg-sky-50",
      ring: "ring-sky-100",
      iconColor: "text-sky-500",
    },
    {
      label: "Confirmed",
      value: confirmedCount,
      icon: CheckCircle2,
      textColor: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      iconColor: "text-emerald-500",
    },
    {
      label: "Completed",
      value: completedCount,
      icon: TrendingUp,
      textColor: "text-indigo-600",
      bg: "bg-indigo-50",
      ring: "ring-indigo-100",
      iconColor: "text-indigo-500",
    },
    {
      label: "Tasks",
      value: taskCount,
      icon: Clock,
      textColor: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-100",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200/60 bg-white">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-100 px-5 pt-5 pb-4">
        <div className="pointer-events-none absolute inset-0 bg-slate-50/50" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-sky-100 ring-1 ring-sky-200/60">
              <Sparkles className="size-4 text-sky-600" />
            </div>
            <div>
              <span className="block text-sm leading-none font-black tracking-tight text-slate-800">
                Schedule
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                Operations Calendar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mini calendar */}
      <div className="p-4 pb-3">
        {/* Month nav */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
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
            onClick={nextMonth}
            aria-label="Next month"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="mb-1.5 grid grid-cols-7">
          {DAY_INITIALS.map((d, i) => (
            <div key={i} className="flex h-6 items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`e-${idx}`} className="h-8" />;

            const key = formatDateKey(date);
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const dotCount = eventDotMap[key] ?? 0;

            return (
              <div key={key} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onDateChange(key)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg text-[12px] font-medium transition-all duration-150",
                    "hover:scale-110 active:scale-95",
                    isSelected
                      ? "bg-sky-600 font-bold text-white shadow-sm shadow-sky-800/20"
                      : isToday
                        ? "bg-sky-100 font-bold text-sky-700 ring-1 ring-sky-400/60"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {date.getDate()}
                </button>
                {/* Event dots */}
                <div className="mt-0.5 flex h-1 items-center justify-center gap-0.5">
                  {dotCount > 0 && !isSelected && (
                    <div className="size-1 rounded-full bg-sky-400/80" />
                  )}
                  {dotCount > 2 && !isSelected && (
                    <div className="size-1 rounded-full bg-sky-500/55" />
                  )}
                  {dotCount > 5 && !isSelected && (
                    <div className="size-1 rounded-full bg-slate-400/55" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-4 h-px bg-slate-200/70" />

      {/* Today's stats */}
      <div className="px-4 pt-3 pb-2">
        <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
          Today&apos;s Overview
        </p>
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className={cn(
                "group flex cursor-default items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-all duration-200 hover:shadow-sm",
                s.bg,
                `ring-1 ${s.ring}`,
                "border-transparent",
              )}
            >
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm",
                )}
              >
                <s.icon className={cn("size-3.5", s.iconColor)} />
              </div>
              <div className="min-w-0">
                <span
                  className={cn(
                    "block text-xl leading-none font-black tabular-nums",
                    s.textColor,
                  )}
                >
                  {s.value}
                </span>
                <span className="mt-0.5 block text-[10px] leading-tight font-medium text-slate-500">
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming today */}
      {upcomingEvents.length > 0 && (
        <>
          <div className="mx-4 mt-2 mb-0 h-px bg-slate-200/70" />
          <div className="px-4 pt-3 pb-2">
            <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Upcoming Today
            </p>
            <div className="space-y-1.5">
              {upcomingEvents.map((ev) => {
                const svc = ev.service ?? "Other";
                const color = serviceColorMap[svc] ?? "#64748b";
                const petName = ev.petNames?.[0] ?? ev.title;
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 transition-all duration-150 hover:bg-white hover:shadow-sm"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] leading-tight font-bold text-slate-800">
                        {petName}
                      </p>
                      <p className="truncate text-[10px] text-slate-500 capitalize">
                        {svc}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-500 tabular-nums">
                      {formatTimeLabel(ev.start)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Service breakdown */}
      {serviceBreakdown.length > 0 && (
        <>
          <div className="mx-4 mt-2 h-px bg-slate-200/70" />
          <div className="px-4 pt-3 pb-5">
            <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              {view === "day" ? "Today's Services" : "Services in View"}
            </p>
            <div className="space-y-2.5">
              {serviceBreakdown.map(([service, { count, color }]) => {
                const pct = totalVisible > 0 ? (count / totalVisible) * 100 : 0;
                return (
                  <div key={service}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full shadow-sm"
                          style={{
                            backgroundColor: color,
                            boxShadow: `0 0 4px ${hexToRgba(color, 0.5)}`,
                          }}
                        />
                        <span className="truncate text-[11px] font-semibold text-slate-600 capitalize">
                          {service}
                        </span>
                      </div>
                      <span className="ml-2 shrink-0 text-[11px] font-bold text-slate-800 tabular-nums">
                        {count}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full"
                      style={{ backgroundColor: hexToRgba(color, 0.12) }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
