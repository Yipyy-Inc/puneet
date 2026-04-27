"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Scissors,
  CalendarIcon,
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
    <div className="flex flex-col gap-4 h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {/* Navigator */}
          <div className="flex items-center rounded-lg border bg-background overflow-hidden shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none h-9 w-9 border-r"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-none h-9 px-4 text-xs font-semibold",
                isToday && viewMode === "day" && "text-pink-600 dark:text-pink-400",
              )}
              onClick={() => setSelectedDate(todayStr)}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-none h-9 w-9 border-l"
              onClick={() => navigate(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Date picker */}
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                <CalendarIcon className="size-3.5" />
                <span className="hidden sm:inline">{getDisplayLabel()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(selectedDate + "T00:00:00")}
                onSelect={(d) => {
                  if (d) {
                    setSelectedDate(formatISODate(d));
                    setPickerOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>

          <span className="hidden lg:block text-sm font-medium text-muted-foreground">
            {getDisplayLabel()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border bg-background overflow-hidden shadow-xs">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-none h-9 px-3 text-xs font-medium capitalize",
                  viewMode === v
                    ? "bg-pink-500 text-white hover:bg-pink-600 hover:text-white"
                    : "text-muted-foreground",
                  v !== "day" && "border-l",
                )}
                onClick={() => setViewMode(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>

          {/* Day stats (day view only) */}
          {viewMode === "day" && stats.total > 0 && (
            <div className="hidden md:flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {stats.total} appointment{stats.total !== 1 ? "s" : ""}
              </span>
              {[
                { dot: "bg-amber-400", label: `${stats.inProgress} in progress` },
                { dot: "bg-emerald-400", label: `${stats.ready} ready` },
                { dot: "bg-gray-400", label: `${stats.completed} done` },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("size-2 rounded-full", s.dot)} />
                  {s.label}
                </div>
              ))}
            </div>
          )}

          <Button size="sm" onClick={() => setNewDialogOpen(true)}>
            <Plus className="size-4 mr-1.5" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* ── Status legend (day view only) ── */}
      {viewMode === "day" && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {(
            Object.entries(STATUS_META) as [
              GroomingStatus,
              (typeof STATUS_META)[GroomingStatus],
            ][]
          ).map(([, s]) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-2 rounded-full", s.dot)} />
              {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ── View content ── */}
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
