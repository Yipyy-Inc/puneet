"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Flame,
  MapPin,
  Minus,
  PawPrint,
  Phone,
  PlayCircle,
  Plus,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Syringe,
  Target,
  Trophy,
  Video,
  X,
} from "lucide-react";
import { ExercisePicker } from "@/components/facility/training/exercise-picker";
import { getDisciplineIdForClassName } from "@/data/training-exercises";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import { trainers } from "@/data/training";
import { vaccinationRecords } from "@/data/pet-data";
import { notes as petNotesData, tagAssignments, tags } from "@/data/tags-notes";
import {
  aggregateHomeworkSummary,
  aggregateStudentBriefing,
  selectPreviousSessionSummary,
  type BriefingAttendanceSummary,
  type HomeworkSummary,
  type PetAlert,
  type PreSessionBriefingTask,
  type PreviousSessionSummary,
  type StudentBriefingRow,
} from "@/lib/training-pre-session";
import { useRouter } from "next/navigation";
import type { TrainerNoteCategory } from "@/types/training";

const NOTE_CATEGORY_META: Record<
  TrainerNoteCategory,
  { label: string; cls: string }
> = {
  concern: { label: "Concern", cls: "border-rose-200 bg-rose-50 text-rose-700" },
  behavior: {
    label: "Behavior",
    cls: "border-amber-200 bg-amber-50 text-amber-700",
  },
  achievement: {
    label: "Achievement",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  progress: {
    label: "Progress",
    cls: "border-sky-200 bg-sky-50 text-sky-700",
  },
  general: {
    label: "General",
    cls: "border-slate-200 bg-slate-50 text-slate-600",
  },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

/** Long-form "Saturday, June 7, 2026" — used in the session header so the
 *  date reads at a glance without abbreviation noise. */
function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeRange(startISO: string, endISO: string): string {
  const start = new Date(startISO).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const end = new Date(endISO).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${start} – ${end}`;
}

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.round((today - target) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

function countdownLabel(iso: string, nowMs: number): string {
  const diffMs = new Date(iso).getTime() - nowMs;
  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 0) return "starting now";
  if (minutes < 60) return `starts in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `starts in ${hours}h`;
}

export function PreSessionBriefingPanel({
  open,
  onOpenChange,
  task,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: PreSessionBriefingTask | null;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [nowMs] = useState(() => Date.now());
  const todayISO = useMemo(
    () => new Date(nowMs).toISOString().split("T")[0]!,
    [nowMs],
  );

  // Pull the data needed to build the briefing rows. We rely on
  // already-cached queries when available, otherwise the underlying queryFn
  // is what produces the mock data anyway.
  const { data: classEnrollments = [] } = useQuery(
    trainingQueries.enrollments(),
  );
  const { data: trainerNotes = [] } = useQuery(trainingQueries.trainerNotes());
  const { data: attendances = [] } = useQuery(
    trainingQueries.allAttendances(),
  );
  const { data: homework = [] } = useQuery(trainingQueries.allHomework());
  const { data: sessions = [] } = useQuery(trainingQueries.sessions());

  const sessionRecord = useMemo(
    () => (task ? sessions.find((s) => s.id === task.sessionId) : undefined),
    [task, sessions],
  );

  const pets = useMemo(() => clients.flatMap((c) => c.pets), []);
  const ownerByPetId = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clients) {
      for (const pet of c.pets) m.set(pet.id, c.name);
    }
    return m;
  }, []);

  const rows = useMemo<StudentBriefingRow[]>(() => {
    if (!task || !sessionRecord) return [];
    return aggregateStudentBriefing({
      session: sessionRecord,
      enrollments: classEnrollments,
      trainerNotes,
      vaccinations: vaccinationRecords,
      attendances,
      homework,
      pets,
      petTags: tags,
      petTagAssignments: tagAssignments,
      petNotes: petNotesData,
      ownerLookup: (petId) => ownerByPetId.get(petId) ?? "Unknown",
      todayISO,
    });
  }, [
    task,
    sessionRecord,
    classEnrollments,
    trainerNotes,
    attendances,
    homework,
    pets,
    ownerByPetId,
    todayISO,
  ]);

  const homeworkSummary = useMemo<HomeworkSummary | null>(() => {
    if (!sessionRecord || rows.length === 0) return null;
    return aggregateHomeworkSummary({
      rows,
      session: sessionRecord,
      enrollments: classEnrollments,
      attendances,
      homework,
    });
  }, [rows, sessionRecord, classEnrollments, attendances, homework]);

  const previousSessionSummary = useMemo<PreviousSessionSummary | null>(() => {
    if (!sessionRecord || rows.length === 0) return null;
    return selectPreviousSessionSummary({
      rows,
      session: sessionRecord,
      attendances,
    });
  }, [rows, sessionRecord, attendances]);

  function markBriefed() {
    if (!task) return;
    const prev =
      queryClient.getQueryData<string[]>(
        trainingQueries.preSessionBriefedSessionIds().queryKey,
      ) ?? [];
    if (!prev.includes(task.sessionId)) {
      queryClient.setQueryData<string[]>(
        trainingQueries.preSessionBriefedSessionIds().queryKey,
        [...prev, task.sessionId],
      );
    }
    toast.success("Briefing reviewed. Have a great session!");
    onOpenChange(false);
  }

  if (!task) return null;

  const summary = summarize(rows);
  const trainer = trainers.find((t) => t.id === task.trainerId);
  const trainerInitials = task.trainerName
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl"
      >
        <SheetHeader className="space-y-3 border-b bg-linear-to-br from-indigo-50/60 via-white to-white pb-4 dark:from-indigo-950/30 dark:via-slate-950 dark:to-slate-950">
          {/* Top row — kicker label + countdown chip */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 flex size-9 items-center justify-center rounded-xl">
                <ClipboardCheckIcon />
              </div>
              <p className="text-indigo-700 dark:text-indigo-200 text-[10px] font-bold uppercase tracking-[0.18em]">
                Pre-session briefing
              </p>
            </div>
            <Badge
              variant="outline"
              className="gap-1 border-amber-200 bg-amber-50 text-[10.5px] font-semibold text-amber-800 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
              title={`Session starts ${new Date(task.sessionStartAt).toLocaleString()}`}
            >
              <AlarmClock className="size-3" />
              {countdownLabel(task.sessionStartAt, nowMs)}
            </Badge>
          </div>

          {/* Course name — the hero of the screen */}
          <div className="space-y-1 text-left">
            <SheetTitle className="text-2xl/tight font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {task.className}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground text-[12.5px]">
              {task.studentCount} student
              {task.studentCount === 1 ? "" : "s"} enrolled · everything you
              need before class starts
            </SheetDescription>
          </div>

          {/* Session facts grid — date, time, location, instructor. */}
          <ul className="grid grid-cols-1 gap-1.5 text-[13px] sm:grid-cols-2">
            <li className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
              <CalendarCheck className="text-indigo-500 mt-0.5 size-4 shrink-0" />
              <span>
                <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                  Date
                </span>
                {formatLongDate(task.sessionStartAt)}
              </span>
            </li>
            <li className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
              <Clock className="text-indigo-500 mt-0.5 size-4 shrink-0" />
              <span>
                <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                  Time
                </span>
                {formatTimeRange(task.sessionStartAt, task.sessionEndAt)}
              </span>
            </li>
            <li className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
              <MapPin className="text-indigo-500 mt-0.5 size-4 shrink-0" />
              <span>
                <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                  Location
                </span>
                {task.location || "Not specified"}
              </span>
            </li>
            <li className="flex items-start gap-2 text-slate-700 dark:text-slate-200">
              <span className="bg-card mt-0.5 inline-flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200 dark:ring-slate-700">
                {trainer?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={trainer.photoUrl}
                    alt={task.trainerName}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 flex size-full items-center justify-center text-[8px] font-bold">
                    {trainerInitials || "?"}
                  </span>
                )}
              </span>
              <span>
                <span className="text-muted-foreground block text-[10px] font-bold uppercase tracking-wider">
                  Trainer
                </span>
                {task.trainerName}
              </span>
            </li>
          </ul>

          {(summary.vaccineCount > 0 ||
            summary.concernCount > 0 ||
            summary.noShowCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed pt-2">
              <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                Heads-up
              </span>
              {summary.vaccineCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                >
                  <ShieldAlert className="size-3" />
                  {summary.vaccineCount} vaccine
                </Badge>
              )}
              {summary.concernCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                >
                  <AlertTriangle className="size-3" />
                  {summary.concernCount} behavior
                </Badge>
              )}
              {summary.noShowCount > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                >
                  <CalendarCheck className="size-3" />
                  {summary.noShowCount} no-show risk
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-3 py-3">
          {rows.length === 0 ? (
            <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
              No enrolled students yet for this session.
            </div>
          ) : (
            <>
              <AlertSection rows={rows} />
              {homeworkSummary && (
                <HomeworkSummarySection
                  summary={homeworkSummary}
                  todayISO={todayISO}
                />
              )}
              {task && (
                <PlannedExercisesSection
                  sessionId={task.sessionId}
                  className={task.className}
                />
              )}
              {rows.map((row) => (
                <StudentCard
                  key={row.enrollmentId}
                  row={row}
                  todayISO={todayISO}
                />
              ))}
              {previousSessionSummary && (
                <PreviousSessionNotesSection
                  summary={previousSessionSummary}
                />
              )}
            </>
          )}
        </div>

        <SheetFooter className="border-t bg-slate-50/40 pt-3 dark:bg-slate-950/40">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <Sparkles className="size-3" />
              Yipyy auto-builds this briefing 15 min before each session.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={markBriefed}
                title="Mark this briefing as reviewed."
              >
                <CheckCircle2 className="size-4" />
                Mark briefed
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 bg-emerald-600 px-4 text-white hover:bg-emerald-700"
                onClick={() => {
                  if (!task) return;
                  // Auto-stamp the briefing as reviewed when starting — the
                  // trainer is past the briefing if they're walking into the
                  // session.
                  markBriefed();
                  router.push(
                    `/facility/dashboard/services/training/session/${task.sessionId}`,
                  );
                }}
                title="Open the in-session Session View screen."
              >
                <PlayCircle className="size-4" />
                Start Session
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function summarize(rows: StudentBriefingRow[]): {
  vaccineCount: number;
  concernCount: number;
  noShowCount: number;
} {
  let vaccineCount = 0;
  let concernCount = 0;
  let noShowCount = 0;
  for (const row of rows) {
    if (row.vaccineWarning.hasWarning) vaccineCount++;
    if (
      row.notes.some(
        (n) => n.category === "concern" || n.category === "behavior",
      )
    ) {
      concernCount++;
    }
    if (row.consecutiveNoShows >= 2) noShowCount++;
  }
  return { vaccineCount, concernCount, noShowCount };
}

// ============================================================================
// Alert section — red highlighted box at the top of the roster
// ============================================================================

const ALERT_KIND_META: Record<
  PetAlert["kind"],
  { label: string; cls: string }
> = {
  "critical-tag": {
    label: "Critical",
    cls: "border-rose-300 bg-rose-50 text-rose-800",
  },
  "warning-tag": {
    label: "Warning",
    cls: "border-amber-300 bg-amber-50 text-amber-800",
  },
  "behavior-note": {
    label: "Behavior",
    cls: "border-amber-300 bg-amber-50 text-amber-800",
  },
  "medication-note": {
    label: "Medication",
    cls: "border-rose-300 bg-rose-50 text-rose-800",
  },
  "care-note": {
    label: "Care note",
    cls: "border-slate-300 bg-slate-50 text-slate-700",
  },
  "special-needs": {
    label: "Special needs",
    cls: "border-slate-300 bg-slate-50 text-slate-700",
  },
  "trainer-alert": {
    label: "Active alert",
    cls: "border-rose-300 bg-rose-100 text-rose-900",
  },
};

function AlertSection({ rows }: { rows: StudentBriefingRow[] }) {
  const alertedRows = rows.filter((r) => r.petAlerts.length > 0);
  if (alertedRows.length === 0) return null;

  const totalAlerts = alertedRows.reduce(
    (sum, r) => sum + r.petAlerts.length,
    0,
  );

  return (
    <section className="space-y-2 rounded-xl border-2 border-rose-300 bg-rose-50/70 p-3 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30">
      <div className="flex items-center gap-2">
        <div className="bg-rose-600 text-white flex size-7 items-center justify-center rounded-lg">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-rose-900 dark:text-rose-100 text-sm font-bold uppercase tracking-wide">
            Alerts — read first
          </p>
          <p className="text-rose-800/80 dark:text-rose-200/80 text-[11.5px]">
            {alertedRows.length} student
            {alertedRows.length === 1 ? "" : "s"} · {totalAlerts} alert
            {totalAlerts === 1 ? "" : "s"} on file
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {alertedRows.map((row) => (
          <li
            key={row.enrollmentId}
            className="rounded-lg border border-rose-200 bg-white p-2.5 dark:border-rose-900/50 dark:bg-slate-900/60"
          >
            <div className="flex items-start gap-2.5">
              <div className="relative shrink-0">
                {row.petImageUrl ? (
                  <div className="size-9 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                    <Image
                      src={row.petImageUrl}
                      alt={row.petName}
                      width={36}
                      height={36}
                      className="size-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl ring-2 ring-white shadow-sm">
                    <PawPrint className="size-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {row.petName}
                  </p>
                  <span className="text-muted-foreground text-[11px]">
                    {row.petBreed} · {row.ownerName}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {row.petAlerts.map((alert, idx) => {
                    const meta = ALERT_KIND_META[alert.kind];
                    return (
                      <li
                        key={`${row.enrollmentId}-alert-${idx}`}
                        className="flex flex-col gap-0.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={cn("gap-1 border text-[10px]", meta.cls)}
                          >
                            {meta.label}
                          </Badge>
                          <span className="text-[12px] font-medium text-slate-800 dark:text-slate-100">
                            {alert.label}
                          </span>
                        </div>
                        <p className="text-[12.5px]/relaxed text-slate-700 dark:text-slate-200">
                          {alert.detail}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ============================================================================
// Previous session notes — read-only continuity block at the bottom
// ============================================================================

function PreviousSessionNotesSection({
  summary,
}: {
  summary: PreviousSessionSummary;
}) {
  const dateLabel = formatPracticeDate(summary.sessionDate);
  const fullDateLabel = new Date(
    `${summary.sessionDate}T00:00:00`,
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-start gap-3 border-b bg-slate-50/60 px-3 py-2.5 dark:bg-slate-900/40">
        <div className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 flex size-9 items-center justify-center rounded-xl">
          <StickyNote className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Previous session notes
          </p>
          <p
            className="text-muted-foreground text-[11.5px]"
            title={fullDateLabel}
          >
            From the session on {dateLabel} · read-only continuity
          </p>
        </div>
      </div>
      <div className="p-3">
        <p className="whitespace-pre-line text-[13px]/relaxed text-slate-700 dark:text-slate-200">
          {summary.summary}
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// Planned exercises — trainer pre-selects what to cover today
// ============================================================================

function PlannedExercisesSection({
  sessionId,
  className,
}: {
  sessionId: string;
  className: string;
}) {
  const queryClient = useQueryClient();
  const { data: exercises = [] } = useQuery(trainingQueries.exercises());
  const { data: plannedIds = [] } = useQuery(
    trainingQueries.plannedExercisesForSession(sessionId),
  );

  const preferredDisciplineId = useMemo(
    () => getDisciplineIdForClassName(className),
    [className],
  );

  // Defaults open when the trainer hasn't planned anything yet (so the
  // picker is right there), collapses once they've added at least one.
  const [open, setOpen] = useState(true);

  const exerciseById = useMemo(
    () => new Map(exercises.map((ex) => [ex.id, ex])),
    [exercises],
  );

  function writePlanned(next: string[]) {
    queryClient.setQueryData<string[]>(
      trainingQueries.plannedExercisesForSession(sessionId).queryKey,
      next,
    );
  }

  function addExercise(id: string) {
    if (!id) return;
    if (plannedIds.includes(id)) return;
    writePlanned([...plannedIds, id]);
  }

  function removeExercise(id: string) {
    writePlanned(plannedIds.filter((x) => x !== id));
  }

  function clearAll() {
    writePlanned([]);
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40"
      >
        <div className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200 flex size-9 items-center justify-center rounded-xl">
          <Target className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Planned exercises
          </p>
          <p className="text-muted-foreground text-[11.5px]">
            {plannedIds.length === 0
              ? "Pre-select what you'll cover — pre-loads into the in-session screen."
              : `${plannedIds.length} exercise${plannedIds.length === 1 ? "" : "s"} queued for today's session`}
          </p>
        </div>
        {plannedIds.length > 0 && (
          <Badge
            variant="outline"
            className="gap-1 border-violet-200 bg-violet-50 text-[10px] text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200"
          >
            <CheckCircle2 className="size-3" />
            {plannedIds.length} queued
          </Badge>
        )}
        {open ? (
          <ChevronDown className="text-muted-foreground size-4" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4" />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t px-3 py-3">
          {/* Add an exercise — picker auto-prioritizes the course discipline. */}
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase tracking-wider">
                Add from library
              </p>
              <ExercisePicker
                value=""
                onSelect={(ex) => {
                  if (ex) addExercise(ex.id);
                }}
                preferredDisciplineId={preferredDisciplineId}
                triggerClassName="h-9 text-sm"
                placeholder="Pick an exercise to plan…"
              />
            </div>
            {plannedIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-muted-foreground hover:text-destructive h-9 px-2 text-[11px]"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Selected chips list — order = signup order. */}
          {plannedIds.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed py-4 text-center text-[12px]">
              <Sparkles className="text-amber-400 mx-auto mb-1 size-4" />
              Nothing planned yet. Pick from the library above — these will
              pre-load when you open the Session View.
            </div>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {plannedIds.map((id) => {
                const ex = exerciseById.get(id);
                const label = ex?.name ?? id;
                return (
                  <li key={id}>
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[12px] text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-200">
                      <Target className="size-3" />
                      {label}
                      <button
                        type="button"
                        onClick={() => removeExercise(id)}
                        className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-violet-200/70 dark:hover:bg-violet-900/60"
                        aria-label={`Remove ${label}`}
                        title={`Remove ${label} from the plan`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-muted-foreground inline-flex items-center gap-1 text-[10.5px]">
            <Plus className="size-3" />
            Order here = order on the Session View. Drag-reorder lands when
            in-session lists support it.
          </p>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Homework summary — collapsible block, sessions 2+ only
// ============================================================================

function HomeworkSummarySection({
  summary,
  todayISO,
}: {
  summary: HomeworkSummary;
  todayISO: string;
}) {
  // Default open when at least one dog skipped practice — that's the signal
  // the trainer most often wants to act on before class.
  const [open, setOpen] = useState(
    summary.submittedCount < summary.totalCount,
  );

  const previousLabel = formatPracticeDate(summary.previousSessionDate);
  const skippedCount = summary.totalCount - summary.submittedCount;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/40"
      >
        <div className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 flex size-9 items-center justify-center rounded-xl">
          <BookOpen className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Homework summary
          </p>
          <p className="text-muted-foreground text-[11.5px]">
            From the previous session ({previousLabel}) ·{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {summary.submittedCount}/{summary.totalCount}
            </span>{" "}
            practiced
          </p>
        </div>
        {skippedCount > 0 && (
          <Badge
            variant="outline"
            className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200"
          >
            <AlertTriangle className="size-3" />
            {skippedCount} skipped
          </Badge>
        )}
        {open ? (
          <ChevronDown className="text-muted-foreground size-4" />
        ) : (
          <ChevronRight className="text-muted-foreground size-4" />
        )}
      </button>

      {open && (
        <ul className="space-y-2 border-t px-3 py-3">
          {summary.rows.map((row) => (
            <li
              key={row.petId}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border bg-slate-50/40 p-2.5 dark:bg-slate-900/40",
                row.submitted
                  ? "border-emerald-200 dark:border-emerald-900/40"
                  : "border-rose-200 dark:border-rose-900/40",
              )}
            >
              <div className="shrink-0">
                {row.petImageUrl ? (
                  <div className="size-9 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
                    <Image
                      src={row.petImageUrl}
                      alt={row.petName}
                      width={36}
                      height={36}
                      className="size-full object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl ring-2 ring-white shadow-sm">
                    <PawPrint className="size-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {row.petName}
                  </p>
                  <span className="text-muted-foreground text-[11px]">
                    {row.petBreed}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {row.assignedItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-1.5 text-[12px]/snug text-slate-700 dark:text-slate-200"
                    >
                      <Circle className="text-muted-foreground/50 mt-0.5 size-2 shrink-0 fill-current" />
                      <span className="truncate">{item.title}</span>
                      {item.frequency && (
                        <span className="text-muted-foreground text-[10.5px]">
                          · {item.frequency}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <SubmissionStatus row={row} todayISO={todayISO} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SubmissionStatus({
  row,
  todayISO,
}: {
  row: HomeworkSummary["rows"][number];
  todayISO: string;
}) {
  if (!row.submitted) {
    return (
      <div className="shrink-0 text-right">
        <Badge
          variant="outline"
          className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
        >
          <Minus className="size-3" />
          No practice
        </Badge>
      </div>
    );
  }
  const lastPracticed = row.lastPracticedISO
    ? relativeDays(row.lastPracticedISO, todayISO)
    : null;
  return (
    <div className="shrink-0 space-y-0.5 text-right">
      <Badge
        variant="outline"
        className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
        title={`${row.practiceCount} practice ${row.practiceCount === 1 ? "log" : "logs"} since the previous session`}
      >
        <CheckCircle2 className="size-3" />
        Submitted
      </Badge>
      <p className="text-muted-foreground text-[10px]">
        {row.practiceCount}× ·{" "}
        {lastPracticed ? `last ${lastPracticed}` : "recent"}
      </p>
    </div>
  );
}

function formatPracticeDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ============================================================================
// Roster chips — homework submitted + attendance rate
// ============================================================================

function HomeworkSubmittedChip({ submitted }: { submitted: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        submitted
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-500",
      )}
      title={
        submitted
          ? "Owner logged homework practice within the last week."
          : "No homework practice logged in the last week."
      }
    >
      {submitted ? (
        <CheckCircle2 className="size-3" />
      ) : (
        <Minus className="size-3" />
      )}
      {submitted ? "HW submitted" : "No HW"}
    </span>
  );
}

function AttendanceRateChip({
  attendance,
}: {
  attendance: BriefingAttendanceSummary;
}) {
  if (attendance.total === 0) {
    return (
      <span
        className="text-muted-foreground inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium"
        title="No prior sessions on file for this enrollment."
      >
        <CalendarCheck className="size-3" />
        First session
      </span>
    );
  }
  const { attended, missed, total } = attendance;
  const rate = attended / total;
  const tone =
    rate >= 0.8
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : rate >= 0.5
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-rose-200 bg-rose-50 text-rose-700";
  // When the dog has been missing sessions, lead with the miss count so the
  // trainer's eye lands on "absent 2 of 3" rather than the attended count.
  const lead =
    missed > attended
      ? `Absent ${missed} of ${total}`
      : `${attended}/${total} attended`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
        tone,
      )}
      title={`Attended ${attended}, missed ${missed}, out of ${total} prior session${
        total === 1 ? "" : "s"
      } in this series.`}
    >
      <CalendarCheck className="size-3" />
      {lead}
    </span>
  );
}

function StudentCard({
  row,
  todayISO,
}: {
  row: StudentBriefingRow;
  todayISO: string;
}) {
  const hasVideos = row.homeworkVideos.length > 0;
  const [open, setOpen] = useState(
    row.vaccineWarning.hasWarning ||
      row.notes.some(
        (n) => n.category === "concern" || n.category === "behavior",
      ) ||
      hasVideos,
  );
  // Toggle just the video panel. Defaults open when there are videos so the
  // trainer sees the clips the moment the card expands.
  const [videosOpen, setVideosOpen] = useState(hasVideos);

  const alertCount =
    (row.vaccineWarning.hasWarning ? 1 : 0) +
    (row.notes.length > 0 ? 1 : 0) +
    (row.consecutiveNoShows >= 2 ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <div className="relative shrink-0">
          {row.petImageUrl ? (
            <div className="size-10 overflow-hidden rounded-xl shadow-sm ring-2 ring-white">
              <Image
                src={row.petImageUrl}
                alt={row.petName}
                width={40}
                height={40}
                className="size-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl shadow-sm ring-2 ring-white">
              <PawPrint className="size-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold text-slate-800">
            {row.petName}
          </p>
          <p className="text-muted-foreground truncate text-[11px]">
            {row.petBreed} · {row.ownerName}
          </p>
          {row.ownerPhone && (
            <a
              href={`tel:${row.ownerPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
            >
              <Phone className="size-3" />
              {row.ownerPhone}
            </a>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <HomeworkSubmittedChip submitted={row.homeworkSubmitted} />
            <AttendanceRateChip attendance={row.attendance} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {row.vaccineWarning.hasWarning && (
            <Badge
              variant="outline"
              className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
              title={
                row.vaccineWarning.soonestName
                  ? `${row.vaccineWarning.soonestName} due in ${row.vaccineWarning.soonestDays ?? 0}d`
                  : undefined
              }
            >
              <ShieldAlert className="size-3" />
              Vaccine
            </Badge>
          )}
          {row.consecutiveNoShows >= 2 && (
            <Badge
              variant="outline"
              className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
            >
              <CalendarCheck className="size-3" />
              No-show risk
            </Badge>
          )}
          {hasVideos && (
            <Badge
              variant="outline"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                // Expand the card if collapsed, then open the video panel.
                // Stop the parent button's onClick from toggling `open` off.
                e.stopPropagation();
                if (!open) setOpen(true);
                setVideosOpen((v) => !v);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!open) setOpen(true);
                  setVideosOpen((v) => !v);
                }
              }}
              className="cursor-pointer gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700 hover:bg-indigo-100"
              title="Owner-submitted homework video — tap to play inline"
            >
              <Video className="size-3" />
              {row.homeworkVideos.length === 1
                ? "Video submitted"
                : `${row.homeworkVideos.length} videos submitted`}
            </Badge>
          )}
          {alertCount === 0 && !hasVideos && (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
            >
              <CheckCircle2 className="size-3" />
              All clear
            </Badge>
          )}
          {open ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t px-3 py-3">
          {/* Behavioral notes */}
          <section className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <StickyNote className="size-3" />
              Trainer notes
            </p>
            {row.notes.length === 0 ? (
              <p className="text-muted-foreground text-[12px] italic">
                No notes on file for {row.petName} yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {row.notes.map((note) => {
                  const meta = NOTE_CATEGORY_META[note.category];
                  return (
                    <li
                      key={note.id}
                      className="rounded-md border bg-slate-50/40 px-2.5 py-1.5"
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", meta.cls)}
                        >
                          {meta.label}
                        </Badge>
                        <span className="text-muted-foreground text-[10px]">
                          {relativeDays(note.date, todayISO)} ·{" "}
                          {note.trainerName}
                          {note.isPrivate && " · Private"}
                        </span>
                      </div>
                      <p className="text-[12.5px]/relaxed text-slate-700">
                        {note.note}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Vaccine alert */}
          {row.vaccineWarning.hasWarning && (
            <section className="rounded-md border border-rose-200 bg-rose-50/60 px-2.5 py-2">
              <p className="text-rose-700 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                <Syringe className="size-3" />
                Vaccination alert
              </p>
              <p className="mt-0.5 text-[12.5px]/relaxed text-slate-700">
                {row.vaccineWarning.soonestName}
                {row.vaccineWarning.soonestDays !== null && (
                  <>
                    {" "}
                    is due in{" "}
                    <span className="font-semibold">
                      {row.vaccineWarning.soonestDays} day
                      {row.vaccineWarning.soonestDays === 1 ? "" : "s"}
                    </span>
                    .
                  </>
                )}{" "}
                Flag the owner before the session if you can.
              </p>
            </section>
          )}

          {/* Homework status */}
          <section className="space-y-1.5">
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <BookOpen className="size-3" />
              Homework
            </p>
            {row.homework.activeCount === 0 ? (
              <p className="text-muted-foreground text-[12px] italic">
                No active homework — they&apos;re between assignments.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="gap-1 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700"
                >
                  <BookOpen className="size-3" />
                  {row.homework.activeCount} active
                </Badge>
                {row.homework.practicedTodayCount > 0 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700"
                  >
                    <CheckCircle2 className="size-3" />
                    {row.homework.practicedTodayCount} practiced today
                  </Badge>
                )}
                {row.homework.streakDays >= 2 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-orange-200 bg-orange-50 text-[10px] text-orange-700"
                  >
                    <Flame className="size-3" />
                    {row.homework.streakDays}-day streak
                  </Badge>
                )}
                {row.homework.overdueCount > 0 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700"
                  >
                    <AlertTriangle className="size-3" />
                    {row.homework.overdueCount} overdue
                  </Badge>
                )}
                {row.homework.lastPracticedISO && (
                  <span className="text-muted-foreground text-[10.5px]">
                    Last practiced{" "}
                    {relativeDays(row.homework.lastPracticedISO, todayISO)}
                  </span>
                )}
                {!row.homework.lastPracticedISO && (
                  <span className="text-rose-600 inline-flex items-center gap-1 text-[10.5px] italic">
                    <AlertTriangle className="size-3" />
                    Owner hasn&apos;t logged any practice
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Homework videos — owner-submitted practice clips. Collapsible
              so the briefing stays scannable when there's nothing to watch. */}
          {hasVideos && (
            <section className="space-y-1.5">
              <button
                type="button"
                onClick={() => setVideosOpen((v) => !v)}
                className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:text-foreground"
              >
                <Video className="size-3" />
                Homework videos · {row.homeworkVideos.length}
                {videosOpen ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
              </button>
              {videosOpen && (
                <ul className="space-y-2">
                  {row.homeworkVideos.map((submission) => (
                    <li
                      key={`${submission.homeworkId}-${submission.practiceDate}`}
                      className="overflow-hidden rounded-md border bg-slate-50/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-card px-2.5 py-1.5">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-semibold text-slate-800">
                            {submission.homeworkTitle}
                          </p>
                          <p className="text-muted-foreground inline-flex items-center gap-1 text-[10px]">
                            <PlayCircle className="size-3" />
                            Submitted{" "}
                            {relativeDays(submission.attachedAtISO, todayISO)} ·
                            practice for {submission.practiceDate}
                          </p>
                        </div>
                      </div>
                      <video
                        src={submission.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="aspect-video w-full bg-slate-900 object-contain"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Quick wins */}
          {row.notes.some((n) => n.category === "achievement") && (
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px] italic">
              <Trophy className="text-amber-500 size-3" />
              Don&apos;t forget to celebrate recent wins above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ClipboardCheckIcon() {
  // Small inline SVG so we don't add another lucide import just for this.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}
