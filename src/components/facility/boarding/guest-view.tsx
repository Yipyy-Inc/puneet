"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
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
  Camera,
  User,
  BedDouble,
  Star,
  ClipboardList,
} from "lucide-react";
import type { ScheduledTask, TaskExecution } from "./guest-journal";
import { OUTCOME_LABELS } from "./task-rows";
import type { BoardingGuest } from "@/data/boarding";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TagChip({ tag, variant }: { tag: string; variant?: "danger" | "warning" | "purple" | "default" }) {
  const styles = {
    danger: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    purple: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
    default: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[variant ?? "default"]}`}
    >
      {tag}
    </span>
  );
}

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
}) {
  return (
    <div className="flex gap-3">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </div>
        <div className="bg-border mt-1 w-px flex-1" />
      </div>
      {/* Content */}
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
              <span className={`text-xs font-semibold ${outcomeColor}`}>
                {outcome}
              </span>
            )}
            {staffInitials && (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <User className="size-3" />
                {staffInitials}
              </span>
            )}
          </div>
        </div>
        {subtitle && (
          <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
        )}
        {notes && (
          <p className="mt-1 text-xs italic text-foreground/70">"{notes}"</p>
        )}
      </div>
    </div>
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
  const guest = guests.find((g) => g.id === selectedGuestId);
  const guestTasks = tasks.filter((t) => t.guestId === selectedGuestId);
  const guestExecs = executions.filter((e) => e.guestId === selectedGuestId);

  // Build timeline: combine executions with pending tasks in time order
  const timelineItems: {
    time: string;
    type: "exec" | "pending";
    exec?: TaskExecution;
    task?: ScheduledTask;
  }[] = [];

  // Add completed executions
  for (const exec of guestExecs) {
    if (exec.taskType === "feeding" && !exec.outcome) continue; // skip serve-only
    timelineItems.push({ time: exec.executedAt, type: "exec", exec });
  }

  // Add pending tasks (not yet executed)
  for (const task of guestTasks) {
    if (task.taskType === "feeding") {
      const exec = getExecForTask(task.id);
      if (!exec || !exec.outcome) {
        timelineItems.push({
          time: task.scheduledTime,
          type: "pending",
          task,
        });
      }
    } else if (!getExecForTask(task.id)) {
      timelineItems.push({ time: task.scheduledTime, type: "pending", task });
    }
  }

  timelineItems.sort((a, b) => a.time.localeCompare(b.time));

  const daysBoardedSoFar = guest
    ? Math.ceil(
        (Date.now() - new Date(guest.checkInDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Guest selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <PawPrint className="text-primary size-4 shrink-0" />
            <Select value={selectedGuestId} onValueChange={onSelectGuest}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select guest..." />
              </SelectTrigger>
              <SelectContent>
                {guests.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{g.petName}</span>
                      <span className="text-muted-foreground text-xs">
                        {g.kennelName}
                      </span>
                      {g.medications.length > 0 && (
                        <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          Meds
                        </span>
                      )}
                      {g.allergies.length > 0 && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          Allergy
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {guest && (
        <>
          {/* Guest info card */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* Avatar */}
                <div className="flex size-20 shrink-0 items-center justify-center self-center rounded-2xl bg-muted sm:self-start">
                  {guest.petPhotoUrl ? (
                    <img
                      src={guest.petPhotoUrl}
                      alt={guest.petName}
                      className="size-20 rounded-2xl object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <PawPrint className="size-8 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-bold">{guest.petName}</h2>
                      <p className="text-muted-foreground text-sm">
                        {guest.petBreed} · {guest.petSize} ·{" "}
                        {guest.petWeight} lbs
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {guest.kennelName}
                    </Badge>
                  </div>

                  {/* Tags row */}
                  <div className="flex flex-wrap gap-1.5">
                    {guest.allergies.length > 0 && (
                      <TagChip
                        tag={`⚠ Allergy: ${guest.allergies.join(", ")}`}
                        variant="danger"
                      />
                    )}
                    {guest.medications.some((m) => m.times.length > 0) && (
                      <TagChip tag="On Medication" variant="purple" />
                    )}
                    {guest.packageType && (
                      <TagChip tag={guest.packageType} />
                    )}
                  </div>

                  {/* Stay info grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="flex items-start gap-2">
                      <CalendarDays className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Check-In
                        </p>
                        <p className="font-medium">
                          {formatDate(guest.checkInDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CalendarDays className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Check-Out
                        </p>
                        <p className="font-medium">
                          {formatDate(guest.checkOutDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <BedDouble className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="text-muted-foreground text-xs">Night</p>
                        <p className="font-medium">
                          {daysBoardedSoFar} of {guest.totalNights}
                        </p>
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
                </div>
              </div>

              {/* Care details */}
              <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                <div className="rounded-xl bg-green-50/60 p-3 dark:bg-green-900/10">
                  <div className="mb-1 flex items-center gap-2">
                    <Utensils className="size-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-800 dark:text-green-300">
                      Feeding
                    </span>
                  </div>
                  <p className="text-sm font-medium">
                    {guest.feedingAmount} {guest.foodBrand}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {guest.feedingTimes.join(" & ")}
                  </p>
                  {guest.feedingInstructions && (
                    <p className="text-muted-foreground mt-0.5 text-xs italic">
                      {guest.feedingInstructions}
                    </p>
                  )}
                </div>

                {guest.medications.length > 0 && (
                  <div className="rounded-xl bg-purple-50/60 p-3 dark:bg-purple-900/10">
                    <div className="mb-1 flex items-center gap-2">
                      <Pill className="size-3.5 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">
                        Medications
                      </span>
                    </div>
                    {guest.medications.map((med) => (
                      <div key={med.id} className="mb-1 last:mb-0">
                        <p className="text-sm font-medium">
                          {med.medicationName} {med.dosage}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {med.frequency}
                          {med.times.length > 0 &&
                            ` · ${med.times.join(", ")}`}
                        </p>
                        {med.requiresPhotoProof && (
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
                            <Camera className="size-3" />
                            Photo proof required
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {guest.notes && (
                <div className="mt-3 rounded-xl border bg-muted/30 p-3">
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Staff Notes
                  </p>
                  <p className="mt-1 text-sm">{guest.notes}</p>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Stethoscope className="size-3.5" />
                Emergency vet: {guest.emergencyVetContact}
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Today's Activity</span>
                <Badge variant="secondary">
                  {guestExecs.filter((e) => !!e.outcome).length} logged
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineItems.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="text-muted-foreground mx-auto mb-3 size-10 opacity-40" />
                  <p className="text-muted-foreground text-sm">
                    No activity logged yet today
                  </p>
                </div>
              ) : (
                <div>
                  {timelineItems.map((item, idx) => {
                    if (item.type === "exec" && item.exec) {
                      const exec = item.exec;
                      const outcomeInfo = OUTCOME_LABELS[exec.outcome];
                      const isConcern = [
                        "diarrhea",
                        "soft_stool",
                        "vomit_noticed",
                        "refused",
                        "vomited_after",
                        "missed",
                      ].includes(exec.outcome);

                      const task = guestTasks.find(
                        (t) => t.id === exec.taskId,
                      );

                      return (
                        <TimelineEntry
                          key={exec.id}
                          time={exec.executedAt}
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
                          title={
                            task?.details ??
                            (exec.taskType === "potty"
                              ? "Potty"
                              : exec.taskType === "feeding"
                                ? "Feeding"
                                : exec.taskType === "addon"
                                  ? "Add-on"
                                  : exec.taskType === "care"
                                    ? "Care"
                                    : "Medication")
                          }
                          subtitle={
                            exec.taskType === "medication"
                              ? task?.details
                              : undefined
                          }
                          outcome={outcomeInfo?.label}
                          outcomeColor={outcomeInfo?.colorClass}
                          staffInitials={exec.staffInitials}
                          notes={exec.notes}
                          isConcern={isConcern}
                        />
                      );
                    }

                    if (item.type === "pending" && item.task) {
                      const pendingTask = item.task;
                      const isFeedingServed =
                        pendingTask.taskType === "feeding" &&
                        executions.some(
                          (e) =>
                            e.taskId === pendingTask.id &&
                            e.taskType === "feeding" &&
                            !!e.servedAt,
                        );

                      return (
                        <div key={pendingTask.id + idx} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/30">
                              <Clock className="size-3.5 text-muted-foreground" />
                            </div>
                            {idx < timelineItems.length - 1 && (
                              <div className="bg-border mt-1 w-px flex-1" />
                            )}
                          </div>
                          <div className="mb-3 min-w-0 flex-1 flex items-center justify-between rounded-xl border border-dashed p-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-xs">
                                  {pendingTask.scheduledTime}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  {pendingTask.details}
                                  {pendingTask.taskType === "medication" &&
                                    ` — ${pendingTask.details}`}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={
                                isFeedingServed ? "outline" : "secondary"
                              }
                              onClick={() => onLogTask(pendingTask)}
                            >
                              {pendingTask.taskType === "potty"
                                ? "Log"
                                : pendingTask.taskType === "feeding"
                                  ? isFeedingServed
                                    ? "Record Intake"
                                    : "Serve"
                                  : pendingTask.taskType === "addon"
                                    ? "Log"
                                    : pendingTask.taskType === "care"
                                      ? "Log"
                                      : "Administer"}
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
