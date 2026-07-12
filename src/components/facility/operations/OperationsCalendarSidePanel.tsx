"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  DollarSign,
  PanelLeftClose,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type OperationsCalendarEvent,
  type OperationsCalendarView,
  formatDateKey,
  formatTimeLabel,
  getEventsForDay,
} from "@/lib/operations-calendar";
import { formatCurrency } from "@/components/facility/operations/OperationsCalendarDrawerHelpers";
import { defaultServiceAddOns } from "@/data/service-addons";

const ADD_ON_PRICE_BY_NAME = new Map(
  defaultServiceAddOns.map((addOn) => [addOn.name.toLowerCase(), addOn.price]),
);

// Booking statuses that drop out of the "Upcoming Today" active list.
const FINISHED_STATUSES = new Set(["Checked-out", "Completed", "Cancelled"]);

const SIDEPANEL_COLLAPSE_KEY = "operations-calendar-sidepanel-collapsed";

/** Two-letter initials for an assignee name ("—" when unassigned). */
function getStaffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0 || name === "Unassigned") return "—";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Price for an add-on by name (from service-addons); 0 for unknown/custom. */
function addOnPrice(name: string): number {
  return ADD_ON_PRICE_BY_NAME.get(name.toLowerCase()) ?? 0;
}

/** Today's Overview tile → calendar-filter target. */
export type SidePanelTile = "all" | "confirmed" | "completed" | "tasks";

