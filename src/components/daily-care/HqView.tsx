"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2, Flag, BellRing } from "lucide-react";
import { toast } from "sonner";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { petFlagsStore } from "@/data/pet-flags-store";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";
import type { DailyCareStep } from "@/types/boarding";
import type { BoardingGuest } from "@/data/boarding";
import type { StaffMember } from "@/types/staff";

type Props = {
  date: string;
  guests: BoardingGuest[];
  staffList: StaffMember[];
  sortedSteps: DailyCareStep[];
  tasksByStep: Map<string, ScheduledTask[]>;
  executions: TaskExecution[];
  headCountDoneStepIds: ReadonlySet<string>;
  overdueAfterMinutes: number;
  /** Wall-clock minutes past midnight — the parent owns "now" for testability. */
  nowMinutes: number;
};

const RECENT_FLAG_WINDOW_MS = 30 * 60 * 1000;

function assignedLabel(a: DailyCareStep["assignedStaff"]): string {
  if (!a || a.kind === "unassigned") return "All Staff";
  if (a.kind === "person") return a.staffName;
  return a.role;
}

function stepMeta(step: DailyCareStep) {
  const key =
    step.taskType === "potty"
      ? "potty"
      : step.taskType === "feeding"
        ? "feeding"
        : step.taskType === "medication"
          ? "medication"
          : step.taskType === "addon"
            ? "addon"
            : "care";
  const sub =
    step.taskType === "water_refill" ||
    step.taskType === "kennel_clean" ||
    step.taskType === "bedding_change"
      ? step.taskType
      : undefined;
  return metaFor(key, sub);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * HQ monitoring mode (manager view). Condenses every task block with its
 * assigned staff, a live per-staff progress bar, overdue highlighting, recent
 * pet flags, and a "Send nudge to staff" reminder — all derived from block
 * completion + assignedStaff and the shared stores already in place.
 */
export function HqView({
  date,
  guests,
  staffList,
  sortedSteps,
  tasksByStep,
  executions,
  headCountDoneStepIds,
  overdueAfterMinutes,
  nowMinutes,
}: Props) {
  const model = useMemo(() => {
    const isLogged = (t: ScheduledTask) =>
      executions.some((e) => e.taskId === t.id);

    const blocks = sortedSteps.map((step) => {
      const tasks = tasksByStep.get(step.id) ?? [];
      const total = tasks.length;
      const done = tasks.filter(isLogged).length;
      const complete =
        headCountDoneStepIds.has(step.id) || (total > 0 && done === total);
      const hasUnlogged = tasks.some((t) => !isLogged(t));
      const overdue =
        !complete &&
        hasUnlogged &&
        nowMinutes > timeToMinutes(step.time) + overdueAfterMinutes;
      return { step, total, done, complete, overdue };
    });

    // Per-staff progress from the blocks assigned to them (person or role).
    const assignedTo = (step: DailyCareStep, s: StaffMember) => {
      const a = step.assignedStaff;
      if (!a || a.kind === "unassigned") return false;
      if (a.kind === "person") return a.staffId === s.id;
      return a.role === s.role;
    };
    const perStaff = staffList
      .map((s) => {
        const assigned = blocks.filter((b) => assignedTo(b.step, s));
        return {
          staff: s,
          done: assigned.filter((b) => b.complete).length,
          total: assigned.length,
          overdue: assigned.filter((b) => b.overdue).length,
        };
      })
      .filter((row) => row.total > 0);

    const unassignedBlocks = blocks.filter((b) => {
      const a = b.step.assignedStaff;
      return !a || a.kind === "unassigned";
    });
    const unassigned = {
      done: unassignedBlocks.filter((b) => b.complete).length,
      total: unassignedBlocks.length,
      overdue: unassignedBlocks.filter((b) => b.overdue).length,
    };

    const overdueBlocks = blocks.filter((b) => b.overdue);

    // Pet flags raised in the last 30 minutes.
    const nowMs = new Date().getTime();
    const recentFlags = guests.flatMap((g) => {
      const f = petFlagsStore.getSnapshot(date, g.id);
      if (!f) return [];
      const ts = Date.parse(f.createdAt);
      if (
        Number.isNaN(ts) ||
        ts > nowMs ||
        nowMs - ts > RECENT_FLAG_WINDOW_MS
      ) {
        return [];
      }
      return [{ petName: g.petName, reason: f.reason, createdBy: f.createdBy }];
    });

    return { blocks, perStaff, unassigned, overdueBlocks, recentFlags };
  }, [
    date,
    guests,
    staffList,
    sortedSteps,
    tasksByStep,
    executions,
    headCountDoneStepIds,
    overdueAfterMinutes,
    nowMinutes,
  ]);

  function handleNudge() {
    if (model.overdueBlocks.length === 0) {
      toast.info("No overdue blocks — nothing to nudge.");
      return;
    }
    const names = [
      ...new Set(
        model.overdueBlocks.map((b) => assignedLabel(b.step.assignedStaff)),
      ),
    ];
    // TODO: replace with a real push / SMS reminder to the assigned staff.
    toast.warning(
      `Nudge sent to ${names.join(", ")} — ${model.overdueBlocks.length} overdue ${
        model.overdueBlocks.length === 1 ? "block" : "blocks"
      } need attention.`,
      { duration: 8000 },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Manager monitoring — live block completion by staff.
        </p>
        <Button
          size="sm"
          onClick={handleNudge}
          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <BellRing className="size-4" />
          Send nudge to staff
        </Button>
      </div>

      {/* Per-staff progress bars */}
      <div className="grid gap-2 sm:grid-cols-2">
        {model.perStaff.map(({ staff, done, total, overdue }) => (
          <StaffProgress
            key={staff.id}
            name={staff.name}
            done={done}
            total={total}
            overdue={overdue}
          />
        ))}
        {model.unassigned.total > 0 && (
          <StaffProgress
            name="Unassigned"
            done={model.unassigned.done}
            total={model.unassigned.total}
            overdue={model.unassigned.overdue}
          />
        )}
      </div>

      {/* Overdue blocks */}
      {model.overdueBlocks.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-300">
            <AlertCircle className="size-4" />
            {model.overdueBlocks.length} overdue{" "}
            {model.overdueBlocks.length === 1 ? "block" : "blocks"}
          </p>
          <ul className="space-y-1 text-sm">
            {model.overdueBlocks.map((b) => (
              <li key={b.step.id} className="flex items-center gap-2">
                <span className="font-medium">{b.step.name}</span>
                <span className="text-muted-foreground">
                  {format12h(b.step.time)} ·{" "}
                  {assignedLabel(b.step.assignedStaff)}
                </span>
                <Badge
                  variant="outline"
                  className="border-red-300 bg-red-100 text-red-700"
                >
                  {b.done}/{b.total}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent pet flags (last 30 min) */}
      <div className="rounded-lg border p-3">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <Flag className="size-4 text-red-500" />
          Flags raised (last 30 min)
          <Badge variant="secondary" className="text-[10px]">
            {model.recentFlags.length}
          </Badge>
        </p>
        {model.recentFlags.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No flags raised in the last 30 minutes.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {model.recentFlags.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Flag className="mt-0.5 size-3.5 shrink-0 fill-red-500 text-red-500" />
                <span>
                  <span className="font-medium">{f.petName}</span>
                  {f.reason ? ` — ${f.reason}` : ""}{" "}
                  <span className="text-muted-foreground">
                    by {f.createdBy}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Condensed all-blocks view */}
      <div className="overflow-hidden rounded-lg border">
        {model.blocks.map((b) => {
          const meta = stepMeta(b.step);
          const Icon = meta.Icon;
          return (
            <div
              key={b.step.id}
              data-overdue={b.overdue}
              data-complete={b.complete}
              className="flex items-center gap-3 border-b px-3 py-2 last:border-b-0 data-[complete=true]:bg-green-50/40 data-[overdue=true]:bg-red-50 dark:data-[complete=true]:bg-green-950/10 dark:data-[overdue=true]:bg-red-950/20"
            >
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-md ${meta.bg}`}
              >
                <Icon className={`size-4 ${meta.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.step.name}</p>
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="size-3" />
                  {format12h(b.step.time)} ·{" "}
                  {assignedLabel(b.step.assignedStaff)}
                </p>
              </div>
              {b.overdue ? (
                <Badge
                  variant="outline"
                  className="gap-1 border-red-300 bg-red-50 text-red-700"
                >
                  <AlertCircle className="size-3" />
                  Overdue
                </Badge>
              ) : b.complete ? (
                <CheckCircle2 className="size-4 shrink-0 text-green-600" />
              ) : null}
              <span className="text-muted-foreground w-10 shrink-0 text-right text-sm tabular-nums">
                {b.done}/{b.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StaffProgress({
  name,
  done,
  total,
  overdue,
}: {
  name: string;
  done: number;
  total: number;
  overdue: number;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-medium">{name}</span>
        <span className="text-muted-foreground shrink-0 tabular-nums">
          {done}/{total}
          {overdue > 0 && (
            <span className="ml-1.5 text-red-600 dark:text-red-400">
              · {overdue} overdue
            </span>
          )}
        </span>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          data-complete={complete}
          data-overdue={overdue > 0}
          className="bg-primary h-full rounded-full transition-all data-[complete=true]:bg-green-500 data-[overdue=true]:bg-red-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
