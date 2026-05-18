"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import {
  DataTable,
  type ColumnDef,
  type FilterDef,
} from "@/components/ui/DataTable";
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
import {
  AlarmClock,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit,
  Flame,
  Inbox,
  PawPrint,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  TrendingDown,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trainingQueries } from "@/lib/api/training";
import { clients } from "@/data/clients";
import {
  DUE_SOON_WINDOW_DAYS,
  aggregateHomeworkBoard,
  bumpNextDueDate,
  fanOutHomeworkDelete,
  fanOutHomeworkUpsert,
  getLastPracticedDate,
  getPracticeStreakDays,
  hasPracticedToday,
  type HomeworkBoardRow,
  type HomeworkBoardStatus,
} from "@/lib/training-homework";
import type { TrainingHomework } from "@/lib/training-enrollment";
import { HomeworkEditDialog } from "@/components/facility/training/homework-edit-dialog";

const STATUS_META: Record<
  HomeworkBoardStatus,
  { label: string; cls: string; icon: typeof Clock }
> = {
  overdue: {
    label: "Overdue",
    cls: "bg-rose-100 text-rose-700 border-rose-200",
    icon: AlarmClock,
  },
  "due-soon": {
    label: "Due soon",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: CalendarClock,
  },
  active: {
    label: "Active",
    cls: "bg-sky-100 text-sky-700 border-sky-200",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function relativeLabel(iso: string, todayISO: string): string {
  const today = new Date(`${todayISO}T00:00:00`).getTime();
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  const days = Math.round((target - today) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0 && days < 7) return `In ${days}d`;
  if (days < 0 && days > -7) return `${-days}d ago`;
  if (days < 0) return `${Math.round(-days / 7)}w ago`;
  return `In ${Math.round(days / 7)}w`;
}

export function HomeworkBoard() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const todayISO = useMemo(
    () => new Date().toISOString().split("T")[0]!,
    [],
  );

  const { data: homeworkRecords = [] } = useQuery(
    trainingQueries.allHomework(),
  );
  const { data: enrollments = [] } = useQuery(
    trainingQueries.allSeriesEnrollments(),
  );
  const { data: series = [] } = useQuery(trainingQueries.series());
  const { data: trainers = [] } = useQuery(trainingQueries.trainers());

  const pets = useMemo(() => clients.flatMap((c) => c.pets), []);

  // Dialogs.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingHomework | null>(null);
  const [deleting, setDeleting] = useState<HomeworkBoardRow | null>(null);

  const rows = useMemo(
    () =>
      aggregateHomeworkBoard({
        homework: homeworkRecords,
        enrollments,
        series,
        trainers,
        pets,
        today: todayISO,
      }),
    [homeworkRecords, enrollments, series, trainers, pets, todayISO],
  );

  const sortedRows = useMemo(() => {
    // Default ordering: overdue first, then due-soon, then active (by next-due
    // ascending), then completed (by completedDate descending).
    const statusRank: Record<HomeworkBoardStatus, number> = {
      overdue: 0,
      "due-soon": 1,
      active: 2,
      completed: 3,
    };
    return rows.slice().sort((a, b) => {
      const sr = statusRank[a.status] - statusRank[b.status];
      if (sr !== 0) return sr;
      if (a.status === "completed") {
        const ad = a.homework.completedDate ?? "";
        const bd = b.homework.completedDate ?? "";
        return bd.localeCompare(ad);
      }
      const ad = a.homework.nextDueDate ?? a.homework.sessionDate;
      const bd = b.homework.nextDueDate ?? b.homework.sessionDate;
      return ad.localeCompare(bd);
    });
  }, [rows]);

  const summary = useMemo(() => {
    let active = 0;
    let dueThisWeek = 0;
    let overdue = 0;
    let completedThisWeek = 0;
    let practicingToday = 0;
    const oneWeekAgo = new Date(`${todayISO}T00:00:00Z`);
    oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7);
    const weekCutoff = oneWeekAgo.toISOString().slice(0, 10);
    for (const r of rows) {
      if (r.status === "completed") {
        const cd = r.homework.completedDate ?? "";
        if (cd && cd >= weekCutoff) completedThisWeek++;
      } else {
        active++;
        if (hasPracticedToday(r.homework, todayISO)) practicingToday++;
        if (r.isDueThisWeek) dueThisWeek++;
        if (r.isOverdue) overdue++;
      }
    }
    return {
      active,
      dueThisWeek,
      overdue,
      completedThisWeek,
      practicingToday,
    };
  }, [rows, todayISO]);

  const instructorFilterOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of rows) {
      if (r.instructorId && r.instructorName) {
        set.set(r.instructorId, r.instructorName);
      }
    }
    return Array.from(set.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [rows]);

  const frequencyFilterOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const f = r.homework.frequency?.trim();
      if (f) set.add(f);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((f) => ({ value: f, label: f }));
  }, [rows]);

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(homework: TrainingHomework) {
    setEditing(homework);
    setDialogOpen(true);
  }

  function markPracticed(row: HomeworkBoardRow) {
    const nextDue = bumpNextDueDate(row.homework, todayISO);
    fanOutHomeworkUpsert(queryClient, {
      ...row.homework,
      nextDueDate: nextDue,
    });
    toast.success(
      `${row.petName}: next practice ${formatDate(nextDue)}.`,
    );
  }

  function toggleComplete(row: HomeworkBoardRow) {
    const becomesCompleted = !row.homework.completed;
    fanOutHomeworkUpsert(queryClient, {
      ...row.homework,
      completed: becomesCompleted,
      completedDate: becomesCompleted ? todayISO : null,
      nextDueDate: becomesCompleted ? null : row.homework.nextDueDate,
    });
    toast.success(
      becomesCompleted
        ? `"${row.homework.title}" marked complete.`
        : `"${row.homework.title}" reopened.`,
    );
  }

  function confirmDelete() {
    if (!deleting) return;
    fanOutHomeworkDelete(queryClient, deleting.id);
    toast.success(`"${deleting.homework.title}" deleted.`);
    setDeleting(null);
  }

  const columns: ColumnDef<HomeworkBoardRow>[] = [
    {
      key: "pet",
      label: "Dog",
      icon: PawPrint,
      sortable: true,
      sortValue: (row) => row.petName.toLowerCase(),
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.petImageUrl ? (
            <div className="size-9 overflow-hidden rounded-xl ring-2 ring-white shadow-sm">
              <Image
                src={row.petImageUrl}
                alt={row.petName}
                width={36}
                height={36}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl ring-2 ring-white shadow-sm">
              <PawPrint className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {row.petName}
            </p>
            <p className="text-muted-foreground truncate text-[11px]">
              {row.ownerName}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "title",
      label: "Homework",
      icon: BookOpen,
      sortable: true,
      sortValue: (row) => row.homework.title.toLowerCase(),
      render: (row) => (
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-sm font-medium text-slate-800",
              row.homework.completed && "line-through decoration-slate-300",
            )}
          >
            {row.homework.title}
          </p>
          <p className="text-muted-foreground truncate text-[11px]">
            {row.seriesName} · Session {row.homework.sessionNumber}
          </p>
        </div>
      ),
    },
    {
      key: "frequency",
      label: "Frequency",
      icon: Clock,
      render: (row) =>
        row.homework.frequency ? (
          <Badge
            variant="outline"
            className="gap-1 border-violet-200 bg-violet-50 text-violet-700"
          >
            <Clock className="size-3" />
            {row.homework.frequency}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "assigned",
      label: "Assigned",
      sortable: true,
      sortValue: (row) =>
        row.homework.unlockedDate ?? row.homework.sessionDate,
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>{formatDate(row.homework.unlockedDate ?? row.homework.sessionDate)}</p>
          <p className="text-muted-foreground text-[10px]">
            {relativeLabel(
              row.homework.unlockedDate ?? row.homework.sessionDate,
              todayISO,
            )}
          </p>
        </div>
      ),
    },
    {
      key: "nextDue",
      label: "Next due",
      icon: CalendarClock,
      sortable: true,
      sortValue: (row) => row.homework.nextDueDate ?? "9999",
      render: (row) => {
        if (!row.homework.nextDueDate) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const status = row.status;
        const meta = STATUS_META[status];
        const Icon = meta.icon;
        return (
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium text-slate-700 tabular-nums">
              {formatDate(row.homework.nextDueDate)}
            </span>
            <Badge variant="outline" className={cn("gap-1 border", meta.cls)}>
              <Icon className="size-3" />
              {status === "active" || status === "completed"
                ? meta.label
                : relativeLabel(row.homework.nextDueDate, todayISO)}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "practice",
      label: "Practice",
      icon: Flame,
      sortable: true,
      sortValue: (row) => {
        // Owners practicing today rank highest; then by streak length; then by
        // most-recent practice date; never-practiced ranks last.
        if (hasPracticedToday(row.homework, todayISO)) return -10000;
        const streak = getPracticeStreakDays(row.homework, todayISO);
        if (streak > 0) return -1000 - streak;
        const last = getLastPracticedDate(row.homework);
        if (!last) return 9999;
        return -new Date(`${last}T00:00:00Z`).getTime();
      },
      render: (row) => {
        if (row.homework.completed) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const practicedToday = hasPracticedToday(row.homework, todayISO);
        const streak = getPracticeStreakDays(row.homework, todayISO);
        const last = getLastPracticedDate(row.homework);
        if (practicedToday) {
          return (
            <div className="flex flex-col items-start gap-0.5">
              <Badge
                variant="outline"
                className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                <CheckCircle2 className="size-3" />
                Practiced today
              </Badge>
              {streak >= 2 && (
                <span className="text-orange-600 inline-flex items-center gap-1 text-[10px] font-medium">
                  <Flame className="size-3" />
                  {streak}-day streak
                </span>
              )}
            </div>
          );
        }
        if (streak >= 2) {
          return (
            <Badge
              variant="outline"
              className="gap-1 border-orange-200 bg-orange-50 text-orange-700"
              title={`Last practiced ${last ? formatDate(last) : "—"}`}
            >
              <Flame className="size-3" />
              {streak}-day streak
            </Badge>
          );
        }
        if (!last) {
          return (
            <Badge
              variant="outline"
              className="gap-1 border-slate-200 bg-slate-50 text-slate-500 italic"
              title="Owner hasn't logged any practice yet"
            >
              <TrendingDown className="size-3" />
              Not started
            </Badge>
          );
        }
        const daysAgo = Math.max(
          0,
          Math.round(
            (new Date(`${todayISO}T00:00:00Z`).getTime() -
              new Date(`${last}T00:00:00Z`).getTime()) /
              86_400_000,
          ),
        );
        const stale = daysAgo >= 7;
        return (
          <Badge
            variant="outline"
            className={cn(
              "gap-1",
              stale
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-600",
            )}
            title={`Last practiced ${formatDate(last)}`}
          >
            {stale ? (
              <TrendingDown className="size-3" />
            ) : (
              <Clock className="size-3" />
            )}
            {daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
          </Badge>
        );
      },
    },
    {
      key: "instructor",
      label: "Instructor",
      icon: UserRound,
      render: (row) =>
        row.instructorName ? (
          <span className="text-sm text-slate-700">{row.instructorName}</span>
        ) : (
          <span className="text-muted-foreground text-xs italic">
            Unassigned
          </span>
        ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All statuses" },
        { value: "overdue", label: "Overdue" },
        { value: "due-soon", label: `Due in ${DUE_SOON_WINDOW_DAYS}d` },
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
      ],
      filterFn: (row: HomeworkBoardRow, v: string) => row.status === v,
    },
    {
      key: "instructor",
      label: "Instructor",
      options: [
        { value: "all", label: "All instructors" },
        ...instructorFilterOptions,
      ],
      filterFn: (row: HomeworkBoardRow, v: string) => row.instructorId === v,
    },
    {
      key: "frequency",
      label: "Frequency",
      options: [
        { value: "all", label: "All cadences" },
        ...frequencyFilterOptions,
      ],
      filterFn: (row: HomeworkBoardRow, v: string) =>
        (row.homework.frequency ?? "") === v,
    },
    {
      key: "practice",
      label: "Practice",
      options: [
        { value: "all", label: "Any practice" },
        { value: "today", label: "Practiced today" },
        { value: "streak", label: "On streak (2d+)" },
        { value: "stale", label: "Not practicing (7d+)" },
        { value: "never", label: "Not started" },
      ],
      filterFn: (row: HomeworkBoardRow, v: string) => {
        if (row.homework.completed) return false;
        const practicedToday = hasPracticedToday(row.homework, todayISO);
        const streak = getPracticeStreakDays(row.homework, todayISO);
        const last = getLastPracticedDate(row.homework);
        if (v === "today") return practicedToday;
        if (v === "streak") return streak >= 2;
        if (v === "never") return !last;
        if (v === "stale") {
          if (!last) return true;
          const daysAgo = Math.round(
            (new Date(`${todayISO}T00:00:00Z`).getTime() -
              new Date(`${last}T00:00:00Z`).getTime()) /
              86_400_000,
          );
          return daysAgo >= 7;
        }
        return true;
      },
    },
  ];

  const renderActions = (row: HomeworkBoardRow) => (
    <div className="flex items-center gap-1">
      {!row.homework.completed && row.homework.nextDueDate && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            markPracticed(row);
          }}
          title="Owner practiced — push next due date forward"
        >
          <Clock className="size-3" />
          Practiced
        </Button>
      )}
      {row.homework.completed ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete(row);
          }}
        >
          <RotateCcw className="size-3" />
          Reopen
        </Button>
      ) : (
        <Button
          size="sm"
          className="h-7 gap-1 bg-emerald-600 text-[11px] text-white hover:bg-emerald-700"
          onClick={(e) => {
            e.stopPropagation();
            toggleComplete(row);
          }}
        >
          <CheckCircle2 className="size-3" />
          Complete
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={(e) => {
          e.stopPropagation();
          openEdit(row.homework);
        }}
        title="Edit homework"
      >
        <Edit className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive size-7"
        onClick={(e) => {
          e.stopPropagation();
          setDeleting(row);
        }}
        title="Delete homework"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Active"
          value={summary.active}
          icon={BookOpen}
          tone="indigo"
          hint={
            summary.active > 0
              ? `${summary.practicingToday} practiced today`
              : undefined
          }
        />
        <KpiTile
          label="Due this week"
          value={summary.dueThisWeek}
          icon={CalendarClock}
          tone={summary.dueThisWeek > 0 ? "amber" : "slate"}
          hint={`within ${DUE_SOON_WINDOW_DAYS} days`}
        />
        <KpiTile
          label="Overdue"
          value={summary.overdue}
          icon={AlarmClock}
          tone={summary.overdue > 0 ? "rose" : "slate"}
        />
        <KpiTile
          label="Completed (7d)"
          value={summary.completedThisWeek}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50/40 px-4 py-3 text-sm">
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[12px]">
          <Sparkles className="size-3.5" />
          Standalone homework — assign or update without opening a completed
          session.
        </p>
        <Button onClick={openAdd} size="sm">
          <Plus className="mr-1.5 size-4" />
          Add homework
        </Button>
      </div>

      <DataTable
        data={sortedRows}
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by dog, owner, or exercise…"
        getSearchValue={(row) =>
          [row.petName, row.ownerName, row.homework.title].join(" ")
        }
        itemsPerPage={15}
        actions={renderActions}
        onRowClick={(row) =>
          router.push(
            `/facility/dashboard/services/training/students/${row.petId}?tab=homework`,
          )
        }
        rowClassName={() => "cursor-pointer"}
      />

      {sortedRows.length === 0 && (
        <div className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
          <Inbox className="text-muted-foreground/30 mx-auto mb-2 size-8" />
          No homework on file yet — assign one from here or from a session
          completion to populate this view.
        </div>
      )}

      <div className="text-muted-foreground rounded-xl border bg-slate-50/40 px-4 py-3 text-xs">
        <span className="inline-flex items-center gap-1">
          <ChevronRight className="size-3" />
          Click any row to jump to that dog&apos;s Training Profile Homework
          tab.
        </span>
      </div>

      <HomeworkEditDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
        todayISO={todayISO}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{deleting?.homework.title}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the homework from {deleting?.petName}&apos;s
              record. Any progress on it won&apos;t be recoverable.
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