interface OperationsCalendarSidePanelProps {
  anchorDate: Date;
  view: OperationsCalendarView;
  allEvents: OperationsCalendarEvent[];
  visibleEvents: OperationsCalendarEvent[];
  serviceColorMap: Record<string, string>;
  onDateChange: (date: string) => void;
  onTileSelect: (tile: SidePanelTile) => void;
  activeTile: SidePanelTile | null;
  revenueToday: { collected: number; expected: number };
  onEventClick: (event: OperationsCalendarEvent) => void;
  onCompleteTask: (event: OperationsCalendarEvent) => void;
  onAddTask: () => void;
}

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function OperationsCalendarSidePanel({
  anchorDate,
  allEvents,
  visibleEvents,
  serviceColorMap,
  onDateChange,
  onTileSelect,
  activeTile,
  revenueToday,
  onEventClick,
  onCompleteTask,
  onAddTask,
}: OperationsCalendarSidePanelProps) {
  const [displayMonth, setDisplayMonth] = useState(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1),
  );

  // Collapse state (persisted) — gives the grid maximum width on busy days.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEPANEL_COLLAPSE_KEY) === "1";
  });
  useEffect(() => {
    localStorage.setItem(SIDEPANEL_COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  const shiftAnchorDay = (delta: number) => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + delta);
    onDateChange(formatDateKey(next));
  };

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

  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // Today's active bookings (not finished/cancelled), soonest first. Includes
  // past-due-not-checked-in ones so the status dot can flag them.
  const upcomingAll = useMemo(
    () =>
      todayEvents
        .filter(
          (ev) => ev.type === "booking" && !FINISHED_STATUSES.has(ev.status),
        )
        .sort((a, b) => a.start.getTime() - b.start.getTime()),
    [todayEvents],
  );
  const shownUpcoming = showAllUpcoming ? upcomingAll : upcomingAll.slice(0, 5);
  const remainingUpcoming = upcomingAll.length - 5;

  // Today's open staff tasks, overdue first then by time.
  const openTasks = useMemo(
    () =>
      todayEvents
        .filter((ev) => ev.type === "task" && ev.status !== "Completed")
        .sort((a, b) => {
          const aOverdue = a.status === "Overdue" ? 0 : 1;
          const bOverdue = b.status === "Overdue" ? 0 : 1;
          if (aOverdue !== bOverdue) return aOverdue - bOverdue;
          return a.start.getTime() - b.start.getTime();
        }),
    [todayEvents],
  );

  // Add-Ons Today (spec Table 40): every add-on across the viewed day's
  // bookings, with counts + total revenue. Deduped by booking + add-on so a
  // nested add-on and its "separate"-mode sub-event aren't double-counted.
  const addOnsToday = useMemo(() => {
    const seen = new Set<string>();
    const counts = new Map<string, number>();
    let revenue = 0;
    for (const ev of visibleEvents) {
      if (formatDateKey(ev.start) !== selectedKey) continue;
      if (ev.type !== "booking" && ev.type !== "add-on") continue;
      for (const addOn of ev.addOns) {
        const key = `${ev.bookingId ?? ev.sourceId}::${addOn.name.toLowerCase()}::${addOn.scheduledAt ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        counts.set(addOn.name, (counts.get(addOn.name) ?? 0) + 1);
        revenue += addOnPrice(addOn.name);
      }
    }
    const rows = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return { rows, revenue };
  }, [visibleEvents, selectedKey]);

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

  const stats: Array<{
    kind: SidePanelTile;
    label: string;
    value: number;
    icon: typeof CalendarDays;
    textColor: string;
    bg: string;
    ring: string;
    iconColor: string;
    dot: string;
  }> = [
    {
      kind: "all",
      label: "Bookings",
      value: bookingCount,
      icon: CalendarDays,
      textColor: "text-sky-600",
      bg: "bg-sky-50",
      ring: "ring-sky-100",
      iconColor: "text-sky-500",
      dot: "bg-sky-500",
    },
    {
      kind: "confirmed",
      label: "Confirmed",
      value: confirmedCount,
      icon: CheckCircle2,
      textColor: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      iconColor: "text-emerald-500",
      dot: "bg-emerald-500",
    },
    {
      kind: "completed",
      label: "Completed",
      value: completedCount,
      icon: TrendingUp,
      textColor: "text-indigo-600",
      bg: "bg-indigo-50",
      ring: "ring-indigo-100",
      iconColor: "text-indigo-500",
      dot: "bg-indigo-500",
    },
    {
      kind: "tasks",
      label: "Tasks",
      value: taskCount,
      icon: Clock,
      textColor: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-100",
      iconColor: "text-amber-500",
      dot: "bg-amber-500",
    },
  ];

  // Revenue Today colour: green > 80% collected, amber 50–80%, red < 50%.
  const revenuePct =
    revenueToday.expected > 0
      ? revenueToday.collected / revenueToday.expected
      : 0;
  const revenueTone =
    revenueToday.expected === 0
      ? {
          bg: "bg-slate-50",
          ring: "ring-slate-100",
          icon: "text-slate-400",
          text: "text-slate-500",
        }
      : revenuePct > 0.8
        ? {
            bg: "bg-emerald-50",
            ring: "ring-emerald-100",
            icon: "text-emerald-500",
            text: "text-emerald-600",
          }
        : revenuePct >= 0.5
          ? {
              bg: "bg-amber-50",
              ring: "ring-amber-100",
              icon: "text-amber-500",
              text: "text-amber-600",
            }
          : {
              bg: "bg-red-50",
              ring: "ring-red-100",
              icon: "text-red-500",
              text: "text-red-600",
            };
  const revenueDot =
    revenueToday.expected === 0
      ? "bg-slate-300"
      : revenuePct > 0.8
        ? "bg-emerald-500"
        : revenuePct >= 0.5
          ? "bg-amber-500"
          : "bg-red-500";

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-slate-200/60 bg-white py-4">
        {/* Expand arrow */}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronRight className="size-4" />
        </button>

        {/* Mini-calendar nav (prev / today / next day) */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => shiftAnchorDay(-1)}
            title="Previous day"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDateChange(formatDateKey(new Date()))}
            title="Jump to today"
            className="flex size-7 items-center justify-center rounded-lg text-sky-600 transition-colors hover:bg-sky-50"
          >
            <CalendarDays className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftAnchorDay(1)}
            title="Next day"
            className="flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>

        <div className="h-px w-6 bg-slate-200" />

        {/* Today's Overview dot indicators */}
        <div className="flex flex-col items-center gap-2.5">
          {stats.map((s) => (
            <div
              key={s.label}
              title={`${s.label}: ${s.value}`}
              className="relative flex size-6 items-center justify-center"
            >
              <span className={cn("size-2.5 rounded-full", s.dot)} />
              {s.value > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-slate-900 px-0.5 text-[8px] font-bold text-white tabular-nums">
                  {s.value > 99 ? "99+" : s.value}
                </span>
              )}
            </div>
          ))}
          <div
            title={`Revenue: ${formatCurrency(revenueToday.collected)} / ${formatCurrency(revenueToday.expected)}`}
            className="flex size-6 items-center justify-center"
          >
            <span className={cn("size-2.5 rounded-full", revenueDot)} />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200/60 bg-white">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-100 px-5 pt-5 pb-4">
        <div className="pointer-events-none absolute inset-0 bg-slate-50/50" />

        <div className="relative flex items-center justify-between gap-2">
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
          {/* Collapse toggle (right edge of the sidebar header) */}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <PanelLeftClose className="size-4" />
          </button>
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
            <button
              key={s.label}
              type="button"
              onClick={() => onTileSelect(s.kind)}
              aria-pressed={activeTile === s.kind}
              className={cn(
                "group flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0",
                s.bg,
                activeTile === s.kind
                  ? "border-slate-300 ring-2 ring-slate-400/50"
                  : cn("border-transparent", `ring-1 ${s.ring}`),
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
            </button>
          ))}
        </div>

        {/* Revenue Today (spec Table 54) */}
        <div
          className={cn(
            "mt-2 flex items-center justify-between rounded-xl border border-transparent px-3 py-2.5",
            revenueTone.bg,
            `ring-1 ${revenueTone.ring}`,
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
              <DollarSign className={cn("size-3.5", revenueTone.icon)} />
            </div>
            <span className="text-[10px] font-medium text-slate-500">
              Revenue Today
            </span>
          </div>
          <span
            className={cn(
              "shrink-0 text-sm font-black tabular-nums",
              revenueTone.text,
            )}
          >
            {formatCurrency(revenueToday.collected)}
            <span className="font-semibold text-slate-400">
              {" / "}
              {formatCurrency(revenueToday.expected)}
            </span>
          </span>
        </div>
      </div>

      {/* Upcoming today (spec Tables 55–57) */}
      {upcomingAll.length > 0 && (
        <>
          <div className="mx-4 mt-2 mb-0 h-px bg-slate-200/70" />
          <div className="px-4 pt-3 pb-2">
            <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Upcoming Today
            </p>
            <div className="space-y-1.5">
              {shownUpcoming.map((ev) => {
                const svc = ev.service ?? "Other";
                const color = serviceColorMap[svc] ?? "#64748b";
                const petName = ev.petNames?.[0] ?? ev.title;
                const raw = ev.bookingRawStatus ?? "";
                const checkedIn =
                  raw === "checked_in" ||
                  raw === "in_progress" ||
                  ev.status === "Checked-in";
                const overdue = !checkedIn && ev.start < today;
                const statusDot = checkedIn
                  ? { color: "bg-emerald-500", label: "Checked in" }
                  : overdue
                    ? { color: "bg-red-500", label: "Overdue — not checked in" }
                    : { color: "bg-sky-500", label: "Confirmed" };
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEventClick(ev)}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-left transition-all duration-150 hover:-translate-y-px hover:bg-white hover:shadow-sm"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] leading-tight font-bold text-slate-800">
                        {petName}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">
                        <span className="capitalize">{svc}</span>
                        {ev.customerName ? ` · ${ev.customerName}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[10px] font-semibold text-slate-500 tabular-nums">
                        {formatTimeLabel(ev.start)}
                      </span>
                      <span
                        className={cn("size-2 rounded-full", statusDot.color)}
                        title={statusDot.label}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            {!showAllUpcoming && remainingUpcoming > 0 && (
              <button
                type="button"
                onClick={() => setShowAllUpcoming(true)}
                className="mt-2 w-full text-center text-[10px] font-semibold text-sky-600 hover:underline"
              >
                View all {remainingUpcoming} remaining
              </button>
            )}
          </div>
        </>
      )}

      {/* Tasks (spec Table 58) — hidden when there are no open tasks */}
      {openTasks.length > 0 && (
        <>
          <div className="mx-4 mt-2 h-px bg-slate-200/70" />
          <div className="px-4 pt-3 pb-2">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                Tasks
              </p>
              <button
                type="button"
                onClick={onAddTask}
                className="text-[10px] font-semibold text-sky-600 hover:underline"
              >
                + Add Task
              </button>
            </div>
            <div className="space-y-1.5">
              {openTasks.map((task) => {
                const overdue = task.status === "Overdue";
                return (
                  <div key={task.id} className="flex items-center gap-2.5">
                    <Checkbox
                      className="size-3.5"
                      checked={false}
                      onCheckedChange={() => onCompleteTask(task)}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[11px]",
                        overdue
                          ? "font-semibold text-red-600"
                          : "text-slate-600",
                      )}
                    >
                      {task.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                      {getStaffInitials(task.staff)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Add-Ons Today (spec Table 40) */}
      {addOnsToday.rows.length > 0 && (
        <>
          <div className="mx-4 mt-2 h-px bg-slate-200/70" />
          <div className="px-4 pt-3 pb-5">
            <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Add-Ons Today
            </p>
            <div className="space-y-1.5">
              {addOnsToday.rows.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Sparkles className="size-3 shrink-0 text-sky-400" />
                    <span className="truncate text-[11px] font-semibold text-slate-600">
                      {row.name}
                    </span>
                  </div>
                  <span className="ml-2 shrink-0 text-[11px] font-bold text-slate-800 tabular-nums">
                    × {row.count}
                  </span>
                </div>
              ))}
            </div>
            {/* Total add-on revenue */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
              <span className="text-[10px] font-medium text-slate-500">
                Add-on revenue today
              </span>
              <span className="text-[11px] font-black text-emerald-600 tabular-nums">
                {formatCurrency(addOnsToday.revenue)}
              </span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
