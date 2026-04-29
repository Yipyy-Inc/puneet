"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Droplets,
  Utensils,
  Pill,
  PawPrint,
  CheckCircle,
  Clock,
  Phone,
  Stethoscope,
  CalendarDays,
  AlertTriangle,
  User,
  BedDouble,
  Star,
  ClipboardList,
  Eye,
  EyeOff,
  BookOpen,
  CalendarCheck,
  ChevronRight,
} from "lucide-react";
import type { ScheduledTask, TaskExecution } from "./guest-journal";
import { OUTCOME_LABELS } from "./task-rows";
import type { BoardingGuest } from "@/data/boarding";
import { ReservationIncidentPanel } from "./ReservationIncidentPanel";

type Props = {
  guests: BoardingGuest[];
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  selectedGuestId: string;
  onSelectGuest: (id: string) => void;
  onLogTask: (task: ScheduledTask) => void;
  getExecForTask: (taskId: string) => TaskExecution | undefined;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, short?: boolean) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(short ? {} : { year: "numeric" }),
  });
}

function getDayOfStay(checkInDate: string, targetDate: Date): number {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getTodayDayNumber(guest: BoardingGuest): number {
  return getDayOfStay(guest.checkInDate, new Date());
}

function getDayDate(checkInDate: string, dayNumber: number): Date {
  const d = new Date(checkInDate);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + dayNumber - 1);
  return d;
}

// ── Tag chip ──────────────────────────────────────────────────────────────────

