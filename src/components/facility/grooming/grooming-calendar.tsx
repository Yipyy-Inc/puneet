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
import {
  groomingQueries,
  getEffectiveAlertNotes,
  stylistMeetsSkillRequirement,
} from "@/lib/api/grooming";
import type {
  AlertNote,
  GroomingAppointment,
  GroomingStatus,
  Stylist,
} from "@/types/grooming";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { BulkActionsDialog, type BulkActionMode } from "./bulk-actions-dialog";
import { getMissedTaskCountForModule } from "@/lib/today-tasks";
import { useSettings } from "@/hooks/use-settings";
import { computeSupplyAlerts } from "@/lib/grooming-supply-alerts";
import {
  findStylistTimeConflict,
  getBookedStationIdsInWindow,
} from "@/lib/grooming-scheduling";
import { groomingPackages } from "@/data/grooming";
import { buildBookingChangeMessage } from "@/lib/grooming-post-booking";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Eraser,
  DoorOpen,
  BellRing,
  Ghost,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64;
const START_HOUR = 8;
const END_HOUR = 19;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

type ViewMode = "day" | "week" | "month";

// ─── Now-tick hook ────────────────────────────────────────────────────────────

/**
 * Returns the current local time as minutes-since-midnight, re-rendering
 * every 30 seconds. Lifted to the parent view (DayView) so we only run one
 * interval per calendar mount and pass the value down to each block.
 * Returns null on the first render (SSR / hydration parity).
 */
