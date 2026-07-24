"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ListChecks,
  CalendarClock,
  ClipboardList,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import {
  getOpenTasksForStaff,
  type StaffTaskSource,
  type StaffTaskPriority,
} from "@/lib/staff-tasks";

const SOURCE_META: Record<
  StaffTaskSource,
  { label: string; icon: React.ElementType; tone: string; border: string }
> = {
  shift: {
    label: "Shift task",
    icon: CalendarClock,
    tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-l-blue-400",
  },
  standalone: {
    label: "Assigned task",
    icon: ClipboardList,
    tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-l-emerald-400",
  },
  incident: {
    label: "Incident follow-up",
    icon: AlertTriangle,
    tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    border: "border-l-rose-400",
  },
};

const PRIORITY_TONE: Record<StaffTaskPriority, string> = {
  urgent: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  high: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  medium: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  low: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
};

function formatDue(due?: string) {
  if (!due) return null;
  const d = new Date(due.length <= 10 ? `${due}T00:00:00` : due);
  if (Number.isNaN(d.getTime())) return due;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Read-only "Tasks" section at the bottom of an active employee's profile —
 * every open task assigned to them across shift tasks, standalone/assigned
 * tasks, and incident follow-ups, so the manager has context in one place.
 */
export function StaffTasksSection({ staff }: { staff: StaffProfile }) {
  const tasks = useMemo(() => getOpenTasksForStaff(staff), [staff]);

  return (
    <section className="bg-card rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="text-primary size-4" />
          <h2 className="text-sm font-semibold tracking-tight">Tasks</h2>
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {tasks.length} open
          </span>
        </div>
        <Link
          href="/facility/dashboard/tasks"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
        >
          Task board <ExternalLink className="size-3" />
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="border-border/60 text-muted-foreground rounded-xl border border-dashed py-8 text-center text-sm">
          No open tasks assigned to {staff.firstName}.
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => {
            const meta = SOURCE_META[task.source];
            const Icon = meta.icon;
            const due = formatDue(task.dueDate);
            return (
              <li
                key={task.id}
                className={cn(
                  "border-border/50 flex items-start gap-3 rounded-xl border border-l-4 p-3",
                  meta.border,
                )}
              >
                <div className={cn("mt-0.5 rounded-md p-1.5", meta.tone)}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{task.title}</span>
                    {task.priority && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          PRIORITY_TONE[task.priority],
                        )}
                      >
                        {task.priority}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {task.description}
                    </p>
                  )}
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                    <span className={cn("rounded-sm px-1.5 py-0.5", meta.tone)}>
                      {meta.label}
                    </span>
                    {task.context && <span>{task.context}</span>}
                    {due && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> Due {due}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
