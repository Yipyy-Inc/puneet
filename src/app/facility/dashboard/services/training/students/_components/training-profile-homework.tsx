"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  AlarmClock,
  ArrowUpRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Flame,
  Inbox,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { trainingQueries } from "@/lib/api/training";
import type {
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import {
  bumpNextDueDate,
  fanOutHomeworkDelete,
  fanOutHomeworkUpsert,
  getHomeworkBoardStatus,
  getLastPracticedDate,
  getPracticeStreakDays,
  hasPracticedToday,
} from "@/lib/training-homework";
import { HomeworkEditDialog } from "@/components/facility/training/homework-edit-dialog";

interface Props {
  petId: number;
  petName: string;
  enrollments: TrainingEnrollment[];
}

interface HomeworkRow {
  homework: TrainingHomework;
  enrollment: TrainingEnrollment | undefined;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDays(iso: string, todayISO: string): string {
  const today = new Date(todayISO + "T00:00:00").getTime();
  const target = new Date(iso + "T00:00:00").getTime();
  const days = Math.round((today - target) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 0) return `in ${-days}d`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

const NEXT_DUE_META: Record<
  "overdue" | "due-soon" | "active",
  { cls: string; icon: typeof Clock }
> = {
  overdue: {
    cls: "border-rose-200 bg-rose-50 text-rose-700",
    icon: AlarmClock,
  },
  "due-soon": {
    cls: "border-amber-200 bg-amber-50 text-amber-700",
    icon: CalendarClock,
  },
  active: {
    cls: "border-sky-200 bg-sky-50 text-sky-700",
    icon: CalendarClock,
  },
};

function HomeworkCard({
  row,
  todayISO,
  onToggleComplete,
  onEdit,
  onMarkPracticed,
  onDelete,
}: {
  row: HomeworkRow;
  todayISO: string;
  onToggleComplete: () => void;
  onEdit: () => void;
  onMarkPracticed: () => void;
  onDelete: () => void;
}) {
  const { homework, enrollment } = row;
  const assignedLabel = homework.unlockedDate ?? homework.sessionDate;
  const isCompleted = homework.completed;
  const dueStatus = !isCompleted
    ? getHomeworkBoardStatus(homework, todayISO)
    : null;
  const dueMeta =
    dueStatus && dueStatus !== "completed" ? NEXT_DUE_META[dueStatus] : null;
  const DueIcon = dueMeta?.icon ?? CalendarClock;
  const practicedToday = !isCompleted && hasPracticedToday(homework, todayISO);
  const streak = isCompleted ? 0 : getPracticeStreakDays(homework, todayISO);
  const lastPracticed = isCompleted ? null : getLastPracticedDate(homework);
  const daysSinceLast = lastPracticed
    ? Math.max(
        0,
        Math.round(
          (new Date(`${todayISO}T00:00:00Z`).getTime() -
            new Date(`${lastPracticed}T00:00:00Z`).getTime()) /
            86_400_000,
        ),
      )
    : null;

  return (
    <li
      className={cn(
        "bg-card rounded-xl border shadow-sm transition-opacity",
        isCompleted && "opacity-80",
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            isCompleted
              ? "bg-emerald-100 text-emerald-700"
              : "bg-indigo-100 text-indigo-700",
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <Target className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm font-semibold text-slate-800",
                  isCompleted && "line-through decoration-slate-300",
                )}
              >
                {homework.title}
              </p>
              {enrollment && (
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {enrollment.seriesName} · Session{" "}
                  {homework.sessionNumber}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {homework.frequency && (
                <Badge
                  variant="outline"
                  className="gap-1 border-violet-200 bg-violet-50 text-violet-700"
                  title="How often to practice"
                >
                  <Clock className="size-3" />
                  {homework.frequency}
                </Badge>
              )}
              {!isCompleted && homework.nextDueDate && dueMeta && (
                <Badge
                  variant="outline"
                  className={cn("gap-1 border", dueMeta.cls)}
                  title={`Due ${formatDate(homework.nextDueDate)}`}
                >
                  <DueIcon className="size-3" />
                  Due {relativeDays(homework.nextDueDate, todayISO)}
                </Badge>
              )}
              {!isCompleted && practicedToday && (
                <Badge
                  variant="outline"
                  className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
                  title="Owner marked practice for today"
                >
                  <CheckCircle2 className="size-3" />
                  Practiced today
                </Badge>
              )}
              {!isCompleted && streak >= 2 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-orange-200 bg-orange-50 text-orange-700"
                  title="Consecutive days the owner has practiced"
                >
                  <Flame className="size-3" />
                  {streak}-day streak
                </Badge>
              )}
              {!isCompleted &&
                !practicedToday &&
                streak < 2 &&
                lastPracticed &&
                daysSinceLast !== null &&
                daysSinceLast >= 7 && (
                  <Badge
                    variant="outline"
                    className="gap-1 border-rose-200 bg-rose-50 text-rose-700"
                    title={`Last practiced ${formatDate(lastPracticed)}`}
                  >
                    <TrendingDown className="size-3" />
                    Not practicing
                  </Badge>
                )}
              {!isCompleted && !lastPracticed && (
                <Badge
                  variant="outline"
                  className="gap-1 border-slate-200 bg-slate-50 italic text-slate-500"
                  title="Owner hasn't logged any practice yet"
                >
                  <TrendingDown className="size-3" />
                  Not started
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 border",
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-50 text-slate-600",
                )}
                title={
                  isCompleted
                    ? `Marked done ${formatDate(
                        homework.completedDate ?? assignedLabel,
                      )}`
                    : `Assigned ${formatDate(assignedLabel)}`
                }
              >
                <CalendarDays className="size-3" />
                {isCompleted
                  ? `Done ${relativeDays(
                      homework.completedDate ?? assignedLabel,
                      todayISO,
                    )}`
                  : `Assigned ${relativeDays(assignedLabel, todayISO)}`}
              </Badge>
            </div>
          </div>

          {homework.description && (
            <p className="text-sm/relaxed text-slate-600">
              {homework.description}
            </p>
          )}

          {homework.instructions.length > 0 && (
            <ul className="space-y-1 pl-4 text-[12px]/relaxed text-slate-600">
              {homework.instructions.map((inst, idx) => (
                <li key={`${homework.id}-inst-${idx}`} className="list-disc">
                  {inst}
                </li>
              ))}
            </ul>
          )}

          {homework.resources && homework.resources.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {homework.resources.map((url, idx) => (
                <a
                  key={`${homework.id}-res-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  Resource {idx + 1}
                  <ArrowUpRight className="size-3" />
                </a>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-muted-foreground text-[10px]">
              Assigned by {enrollment ? "instructor" : "facility"}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              {!isCompleted && homework.nextDueDate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px]"
                  onClick={onMarkPracticed}
                  title="Owner practiced — push next due date forward"
                >
                  <Clock className="size-3" />
                  Practiced
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-[11px]"
                onClick={onEdit}
                title="Edit homework"
              >
                <Edit className="size-3" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive h-7 gap-1 text-[11px]"
                onClick={onDelete}
                title="Delete homework"
              >
                <Trash2 className="size-3" />
              </Button>
              {isCompleted ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onToggleComplete}
                  className="h-7 gap-1 text-[11px]"
                >
                  <RotateCcw className="size-3" />
                  Reopen
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onToggleComplete}
                  className="h-7 gap-1 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="size-3" />
                  Mark complete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export function TrainingProfileHomework({
  petId,
  petName,
  enrollments,
}: Props) {
  const queryClient = useQueryClient();
  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0]!,
    [],
  );

  const enrollmentIds = useMemo(
    () => enrollments.map((e) => e.id),
    [enrollments],
  );
  const enrollmentById = useMemo(
    () => new Map(enrollments.map((e) => [e.id, e])),
    [enrollments],
  );
  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === "enrolled"),
    [enrollments],
  );

  const homeworkQuery = trainingQueries.homeworkForEnrollments(enrollmentIds);
  const { data: homeworkRecords = [] } = useQuery(homeworkQuery);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingHomework | null>(null);
  const [deleting, setDeleting] = useState<TrainingHomework | null>(null);

  // Build rows joined with their enrollment for context, then split into
  // active vs completed.
  const { active, completed } = useMemo(() => {
    const rows = homeworkRecords.map<HomeworkRow>((h) => ({
      homework: h,
      enrollment: enrollmentById.get(h.enrollmentId),
    }));
    const a: HomeworkRow[] = [];
    const c: HomeworkRow[] = [];
    for (const row of rows) {
      if (row.homework.completed) c.push(row);
      else a.push(row);
    }
    // Active sorted newest assignment first; completed sorted by most-recent
    // completion first so the archive reads as a timeline.
    a.sort((x, y) => {
      const xd = x.homework.unlockedDate ?? x.homework.sessionDate;
      const yd = y.homework.unlockedDate ?? y.homework.sessionDate;
      return yd.localeCompare(xd);
    });
    c.sort((x, y) => {
      const xd = x.homework.completedDate ?? x.homework.sessionDate;
      const yd = y.homework.completedDate ?? y.homework.sessionDate;
      return yd.localeCompare(xd);
    });
    return { active: a, completed: c };
  }, [homeworkRecords, enrollmentById]);

  function toggleHomeworkComplete(homework: TrainingHomework) {
    const becomesCompleted = !homework.completed;
    fanOutHomeworkUpsert(queryClient, {
      ...homework,
      completed: becomesCompleted,
      completedDate: becomesCompleted ? todayISO : null,
      nextDueDate: becomesCompleted ? null : homework.nextDueDate,
    });
    toast.success(
      becomesCompleted
        ? `"${homework.title}" marked complete.`
        : `"${homework.title}" reopened.`,
    );
  }

  function markPracticed(homework: TrainingHomework) {
    const next = bumpNextDueDate(homework, todayISO);
    fanOutHomeworkUpsert(queryClient, { ...homework, nextDueDate: next });
    toast.success(`Next practice ${next}.`);
  }

  function confirmDelete() {
    if (!deleting) return;
    fanOutHomeworkDelete(queryClient, deleting.id);
    toast.success(`"${deleting.title}" deleted.`);
    setDeleting(null);
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(homework: TrainingHomework) {
    setEditing(homework);
    setDialogOpen(true);
  }

  const singleLockedEnrollmentId =
    activeEnrollments.length === 1 ? activeEnrollments[0]?.id : undefined;

  const canAddHomework = activeEnrollments.length > 0;

  if (homeworkRecords.length === 0) {
    return (
      <>
        <div className="text-muted-foreground rounded-xl border border-dashed py-16 text-center text-sm">
          <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
          <p>
            No homework assigned yet — homework unlocks when {petName} completes
            a session.
          </p>
          {canAddHomework && (
            <Button
              className="mt-4"
              size="sm"
              onClick={openAdd}
            >
              <Plus className="mr-1.5 size-4" />
              Add homework now
            </Button>
          )}
        </div>
        <HomeworkEditDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditing(null);
          }}
          editing={editing}
          lockedEnrollmentId={singleLockedEnrollmentId}
          restrictToPetId={petId}
          todayISO={todayISO}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top summary strip ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
        <div className="flex items-center gap-3 text-slate-700">
          <BookOpen className="text-muted-foreground size-4" />
          <span>
            <span className="font-semibold tabular-nums text-slate-900">
              {active.length}
            </span>{" "}
            active
          </span>
          {completed.length > 0 && (
            <span className="text-muted-foreground">
              ·{" "}
              <span className="font-semibold tabular-nums text-slate-700">
                {completed.length}
              </span>{" "}
              completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
            <Sparkles className="size-3" />
            Owners see this list in their portal.
          </p>
          {canAddHomework && (
            <Button size="sm" onClick={openAdd} className="h-7 gap-1 text-[11px]">
              <Plus className="size-3" />
              Add homework
            </Button>
          )}
        </div>
      </div>

      {/* Active homework ─────────────────────────────────────────────── */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Active homework
          </h3>
          {active.length > 0 && (
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {active.length}
            </span>
          )}
        </div>
        {active.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed bg-emerald-50/30 px-4 py-6 text-center text-sm">
            <CheckCircle2 className="mx-auto mb-1.5 size-5 text-emerald-500" />
            All caught up — nothing currently assigned.
          </div>
        ) : (
          <ul className="space-y-2">
            {active.map((row) => (
              <HomeworkCard
                key={row.homework.id}
                row={row}
                todayISO={todayISO}
                onToggleComplete={() => toggleHomeworkComplete(row.homework)}
                onEdit={() => openEdit(row.homework)}
                onMarkPracticed={() => markPracticed(row.homework)}
                onDelete={() => setDeleting(row.homework)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Completed archive ─────────────────────────────────────────── */}
      {completed.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setArchiveOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/60 px-4 py-2.5 text-left hover:bg-slate-100/60"
          >
            <div className="flex items-center gap-2">
              {archiveOpen ? (
                <ChevronDown className="text-muted-foreground size-4" />
              ) : (
                <ChevronRight className="text-muted-foreground size-4" />
              )}
              <h3 className="text-sm font-semibold text-slate-700">
                Completed homework
              </h3>
              <span className="text-muted-foreground text-[11px] tabular-nums">
                {completed.length}
              </span>
            </div>
            <span className="text-muted-foreground text-[11px]">
              {archiveOpen ? "Hide" : "Show archive"}
            </span>
          </button>
          {archiveOpen && (
            <ul className="space-y-2">
              {completed.map((row) => (
                <HomeworkCard
                  key={row.homework.id}
                  row={row}
                  todayISO={todayISO}
                  onToggleComplete={() =>
                    toggleHomeworkComplete(row.homework)
                  }
                  onEdit={() => openEdit(row.homework)}
                  onMarkPracticed={() => markPracticed(row.homework)}
                  onDelete={() => setDeleting(row.homework)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <HomeworkEditDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        lockedEnrollmentId={singleLockedEnrollmentId}
        restrictToPetId={petId}
        todayISO={todayISO}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleting?.title}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the homework from {petName}&apos;s record. Any
              progress on it won&apos;t be recoverable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
