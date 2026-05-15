"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/color-utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Scissors,
  CalendarDays,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  ActivitySquare,
} from "lucide-react";
import { groomingQueries, getEffectiveAlertNotes } from "@/lib/api/grooming";
import type {
  GroomingAppointment,
  GroomingStatus,
  Stylist,
} from "@/types/grooming";
import { AppointmentPanel } from "./appointment-panel";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import {
  CalendarFilters,
  EMPTY_FILTERS,
  applyCalendarFilters,
  type CalendarFilterState,
} from "./calendar-filters";
import { TimeBlockDialog, type TimeBlock } from "./time-block-dialog";
import { WaitlistPanel } from "./waitlist-panel";
import { PrintableDaySheet } from "./printable-day-sheet";
import { PrintableAppointmentCards } from "./printable-appointment-cards";
import {
  BulkActionsDialog,
  type BulkActionMode,
} from "./bulk-actions-dialog";
import { getMissedTaskCountForModule } from "@/lib/today-tasks";
import { useMobileGrooming } from "@/hooks/use-mobile-grooming";
import { useGroomingWaitlist } from "@/hooks/use-grooming-waitlist";
import { facilityStaff } from "@/data/facility-staff";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ban,
  Hourglass,
  Printer,
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  XCircle,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;
const START_HOUR = 8;
const END_HOUR = 19;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

type ViewMode = "day" | "week" | "month";

// ─── Status styles ────────────────────────────────────────────────────────────

export const STATUS_META: Record<
  GroomingStatus,
  { bg: string; text: string; dot: string; pill: string; label: string }
