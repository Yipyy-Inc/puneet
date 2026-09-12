"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  Leaf,
  Loader2,
  Play,
  Star,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { useAppLocale } from "@/hooks/use-app-locale";
import { formatTime } from "@/lib/i18n/format";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  useModuleDayTasks,
  type DayTask,
  type DayTaskStatus,
} from "@/lib/tasks/use-module-day-tasks";
import type { TaskTemplate } from "@/types/task";

// ============================================================================
// Today's tasks for one module — the day's bookings, planned from the
// routine, and ticked into `facility_tasks`. See use-module-day-tasks.ts for
// what this replaced: a list invented from the templates, every task assigned
// to "Alex R.", its status decided by its position.
//
// One-off tasks are not added here any more. They went into a useState and
// were gone on reload; the facility's task board is where a task that is not
// part of a booking's routine lives, and this links to it.
// ============================================================================

type TaskCategory = TaskTemplate["category"];

const CATEGORY: Record<
  TaskCategory,
  { key: string; icon: typeof Wrench; color: string }
> = {
  setup: { key: "catSetup", icon: Wrench, color: "text-blue-500" },
  execution: { key: "catExecution", icon: Play, color: "text-primary" },
  cleanup: { key: "catCleanup", icon: Trash2, color: "text-orange-500" },
  care: { key: "catCare", icon: Leaf, color: "text-green-500" },
  transport: { key: "catTransport", icon: Truck, color: "text-purple-500" },
  custom: { key: "catCustom", icon: Star, color: "text-yellow-500" },
};

const STATUS_CFG: Record<
  DayTaskStatus,
  {
    key: string;
    variant: "secondary" | "default" | "outline" | "destructive";
    icon: typeof Clock;
  }
> = {
  pending: { key: "statusPending", variant: "secondary", icon: Clock },
  in_progress: { key: "statusInProgress", variant: "default", icon: Play },
  completed: { key: "statusCompleted", variant: "outline", icon: CheckCircle2 },
  missed: { key: "statusMissed", variant: "destructive", icon: AlertTriangle },
};

export function ModuleTodayTasks({
  moduleId,
  templates,
}: {
  moduleId: string;
  templates: TaskTemplate[];
}) {
  const locale = useAppLocale();
  const { t, fill } = useStaffText("moduleTasks");
  const { tasks, pending, moveTo } = useModuleDayTasks(moduleId, templates);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bookingFilter, setBookingFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const count = (status: DayTaskStatus) =>
    tasks.filter((t) => t.dayStatus === status).length;

  const bookingOptions = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.bookingLabel))).sort(),
    [tasks],
  );
  const filtered = tasks.filter(
    (t) =>
      (statusFilter === "all" || t.dayStatus === statusFilter) &&
      (bookingFilter === "all" || t.bookingLabel === bookingFilter),
  );
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (bookingFilter !== "all" ? 1 : 0);

  async function move(task: DayTask, status: "in_progress" | "completed") {
    setBusyId(task.id);
    try {
      await moveTo(task, status);
      toast.success(
        fill(status === "completed" ? "taskDone" : "taskStarted", {
          task: task.title,
        }),
      );
    } catch (error) {
      toast.error(t("notUpdated"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label={t("statusCompleted")}
          value={count("completed")}
          hint={t("tileDoneToday")}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiTile
          label={t("statusInProgress")}
          value={count("in_progress")}
          hint={t("tileActive")}
          icon={Play}
          tone="indigo"
        />
        <KpiTile
          label={t("statusPending")}
          value={count("pending")}
          hint={t("tileNotStarted")}
          icon={Clock}
          tone="amber"
        />
        <KpiTile
          label={t("statusMissed")}
          value={count("missed")}
          hint={count("missed") > 0 ? t("tilePastTime") : t("tileOnTrack")}
          icon={AlertTriangle}
          tone="rose"
        />
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <ClipboardList className="size-5" />
              {t("title")}
            </CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link href="/facility/dashboard/tasks">{t("openBoard")}</Link>
            </Button>
          </div>

          <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
            <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Filter className="size-3.5" />
              {t("filter")}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="min-w-[140px] text-xs">
                <SelectValue placeholder={t("statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allStatuses")}</SelectItem>
                {(Object.keys(STATUS_CFG) as DayTaskStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(STATUS_CFG[s].key)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={bookingFilter}
              onValueChange={setBookingFilter}
              disabled={bookingOptions.length === 0}
            >
              <SelectTrigger className="min-w-[180px] text-xs">
                <SelectValue placeholder={t("bookingPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allBookings")}</SelectItem>
                {bookingOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setBookingFilter("all");
                }}
                className="text-muted-foreground hover:text-foreground min-h-10 text-xs font-medium"
              >
                {fill("clear", { n: activeFilterCount })}
              </button>
            )}
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {fill("countOf", { shown: filtered.length, total: tasks.length })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {pending ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <ClipboardList className="text-muted-foreground size-8" />
              <p className="text-muted-foreground max-w-md text-sm">
                {t("emptyDay")}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Filter className="text-muted-foreground size-8" />
              <p className="text-muted-foreground text-sm">{t("noMatch")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((task) => {
                const meta =
                  CATEGORY[task.category as TaskCategory] ?? CATEGORY.custom;
                const Icon = meta.icon;
                const status = STATUS_CFG[task.dayStatus];
                const StatusIcon = status.icon;
                const busy = busyId === task.id;
                return (
                  <div
                    key={`${task.bookingId}:${task.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`bg-muted flex size-9 shrink-0 items-center justify-center rounded-full ${meta.color}`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          {task.isRequired && (
                            <AlertCircle
                              className="text-destructive size-3.5"
                              aria-label={t("required")}
                            />
                          )}
                        </div>
                        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                          <span>{t(meta.key)}</span>
                          <span>·</span>
                          <span className="tabular-nums">
                            {formatTime(task.scheduledAt, locale)}
                          </span>
                          <span>·</span>
                          <Link
                            href={`/facility/dashboard/bookings/${task.bookingId}`}
                            className="hover:text-foreground truncate underline-offset-2 hover:underline"
                          >
                            {task.bookingLabel}
                          </Link>
                          {task.completedBy && (
                            <>
                              <span>·</span>
                              <span>{task.completedBy}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="size-3" />
                        {t(status.key)}
                      </Badge>
                      {task.dayStatus !== "completed" &&
                        task.dayStatus !== "in_progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => move(task, "in_progress")}
                          >
                            <Play className="mr-1.5 size-3.5" />
                            {t("start")}
                          </Button>
                        )}
                      {task.dayStatus !== "completed" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => move(task, "completed")}
                        >
                          {busy ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 size-3.5" />
                          )}
                          {t("done")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
