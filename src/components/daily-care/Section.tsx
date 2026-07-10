"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Printer,
} from "lucide-react";
import { metaFor } from "./task-type-meta";
import { format12h } from "@/lib/care-log-scheduler";
import { defaultOutcomeFor } from "./outcome-meta";
import { PetRow } from "./PetRow";
import type { DailyCareStep } from "@/types/boarding";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";

type Props = {
  step: DailyCareStep;
  tasks: ScheduledTask[];
  executions: TaskExecution[];
  /** The day being viewed — threaded to PetRow for date-keyed flags. */
  date: string;
  /** Minutes past scheduledTime after which an unlogged task is overdue. */
  overdueAfterMinutes: number;
  /** Wall-clock minutes elapsed past midnight today. Passed in so the
   *  parent controls "now" for testability. */
  nowMinutes: number;
  onLog: (task: ScheduledTask, existing?: TaskExecution) => void;
  /** One-tap quick log of a routine task's default outcome. */
  onQuickLog?: (task: ScheduledTask, outcome: string) => void;
  /** Controlled expand state, lifted into DailyCareView (the collapse map /
   *  "expand all"). undefined = use the default of collapsing a completed block. */
  expanded?: boolean;
  /** Per-card toggle — writes back to the lifted collapse map. */
  onToggle?: (stepId: string, next: boolean) => void;
  /** Batch-log the default outcome for every not-yet-logged pet in this block. */
  onLogAll?: (step: DailyCareStep) => void;
  /** Last Call (F1): whether the head count has been completed for this step. */
  headCountDone?: boolean;
  /** Opens the full-screen head-count overlay for a requiresHeadCount step. */
  onStartHeadCount?: (step: DailyCareStep) => void;
  /** Print only this task's pet list (single-step print sheet). */
  onPrintStep?: (step: DailyCareStep) => void;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

// F1 assignment → a short label for the card header: the person's name, the
// role, or "All Staff" when unassigned/undefined.
function assignedLabel(assigned: DailyCareStep["assignedStaff"]): string {
  if (!assigned || assigned.kind === "unassigned") return "All Staff";
  if (assigned.kind === "person") return assigned.staffName;
  return assigned.role; // kind === "role"
}

export function Section({
  step,
  tasks,
  executions,
  date,
  overdueAfterMinutes,
  nowMinutes,
  onLog,
  onQuickLog,
  expanded,
  onToggle,
  onLogAll,
  headCountDone,
  onStartHeadCount,
  onPrintStep,
}: Props) {
  const meta = metaFor(
    step.taskType === "potty"
      ? "potty"
      : step.taskType === "feeding"
        ? "feeding"
        : step.taskType === "medication"
          ? "medication"
          : step.taskType === "addon"
            ? "addon"
            : "care",
    step.taskType === "water_refill" ||
      step.taskType === "kennel_clean" ||
      step.taskType === "bedding_change"
      ? step.taskType
      : undefined,
  );
  const Icon = meta.Icon;

  const total = tasks.length;
  const done = tasks.filter((t) =>
    executions.some((e) => e.taskId === t.id),
  ).length;
  const remaining = total - done;

  // Last Call (F1): a requiresHeadCount step is complete when its head count has
  // been recorded — not by per-pet logging. The rollcall is the completion gate.
  const requiresHeadCount = step.requiresHeadCount === true;
  const isComplete =
    (requiresHeadCount && Boolean(headCountDone)) ||
    (total > 0 && done === total);

  const stepMinutes = timeToMinutes(step.time);
  const isOverdue =
    !isComplete &&
    remaining > 0 &&
    nowMinutes > stepMinutes + overdueAfterMinutes;
  const isCurrent =
    !isComplete &&
    remaining > 0 &&
    nowMinutes >= stepMinutes &&
    nowMinutes <= stepMinutes + overdueAfterMinutes;

  // Controlled collapse: `expanded` is lifted into DailyCareView (the collapse
  // map / "expand all"). undefined falls back to the default of collapsing a
  // completed block. Active/overdue/in-progress blocks always render expanded.
  const isExpanded = expanded ?? false;

  // Batch "Log All" (A3.5): only Water Refill and Kennel Cleaning may batch-log
  // — they carry no per-pet outcome. Every other type (potty, feeding,
  // medication, add-ons, bedding change, custom) shows the control disabled
  // with a tooltip, since each pet needs its own outcome logged.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const batchAllowed =
    step.taskType === "water_refill" || step.taskType === "kennel_clean";
  const defaultOutcome = tasks[0]
    ? defaultOutcomeFor(tasks[0].taskType)
    : undefined;

  if (isComplete && !isExpanded) {
    return (
      <Card
        id={`step-${step.id}`}
        data-complete="true"
        className="scroll-mt-4 gap-0 overflow-hidden border-green-300 bg-green-50 py-0 dark:border-green-900/50 dark:bg-green-950/20"
      >
        <button
          type="button"
          onClick={() => onToggle?.(step.id, true)}
          className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-green-100 dark:hover:bg-green-950/40"
          aria-label={`${step.name} complete — ${done} of ${total}. Tap to expand.`}
        >
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
          >
            <Icon className={`size-5 ${meta.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{step.name}</p>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <Clock className="size-3" />
              {format12h(step.time)}
              <span className="truncate">
                · Assigned to: {assignedLabel(step.assignedStaff)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 font-semibold text-green-700 dark:text-green-400">
            <span className="font-[tabular-nums] text-sm">
              {requiresHeadCount && headCountDone
                ? "Counted"
                : `${done}/${total}`}
            </span>
            <CheckCircle2 className="size-5" />
          </div>
        </button>
      </Card>
    );
  }

  // No pets need this task today — collapse to a single compact line rather
  // than a full card with an empty body.
  if (total === 0) {
    return (
      <Card id={`step-${step.id}`} className="scroll-mt-4 gap-0 py-0">
        <div className="flex items-center gap-3 px-6 py-3">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
          >
            <Icon className={`size-5 ${meta.color}`} />
          </div>
          <div className="min-w-0 flex-1 truncate text-sm">
            <span className="font-semibold">{step.name}</span>
            <span className="text-muted-foreground"> · No pets today</span>
          </div>
          <CheckCircle2 className="text-muted-foreground size-4 shrink-0" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      id={`step-${step.id}`}
      data-overdue={isOverdue}
      data-current={isCurrent}
      data-complete={isComplete}
      className="scroll-mt-4 data-[complete=true]:opacity-75 data-[current=true]:border-amber-300 data-[overdue=true]:border-red-300"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
          >
            <Icon className={`size-5 ${meta.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base">
              {step.name}
              {isOverdue && (
                <Badge
                  variant="outline"
                  className="border-red-300 bg-red-50 text-red-700"
                >
                  <AlertCircle className="mr-1 size-3" />
                  Overdue
                </Badge>
              )}
              {isCurrent && (
                <Badge
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-700"
                >
                  In progress
                </Badge>
              )}
            </CardTitle>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <Clock className="size-3" />
              {format12h(step.time)}
              <span className="truncate">
                · Assigned to: {assignedLabel(step.assignedStaff)}
              </span>
              {step.description && (
                <span className="hidden truncate sm:inline">
                  · {step.description}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {onPrintStep && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-7"
                onClick={() => onPrintStep(step)}
                title="Print this task"
                aria-label={`Print ${step.name}`}
              >
                <Printer className="size-3.5" />
              </Button>
            )}
            {remaining > 0 &&
              (batchAllowed ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setConfirmOpen(true)}
                >
                  Mark all as done
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled
                      >
                        Mark all as done
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-56 text-xs">
                    This task needs an outcome logged per pet.
                  </TooltipContent>
                </Tooltip>
              ))}
            <div className="text-right">
              <div className="font-[tabular-nums] text-sm font-semibold">
                {done} / {total}
              </div>
              <div className="text-muted-foreground text-[10px] tracking-wider uppercase">
                done
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {requiresHeadCount && !headCountDone && (
          <div className="mb-3 space-y-1">
            <button
              type="button"
              onClick={() => onStartHeadCount?.(step)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold tracking-wide text-white uppercase shadow-sm transition-colors hover:bg-emerald-700"
            >
              <ClipboardCheck className="size-5" />
              Start Head Count
            </button>
            <p className="text-muted-foreground text-center text-[11px]">
              Last Call — account for every dog before this step can be
              completed.
            </p>
          </div>
        )}
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const execution = executions.find((e) => e.taskId === task.id);
            return (
              <PetRow
                key={task.id}
                task={task}
                execution={execution}
                date={date}
                onLog={() => onLog(task, execution)}
                onQuickLog={(outcome) => onQuickLog?.(task, outcome)}
              />
            );
          })}
        </div>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark all as done?</AlertDialogTitle>
            <AlertDialogDescription>
              Log {step.name} as {defaultOutcome?.label} for all {remaining}{" "}
              {remaining === 1 ? "pet" : "pets"}? This cannot be individually
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onLogAll?.(step)}>
              Mark all done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