> = {
  scheduled: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
    pill: "bg-blue-500",
    label: "Scheduled",
  },
  "checked-in": {
    bg: "bg-sky-100 dark:bg-sky-900/40",
    text: "text-sky-900 dark:text-sky-100",
    dot: "bg-sky-500",
    pill: "bg-sky-500",
    label: "Checked In",
  },
  "in-progress": {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-900 dark:text-amber-100",
    dot: "bg-amber-500",
    pill: "bg-amber-500",
    label: "In Progress",
  },
  "ready-for-pickup": {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-900 dark:text-emerald-100",
    dot: "bg-emerald-500",
    pill: "bg-emerald-500",
    label: "Ready",
  },
  completed: {
    bg: "bg-gray-100 dark:bg-gray-700/40",
    text: "text-gray-600 dark:text-gray-300",
    dot: "bg-gray-400",
    pill: "bg-gray-400",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
    dot: "bg-red-400",
    pill: "bg-red-400",
    label: "Cancelled",
  },
  "no-show": {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    pill: "bg-rose-500",
    label: "No Show",
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatHour(h: number): string {
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday as start
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDays(dateStr: string): Date[] {
  const start = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function getMonthDays(dateStr: string): (Date | null)[] {
  const ref = new Date(dateStr + "T00:00:00");
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay === 0 ? 6 : firstDay - 1; // Monday-first
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

// ─── Service color palette (stable hash) ─────────────────────────────────────

const SERVICE_PALETTE = [
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#a855f7", // purple
  "#f97316", // orange
  "#ec4899", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#eab308", // yellow
];

function colorForService(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return SERVICE_PALETTE[Math.abs(hash) % SERVICE_PALETTE.length];
}

// Stable per-stylist color used for the calendar accent. Honors the stylist's
// configured calendarColor when present, otherwise hashes the id into the
// same SERVICE_PALETTE so adjacent groomers stay visually distinct.
function colorForStylist(
  stylistId: string,
  configured?: string,
): string {
  if (configured) return configured;
  let hash = 0;
  for (let i = 0; i < stylistId.length; i++) {
    hash = (hash * 31 + stylistId.charCodeAt(i)) | 0;
  }
  return SERVICE_PALETTE[Math.abs(hash) % SERVICE_PALETTE.length];
}

// ─── Sidebar (mini calendar + stats + upcoming + service breakdown) ──────────

const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function GroomingSidebar({
  selectedDate,
  todayStr,
  appointments,
  viewMode,
  onDateChange,
}: {
  selectedDate: string;
  todayStr: string;
  appointments: GroomingAppointment[];
  viewMode: ViewMode;
  onDateChange: (dateStr: string) => void;
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
    for (const apt of appointments) {
      if (apt.status === "cancelled" || apt.status === "no-show") continue;
      map[apt.date] = (map[apt.date] ?? 0) + 1;
    }
    return map;
  }, [appointments]);

  const todayAppointments = useMemo(
    () => appointments.filter((a) => a.date === todayStr),
    [appointments, todayStr],
  );

  const stats = useMemo(() => {
    const active = todayAppointments.filter(
      (a) => a.status !== "cancelled" && a.status !== "no-show",
    );
    return {
      bookings: active.length,
      confirmed: todayAppointments.filter(
        (a) => a.status === "scheduled" || a.status === "checked-in",
      ).length,
      completed: todayAppointments.filter((a) => a.status === "completed")
        .length,
    };
  }, [todayAppointments]);

  // Missed tasks count — derived from the same source the Tasks tab uses.
  // Gated by mount so SSR/CSR match (calc depends on current time).
  const [missedTaskCount, setMissedTaskCount] = useState(0);
  useEffect(() => {
    function refresh() {
      setMissedTaskCount(getMissedTaskCountForModule("grooming"));
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const upcomingToday = useMemo(() => {
    const nowMin =
      selectedDate === todayStr
        ? new Date().getHours() * 60 + new Date().getMinutes()
        : 0;
    return todayAppointments
      .filter((a) => {
        if (a.status === "cancelled" || a.status === "no-show") return false;
        return timeToMinutes(a.startTime) >= nowMin;
      })
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
      .slice(0, 4);
  }, [todayAppointments, selectedDate, todayStr]);

  // Calendar Report — totals for the selected period. Filtered by the
  // calendar's current view mode so a manager looking at the week sees the
  // week's numbers, etc. Recomputes whenever appointments change (so it
  // stays accurate as bookings are added, completed, or cancelled).
  const calendarReport = useMemo(() => {
    const inView = appointments.filter((a) => {
      if (viewMode === "day") return a.date === selectedDate;
      if (viewMode === "week") {
        const days = getWeekDays(selectedDate).map(formatISODate);
        return days.includes(a.date);
      }
      const ref = new Date(selectedDate + "T00:00:00");
      const aDate = new Date(a.date + "T00:00:00");
      return (
        aDate.getFullYear() === ref.getFullYear() &&
        aDate.getMonth() === ref.getMonth()
      );
    });
    const counting = inView.filter(
      (a) => a.status !== "cancelled" && a.status !== "no-show",
    );
    const finished = counting.filter((a) => a.status === "completed");
    const earnedRevenue = finished.reduce((s, a) => s + a.totalPrice, 0);
    const expectedRevenue = counting.reduce((s, a) => s + a.totalPrice, 0);
    const distinctPets = new Set(counting.map((a) => a.petId));
    return {
      appointments: counting.length,
      pets: distinctPets.size,
      finished: finished.length,
      earnedRevenue,
      expectedRevenue,
    };
  }, [appointments, viewMode, selectedDate]);

  const reportPeriodLabel =
    viewMode === "day" ? "today" : viewMode === "week" ? "this week" : "this month";

  const serviceBreakdown = useMemo(() => {
    const inView = appointments.filter((a) => {
      if (a.status === "cancelled" || a.status === "no-show") return false;
      if (viewMode === "day") return a.date === selectedDate;
      if (viewMode === "week") {
        const days = getWeekDays(selectedDate).map(formatISODate);
        return days.includes(a.date);
      }
      // month
      const ref = new Date(selectedDate + "T00:00:00");
      const aDate = new Date(a.date + "T00:00:00");
      return (
        aDate.getFullYear() === ref.getFullYear() &&
        aDate.getMonth() === ref.getMonth()
      );
    });
    const map: Record<string, { count: number; color: string }> = {};
    for (const a of inView) {
      const svc = a.packageName ?? "Other";
      if (!map[svc]) map[svc] = { count: 0, color: colorForService(svc) };
      map[svc].count++;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 7);
  }, [appointments, viewMode, selectedDate]);

  const totalInView = serviceBreakdown.reduce(
    (s, [, { count }]) => s + count,
    0,
  );

  const monthLabel = displayMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const statTiles = [
    {
      label: "Bookings",
      value: stats.bookings,
      icon: CalendarDays,
      bg: "bg-sky-50",
      ring: "ring-sky-100",
      text: "text-sky-600",
      iconColor: "text-sky-500",
    },
    {
      label: "Confirmed",
      value: stats.confirmed,
      icon: CheckCircle2,
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      text: "text-emerald-600",
      iconColor: "text-emerald-500",
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: TrendingUp,
      bg: "bg-indigo-50",
      ring: "ring-indigo-100",
      text: "text-indigo-600",
      iconColor: "text-indigo-500",
    },
    {
      label: "Missed Tasks",
      value: missedTaskCount,
      icon: AlertTriangle,
      bg: missedTaskCount > 0 ? "bg-red-50" : "bg-amber-50",
      ring: missedTaskCount > 0 ? "ring-red-100" : "ring-amber-100",
      text: missedTaskCount > 0 ? "text-red-600" : "text-amber-600",
      iconColor: missedTaskCount > 0 ? "text-red-500" : "text-amber-500",
    },
  ];

  return (
    <aside className="flex w-72 shrink-0 flex-col overflow-y-auto rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 pt-5 pb-4">
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

      {/* Mini calendar */}
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
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={`e-${idx}`} className="h-8" />;
            const key = formatISODate(date);
            const isToday = key === todayStr;
            const isSelected = key === selectedDate;
            const dotCount = eventCountByDate[key] ?? 0;
            return (
              <div key={key} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => onDateChange(key)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-lg text-[12px] font-medium transition-all duration-150 hover:scale-110 active:scale-95",
                    isSelected
                      ? "bg-sky-600 font-bold text-white shadow-sm shadow-sky-800/20"
                      : isToday
                        ? "bg-sky-100 font-bold text-sky-700 ring-1 ring-sky-400/60"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {date.getDate()}
                </button>
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

      {/* Quick Jump — teleport N weeks ahead in one click */}
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

      {/* Today's overview */}
      <div className="px-4 pt-3 pb-2">
        <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
          Today&apos;s Overview
        </p>
        <div className="grid grid-cols-2 gap-2">
          {statTiles.map((s) => (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 ring-1 transition-all duration-200 hover:shadow-sm",
                s.bg,
                s.ring,
              )}
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                <s.icon className={cn("size-3.5", s.iconColor)} />
              </div>
              <div className="min-w-0">
                <span
                  className={cn(
                    "block text-xl leading-none font-black tabular-nums",
                    s.text,
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

      <div className="mx-4 mt-2 h-px bg-slate-200/70" />

      {/* Calendar Report — totals for the selected day/week/month view.
          Auto-updates as appointments are added or completed. */}
      <div className="px-4 pt-3 pb-2">
        <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
          Calendar Report ·{" "}
          <span className="text-slate-500">{reportPeriodLabel}</span>
        </p>
        <div className="space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Appointments</span>
            <span className="text-[12px] font-bold tabular-nums text-slate-800">
              {calendarReport.appointments}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Pets</span>
            <span className="text-[12px] font-bold tabular-nums text-slate-800">
              {calendarReport.pets}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Finished</span>
            <span className="text-[12px] font-bold tabular-nums text-slate-800">
              {calendarReport.finished}
            </span>
          </div>
          <div className="my-1 h-px bg-emerald-200/60" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">
              Earned
            </span>
            <span className="text-[12px] font-bold tabular-nums text-emerald-700">
              ${calendarReport.earnedRevenue.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">
              Expected
            </span>
            <span className="text-base font-black tabular-nums text-emerald-800">
              ${calendarReport.expectedRevenue.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming today */}
      {upcomingToday.length > 0 && (
        <>
          <div className="mx-4 mt-2 h-px bg-slate-200/70" />
          <div className="px-4 pt-3 pb-2">
            <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Upcoming Today
            </p>
            <div className="space-y-1.5">
              {upcomingToday.map((apt) => {
                const color = colorForService(apt.packageName ?? "Other");
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2 transition-all duration-150 hover:bg-white hover:shadow-sm"
                    style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] leading-tight font-bold text-slate-800">
                        {apt.petName}
                      </p>
                      <p className="truncate text-[10px] text-slate-500 capitalize">
                        {apt.packageName}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-500 tabular-nums">
                      {apt.startTime}
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
              {viewMode === "day" ? "Today's Services" : "Services in View"}
            </p>
            <div className="space-y-2.5">
              {serviceBreakdown.map(([service, { count, color }]) => {
                const pct = totalInView > 0 ? (count / totalInView) * 100 : 0;
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

// ─── Appointment block (day view) ─────────────────────────────────────────────

function AppointmentBlock({
  appointment,
  stylistColor,
  staffLine,
  isSecondary,
  stageOverride,
  onClick,
  isMatch,
  isDimmed,
  blockRef,
  alertCount,
}: {
  appointment: GroomingAppointment;
  stylistColor: string;
  /** Secondary line shown when the column has more than one assigned person
   *  (e.g., a van's primary driver + second groomer). */
  staffLine?: string;
  /** True when this block is rendered in a co-groomer's column rather than the
   *  primary stylist's column — get a "Co-groom" indicator + muted styling. */
  isSecondary?: boolean;
  /** When the booking is split across sequential stages, the block is sized
   *  by the stage rather than the whole appointment. */
  stageOverride?: {
    label: string;
    startTime: string;
    endTime: string;
    completedAt?: string;
  };
  onClick: (apt: GroomingAppointment) => void;
  isMatch?: boolean;
  isDimmed?: boolean;
  blockRef?: React.Ref<HTMLButtonElement>;
  /** Number of effective alert notes (own + pet carry-forward). Renders the
   *  red exclamation badge so groomers can see warnings without opening the
   *  appointment. */
  alertCount?: number;
}) {
  const startStr = stageOverride?.startTime ?? appointment.startTime;
  const endStr = stageOverride?.endTime ?? appointment.endTime;
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);
  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 3, 28);
  const s = STATUS_META[appointment.status];
  const stageDone = !!stageOverride?.completedAt;

  return (
    <button
      ref={blockRef}
      onClick={(e) => {
        e.stopPropagation();
        onClick(appointment);
      }}
      className={cn(
        "absolute left-1 right-1 rounded-lg",
        "px-2 py-1.5 text-left transition-all",
        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "overflow-hidden cursor-pointer shadow-xs",
        s.bg,
        s.text,
        appointment.status === "cancelled" && "opacity-40",
        appointment.status === "completed" && "opacity-55",
        isSecondary && "opacity-75",
        isMatch && "ring-2 ring-blue-500 ring-offset-1 shadow-lg z-20 scale-[1.02]",
        isDimmed && "opacity-15 saturate-50",
        !isMatch && !isDimmed && "z-10",
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      {(() => {
        const hasExtraPets =
          (appointment.additionalPets?.length ?? 0) > 0;
        const allPetNames = hasExtraPets
          ? [
              appointment.petName,
              ...(appointment.additionalPets?.map((p) => p.petName) ?? []),
            ].join(", ")
          : appointment.petName;
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={cn(
                "size-2 rounded-full flex-shrink-0 shadow-sm",
                s.dot,
              )}
            />
            <span
              className="font-semibold text-xs truncate leading-tight"
              title={hasExtraPets ? allPetNames : undefined}
            >
              {allPetNames}
            </span>
            {!!alertCount && alertCount > 0 && (
              <span
                title={`${alertCount} alert note${alertCount > 1 ? "s" : ""} — open the appointment for details`}
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red-600 px-1.5 text-[9px] font-bold text-white shadow-sm"
              >
                <AlertTriangle className="size-2.5" />
                {alertCount}
              </span>
            )}
            {stageOverride && (
              <span
                className={cn(
                  "ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full px-1 text-[9px] font-semibold shadow-sm",
                  stageDone
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-white/80 text-amber-700 dark:bg-slate-900/80 dark:text-amber-300",
                )}
                title={
                  stageDone
                    ? `Stage complete — ${stageOverride.label}`
                    : `Split-service stage — ${stageOverride.label}`
                }
              >
                {stageDone ? "✓ " : ""}
                {stageOverride.label}
              </span>
            )}
            {!stageOverride && isSecondary && (
              <span
                className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/80 px-1 text-[9px] font-semibold text-violet-700 shadow-sm dark:bg-slate-900/80 dark:text-violet-300"
                title={`Co-groom — primary stylist is ${appointment.stylistName}`}
              >
                Co-groom
              </span>
            )}
            {!stageOverride && !isSecondary && hasExtraPets && (
              <span
                className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/80 px-1 text-[9px] font-semibold text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-200"
                title={`Multi-pet booking — ${(appointment.additionalPets?.length ?? 0) + 1} pets`}
              >
                {(appointment.additionalPets?.length ?? 0) + 1}🐾
              </span>
            )}
          </div>
        );
      })()}
      {height > 46 && (
        <p className="text-[11px] truncate opacity-70 mt-0.5 leading-tight pl-3.5">
          {appointment.packageName}
        </p>
      )}
      {height > 66 && (
        <p className="text-[10px] opacity-55 mt-0.5 pl-3.5">
          {startStr}–{endStr}
        </p>
      )}
      {staffLine && height > 80 && (
        <p
          className="text-[10px] opacity-70 mt-0.5 pl-3.5 truncate"
          title={staffLine}
        >
          {staffLine}
        </p>
      )}
    </button>
  );
}

// ─── Time block (striped gray block) ─────────────────────────────────────────

const TIME_BLOCK_STRIPES =
  "repeating-linear-gradient(45deg, rgba(148,163,184,0.35) 0, rgba(148,163,184,0.35) 6px, rgba(226,232,240,0.7) 6px, rgba(226,232,240,0.7) 12px)";

function TimeBlockBlock({ block }: { block: TimeBlock }) {
  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);
  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 3, 24);
  return (
    <div
      title={`${block.reason} · ${block.startTime}–${block.endTime}${
        block.notes ? ` · ${block.notes}` : ""
      }`}
      className="absolute left-1 right-1 z-[5] overflow-hidden rounded-lg border border-slate-400/40 px-2 py-1 text-slate-700 dark:border-slate-500/40 dark:text-slate-200"
      style={{
        top: `${top}px`,
        height: `${height}px`,
        backgroundImage: TIME_BLOCK_STRIPES,
      }}
    >
      <div className="flex items-center gap-1.5">
        <Ban className="size-3 shrink-0 text-slate-500" />
        <span className="truncate text-xs/tight font-semibold capitalize">
          {block.reason}
        </span>
      </div>
      {height > 40 && (
        <p className="mt-0.5 pl-4 text-[10px] text-slate-500 dark:text-slate-400">
          {block.startTime}–{block.endTime}
        </p>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyDay({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
        <Scissors className="size-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No appointments today</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Start by booking a new appointment
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onNew}>
        <Plus className="size-4 mr-1.5" />
        New Appointment
      </Button>
    </div>
  );
}

// ─── Day view ────────────────────────────────────────────────────────────────

function WaitlistChip({
  count,
  onClick,
  size = "sm",
}: {
  count: number;
  onClick: () => void;
  size?: "sm" | "xs";
}) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${count} on the waitlist`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "xs" && "px-1.5 py-0.5 text-[10px]",
      )}
    >
      <Hourglass className={cn(size === "xs" ? "size-2.5" : "size-3")} />
      {count}
    </button>
  );
}

function DayView({
  selectedDate,
  appointments,
  timeBlocks,
  stylists,
  fullStylists,
  onBlockClick,
  onNew,
  onSlotClick,
  onSlotContext,
  onConfirmBlock,
  matchedIds,
  searchActive,
  stylistNameById,
  alertCountById,
}: {
  selectedDate: string;
  appointments: GroomingAppointment[];
  timeBlocks: TimeBlock[];
  stylists: {
    id: string;
    name: string;
    status: string;
    capacity: { skillLevel: string };
    calendarColor?: string;
    /** Optional secondary line (e.g., "Driver: Sarah · 2nd: Marcus") for van columns. */
    staffLine?: string;
  }[];
  /** Full Stylist records — needed for the bulk-actions reschedule target picker. */
  fullStylists: Stylist[];
  /** Lookup so AppointmentBlocks can resolve co-groomer ids to names. */
  stylistNameById: Record<string, string>;
  onBlockClick: (apt: GroomingAppointment) => void;
  onNew: () => void;
  onSlotClick: (stylistId: string, time: string) => void;
  onSlotContext: (stylistId: string, time: string) => void;
  onConfirmBlock: () => void;
  matchedIds: Set<string>;
  searchActive: boolean;
  alertCountById: Record<string, number>;
}) {
  const dateAppointments = appointments.filter((a) => a.date === selectedDate);

  // Bulk-actions state — triggered from each stylist's column header.
  const [bulkState, setBulkState] = useState<{
    mode: BulkActionMode;
    stylistId: string;
    stylistName: string;
  } | null>(null);

  function openBulk(
    mode: BulkActionMode,
    stylistId: string,
    stylistName: string,
  ) {
    setBulkState({ mode, stylistId, stylistName });
  }

  const bulkTargetAppointments = useMemo(
    () =>
      bulkState
        ? dateAppointments.filter((a) => a.stylistId === bulkState.stylistId)
        : [],
    [bulkState, dateAppointments],
  );
  const activeStylists = stylists.filter((s) => s.status === "active");

  const firstMatchId = useMemo(() => {
    if (!searchActive || matchedIds.size === 0) return null;
    const match = dateAppointments
      .filter((a) => matchedIds.has(a.id))
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))[0];
    return match?.id ?? null;
  }, [dateAppointments, matchedIds, searchActive]);

  const firstMatchRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (firstMatchId && firstMatchRef.current) {
      firstMatchRef.current.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });
    }
  }, [firstMatchId]);

  if (activeStylists.length === 0) return <EmptyDay onNew={onNew} />;

  return (
    <div className="flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
      <div style={{ minWidth: `${64 + activeStylists.length * 168}px` }}>
        {/* Stylist headers */}
        <div
          className="sticky top-0 z-20 flex border-b bg-card/95 backdrop-blur-sm"
          style={{ paddingLeft: "4rem" }}
        >
          {activeStylists.map((stylist) => {
            const headerColor = colorForStylist(
              stylist.id,
              stylist.calendarColor,
            );
            return (
              <div
                key={stylist.id}
                className="flex-1 min-w-[168px] border-l px-3 py-2.5"
                style={{ borderTop: `2px solid ${headerColor}` }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-muted/60"
                      title="Bulk actions for this groomer's day"
                    >
                      <div
                        className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: headerColor }}
                      >
                        {stylist.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {stylist.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                          {stylist.capacity.skillLevel}
                        </p>
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() =>
                        openBulk("reschedule", stylist.id, stylist.name)
                      }
                    >
                      <CalendarClock className="size-4" />
                      Bulk Reschedule
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() =>
                        openBulk("book-again", stylist.id, stylist.name)
                      }
                    >
                      <CalendarPlus className="size-4" />
                      Bulk Book Again
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive focus:text-destructive"
                      onClick={() =>
                        openBulk("cancel", stylist.id, stylist.name)
                      }
                    >
                      <XCircle className="size-4" />
                      Bulk Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
        {/* Grid */}
        <div className="flex">
          <div className="w-16 flex-shrink-0 select-none" aria-hidden>
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: `${HOUR_HEIGHT}px` }}>
                <span className="absolute -top-[9px] right-2 text-[10px] text-muted-foreground/70 leading-none">
                  {formatHour(h)}
                </span>
              </div>
            ))}
          </div>
          {activeStylists.map((stylist) => {
            // Include co-groom appointments where this stylist is the
            // secondary so multi-staff bookings render in every involved
            // column simultaneously. For split-service appointments, only
            // include them in a column if this stylist owns at least one
            // stage there (the per-stage render handles the actual block).
            const stylistAppts = dateAppointments.filter((a) => {
              if (a.stages && a.stages.length > 0) {
                return a.stages.some((st) => st.stylistId === stylist.id);
              }
              return (
                a.stylistId === stylist.id ||
                a.additionalStylistIds?.includes(stylist.id)
              );
            });
            const stylistBlocks = timeBlocks.filter(
              (b) => b.date === selectedDate && b.stylistId === stylist.id,
            );
            const stylistColor = colorForStylist(
              stylist.id,
              stylist.calendarColor,
            );

            const slotTimeFromEvent = (
              e: React.MouseEvent<HTMLDivElement>,
            ): string | null => {
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const slotsFromStart = Math.max(
                0,
                Math.floor((y / HOUR_HEIGHT) * 2),
              );
              const totalMinutes = START_HOUR * 60 + slotsFromStart * 30;
              if (totalMinutes >= END_HOUR * 60) return null;
              const h = Math.floor(totalMinutes / 60);
              const m = totalMinutes % 60;
              return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
            };

            const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>) => {
              const time = slotTimeFromEvent(e);
              if (time) onSlotClick(stylist.id, time);
            };

            const handleColumnContextMenu = (
              e: React.MouseEvent<HTMLDivElement>,
            ) => {
              const time = slotTimeFromEvent(e);
              if (time) onSlotContext(stylist.id, time);
            };

            return (
              <ContextMenu key={stylist.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className="flex-1 min-w-[168px] relative border-l cursor-pointer"
                    onClick={handleColumnClick}
                    onContextMenu={handleColumnContextMenu}
                    role="button"
                    tabIndex={-1}
                    aria-label={`Schedule slot for ${stylist.name}`}
                  >
                    {HOURS.map((h) => (
                      <div key={h} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-border/30">
                        <div className="h-1/2 border-b border-dashed border-border/20" />
                      </div>
                    ))}
                    {stylistBlocks.map((b) => (
                      <TimeBlockBlock key={b.id} block={b} />
                    ))}
                    {stylistAppts.flatMap((apt) => {
                      // Split-service path: render one block per stage owned
                      // by this column's stylist, anchored at the stage's
                      // start/end times rather than the full appointment.
                      if (apt.stages && apt.stages.length > 0) {
                        return apt.stages
                          .filter((st) => st.stylistId === stylist.id)
                          .map((st) => (
                            <AppointmentBlock
                              key={`${apt.id}-${st.id}`}
                              appointment={apt}
                              stylistColor={stylistColor}
                              stageOverride={{
                                label: st.label,
                                startTime: st.startTime,
                                endTime: st.endTime,
                                completedAt: st.completedAt,
                              }}
                              onClick={onBlockClick}
                              isMatch={
                                searchActive && matchedIds.has(apt.id)
                              }
                              isDimmed={
                                searchActive && !matchedIds.has(apt.id)
                              }
                              alertCount={alertCountById[apt.id]}
                            />
                          ));
                      }

                      // Standard / co-groom path
                      const coGroomerNames =
                        apt.additionalStylistIds
                          ?.map((id) => stylistNameById[id])
                          .filter(Boolean) ?? [];
                      const isSecondary = apt.stylistId !== stylist.id;
                      let staffLine: string | undefined;
                      if (isSecondary) {
                        staffLine = `with ${apt.stylistName}`;
                      } else if (coGroomerNames.length > 0) {
                        staffLine = [
                          apt.stylistName,
                          ...coGroomerNames,
                        ].join(" + ");
                      } else if (stylist.staffLine) {
                        staffLine = stylist.staffLine;
                      }
                      return [
                        <AppointmentBlock
                          key={apt.id}
                          appointment={apt}
                          stylistColor={stylistColor}
                          staffLine={staffLine}
                          isSecondary={isSecondary}
                          onClick={onBlockClick}
                          isMatch={searchActive && matchedIds.has(apt.id)}
                          isDimmed={searchActive && !matchedIds.has(apt.id)}
                          blockRef={
                            apt.id === firstMatchId
                              ? firstMatchRef
                              : undefined
                          }
                          alertCount={alertCountById[apt.id]}
                        />,
                      ];
                    })}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onSelect={onConfirmBlock}>
                    <Ban className="size-4" />
                    Block this time
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      </div>
      {bulkState && (
        <BulkActionsDialog
          open={!!bulkState}
          onOpenChange={(o) => {
            if (!o) setBulkState(null);
          }}
          mode={bulkState.mode}
          sourceStylist={{
            id: bulkState.stylistId,
            name: bulkState.stylistName,
          }}
          date={selectedDate}
          appointments={bulkTargetAppointments}
          allStylists={fullStylists}
        />
      )}
    </div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function WeekView({
  selectedDate,
  today,
  appointments,
  onDayClick,
  matchedIds,
  searchActive,
  waitlistByDate,
  onWaitlistOpen,
  stylistColorById,
  alertCountById,
}: {
  selectedDate: string;
  today: string;
  appointments: GroomingAppointment[];
  onDayClick: (dateStr: string) => void;
  matchedIds: Set<string>;
  searchActive: boolean;
  waitlistByDate: Record<string, number>;
  onWaitlistOpen: (dateStr: string) => void;
  stylistColorById: Record<string, string>;
  alertCountById: Record<string, number>;
}) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
      <div className="grid grid-cols-7 divide-x">
        {weekDays.map((day, idx) => {
          const ds = formatISODate(day);
          const dayApts = appointments.filter(
            (a) => a.date === ds && a.status !== "cancelled" && a.status !== "no-show",
          );
          const isToday = ds === today;
          const isSelected = ds === selectedDate;

          const waitlistCount = waitlistByDate[ds] ?? 0;
          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              className={cn(
                "flex flex-col gap-1.5 p-3 text-left hover:bg-muted/50 transition-colors min-h-[160px]",
                isSelected && "bg-pink-50/60 dark:bg-pink-950/20",
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase">
                    {DAY_ABBR[idx]}
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                      isToday
                        ? "bg-pink-500 text-white"
                        : isSelected
                          ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                          : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <WaitlistChip
                  count={waitlistCount}
                  onClick={() => onWaitlistOpen(ds)}
                  size="xs"
                />
              </div>
              {dayApts.length === 0 ? (
                <span className="text-[10px] text-muted-foreground/50 mt-1">No appts</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {dayApts.slice(0, 4).map((apt) => {
                    const s = STATUS_META[apt.status];
                    const isMatch = searchActive && matchedIds.has(apt.id);
                    const isDimmed = searchActive && !isMatch;
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                          s.bg,
                          s.text,
                          isMatch && "ring-2 ring-blue-500 ring-offset-1",
                          isDimmed && "opacity-25 saturate-50",
                        )}
                      >
                        {!!alertCountById[apt.id] && (
                          <AlertTriangle
                            className="size-2.5 shrink-0 text-red-600"
                            aria-label={`${alertCountById[apt.id]} alert note${alertCountById[apt.id] > 1 ? "s" : ""}`}
                          />
                        )}
                        <span className="truncate">
                          {apt.startTime} {apt.petName}
                        </span>
                      </div>
                    );
                  })}
                  {dayApts.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayApts.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────

function MonthView({
  selectedDate,
  today,
  appointments,
  onDayClick,
  matchedIds,
  searchActive,
  waitlistByDate,
  onWaitlistOpen,
  stylistColorById,
  alertCountById,
}: {
  selectedDate: string;
  today: string;
  appointments: GroomingAppointment[];
  onDayClick: (dateStr: string) => void;
  matchedIds: Set<string>;
  searchActive: boolean;
  waitlistByDate: Record<string, number>;
  onWaitlistOpen: (dateStr: string) => void;
  stylistColorById: Record<string, string>;
  alertCountById: Record<string, number>;
}) {
  const cells = getMonthDays(selectedDate);

  return (
    <div className="flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b">
        {DAY_ABBR.map((d) => (
          <div key={d} className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground uppercase">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="min-h-[100px] bg-muted/20" />;
          }
          const ds = formatISODate(day);
          const dayApts = appointments.filter(
            (a) => a.date === ds && a.status !== "cancelled" && a.status !== "no-show",
          );
          const isToday = ds === today;
          const isSelected = ds === selectedDate;

          const waitlistCount = waitlistByDate[ds] ?? 0;
          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              className={cn(
                "min-h-[100px] p-2 text-left hover:bg-muted/50 transition-colors flex flex-col gap-1",
                isSelected && "bg-pink-50/60 dark:bg-pink-950/20",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                    isToday
                      ? "bg-pink-500 text-white"
                      : isSelected
                        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                        : "text-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                <WaitlistChip
                  count={waitlistCount}
                  onClick={() => onWaitlistOpen(ds)}
                  size="xs"
                />
              </div>
              {dayApts.slice(0, 3).map((apt) => {
                const s = STATUS_META[apt.status];
                const isMatch = searchActive && matchedIds.has(apt.id);
                const isDimmed = searchActive && !isMatch;
                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium w-full",
                      s.bg,
                      s.text,
                      isMatch && "ring-2 ring-blue-500 ring-offset-1",
                      isDimmed && "opacity-25 saturate-50",
                    )}
                  >
                    {!!alertCountById[apt.id] && (
                      <AlertTriangle
                        className="size-2.5 shrink-0 text-red-600"
                        aria-label={`${alertCountById[apt.id]} alert note${alertCountById[apt.id] > 1 ? "s" : ""}`}
                      />
                    )}
                    <span className="truncate">
                      {apt.startTime} {apt.petName}
                    </span>
                  </div>
                );
              })}
              {dayApts.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{dayApts.length - 3} more</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GroomingCalendar() {
  const todayStr = formatISODate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  // Print picker — controls which printable layout is mounted into the
  // hidden `print:block` surface when the browser print dialog opens.
  const [printMode, setPrintMode] = useState<"day-summary" | "cards">(
    "day-summary",
  );

  function handlePrint(mode: "day-summary" | "cards") {
    setPrintMode(mode);
    // Defer the actual print() until after the state flush so the requested
    // layout has time to mount into the print surface.
    queueMicrotask(() => window.print());
  }
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<GroomingAppointment | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [quickBookSlot, setQuickBookSlot] = useState<
    { stylistId: string; time: string } | null
  >(null);
  const [filters, setFilters] = useState<CalendarFilterState>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [pendingBlockSlot, setPendingBlockSlot] = useState<
    { stylistId: string; time: string } | null
  >(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  const { data: appointments = [] } = useQuery(groomingQueries.appointments());
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const { entries: waitlist } = useGroomingWaitlist();
  const { enabled: mobileEnabled, vans } = useMobileGrooming();

  // When mobile grooming is on, vans show up alongside groomers as calendar
  // columns. They share the same shape so DayView can render them without
  // knowing the difference.
  const calendarColumns = useMemo(() => {
    const cols = stylistsData.map((s) => ({
      id: s.id,
      name: s.name,
      status: s.status,
      capacity: { skillLevel: s.capacity.skillLevel },
      calendarColor: s.calendarColor,
    }));
    if (!mobileEnabled) return cols;
    const nameFor = (id: string | undefined) => {
      if (!id) return null;
      const s = facilityStaff.find((p) => p.id === id);
      return s ? `${s.firstName} ${s.lastName}` : null;
    };
    const vanCols = vans
      .filter((v) => v.active)
      .map((v) => {
        const primary = nameFor(v.primaryDriverId);
        const second = nameFor(v.secondGroomerId);
        const staffLine =
          primary && second
            ? `${primary} · ${second}`
            : (primary ?? second ?? undefined);
        return {
          id: v.id,
          name: v.name,
          status: "active" as const,
          capacity: { skillLevel: "van" },
          calendarColor: v.calendarColor,
          staffLine,
        };
      });
    return [...cols, ...vanCols];
  }, [stylistsData, vans, mobileEnabled]);

  const waitlistByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of waitlist) {
      // Only count entries that are still actionable on the calendar.
      if (w.status === "confirmed" || w.status === "expired") continue;
      map[w.date] = (map[w.date] ?? 0) + 1;
    }
    return map;
  }, [waitlist]);

  const stylistColorById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stylistsData) {
      map[s.id] = colorForStylist(s.id, s.calendarColor);
    }
    return map;
  }, [stylistsData]);

  const stylistNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of stylistsData) map[s.id] = s.name;
    return map;
  }, [stylistsData]);

  const [waitlistDate, setWaitlistDate] = useState<string | null>(null);

  const filteredAppointments = useMemo(
    () => applyCalendarFilters(appointments, filters),
    [appointments, filters],
  );

  // Effective alert-note count per appointment. Carry-forward alerts from past
  // bookings for the same pet are included so the red badge appears even on
  // future appointments that don't have their own alerts yet.
  const alertCountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      const count = getEffectiveAlertNotes(a, appointments).length;
      if (count > 0) map[a.id] = count;
    }
    return map;
  }, [appointments]);

  const searchActive = searchQuery.trim().length > 0;

  const searchMatchedIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return new Set<string>();
    const qDigits = q.replace(/\D/g, "");
    const ids = new Set<string>();
    for (const a of filteredAppointments) {
      if (
        a.petName.toLowerCase().includes(q) ||
        a.ownerName.toLowerCase().includes(q)
      ) {
        ids.add(a.id);
        continue;
      }
      if (qDigits.length >= 3) {
        const phoneDigits = a.ownerPhone.replace(/\D/g, "");
        if (phoneDigits.includes(qDigits)) ids.add(a.id);
      }
    }
    return ids;
  }, [filteredAppointments, searchQuery]);

  // Auto-navigate to the first match's date so the result is visible in any view.
  useEffect(() => {
    if (!searchActive || searchMatchedIds.size === 0) return;
    const earliest = filteredAppointments
      .filter((a) => searchMatchedIds.has(a.id))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      })[0];
    if (earliest && earliest.date !== selectedDate) {
      setSelectedDate(earliest.date);
    }
    // Intentionally fire only when the search query changes, not on every
    // selectedDate change — otherwise we'd snap the user back if they navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const activeEventCount = useMemo(() => {
    const apts = filteredAppointments.filter(
      (a) =>
        a.date === selectedDate &&
        a.status !== "cancelled" &&
        a.status !== "no-show",
    ).length;
    // Time blocks count against scheduling capacity, so include them.
    const blocks = timeBlocks.filter((b) => b.date === selectedDate).length;
    return apts + blocks;
  }, [filteredAppointments, selectedDate, timeBlocks]);

  function handleBlockClick(apt: GroomingAppointment) {
    setSelectedAppointment(apt);
    setPanelOpen(true);
  }

  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr);
    setViewMode("day");
  }

  function handleSlotClick(stylistId: string, time: string) {
    setQuickBookSlot({ stylistId, time });
    setNewDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setNewDialogOpen(open);
    if (!open) setQuickBookSlot(null);
  }

  function handleNewEvent() {
    setQuickBookSlot(null);
    setNewDialogOpen(true);
  }

  function handleSlotContext(stylistId: string, time: string) {
    // Stage the right-clicked slot so the menu item can commit it.
    setPendingBlockSlot({ stylistId, time });
  }

  function handleConfirmBlock() {
    if (pendingBlockSlot) setBlockDialogOpen(true);
  }

  function handleSaveBlock(block: TimeBlock) {
    setTimeBlocks((prev) => [...prev, block]);
  }

  function handleBlockDialogOpenChange(next: boolean) {
    setBlockDialogOpen(next);
    if (!next) setPendingBlockSlot(null);
  }

  const pendingBlockStylistName = pendingBlockSlot
    ? (stylistsData.find((s) => s.id === pendingBlockSlot.stylistId)?.name ??
      "Groomer")
    : "";

  return (
    <>
    <div className="flex h-full gap-6 print:hidden">
      <GroomingSidebar
        selectedDate={selectedDate}
        todayStr={todayStr}
        appointments={filteredAppointments}
        viewMode={viewMode}
        onDateChange={setSelectedDate}
      />

      {/* ── Main View Area ── */}
      <div className="flex-1 flex flex-col min-w-0 gap-4 bg-slate-50/50 dark:bg-slate-900/20 rounded-[2rem] p-6 border shadow-sm">
        {/* Top Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" className="rounded-full px-5 shadow-sm h-10 border-slate-200 hover:bg-slate-100 bg-white" onClick={() => setSelectedDate(todayStr)}>
              Today
            </Button>
            <div className="flex bg-white dark:bg-slate-950 p-1 rounded-full border shadow-sm">
              {(["day", "week", "month"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={cn(
                    "px-5 py-1.5 text-sm font-medium rounded-full capitalize transition-all",
                    viewMode === v
                      ? "bg-slate-100 dark:bg-slate-800 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pet, owner, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full w-56 pl-9 h-10 shadow-sm bg-white dark:bg-slate-950 border-slate-200"
              />
            </div>
            <CalendarFilters
              filters={filters}
              onChange={setFilters}
              stylists={stylistsData}
              appointments={appointments}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-full h-10 px-4 shadow-sm gap-2 border-slate-200 hover:bg-slate-100 bg-white"
                  title="Print options"
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => handlePrint("day-summary")}
                  className="gap-2"
                >
                  <CalendarDays className="size-4" />
                  Daily Summary
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handlePrint("cards")}
                  className="gap-2"
                >
                  <Scissors className="size-4" />
                  Appointment Cards
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button className="rounded-full h-10 px-5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={handleNewEvent}>
              <Plus className="h-4 w-4 mr-1.5" /> New Event
            </Button>
          </div>
        </div>

        {/* Header Title */}
        <div className="flex items-center justify-between mt-2 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <ActivitySquare className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold">Client Schedule</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              {activeEventCount} active events
            </span>
            {viewMode === "day" && (waitlistByDate[selectedDate] ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setWaitlistDate(selectedDate)}
                className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
              >
                <Hourglass className="size-3.5" />
                {waitlistByDate[selectedDate]} on waitlist
              </button>
            )}
            <span className="text-sm text-muted-foreground hidden lg:inline">
              Click any date & time to create a quick appointment.
            </span>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="flex-1 min-h-0 bg-background rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          {viewMode === "day" && (
            <DayView
              selectedDate={selectedDate}
              appointments={filteredAppointments}
              timeBlocks={timeBlocks}
              stylists={calendarColumns}
              fullStylists={stylistsData}
              onBlockClick={handleBlockClick}
              onNew={handleNewEvent}
              onSlotClick={handleSlotClick}
              onSlotContext={handleSlotContext}
              onConfirmBlock={handleConfirmBlock}
              matchedIds={searchMatchedIds}
              searchActive={searchActive}
              stylistNameById={stylistNameById}
              alertCountById={alertCountById}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              selectedDate={selectedDate}
              today={todayStr}
              appointments={filteredAppointments}
              onDayClick={handleDayClick}
              matchedIds={searchMatchedIds}
              searchActive={searchActive}
              waitlistByDate={waitlistByDate}
              onWaitlistOpen={setWaitlistDate}
              stylistColorById={stylistColorById}
              alertCountById={alertCountById}
            />
          )}
          {viewMode === "month" && (
            <MonthView
              selectedDate={selectedDate}
              today={todayStr}
              appointments={filteredAppointments}
              onDayClick={handleDayClick}
              matchedIds={searchMatchedIds}
              searchActive={searchActive}
              waitlistByDate={waitlistByDate}
              onWaitlistOpen={setWaitlistDate}
              stylistColorById={stylistColorById}
              alertCountById={alertCountById}
            />
          )}
        </div>
      </div>

      <AppointmentPanel
        open={panelOpen}
        onOpenChange={setPanelOpen}
        appointment={selectedAppointment}
      />

      <NewAppointmentDialog
        open={newDialogOpen}
        onOpenChange={handleDialogOpenChange}
        defaultDate={selectedDate}
        defaultStartTime={quickBookSlot?.time}
        defaultStylistId={quickBookSlot?.stylistId}
      />

      <TimeBlockDialog
        open={blockDialogOpen}
        onOpenChange={handleBlockDialogOpenChange}
        stylistId={pendingBlockSlot?.stylistId ?? ""}
        stylistName={pendingBlockStylistName}
        date={selectedDate}
        startTime={pendingBlockSlot?.time ?? "09:00"}
        onSave={handleSaveBlock}
      />

      <WaitlistPanel
        open={waitlistDate !== null}
        onOpenChange={(open) => {
          if (!open) setWaitlistDate(null);
        }}
        date={waitlistDate ?? selectedDate}
        entries={
          waitlistDate
            ? waitlist.filter((w) => w.date === waitlistDate)
            : []
        }
      />
    </div>

    <PrintableDaySheet
      date={selectedDate}
      appointments={filteredAppointments}
      allAppointments={appointments}
      timeBlocks={timeBlocks}
      stylists={calendarColumns}
      active={printMode === "day-summary"}
    />
    <PrintableAppointmentCards
      date={selectedDate}
      appointments={filteredAppointments}
      allAppointments={appointments}
      active={printMode === "cards"}
    />
    </>
  );
}