function useNowMin(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── Status styles ────────────────────────────────────────────────────────────

// Icon per status so each block self-narrates its state without staff having
// to memorize the bg-color encoding. The icon sits at the leading edge of the
// block, replacing the empty avatar slot when no pet photo exists.
const STATUS_ICON: Record<
  GroomingStatus,
  React.ComponentType<{ className?: string }>
> = {
  scheduled: CalendarClock,
  "checked-in": DoorOpen,
  "in-progress": Scissors,
  "ready-for-pickup": BellRing,
  completed: CheckCircle2,
  cancelled: XCircle,
  "no-show": Ghost,
};

export const STATUS_META: Record<
  GroomingStatus,
  { bg: string; text: string; dot: string; pill: string; label: string }
> = {
  // Confirmed — white/light, the "default" pending state. Border on the block
  // keeps it visible against the calendar background since the bg is plain.
  scheduled: {
    bg: "bg-white dark:bg-slate-900",
    text: "text-slate-800 dark:text-slate-100",
    dot: "bg-slate-400",
    pill: "bg-slate-500",
    label: "Confirmed",
  },
  "checked-in": {
    bg: "bg-sky-100 dark:bg-sky-900/40",
    text: "text-sky-900 dark:text-sky-100",
    dot: "bg-sky-500",
    pill: "bg-sky-500",
    label: "Checked In",
  },
  // In Progress — blue (was amber). Saturated enough to read against the
  // light "Confirmed" bg on the same column.
  "in-progress": {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
    pill: "bg-blue-500",
    label: "In Progress",
  },
  // Ready for Pickup — green (kept).
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
  // No Show — solid red (was rose). Most actionable miss for a manager
  // doing a scan, so it gets the loudest color.
  "no-show": {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-900 dark:text-red-100",
    dot: "bg-red-500",
    pill: "bg-red-500",
    label: "No Show",
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, total));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatHour(h: number): string {
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

/** Compact "Xh expected" / "Xh Ym expected" label for a session's estimated
 *  duration (spec Table 34 — second line of the elapsed indicator). */
function formatExpectedDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m expected`;
  if (h > 0) return `${h}h expected`;
  return `${m}m expected`;
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
function colorForStylist(stylistId: string, configured?: string): string {
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
    () =>
      new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), 1),
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
      inProgress: todayAppointments.filter((a) => a.status === "in-progress")
        .length,
      readyForPickup: todayAppointments.filter(
        (a) => a.status === "ready-for-pickup",
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
    // Earned = money actually collected — appointments paid at checkout
    // (applyPaymentResult stamps paymentStatus="paid") or otherwise completed.
    // Updates live as payments come in, so it no longer sits at $0 all day.
    const collected = counting.filter(
      (a) => a.paymentStatus === "paid" || a.status === "completed",
    );
    const earnedRevenue = collected.reduce((s, a) => s + a.totalPrice, 0);
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
    viewMode === "day"
      ? "today"
      : viewMode === "week"
        ? "this week"
        : "this month";

  // Active (non-cancelled / non-no-show) appointments in the current view.
  // Shared by the service mix + add-on breakdown so both reconcile with the
  // Calendar Report's Expected revenue (same date-filtered set).
  const inViewActive = useMemo(() => {
    return appointments.filter((a) => {
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
  }, [appointments, viewMode, selectedDate]);

  const serviceBreakdown = useMemo(() => {
    const map: Record<
      string,
      { count: number; color: string; revenue: number }
    > = {};
    for (const a of inViewActive) {
      const svc = a.packageName ?? "Other";
      if (!map[svc]) {
        map[svc] = { count: 0, color: colorForService(svc), revenue: 0 };
      }
      map[svc].count++;
      map[svc].revenue += a.totalPrice;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 7);
  }, [inViewActive]);

  // Every add-on booked across the in-view appointments, counted by name so
  // staff can prep supplies. Derived from the same day-filtered set.
  const addOnBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of inViewActive) {
      for (const name of a.addOns ?? []) {
        map[name] = (map[name] ?? 0) + 1;
      }
    }
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, c]) => s + c, 0);
    return { entries, total };
  }, [inViewActive]);

  const totalInView = serviceBreakdown.reduce(
    (s, [, { count }]) => s + count,
    0,
  );

  // Supply Alerts (spec Table 31) — only when the grooming module tracks
  // inventory. Joins the in-view add-ons to the consumable each draws down and
  // surfaces a soft reminder when stock is low. Never blocks anything.
  const { grooming: groomingModule } = useSettings();
  const inventoryTrackingEnabled =
    groomingModule.settings.inventory?.trackingEnabled ?? false;
  const supplyAlerts = useMemo(
    () =>
      inventoryTrackingEnabled
        ? computeSupplyAlerts(Object.fromEntries(addOnBreakdown.entries))
        : [],
    [inventoryTrackingEnabled, addOnBreakdown],
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
      bg: "bg-slate-50",
      ring: "ring-slate-100",
      text: "text-slate-700",
      iconColor: "text-slate-500",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      icon: Scissors,
      bg: "bg-blue-50",
      ring: "ring-blue-100",
      text: "text-blue-600",
      iconColor: "text-blue-500",
    },
    {
      label: "Ready for Pickup",
      value: stats.readyForPickup,
      icon: BellRing,
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
            <span className="text-[12px] font-bold text-slate-800 tabular-nums">
              {calendarReport.appointments}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Pets</span>
            <span className="text-[12px] font-bold text-slate-800 tabular-nums">
              {calendarReport.pets}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-600">Finished</span>
            <span className="text-[12px] font-bold text-slate-800 tabular-nums">
              {calendarReport.finished}
            </span>
          </div>
          <div className="my-1 h-px bg-emerald-200/60" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">
              Earned
            </span>
            <span className="text-[12px] font-bold text-emerald-700 tabular-nums">
              ${calendarReport.earnedRevenue.toFixed(0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-700">
              Expected
            </span>
            <span className="text-base font-black text-emerald-800 tabular-nums">
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
              {viewMode === "day" ? "Service Mix Today" : "Services in View"}
            </p>
            <div className="space-y-2.5">
              {serviceBreakdown.map(([service, { count, color, revenue }]) => {
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
                        ×{count} = ${revenue.toFixed(0)}
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

            {/* Add-ons roll-up — clickable list of every add-on across the
                in-view appointments (name × count) so staff can prep supplies. */}
            {addOnBreakdown.total > 0 && (
              <div className="mt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                    >
                      <Sparkles className="size-3" />
                      Add-ons: {addOnBreakdown.total} total
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-0">
                    <div className="border-b px-3 py-2">
                      <p className="text-xs font-semibold">Add-ons today</p>
                      <p className="text-muted-foreground text-[10px]">
                        Prep supplies across today&rsquo;s appointments
                      </p>
                    </div>
                    <ul className="max-h-64 divide-y overflow-y-auto">
                      {addOnBreakdown.entries.map(([name, count]) => (
                        <li
                          key={name}
                          className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                        >
                          <span className="truncate">{name}</span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            ×{count}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </>
      )}

      {/* Supply Alerts — soft reminders when today's add-ons draw down a low
          consumable (spec Table 31). Rendered only when inventory tracking is
          enabled and something is actually low; never a hard block. */}
      {inventoryTrackingEnabled && supplyAlerts.length > 0 && (
        <>
          <div className="mx-4 mt-2 h-px bg-slate-200/70" />
          <div className="px-4 pt-3 pb-5">
            <p className="mb-2.5 text-[9px] font-black tracking-widest text-slate-400 uppercase">
              Supply Alerts
            </p>
            <div className="space-y-1.5">
              {supplyAlerts.map((a) => (
                <div
                  key={a.addOnName}
                  className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2 dark:border-amber-900/40 dark:bg-amber-950/20"
                >
                  <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-[11px] leading-tight font-semibold text-amber-900 dark:text-amber-200">
                      {a.message}
                    </p>
                    {a.alreadyLow && (
                      <p className="mt-0.5 text-[10px] text-amber-700/80 dark:text-amber-300/70">
                        {a.productName} is at/below its reorder level.
                      </p>
                    )}
                  </div>
                </div>
              ))}
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
  isSecondary,
  stageOverride,
  onClick,
  isMatch,
  isDimmed,
  blockRef,
  alertCount,
  alertNotes,
  nowMin,
  isToday,
  isDraggable,
  onDragStartAppointment,
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
  /** Full alert-note records — when present, clicking the badge opens a
   *  small popover listing each note instead of the full appointment. */
  alertNotes?: AlertNote[];
  /** Current local time in minutes-since-midnight. Drives the late / overrun /
   *  ready-since tags. Null during the SSR/first render. */
  nowMin?: number | null;
  /** True when the calendar is showing today's date. Time-based exception
   *  tags only apply to today's appointments. */
  isToday?: boolean;
  /** When true the block can be dragged to another column (reassign) or a new
   *  time (reschedule). Only the primary, non-terminal block is draggable. */
  isDraggable?: boolean;
  /** Fired on drag start so the DayView can track which appointment is moving. */
  onDragStartAppointment?: () => void;
}) {
  const startStr = stageOverride?.startTime ?? appointment.startTime;
  const endStr = stageOverride?.endTime ?? appointment.endTime;
  const start = timeToMinutes(startStr);
  const end = timeToMinutes(endStr);
  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  // Fixed compact height — two tight lines (pet name + service) regardless
  // of appointment duration so the calendar stays scannable.
  const height = 50;
  const s = STATUS_META[appointment.status];
  const StatusIcon = STATUS_ICON[appointment.status];
  const stageDone = !!stageOverride?.completedAt;

  // Time-based exception state — only meaningful on today's view. 5-minute
  // grace before "late" fires keeps normal arrival window from flashing red.
  const LATE_GRACE_MIN = 5;
  const RUNNING_LONG_MIN = 15;
  const liveOnToday = !!isToday && typeof nowMin === "number";
  const lateMin =
    liveOnToday &&
    appointment.status === "scheduled" &&
    nowMin! > start + LATE_GRACE_MIN
      ? nowMin! - start
      : 0;

  // During the groom — derive elapsed and estimated duration from the actual
  // check-in time (groomer's wall clock) rather than the scheduled start.
  // estimatedReadyTime is the groomer-adjusted target captured at check-in;
  // fall back to scheduled (endTime - startTime) if it's missing.
  const checkInMin = appointment.checkInTime
    ? (() => {
        const d = new Date(appointment.checkInTime);
        return Number.isNaN(d.getTime())
          ? null
          : d.getHours() * 60 + d.getMinutes();
      })()
    : null;
  const estimatedReadyMin = appointment.estimatedReadyTime
    ? timeToMinutes(appointment.estimatedReadyTime)
    : null;
  const sessionEstimatedMin =
    estimatedReadyMin !== null && checkInMin !== null
      ? Math.max(0, estimatedReadyMin - checkInMin)
      : end - start;
  const elapsedMin =
    liveOnToday &&
    appointment.status === "in-progress" &&
    checkInMin !== null &&
    nowMin! >= checkInMin
      ? nowMin! - checkInMin
      : 0;
  const runningLongMin =
    appointment.status === "in-progress" &&
    elapsedMin > sessionEstimatedMin + RUNNING_LONG_MIN
      ? elapsedMin - sessionEstimatedMin
      : 0;
  const progressPct =
    appointment.status === "in-progress" && sessionEstimatedMin > 0
      ? Math.min(100, Math.round((elapsedMin / sessionEstimatedMin) * 100))
      : 0;

  // Ready-since approximates from the scheduled end time — close enough for
  // the prototype; when a real `markedReadyAt` timestamp is captured we'd
  // swap to that for accuracy.
  const readySinceMin =
    liveOnToday && appointment.status === "ready-for-pickup" && nowMin! > end
      ? nowMin! - end
      : 0;

  const hasExtraPets = (appointment.additionalPets?.length ?? 0) > 0;
  const allPetNames = hasExtraPets
    ? [
        appointment.petName,
        ...(appointment.additionalPets?.map((p) => p.petName) ?? []),
      ].join(", ")
    : appointment.petName;
  const hasCheckedInBadge = !!appointment.expressCheckinSubmission;

  const alertBadge = !!alertCount && alertCount > 0 && (
    <Popover>
      {/* Span trigger (not button) because the outer AppointmentBlock is
          already a <button>; nesting buttons is invalid HTML. role/tabIndex
          + keyboard handler keep the span fully keyboard-accessible. */}
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          // Clicking the badge must NOT open the full appointment — staff
          // wants a quick read of the warnings without losing their place.
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") e.stopPropagation();
          }}
          title={`${alertCount} alert note${alertCount > 1 ? "s" : ""} — click for details`}
          className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:outline-none"
        >
          <AlertTriangle className="size-2.5" />
          {alertCount}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-red-800 dark:text-red-200">
            <AlertTriangle className="size-3.5" />
            {alertCount} alert note{alertCount > 1 ? "s" : ""}
          </p>
          <p className="mt-0.5 text-[10px] text-red-700/80 dark:text-red-300/80">
            {appointment.petName} — includes carry-forward from past visits
          </p>
        </div>
        <ul className="divide-border max-h-64 divide-y overflow-y-auto">
          {(alertNotes ?? []).map((note) => (
            <li key={note.id} className="px-3 py-2">
              <p className="text-xs/snug">{note.text}</p>
              <p className="text-muted-foreground mt-1 text-[10px]">
                {note.createdBy}
                {" · "}
                {new Date(note.createdAt).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {note.appliesToFuture && " · applies to future"}
              </p>
            </li>
          ))}
          {(!alertNotes || alertNotes.length === 0) && (
            <li className="text-muted-foreground px-3 py-2 text-[11px] italic">
              No note details available.
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );

  // Time-based exception pill — wins over other badges visually because it's
  // the most actionable state ("Late", "Overrun", "Ready Nm waiting").
  const exceptionPill =
    lateMin > 0 ? (
      <span
        title={`Scheduled for ${startStr} — client is ${lateMin} min late`}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm"
      >
        <Clock className="size-2.5" />
        Late {lateMin}m
      </span>
    ) : runningLongMin > 0 ? (
      <span
        title={`Running ${runningLongMin} min past the estimated duration — consider sending an ETA update to ${appointment.ownerName}`}
        className="inline-flex shrink-0 animate-pulse items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm"
      >
        <Hourglass className="size-2.5" />
        Running long {runningLongMin}m
      </span>
    ) : appointment.status === "in-progress" &&
      liveOnToday &&
      elapsedMin > 0 ? (
      <span
        title={`Elapsed ${elapsedMin} min of ~${sessionEstimatedMin} min estimated`}
        className="inline-flex shrink-0 flex-col items-center rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] leading-none font-bold text-white tabular-nums shadow-sm"
      >
        <span>{elapsedMin}m</span>
        <span className="mt-0.5 text-[8px] font-medium opacity-90">
          {formatExpectedDuration(sessionEstimatedMin)}
        </span>
      </span>
    ) : readySinceMin > 0 ? (
      <span
        title={`Marked ready for pickup ~${readySinceMin} min ago — nudge the client`}
        className="inline-flex shrink-0 animate-pulse items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase shadow-sm"
      >
        <BellRing className="size-2.5" />
        Ready {readySinceMin}m
      </span>
    ) : null;

  // Status icon + label — gives every block an explicit state cue so staff
  // don't have to memorize the bg-color encoding. Hidden when an exception
  // pill is showing because it already implies the state.
  const statusChip = !exceptionPill ? (
    <span
      title={s.label}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/70 px-1 py-0.5 text-[9px] font-semibold tracking-wide uppercase shadow-sm dark:bg-slate-900/60"
    >
      <StatusIcon className="size-2.5" />
      {s.label}
    </span>
  ) : null;
  const checkedInBadge = hasCheckedInBadge && (
    <span
      title="Client submitted the Express Check-In form"
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm"
    >
      <CheckCircle2 className="size-2.5" />
      Checked in
    </span>
  );

  const cornerBadge = stageOverride ? (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1 text-[9px] font-semibold shadow-sm",
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
  ) : isSecondary ? (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/80 px-1 text-[9px] font-semibold text-violet-700 shadow-sm dark:bg-slate-900/80 dark:text-violet-300"
      title={`Co-groom — primary stylist is ${appointment.stylistName}`}
    >
      Co-groom
    </span>
  ) : hasExtraPets ? (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white/80 px-1 text-[9px] font-semibold text-slate-700 shadow-sm dark:bg-slate-900/80 dark:text-slate-200"
      title={`Multi-pet booking — ${(appointment.additionalPets?.length ?? 0) + 1} pets`}
    >
      {(appointment.additionalPets?.length ?? 0) + 1}🐾
    </span>
  ) : null;

  // +N add-ons badge (spec Table 35) — surfaces how many extras this booking
  // carries so staff can prep. Tooltip lists the add-on names.
  const addOnBadge =
    (appointment.addOns?.length ?? 0) > 0 ? (
      <span
        title={`Add-ons: ${appointment.addOns.join(", ")}`}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-violet-600 px-1 py-0.5 text-[9px] font-bold text-white shadow-sm"
      >
        <Sparkles className="size-2" />+{appointment.addOns.length}
      </span>
    ) : null;

  return (
    <button
      ref={blockRef}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) return;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", appointment.id);
        onDragStartAppointment?.();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(appointment);
      }}
      className={cn(
        "group absolute right-1 left-1 rounded-lg border border-black/5 backdrop-blur-sm",
        "cursor-pointer overflow-hidden text-left shadow-sm transition-all",
        "hover:scale-[1.01] hover:shadow-md active:scale-[0.99]",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        "px-2 py-1",
        s.bg,
        s.text,
        appointment.status === "cancelled" && "opacity-40",
        appointment.status === "completed" && "opacity-55",
        isSecondary && "opacity-75",
        isMatch &&
          "z-20 scale-[1.02] shadow-lg ring-2 ring-blue-500 ring-offset-1",
        isDimmed && "opacity-15 saturate-50",
        !isMatch && !isDimmed && "z-10",
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <div className="flex h-full min-w-0 items-center gap-2">
        <div className="ring-background relative size-8 shrink-0 overflow-hidden rounded-full ring-2">
          {appointment.petPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={appointment.petPhotoUrl}
              alt={appointment.petName}
              width={32}
              height={32}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-white/60 dark:bg-slate-900/60">
              <StatusIcon className="size-4 opacity-70" />
            </div>
          )}
          {/* Status corner badge — only when a photo covers the avatar so the
              state remains visible even when the icon-fallback above is hidden. */}
          {appointment.petPhotoUrl && (
            <span
              title={s.label}
              className={cn(
                "absolute -right-px -bottom-px flex size-3.5 items-center justify-center rounded-full ring-1 ring-white dark:ring-slate-900",
                s.pill,
              )}
            >
              <StatusIcon className="size-2 text-white" />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-px">
          <div className="flex min-w-0 items-center gap-1">
            <span
              className="truncate text-xs/tight font-semibold"
              title={hasExtraPets ? allPetNames : undefined}
            >
              {allPetNames}
            </span>
            {exceptionPill}
            {!exceptionPill && statusChip}
            {alertBadge}
          </div>
          <span
            className="truncate text-[10px] leading-tight opacity-75"
            title={appointment.packageName}
          >
            {appointment.packageName}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-px">
          {checkedInBadge}
          {cornerBadge}
          {addOnBadge}
        </div>
      </div>
      {/* Elapsed / estimated progress bar — only on today's in-progress
          appointments. Color escalates from blue → amber → red as the
          session approaches and then exceeds the estimated duration. */}
      {appointment.status === "in-progress" &&
        liveOnToday &&
        sessionEstimatedMin > 0 && (
          <span
            className="absolute right-0 bottom-0 left-0 h-1 bg-black/10 dark:bg-white/10"
            aria-hidden="true"
          >
            <span
              className={cn(
                "block h-full transition-all duration-500",
                runningLongMin > 0
                  ? "bg-red-500"
                  : progressPct >= 85
                    ? "bg-amber-500"
                    : "bg-blue-500",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </span>
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
      className="absolute right-1 left-1 z-5 overflow-hidden rounded-lg border border-slate-400/40 px-2 py-1 text-slate-700 dark:border-slate-500/40 dark:text-slate-200"
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
      <div className="bg-muted flex size-12 items-center justify-center rounded-xl">
        <Scissors className="text-muted-foreground size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">No appointments today</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Start by booking a new appointment
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onNew}>
        <Plus className="mr-1.5 size-4" />
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
  onConfirmUnblock,
  pendingExistingBlockId,
  matchedIds,
  searchActive,
  stylistNameById,
  alertCountById,
  alertNotesById,
  onDropAppointment,
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
  onConfirmUnblock: () => void;
  /** Id of an existing time block at the right-clicked slot, if any. */
  pendingExistingBlockId: string | null;
  matchedIds: Set<string>;
  searchActive: boolean;
  alertCountById: Record<string, number>;
  /** Full alert-note records per appointment — feeds the click-to-open
   *  popover on each block's alert badge so staff can read the specific
   *  warnings without opening the full appointment view. */
  alertNotesById: Record<string, AlertNote[]>;
  /** Called on drop: reassign (target ≠ current groomer) or reschedule
   *  (same column, new time). The parent validates + confirms. */
  onDropAppointment: (
    apptId: string,
    targetStylistId: string,
    targetTime: string | null,
  ) => void;
}) {
  const dateAppointments = appointments.filter((a) => a.date === selectedDate);

  // Tracks which appointment card is mid-drag (native HTML5 DnD) so a column
  // drop knows what to move.
  const [draggingApptId, setDraggingApptId] = useState<string | null>(null);

  // One ticker per DayView mount — passed down to each block so all of them
  // share the same "now" and re-render together.
  const nowMin = useNowMin();
  const todayStr = useMemo(() => formatISODate(new Date()), []);
  const isToday = selectedDate === todayStr;

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
      .sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
      )[0];
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
    <div className="bg-card flex-1 overflow-auto rounded-xl border shadow-sm">
      <div style={{ minWidth: `${64 + activeStylists.length * 168}px` }}>
        {/* Stylist headers */}
        <div
          className="bg-card/95 sticky top-0 z-20 flex border-b backdrop-blur-sm"
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
                className="min-w-[168px] flex-1 border-l px-3 py-2.5"
                style={{ borderTop: `2px solid ${headerColor}` }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="hover:bg-muted/60 flex w-full items-center gap-2.5 rounded-md px-1 py-0.5 text-left transition-colors"
                      title="Bulk actions for this groomer's day"
                    >
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: headerColor }}
                      >
                        {stylist.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs/tight font-semibold">
                          {stylist.name}
                        </p>
                        {stylist.staffLine ? (
                          <p
                            className="text-muted-foreground flex items-center gap-1 truncate text-[10px] leading-tight"
                            title={`Driver: ${stylist.staffLine}`}
                          >
                            <Truck className="size-2.5 shrink-0" />
                            <span className="truncate">
                              {stylist.staffLine}
                            </span>
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-[10px] leading-tight capitalize">
                            {stylist.capacity.skillLevel}
                          </p>
                        )}
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
                      className="text-destructive focus:text-destructive gap-2"
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
          <div className="w-16 shrink-0 select-none" aria-hidden>
            {HOURS.map((h) => (
              <div
                key={h}
                className="relative"
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-muted-foreground absolute -top-[9px] right-2 text-[10px] leading-none">
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
                    className="relative min-w-[168px] flex-1 cursor-pointer border-l"
                    onClick={handleColumnClick}
                    onContextMenu={handleColumnContextMenu}
                    onDragOver={(e) => {
                      if (draggingApptId) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const id = draggingApptId;
                      setDraggingApptId(null);
                      if (!id) return;
                      onDropAppointment(id, stylist.id, slotTimeFromEvent(e));
                    }}
                    role="button"
                    tabIndex={-1}
                    aria-label={`Schedule slot for ${stylist.name}`}
                  >
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        style={{ height: `${HOUR_HEIGHT}px` }}
                        className="border-border/30 border-b"
                      >
                        <div className="border-border/20 h-1/2 border-b border-dashed" />
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
                              isMatch={searchActive && matchedIds.has(apt.id)}
                              isDimmed={searchActive && !matchedIds.has(apt.id)}
                              alertCount={alertCountById[apt.id]}
                              alertNotes={alertNotesById[apt.id]}
                              nowMin={nowMin}
                              isToday={isToday}
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
                        staffLine = [apt.stylistName, ...coGroomerNames].join(
                          " + ",
                        );
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
                          isDraggable={
                            !isSecondary &&
                            apt.status !== "cancelled" &&
                            apt.status !== "completed" &&
                            apt.status !== "no-show"
                          }
                          onDragStartAppointment={() =>
                            setDraggingApptId(apt.id)
                          }
                          onClick={onBlockClick}
                          isMatch={searchActive && matchedIds.has(apt.id)}
                          isDimmed={searchActive && !matchedIds.has(apt.id)}
                          blockRef={
                            apt.id === firstMatchId ? firstMatchRef : undefined
                          }
                          alertCount={alertCountById[apt.id]}
                          alertNotes={alertNotesById[apt.id]}
                          nowMin={nowMin}
                          isToday={isToday}
                        />,
                      ];
                    })}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {pendingExistingBlockId ? (
                    <ContextMenuItem onSelect={onConfirmUnblock}>
                      <Eraser className="size-4" />
                      Unblock this time
                    </ContextMenuItem>
                  ) : (
                    <ContextMenuItem onSelect={onConfirmBlock}>
                      <Ban className="size-4" />
                      Block this time
                    </ContextMenuItem>
                  )}
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
    <div className="bg-card flex-1 overflow-auto rounded-xl border shadow-sm">
      <div className="grid grid-cols-7 divide-x">
        {weekDays.map((day, idx) => {
          const ds = formatISODate(day);
          const dayApts = appointments.filter(
            (a) =>
              a.date === ds &&
              a.status !== "cancelled" &&
              a.status !== "no-show",
          );
          const isToday = ds === today;
          const isSelected = ds === selectedDate;

          const waitlistCount = waitlistByDate[ds] ?? 0;
          // Per-day service mix — feeds the count + mini color bar (Table 37).
          const serviceMix = (() => {
            const map = new Map<string, number>();
            for (const a of dayApts) {
              const svc = a.packageName ?? "Other";
              map.set(svc, (map.get(svc) ?? 0) + 1);
            }
            return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
          })();
          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              className={cn(
                "hover:bg-muted/50 flex min-h-[160px] flex-col gap-1.5 p-3 text-left transition-colors",
                isSelected && "bg-pink-50/60 dark:bg-pink-950/20",
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px] font-medium uppercase">
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
              {dayApts.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-[10px] font-semibold">
                    {dayApts.length} appt{dayApts.length === 1 ? "" : "s"}
                  </span>
                  {/* Mini service-mix bar — one segment per service, width
                      proportional to its share of the day (Table 37). */}
                  <div
                    className="bg-muted/40 flex h-1.5 w-full overflow-hidden rounded-full"
                    title={serviceMix
                      .map(([svc, c]) => `${svc} ×${c}`)
                      .join(" · ")}
                  >
                    {serviceMix.map(([svc, count]) => (
                      <div
                        key={svc}
                        style={{
                          width: `${(count / dayApts.length) * 100}%`,
                          backgroundColor: colorForService(svc),
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {dayApts.length === 0 ? (
                <span className="text-muted-foreground/50 mt-1 text-[10px]">
                  No appts
                </span>
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
                          "flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
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
                    <span className="text-muted-foreground text-[10px]">
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
    <div className="bg-card flex-1 overflow-auto rounded-xl border shadow-sm">
      <div className="grid grid-cols-7 border-b">
        {DAY_ABBR.map((d) => (
          <div
            key={d}
            className="text-muted-foreground px-3 py-2 text-center text-[11px] font-semibold uppercase"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y">
        {cells.map((day, i) => {
          if (!day) {
            return (
              <div key={`empty-${i}`} className="bg-muted/20 min-h-[100px]" />
            );
          }
          const ds = formatISODate(day);
          const dayApts = appointments.filter(
            (a) =>
              a.date === ds &&
              a.status !== "cancelled" &&
              a.status !== "no-show",
          );
          const isToday = ds === today;
          const isSelected = ds === selectedDate;

          const waitlistCount = waitlistByDate[ds] ?? 0;
          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              className={cn(
                "hover:bg-muted/50 flex min-h-[100px] flex-col gap-1 p-2 text-left transition-colors",
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
                      "flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-[10px] font-medium",
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
                <span className="text-muted-foreground text-[10px]">
                  +{dayApts.length - 3} more
                </span>
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
  const [quickBookSlot, setQuickBookSlot] = useState<{
    stylistId: string;
    time: string;
  } | null>(null);
  const [filters, setFilters] = useState<CalendarFilterState>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [pendingBlockSlot, setPendingBlockSlot] = useState<{
    stylistId: string;
    time: string;
    existingBlockId: string | null;
  } | null>(null);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  const { data: rawAppointments = [] } = useQuery(
    groomingQueries.appointments(),
  );
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());
  const { entries: waitlist } = useGroomingWaitlist();

  // Drag-and-drop reassign/reschedule edits, merged over the (static mock)
  // query so a drop renders immediately. Mock-only, in-memory.
  const [apptOverrides, setApptOverrides] = useState<
    Record<string, GroomingAppointment>
  >({});
  const appointments = useMemo(
    () => rawAppointments.map((a) => apptOverrides[a.id] ?? a),
    [rawAppointments, apptOverrides],
  );

  // Pending drop awaiting confirmation ("Reassign / Reschedule … ?").
  const [pendingDrop, setPendingDrop] = useState<
    | {
        kind: "reassign";
        apt: GroomingAppointment;
        targetStylistId: string;
        targetStylistName: string;
      }
    | {
        kind: "reschedule";
        apt: GroomingAppointment;
        newTime: string;
        newEndTime: string;
      }
    | null
  >(null);

  // Validate a drop and stage the confirm. Guards against groomer skill
  // eligibility and time / station conflicts (spec Table 36).
  function handleAppointmentDrop(
    apptId: string,
    targetStylistId: string,
    targetTime: string | null,
  ) {
    const apt = appointments.find((a) => a.id === apptId);
    if (!apt) return;

    // Reassign — dropped on a different groomer's column (time preserved).
    if (targetStylistId !== apt.stylistId) {
      const targetStylist = stylistsData.find((s) => s.id === targetStylistId);
      if (!targetStylist) return;
      const pkg = groomingPackages.find((p) => p.id === apt.packageId);
      if (pkg && !stylistMeetsSkillRequirement(targetStylist, pkg)) {
        toast.error(
          `${targetStylist.name} isn't qualified for ${apt.packageName}.`,
        );
        return;
      }
      const conflict = findStylistTimeConflict(
        targetStylistId,
        apt.date,
        apt.startTime,
        apt.endTime,
        appointments,
        apt.id,
      );
      if (conflict) {
        toast.error(
          `${targetStylist.name} is busy at ${apt.startTime} (${conflict.petName}).`,
        );
        return;
      }
      setPendingDrop({
        kind: "reassign",
        apt,
        targetStylistId,
        targetStylistName: targetStylist.name,
      });
      return;
    }

    // Reschedule — dropped at a new time in the same column.
    if (!targetTime || targetTime === apt.startTime) return;
    const duration = timeToMinutes(apt.endTime) - timeToMinutes(apt.startTime);
    const newEndTime = minutesToTime(timeToMinutes(targetTime) + duration);
    const conflict = findStylistTimeConflict(
      apt.stylistId,
      apt.date,
      targetTime,
      newEndTime,
      appointments,
      apt.id,
    );
    if (conflict) {
      toast.error(`That time conflicts with ${conflict.petName}.`);
      return;
    }
    if (apt.stationId) {
      const booked = getBookedStationIdsInWindow(
        apt.date,
        targetTime,
        newEndTime,
        appointments.filter((a) => a.id !== apt.id),
      );
      if (booked.has(apt.stationId)) {
        toast.error(`That station is already booked at ${targetTime}.`);
        return;
      }
    }
    setPendingDrop({
      kind: "reschedule",
      apt,
      newTime: targetTime,
      newEndTime,
    });
  }

  // Apply the confirmed drop: update the store override, append a history
  // entry, and fire the mock owner notification.
  function applyDrop() {
    if (!pendingDrop) return;
    const { apt } = pendingDrop;
    const at = new Date().toISOString();
    const histId = `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (pendingDrop.kind === "reassign") {
      const updated: GroomingAppointment = {
        ...apt,
        stylistId: pendingDrop.targetStylistId,
        stylistName: pendingDrop.targetStylistName,
        history: [
          ...(apt.history ?? []),
          {
            id: histId,
            at,
            staff: "You",
            description: `Reassigned from ${apt.stylistName} to ${pendingDrop.targetStylistName}`,
          },
        ],
      };
      setApptOverrides((prev) => ({ ...prev, [apt.id]: updated }));
      toast.success(
        `${apt.petName} reassigned to ${pendingDrop.targetStylistName}`,
        {
          description: buildBookingChangeMessage({
            kind: "reassign",
            petName: apt.petName,
            clientName: apt.ownerName,
            newGroomerName: pendingDrop.targetStylistName,
          }),
        },
      );
    } else {
      const updated: GroomingAppointment = {
        ...apt,
        startTime: pendingDrop.newTime,
        endTime: pendingDrop.newEndTime,
        history: [
          ...(apt.history ?? []),
          {
            id: histId,
            at,
            staff: "You",
            description: `Rescheduled from ${apt.startTime} to ${pendingDrop.newTime}`,
          },
        ],
      };
      setApptOverrides((prev) => ({ ...prev, [apt.id]: updated }));
      toast.success(`${apt.petName} rescheduled to ${pendingDrop.newTime}`, {
        description: buildBookingChangeMessage({
          kind: "reschedule",
          petName: apt.petName,
          clientName: apt.ownerName,
          newTime: pendingDrop.newTime,
        }),
      });
    }
    setPendingDrop(null);
  }
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

  // Effective alert-notes per appointment. Carry-forward alerts from past
  // bookings for the same pet are included so the red badge appears even on
  // future appointments that don't have their own alerts yet. We keep the
  // full notes (not just the count) so the calendar block can pop them up
  // inline without forcing staff into the full appointment view.
  const alertNotesById = useMemo(() => {
    const map: Record<string, AlertNote[]> = {};
    for (const a of appointments) {
      const notes = getEffectiveAlertNotes(a, appointments);
      if (notes.length > 0) map[a.id] = notes;
    }
    return map;
  }, [appointments]);
  const alertCountById = useMemo(() => {
    const map: Record<string, number> = {};
    for (const id in alertNotesById) map[id] = alertNotesById[id].length;
    return map;
  }, [alertNotesById]);

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
    // Stage the right-clicked slot so the menu item can commit it. If the slot
    // falls inside an existing block for this stylist, capture its id so the
    // menu shows "Unblock" instead of "Block this time".
    const tMin = timeToMinutes(time);
    const existing = timeBlocks.find(
      (b) =>
        b.date === selectedDate &&
        b.stylistId === stylistId &&
        timeToMinutes(b.startTime) <= tMin &&
        timeToMinutes(b.endTime) > tMin,
    );
    setPendingBlockSlot({
      stylistId,
      time,
      existingBlockId: existing?.id ?? null,
    });
  }

  function handleConfirmBlock() {
    if (pendingBlockSlot && !pendingBlockSlot.existingBlockId) {
      setBlockDialogOpen(true);
    }
  }

  function handleConfirmUnblock() {
    const id = pendingBlockSlot?.existingBlockId;
    if (!id) return;
    setTimeBlocks((prev) => prev.filter((b) => b.id !== id));
    toast.success("Time block removed");
    setPendingBlockSlot(null);
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
        <div className="flex min-w-0 flex-1 flex-col gap-4 rounded-4xl border bg-slate-50/50 p-6 shadow-sm dark:bg-slate-900/20">
          {/* Top Controls — flex-wrap: without it the Filters/Print/New Event
              group overflowed its clipped parent by ~700px on tablet. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="h-10 rounded-full border-slate-200 bg-white px-5 shadow-sm hover:bg-slate-100"
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </Button>
              <div className="flex rounded-full border bg-white p-1 shadow-sm dark:bg-slate-950">
                {(["day", "week", "month"] as ViewMode[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    className={cn(
                      "rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-all",
                      viewMode === v
                        ? "text-foreground bg-slate-100 shadow-sm dark:bg-slate-800"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-2.5 left-3 h-4 w-4" />
                <Input
                  placeholder="Search pet, owner, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-56 rounded-full border-slate-200 bg-white pl-9 shadow-sm dark:bg-slate-950"
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
                    className="h-10 gap-2 rounded-full border-slate-200 bg-white px-4 shadow-sm hover:bg-slate-100"
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
              <Button
                className="h-10 rounded-full bg-blue-600 px-5 text-white shadow-sm hover:bg-blue-700"
                onClick={handleNewEvent}
              >
                <Plus className="mr-1.5 h-4 w-4" /> New Event
              </Button>
            </div>
          </div>

          {/* Header Title */}
          <div className="mt-2 mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <ActivitySquare className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">Client Schedule</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1 text-sm font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
                {activeEventCount} active events
              </span>
              {viewMode === "day" &&
                (waitlistByDate[selectedDate] ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => setWaitlistDate(selectedDate)}
                    className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50"
                  >
                    <Hourglass className="size-3.5" />
                    {waitlistByDate[selectedDate]} on waitlist
                  </button>
                )}
              <span className="text-muted-foreground hidden text-sm lg:inline">
                Click any date & time to create a quick appointment.
              </span>
            </div>
          </div>

          {/* Calendar Grid Container */}
          <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm">
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
                onConfirmUnblock={handleConfirmUnblock}
                pendingExistingBlockId={
                  pendingBlockSlot?.existingBlockId ?? null
                }
                matchedIds={searchMatchedIds}
                searchActive={searchActive}
                stylistNameById={stylistNameById}
                alertCountById={alertCountById}
                alertNotesById={alertNotesById}
                onDropAppointment={handleAppointmentDrop}
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
            waitlistDate ? waitlist.filter((w) => w.date === waitlistDate) : []
          }
        />

        {/* Drag-and-drop reassign / reschedule confirmation (spec Table 36). */}
        <AlertDialog
          open={!!pendingDrop}
          onOpenChange={(o) => {
            if (!o) setPendingDrop(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingDrop?.kind === "reassign"
                  ? "Reassign appointment?"
                  : "Reschedule appointment?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDrop?.kind === "reassign"
                  ? `Reassign ${pendingDrop.apt.petName} to ${pendingDrop.targetStylistName}? The owner will be notified.`
                  : pendingDrop
                    ? `Reschedule ${pendingDrop.apt.petName} to ${pendingDrop.newTime}? The owner will be notified.`
                    : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={applyDrop}>
                Confirm &amp; Notify
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