function TagChip({ tag, variant }: { tag: string; variant?: "danger" | "warning" | "purple" | "default" }) {
  const styles = {
    danger: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    purple: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    default: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[variant ?? "default"]}`}>
      {tag}
    </span>
  );
}

// ── Customer-friendly outcome text ────────────────────────────────────────────

function friendlyFeedingOutcome(outcome: string): string {
  const map: Record<string, string> = {
    ate_all: "Ate all of their meal",
    ate_half: "Ate about half of their meal",
    refused: "Didn't eat this meal",
    vomited_after: "Ate but vomited afterward",
    slow_eater: "Ate slowly but finished",
  };
  return map[outcome] ?? outcome;
}

function friendlyPottyOutcome(outcome: string): string {
  const map: Record<string, string> = {
    pee: "Good bathroom break",
    poop: "Good bathroom break",
    both: "Good bathroom break",
    nothing: "Went outside but didn't go",
    diarrhea: "Digestive issue — being monitored",
    soft_stool: "Loose stool — being monitored",
    vomit_noticed: "Vomiting noticed — being monitored",
  };
  return map[outcome] ?? "Bathroom break completed";
}

function friendlyMedOutcome(outcome: string): string {
  const map: Record<string, string> = {
    administered: "Medication given on time",
    refused: "Medication skipped — staff notified",
    spit_out: "Medication was spit out — staff notified",
    delayed: "Medication given slightly late",
    missed: "Medication was missed — manager notified",
  };
  return map[outcome] ?? outcome;
}

function friendlyAddonOutcome(outcome: string): string {
  const map: Record<string, string> = {
    completed: "Completed and enjoyed",
    partial: "Partially completed",
    skipped: "Skipped today",
    dog_refused: "Wasn't interested today",
    rescheduled: "Rescheduled for later",
  };
  return map[outcome] ?? outcome;
}

// ── Timeline entry ────────────────────────────────────────────────────────────

function TimelineEntry({
  time,
  icon,
  iconBg,
  title,
  subtitle,
  outcome,
  outcomeColor,
  staffInitials,
  notes,
  isConcern,
  customerView,
}: {
  time: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  outcome?: string;
  outcomeColor?: string;
  staffInitials?: string;
  notes?: string;
  isConcern?: boolean;
  customerView: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
          {icon}
        </div>
        <div className="bg-border mt-1 w-px flex-1" />
      </div>
      <div
        data-concern={isConcern}
        className="mb-3 min-w-0 flex-1 rounded-xl border p-3 data-[concern=true]:border-red-200 data-[concern=true]:bg-red-50/40 dark:data-[concern=true]:border-red-800 dark:data-[concern=true]:bg-red-900/10"
      >
        <div className="flex flex-wrap items-start justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <Clock className="size-3" />
              {time}
            </span>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {outcome && (
              <span className={`text-xs font-semibold ${outcomeColor}`}>{outcome}</span>
            )}
            {!customerView && staffInitials && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <User className="size-3" />
                {staffInitials}
              </span>
            )}
            {customerView && staffInitials && (
              <span className="text-muted-foreground text-xs">by Care team</span>
            )}
          </div>
        </div>
        {subtitle && !customerView && (
          <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
        )}
        {notes && !customerView && (
          <p className="mt-1 text-xs italic text-foreground/70">&ldquo;{notes}&rdquo;</p>
        )}
      </div>
    </div>
  );
}

// ── Pending task row in timeline ──────────────────────────────────────────────

function PendingTimelineRow({
  task,
  executions,
  onLogTask,
  isLast,
}: {
  task: ScheduledTask;
  executions: TaskExecution[];
  onLogTask: (task: ScheduledTask) => void;
  isLast: boolean;
}) {
  const isFeedingServed = task.taskType === "feeding" &&
    executions.some((e) => e.taskId === task.id && e.taskType === "feeding" && !!e.servedAt);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/30">
          <Clock className="size-3.5 text-muted-foreground" />
        </div>
        {!isLast && <div className="bg-border mt-1 w-px flex-1" />}
      </div>
      <div className="mb-3 min-w-0 flex-1 flex items-center justify-between rounded-xl border border-dashed p-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{task.scheduledTime}</span>
            <span className="text-muted-foreground text-sm">{task.details}</span>
          </div>
          {task.subDetails && task.subDetails.length > 0 && (
            <p className="text-muted-foreground text-xs mt-0.5">{task.subDetails.join(" · ")}</p>
          )}
        </div>
        <Button
          size="sm"
          variant={isFeedingServed ? "outline" : "secondary"}
          onClick={() => onLogTask(task)}
        >
          {task.taskType === "potty"
            ? "Log"
            : task.taskType === "feeding"
              ? isFeedingServed ? "Record Intake" : "Serve"
              : task.taskType === "addon"
                ? "Log"
                : task.taskType === "care"
                  ? "Log"
                  : "Administer"}
        </Button>
      </div>
    </div>
  );
}

// ── Day journal body ──────────────────────────────────────────────────────────

function DayJournal({
  guest,
  dayNumber,
  todayDayNumber,
  dayTasks,
  dayExecutions,
  allExecutions,
  customerView,
  onLogTask,
  getExecForTask,
}: {
  guest: BoardingGuest;
  dayNumber: number;
  todayDayNumber: number;
  dayTasks: ScheduledTask[];
  dayExecutions: TaskExecution[];
  allExecutions: TaskExecution[];
  customerView: boolean;
  onLogTask: (task: ScheduledTask) => void;
  getExecForTask: (taskId: string) => TaskExecution | undefined;
}) {
  const isToday = dayNumber === todayDayNumber;
  const isPast = dayNumber < todayDayNumber;
  const isFuture = dayNumber > todayDayNumber;

  const dayDate = getDayDate(guest.checkInDate, dayNumber);
  const dateLabel = formatDate(dayDate.toISOString().split("T")[0], true);

  // For today: build full timeline with pending + logged
  const timelineItems: {
    time: string;
    type: "exec" | "pending";
    exec?: TaskExecution;
    task?: ScheduledTask;
  }[] = [];

  if (isToday) {
    for (const exec of dayExecutions) {
      if (exec.taskType === "feeding" && !exec.outcome) continue;
      timelineItems.push({ time: exec.executedAt, type: "exec", exec });
    }
    for (const task of dayTasks) {
      if (task.taskType === "feeding") {
        const exec = getExecForTask(task.id);
        if (!exec || !exec.outcome) {
          timelineItems.push({ time: task.scheduledTime, type: "pending", task });
        }
      } else if (!getExecForTask(task.id)) {
        timelineItems.push({ time: task.scheduledTime, type: "pending", task });
      }
    }
    timelineItems.sort((a, b) => a.time.localeCompare(b.time));
  }

  // For customer view: build friendly summaries
  const completedExecs = dayExecutions.filter((e) => !!e.outcome);
  const feedingExecs = completedExecs.filter((e) => e.taskType === "feeding");
  const medExecs = completedExecs.filter((e) => e.taskType === "medication");
  const addonExecs = completedExecs.filter((e) => e.taskType === "addon");

  if (isFuture) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <CalendarDays className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
          <p className="text-muted-foreground font-medium">Day {dayNumber} — {dateLabel}</p>
          <p className="text-muted-foreground mt-1 text-sm">Not started yet</p>
        </CardContent>
      </Card>
    );
  }

  if (isPast && dayExecutions.length === 0) {
    if (customerView) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarCheck className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
            <p className="text-muted-foreground text-sm">Day {dayNumber} care summary not yet available</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <ClipboardList className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
          <p className="text-muted-foreground font-medium">Day {dayNumber} — {dateLabel}</p>
          <p className="text-muted-foreground mt-1 text-sm">No activity logged for this day</p>
        </CardContent>
      </Card>
    );
  }

  // Customer view: clean summary cards
  if (customerView) {
    const hasConcern = completedExecs.some((e) =>
      ["diarrhea", "soft_stool", "vomit_noticed", "refused", "vomited_after", "missed"].includes(e.outcome),
    );

    return (
      <div className="space-y-3">
        {hasConcern && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/10 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            Our care team noted something that needs attention — we&apos;ll follow up with you shortly.
          </div>
        )}

        {/* Feeding summary */}
        {feedingExecs.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Utensils className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-semibold">Meals</span>
              </div>
              <div className="space-y-2">
                {feedingExecs.map((exec, i) => {
                  const task = dayTasks.find((t) => t.id === exec.taskId);
                  return (
                    <div key={exec.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {task?.details ?? `Meal ${i + 1}`} · {exec.executedAt}
                      </span>
                      <span className="font-medium">{friendlyFeedingOutcome(exec.outcome)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medication summary */}
        {guest.medications.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Pill className="size-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="font-semibold">Medications</span>
              </div>
              {medExecs.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {isToday ? "Not yet given today" : "No medication logs for this day"}
                </p>
              ) : (
                <div className="space-y-2">
                  {medExecs.map((exec) => {
                    const task = dayTasks.find((t) => t.id === exec.taskId);
                    return (
                      <div key={exec.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{task?.details ?? "Medication"} · {exec.executedAt}</span>
                        <span className="font-medium">{friendlyMedOutcome(exec.outcome)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add-on summary */}
        {addonExecs.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Star className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-semibold">Special Services</span>
              </div>
              <div className="space-y-2">
                {addonExecs.map((exec) => {
                  const task = dayTasks.find((t) => t.id === exec.taskId);
                  return (
                    <div key={exec.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{task?.details ?? "Service"} · {exec.executedAt}</span>
                      <span className="font-medium">{friendlyAddonOutcome(exec.outcome)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {completedExecs.length === 0 && isToday && (
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
              <p className="text-muted-foreground text-sm">Today&apos;s activity will appear here as our team cares for your pet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Staff / internal view — full activity timeline
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Activity Log</span>
          <Badge variant="secondary">
            {completedExecs.length} logged
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isToday && timelineItems.length === 0 && (
          <div className="py-8 text-center">
            <Clock className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
            <p className="text-muted-foreground text-sm">No activity logged yet today</p>
          </div>
        )}

        {!isToday && completedExecs.length === 0 && (
          <div className="py-8 text-center">
            <ClipboardList className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
            <p className="text-muted-foreground text-sm">No activity logged for this day</p>
          </div>
        )}

        {isToday && timelineItems.length > 0 && (
          <div>
            {timelineItems.map((item, idx) => {
              if (item.type === "exec" && item.exec) {
                const exec = item.exec;
                const outcomeInfo = OUTCOME_LABELS[exec.outcome];
                const isConcern = ["diarrhea", "soft_stool", "vomit_noticed", "refused", "vomited_after", "missed"].includes(exec.outcome);
                const task = dayTasks.find((t) => t.id === exec.taskId);

                return (
                  <TimelineEntry
                    key={exec.id}
                    time={exec.executedAt}
                    customerView={false}
                    iconBg={
                      exec.taskType === "potty"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : exec.taskType === "feeding"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : exec.taskType === "addon"
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : exec.taskType === "care"
                              ? "bg-slate-100 dark:bg-slate-900/30"
                              : "bg-purple-100 dark:bg-purple-900/30"
                    }
                    icon={
                      exec.taskType === "potty" ? (
                        <Droplets className="size-4 text-blue-600 dark:text-blue-400" />
                      ) : exec.taskType === "feeding" ? (
                        <Utensils className="size-4 text-green-600 dark:text-green-400" />
                      ) : exec.taskType === "addon" ? (
                        <Star className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : exec.taskType === "care" ? (
                        <ClipboardList className="size-4 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <Pill className="size-4 text-purple-600 dark:text-purple-400" />
                      )
                    }
                    title={task?.details ?? exec.taskType}
                    outcome={outcomeInfo?.label}
                    outcomeColor={outcomeInfo?.colorClass}
                    staffInitials={exec.staffInitials}
                    notes={exec.notes}
                    isConcern={isConcern}
                  />
                );
              }

              if (item.type === "pending" && item.task) {
                return (
                  <PendingTimelineRow
                    key={item.task.id + idx}
                    task={item.task}
                    executions={allExecutions}
                    onLogTask={onLogTask}
                    isLast={idx === timelineItems.length - 1}
                  />
                );
              }
              return null;
            })}
          </div>
        )}

        {!isToday && completedExecs.length > 0 && (
          <div>
            {completedExecs
              .sort((a, b) => a.executedAt.localeCompare(b.executedAt))
              .map((exec) => {
                const outcomeInfo = OUTCOME_LABELS[exec.outcome];
                const isConcern = ["diarrhea", "soft_stool", "vomit_noticed", "refused", "vomited_after", "missed"].includes(exec.outcome);
                const task = dayTasks.find((t) => t.id === exec.taskId);

                return (
                  <TimelineEntry
                    key={exec.id}
                    time={exec.executedAt}
                    customerView={false}
                    iconBg={
                      exec.taskType === "potty"
                        ? "bg-blue-100 dark:bg-blue-900/30"
                        : exec.taskType === "feeding"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : exec.taskType === "addon"
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : exec.taskType === "care"
                              ? "bg-slate-100 dark:bg-slate-900/30"
                              : "bg-purple-100 dark:bg-purple-900/30"
                    }
                    icon={
                      exec.taskType === "potty" ? (
                        <Droplets className="size-4 text-blue-600 dark:text-blue-400" />
                      ) : exec.taskType === "feeding" ? (
                        <Utensils className="size-4 text-green-600 dark:text-green-400" />
                      ) : exec.taskType === "addon" ? (
                        <Star className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : exec.taskType === "care" ? (
                        <ClipboardList className="size-4 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <Pill className="size-4 text-purple-600 dark:text-purple-400" />
                      )
                    }
                    title={task?.details ?? exec.taskType}
                    outcome={outcomeInfo?.label}
                    outcomeColor={outcomeInfo?.colorClass}
                    staffInitials={exec.staffInitials}
                    notes={exec.notes}
                    isConcern={isConcern}
                  />
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── GuestTimelineView ─────────────────────────────────────────────────────────

export function GuestTimelineView({
  guests,
  tasks,
  executions,
  selectedGuestId,
  onSelectGuest,
  onLogTask,
  getExecForTask,
}: Props) {
  const [customerView, setCustomerView] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const guest = guests.find((g) => g.id === selectedGuestId);

  const todayDayNumber = useMemo(
    () => (guest ? getTodayDayNumber(guest) : 1),
    [guest],
  );

  const activeDayNumber = selectedDay ?? todayDayNumber;

  // Tasks and executions for the selected guest only
  const guestTasks = tasks.filter((t) => t.guestId === selectedGuestId);
  const guestExecs = executions.filter((e) => e.guestId === selectedGuestId);

  // The day's date string (YYYY-MM-DD) — used to filter executions by date
  const activeDayDate = guest
    ? getDayDate(guest.checkInDate, activeDayNumber).toISOString().split("T")[0]
    : null;

  // Today's date string
  const todayDateStr = new Date().toISOString().split("T")[0];

  const dayTasks = guestTasks;

  // Filter executions for the active day by their `date` field.
  // Executions without a `date` field are treated as today's (legacy/real-time).
  const dayExecutions = guestExecs.filter((e) => {
    const execDate = (e as { date?: string }).date ?? todayDateStr;
    return execDate === activeDayDate;
  });

  // Group guests by bookingId for the selector
  const bookingGroups = useMemo(() => {
    const map = new Map<string, typeof guests>();
    for (const g of guests) {
      const key = g.bookingId ?? `solo-${g.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return Array.from(map.entries()).map(([key, pets]) => ({ key, pets }));
  }, [guests]);

  const todayExecs = guestExecs.filter((e) => {
    const execDate = (e as { date?: string }).date ?? todayDateStr;
    return execDate === todayDateStr;
  });
  const completedToday = todayExecs.filter((e) => !!e.outcome).length;
  const totalToday = guestTasks.length;
  const completionPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const daysBoarded = guest
    ? Math.min(todayDayNumber, guest.totalNights)
    : 0;

  return (
    <div className="space-y-4">
      {/* Guest selector — grouped by reservation */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <PawPrint className="text-primary size-4 shrink-0" />
            <Select value={selectedGuestId} onValueChange={(id) => { onSelectGuest(id); setSelectedDay(null); }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select guest..." />
              </SelectTrigger>
              <SelectContent>
                {bookingGroups.map(({ key, pets }) => {
                  const isMultiPet = pets.length > 1;
                  const owner = pets[0]?.ownerName ?? "Unknown";
                  return (
                    <SelectGroup key={key}>
                      {isMultiPet && (
                        <SelectLabel className="flex items-center gap-1.5 text-xs">
                          <BookOpen className="size-3" />
                          {owner} · {pets.length} pets
                        </SelectLabel>
                      )}
                      {pets.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <div className="flex items-center gap-2">
                            {isMultiPet && <span className="text-muted-foreground text-xs">↳</span>}
                            <span className="font-medium">{g.petName}</span>
                            <span className="text-muted-foreground text-xs">{g.kennelName}</span>
                            {g.medications.length > 0 && (
                              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Meds</span>
                            )}
                            {g.allergies.length > 0 && (
                              <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">Allergy</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {guest && (
        <>
          {/* Guest Journal header card */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* Avatar */}
                <div className="flex size-20 shrink-0 items-center justify-center self-center rounded-2xl bg-muted sm:self-start">
                  {guest.petPhotoUrl ? (
                    <img
                      src={guest.petPhotoUrl}
                      alt={guest.petName}
                      className="size-20 rounded-2xl object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <PawPrint className="size-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="text-primary size-4" />
                        <h2 className="text-xl font-bold">{guest.petName}&apos;s Guest Journal</h2>
                      </div>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        {guest.petBreed} · {guest.petSize} · {guest.petWeight} lbs
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-sm">{guest.kennelName}</Badge>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {guest.allergies.length > 0 && (
                      <TagChip tag={`⚠ Allergy: ${guest.allergies.join(", ")}`} variant="danger" />
                    )}
                    {guest.medications.length > 0 && (
                      <TagChip tag="On Medication" variant="purple" />
                    )}
                    {guest.postSurgery && <TagChip tag="Post-Surgery" variant="warning" />}
                    {guest.heatCycle && <TagChip tag="Heat Cycle" variant="warning" />}
                    {guest.packageType && <TagChip tag={guest.packageType} />}
                    {(guest.tags ?? []).map((t) => <TagChip key={t} tag={t} />)}
                  </div>

                  {/* Stay stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="flex items-start gap-2">
                      <CalendarDays className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Check-In</p>
                        <p className="font-medium">{formatDate(guest.checkInDate, true)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CalendarDays className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Check-Out</p>
                        <p className="font-medium">{formatDate(guest.checkOutDate, true)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <BedDouble className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Night</p>
                        <p className="font-medium">{daysBoarded} of {guest.totalNights}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Owner</p>
                        <p className="font-medium">{guest.ownerName}</p>
                      </div>
                    </div>
                  </div>

                  {/* Today's progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {completedToday}/{totalToday} today
                    </span>
                  </div>
                </div>
              </div>

              {/* Feeding & meds reference */}
              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                <div className="rounded-xl bg-green-50/60 p-3 dark:bg-green-900/10">
                  <div className="mb-1 flex items-center gap-2">
                    <Utensils className="size-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-800 dark:text-green-300">Feeding Plan</span>
                  </div>
                  <p className="text-sm font-medium">{guest.feedingAmount} {guest.foodBrand}</p>
                  <p className="text-muted-foreground text-xs">{guest.feedingTimes.join(" & ")}</p>
                  {guest.feedingInstructions && (
                    <p className="text-muted-foreground mt-0.5 text-xs italic">{guest.feedingInstructions}</p>
                  )}
                </div>
                {guest.medications.length > 0 && (
                  <div className="rounded-xl bg-purple-50/60 p-3 dark:bg-purple-900/10">
                    <div className="mb-1 flex items-center gap-2">
                      <Pill className="size-3.5 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">Medications</span>
                    </div>
                    {guest.medications.map((med) => (
                      <div key={med.id} className="mb-1 last:mb-0">
                        <p className="text-sm font-medium">{med.medicationName} {med.dosage}</p>
                        <p className="text-muted-foreground text-xs">
                          {med.frequency}{med.times.length > 0 && ` · ${med.times.join(", ")}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {guest.notes && !customerView && (
                <div className="mt-3 rounded-xl border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Staff Notes</p>
                  <p className="mt-1 text-sm">{guest.notes}</p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Stethoscope className="size-3.5" />
                Emergency vet: {guest.emergencyVetContact}
              </div>
            </CardContent>
          </Card>

          {/* Incident reports panel — staff view only */}
          {!customerView && (
            <ReservationIncidentPanel
              guestId={guest.id}
              reservationId={guest.bookingId}
              petName={guest.petName}
              petId={guest.petId}
              ownerName={guest.ownerName}
            />
          )}

          {/* Customer View toggle */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              {customerView ? (
                <Eye className="text-primary size-4" />
              ) : (
                <EyeOff className="text-muted-foreground size-4" />
              )}
              <Label htmlFor="customer-view-toggle" className="cursor-pointer text-sm font-medium">
                {customerView ? "Customer View — showing owner-facing summary" : "Staff View — showing full internal log"}
              </Label>
            </div>
            <Switch
              id="customer-view-toggle"
              checked={customerView}
              onCheckedChange={setCustomerView}
            />
          </div>

          {/* Day selector */}
          <div className="overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {Array.from({ length: guest.totalNights }, (_, i) => i + 1).map((day) => {
                const isActive = day === activeDayNumber;
                const isToday = day === todayDayNumber;
                const isPast = day < todayDayNumber;
                const isFuture = day > todayDayNumber;
                const dayDate = getDayDate(guest.checkInDate, day);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    data-active={isActive}
                    data-future={isFuture}
                    className="flex shrink-0 cursor-pointer flex-col items-center gap-0.5 rounded-xl border-2 px-3 py-2 text-center transition-all data-[active=true]:border-primary data-[active=true]:bg-primary/5 data-[active=false]:border-border data-[future=true]:opacity-50 data-[active=false]:hover:bg-muted/50"
                  >
                    <span
                      data-active={isActive}
                      className="text-xs font-medium data-[active=true]:text-primary data-[active=false]:text-muted-foreground"
                    >
                      Day {day}
                    </span>
                    <span
                      data-active={isActive}
                      className="text-sm font-bold data-[active=true]:text-primary data-[active=false]:text-foreground"
                    >
                      {dayDate.getDate()}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                        Today
                      </span>
                    )}
                    {isPast && !isToday && (
                      <CheckCircle className="size-3 text-green-500" />
                    )}
                    {isFuture && (
                      <ChevronRight className="size-3 text-muted-foreground rotate-90" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day content */}
          <DayJournal
            guest={guest}
            dayNumber={activeDayNumber}
            todayDayNumber={todayDayNumber}
            dayTasks={dayTasks}
            dayExecutions={dayExecutions}
            allExecutions={executions}
            customerView={customerView}
            onLogTask={onLogTask}
            getExecForTask={getExecForTask}
          />
        </>
      )}
    </div>
  );
}
