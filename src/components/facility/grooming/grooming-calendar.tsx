"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Scissors,
  CalendarIcon,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  CheckSquare,
  ActivitySquare
} from "lucide-react";
import { groomingQueries } from "@/lib/api/grooming";
import type { GroomingAppointment, GroomingStatus } from "@/types/grooming";
import { AppointmentPanel } from "./appointment-panel";
import { NewAppointmentDialog } from "./new-appointment-dialog";

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

function formatDisplayDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

// ─── Appointment block (day view) ─────────────────────────────────────────────

function AppointmentBlock({
  appointment,
  onClick,
}: {
  appointment: GroomingAppointment;
  onClick: (apt: GroomingAppointment) => void;
}) {
  const start = timeToMinutes(appointment.startTime);
  const end = timeToMinutes(appointment.endTime);
  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 3, 28);
  const s = STATUS_META[appointment.status];

  return (
    <button
      onClick={() => onClick(appointment)}
      className={cn(
        "absolute left-1 right-1 z-10 rounded-lg",
        "px-2 py-1.5 text-left transition-all",
        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "overflow-hidden cursor-pointer shadow-xs",
        s.bg,
        s.text,
        appointment.status === "cancelled" && "opacity-40",
        appointment.status === "completed" && "opacity-55",
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={cn("size-2 rounded-full flex-shrink-0 shadow-sm", s.dot)} />
        <span className="font-semibold text-xs truncate leading-tight">
          {appointment.petName}
        </span>
      </div>
      {height > 46 && (
        <p className="text-[11px] truncate opacity-70 mt-0.5 leading-tight pl-3.5">
          {appointment.packageName}
        </p>
      )}
      {height > 66 && (
        <p className="text-[10px] opacity-55 mt-0.5 pl-3.5">
          {appointment.startTime}–{appointment.endTime}
        </p>
      )}
    </button>
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

function DayView({
  selectedDate,
  appointments,
  stylists,
  onBlockClick,
  onNew,
}: {
  selectedDate: string;
  appointments: GroomingAppointment[];
  stylists: { id: string; name: string; status: string; capacity: { skillLevel: string } }[];
  onBlockClick: (apt: GroomingAppointment) => void;
  onNew: () => void;
}) {
  const dateAppointments = appointments.filter((a) => a.date === selectedDate);
  const activeStylists = stylists.filter((s) => s.status === "active");

  if (activeStylists.length === 0) return <EmptyDay onNew={onNew} />;

  return (
    <div className="flex-1 overflow-auto rounded-xl border bg-card shadow-sm">
      <div style={{ minWidth: `${64 + activeStylists.length * 168}px` }}>
        {/* Stylist headers */}
        <div
          className="sticky top-0 z-20 flex border-b bg-card/95 backdrop-blur-sm"
          style={{ paddingLeft: "4rem" }}
        >
          {activeStylists.map((stylist) => (
            <div key={stylist.id} className="flex-1 min-w-[168px] border-l px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-full bg-pink-100 text-pink-700 text-xs font-bold dark:bg-pink-900/40 dark:text-pink-300 flex-shrink-0">
                  {stylist.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">{stylist.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize leading-tight">
                    {stylist.capacity.skillLevel}
                  </p>
                </div>
              </div>
            </div>
          ))}
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
            const stylistAppts = dateAppointments.filter((a) => a.stylistId === stylist.id);
            return (
              <div key={stylist.id} className="flex-1 min-w-[168px] relative border-l">
                {HOURS.map((h) => (
                  <div key={h} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-border/30">
                    <div className="h-1/2 border-b border-dashed border-border/20" />
                  </div>
                ))}
                {stylistAppts.map((apt) => (
                  <AppointmentBlock key={apt.id} appointment={apt} onClick={onBlockClick} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
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
}: {
  selectedDate: string;
  today: string;
  appointments: GroomingAppointment[];
  onDayClick: (dateStr: string) => void;
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

          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              className={cn(
                "flex flex-col gap-1.5 p-3 text-left hover:bg-muted/50 transition-colors min-h-[160px]",
                isSelected && "bg-pink-50/60 dark:bg-pink-950/20",
              )}
            >
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
              {dayApts.length === 0 ? (
                <span className="text-[10px] text-muted-foreground/50 mt-1">No appts</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {dayApts.slice(0, 4).map((apt) => {
                    const s = STATUS_META[apt.status];
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium truncate",
                          s.bg,
                          s.text,
                        )}
                      >
                        {apt.startTime} {apt.petName}
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
}: {
  selectedDate: string;
  today: string;
  appointments: GroomingAppointment[];
  onDayClick: (dateStr: string) => void;
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

          return (
            <button
              key={ds}
              onClick={() => onDayClick(ds)}
              className={cn(
                "min-h-[100px] p-2 text-left hover:bg-muted/50 transition-colors flex flex-col gap-1",
                isSelected && "bg-pink-50/60 dark:bg-pink-950/20",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold self-start",
                  isToday
                    ? "bg-pink-500 text-white"
                    : isSelected
                      ? "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300"
                      : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
              {dayApts.slice(0, 3).map((apt) => {
                const s = STATUS_META[apt.status];
                return (
                  <div
                    key={apt.id}
                    className={cn("rounded px-1 py-0.5 text-[10px] font-medium truncate w-full", s.bg, s.text)}
                  >
                    {apt.startTime} {apt.petName}
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
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<GroomingAppointment | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const { data: appointments = [] } = useQuery(groomingQueries.appointments());
  const { data: stylistsData = [] } = useQuery(groomingQueries.stylists());

  const dateAppointments = useMemo(
    () => appointments.filter((a) => a.date === selectedDate),
    [appointments, selectedDate],
  );

  const stats = useMemo(
    () => ({
      total: dateAppointments.filter(
        (a) => a.status !== "cancelled" && a.status !== "no-show",
      ).length,
      inProgress: dateAppointments.filter((a) => a.status === "in-progress").length,
      ready: dateAppointments.filter((a) => a.status === "ready-for-pickup").length,
      completed: dateAppointments.filter((a) => a.status === "completed").length,
    }),
    [dateAppointments],
  );

  function navigate(dir: -1 | 1) {
    const d = new Date(selectedDate + "T00:00:00");
    if (viewMode === "week") {
      d.setDate(d.getDate() + dir * 7);
    } else if (viewMode === "month") {
      d.setMonth(d.getMonth() + dir);
    } else {
      d.setDate(d.getDate() + dir);
    }
    setSelectedDate(formatISODate(d));
  }

  function handleBlockClick(apt: GroomingAppointment) {
    setSelectedAppointment(apt);
    setPanelOpen(true);
  }

  function handleDayClick(dateStr: string) {
    setSelectedDate(dateStr);
    setViewMode("day");
  }

  const isToday = selectedDate === todayStr;

  function getDisplayLabel() {
    const d = new Date(selectedDate + "T00:00:00");
    if (viewMode === "day") return formatDisplayDate(selectedDate);
    if (viewMode === "week") {
      const days = getWeekDays(selectedDate);
      const start = days[0];
      const end = days[6];
      const sameMonth = start.getMonth() === end.getMonth();
      const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
      return sameMonth
        ? `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", { day: "numeric" })}, ${end.getFullYear()}`
        : `${start.toLocaleDateString("en-CA", opts)} – ${end.toLocaleDateString("en-CA", opts)}, ${end.getFullYear()}`;
    }
    return d.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  }

  return (
    <div className="flex h-full gap-6">
      {/* ── Left Sidebar ── */}
      <div className="w-72 flex flex-col gap-6 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Scissors className="h-5 w-5 text-blue-500" /> Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Operations Calendar</p>
        </div>

        {/* Mini Calendar */}
        <div className="bg-card rounded-xl border shadow-sm p-3">
          <Calendar
            mode="single"
            selected={new Date(selectedDate + "T00:00:00")}
            onSelect={(d) => {
              if (d) {
                setSelectedDate(formatISODate(d));
              }
            }}
            className="w-full"
          />
        </div>

        {/* Today's Overview Stats */}
        <div>
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Today's Overview</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4 flex flex-col gap-1 items-start">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-1" />
              <span className="text-3xl font-bold leading-none text-blue-700 dark:text-blue-300">{stats.total}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Bookings</span>
            </div>
            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4 flex flex-col gap-1 items-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
              <span className="text-3xl font-bold leading-none text-emerald-700 dark:text-emerald-300">{stats.ready}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Confirmed</span>
            </div>
            <div className="bg-purple-50/50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-4 flex flex-col gap-1 items-start">
              <ActivitySquare className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1" />
              <span className="text-3xl font-bold leading-none text-purple-700 dark:text-purple-300">{stats.completed}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Completed</span>
            </div>
            <div className="bg-orange-50/50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl p-4 flex flex-col gap-1 items-start">
              <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400 mb-1" />
              <span className="text-3xl font-bold leading-none text-orange-700 dark:text-orange-300">{stats.inProgress}</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tasks</span>
            </div>
          </div>
        </div>

        {/* Upcoming Today */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Upcoming Today</h2>
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-8">
            {dateAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments today.</p>
            ) : (
              dateAppointments.map(apt => (
                <div key={apt.id} className="flex items-center bg-card rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className="font-bold text-sm text-foreground truncate">{apt.petName}</span>
                    <span className="text-xs text-muted-foreground truncate">{apt.packageName}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md">
                    {apt.startTime}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
              <Input placeholder="Search..." className="rounded-full w-56 pl-9 h-10 shadow-sm bg-white dark:bg-slate-950 border-slate-200" />
            </div>
            <Button variant="outline" className="rounded-full h-10 px-4 shadow-sm gap-2 border-slate-200 hover:bg-slate-100 bg-white">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button className="rounded-full h-10 px-5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setNewDialogOpen(true)}>
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
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-full px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              {stats.total} active events
            </span>
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
              appointments={appointments}
              stylists={stylistsData}
              onBlockClick={handleBlockClick}
              onNew={() => setNewDialogOpen(true)}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              selectedDate={selectedDate}
              today={todayStr}
              appointments={appointments}
              onDayClick={handleDayClick}
            />
          )}
          {viewMode === "month" && (
            <MonthView
              selectedDate={selectedDate}
              today={todayStr}
              appointments={appointments}
              onDayClick={handleDayClick}
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
        onOpenChange={setNewDialogOpen}
        defaultDate={selectedDate}
      />
    </div>
  );
}
