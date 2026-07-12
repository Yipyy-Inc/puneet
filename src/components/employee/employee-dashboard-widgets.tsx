"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  CheckSquare,
  Bell,
  ChevronDown,
  ArrowRight,
  GraduationCap,
  CircleCheck,
  PawPrint,
  ClipboardList,
  Zap,
  Clock,
  Hourglass,
} from "lucide-react";
import type { StaffProfile, FacilityStaffRole } from "@/types/facility-staff";
import {
  useOnboarding,
  setOnboardingTaskComplete,
  ONBOARDING_TYPE_LABEL,
  type OnboardingTask,
} from "@/data/staff-onboarding";

// A staff member counts as onboarded once they've finished account setup.
// TODO: back with the real staff-onboarding store (Area F) when it lands.
export function isOnboarded(staff: StaffProfile): boolean {
  return staff.status !== "invited";
}

export function timeOfDayGreeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Role-contextual primary action (spec Table 17 — Quick Actions).
export const ROLE_PRIMARY_ACTION: Record<
  FacilityStaffRole,
  { label: string; href: string }
> = {
  owner: { label: "View today's bookings", href: "/employee/bookings" },
  admin: { label: "View today's bookings", href: "/employee/bookings" },
  manager: { label: "View today's bookings", href: "/employee/bookings" },
  supervisor: { label: "View today's bookings", href: "/employee/bookings" },
  reception: { label: "Check in next arrival", href: "/employee/bookings" },
  groomer: { label: "Start next appointment", href: "/employee/grooming" },
  trainer: { label: "Start training session", href: "/employee/training" },
  caretaker: { label: "Log morning rounds", href: "/employee/daycare" },
  daycare_attendant: { label: "Log daycare round", href: "/employee/daycare" },
  boarding_attendant: { label: "Log kennel round", href: "/employee/boarding" },
  retail: { label: "Open point of sale", href: "/employee/retail" },
  accountant: { label: "View bookings", href: "/employee/bookings" },
  sanitation: { label: "Log cleaning task", href: "/employee/tasks" },
};

// ============================================================================
// Today's Summary — greeting + the day's at-a-glance chips
// ============================================================================

export function TodaySummary({
  staff,
  greeting,
}: {
  staff: StaffProfile;
  greeting: string;
}) {
  const chips = [
    {
      icon: Calendar,
      label: "appointments today",
      value: staff.upcomingAppointments,
    },
    { icon: CheckSquare, label: "tasks due", value: staff.openTasks },
    {
      icon: PawPrint,
      label: "care areas",
      value: staff.serviceAssignments.length,
    },
  ];
  return (
    <div className="border-border/60 bg-card rounded-2xl border p-4">
      <p className="text-sm font-semibold">
        {greeting}, {staff.firstName} 👋
      </p>
      <p className="text-muted-foreground text-xs">Here&apos;s your day.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c) => {
          const Icon = c.icon;
          return (
            <span
              key={c.label}
              className="bg-muted/60 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            >
              <Icon className="text-muted-foreground size-3.5" />
              <span className="font-bold">{c.value}</span>
              <span className="text-muted-foreground">{c.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// My Schedule — today + tomorrow, tap to expand
// ============================================================================

export function MyScheduleWidget({ staff }: { staff: StaffProfile }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Calendar className="text-primary size-4" /> My Schedule
          </span>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>

        <div className="mt-3 space-y-2">
          <ScheduleRow
            label="Today"
            summary={
              staff.upcomingAppointments > 0
                ? `${staff.upcomingAppointments} appointments`
                : "No shifts scheduled"
            }
          />
          <ScheduleRow label="Tomorrow" summary="View in schedule" />
        </div>

        {expanded && (
          <div className="border-border/50 mt-3 border-t pt-3">
            <p className="text-muted-foreground text-xs">
              Detailed shift times, swaps, and time-off live in your full
              schedule.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2 w-full">
              <Link href="/employee/schedule">
                Open My Schedule <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleRow({ label, summary }: { label: string; summary: string }) {
  return (
    <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground text-xs">{summary}</span>
    </div>
  );
}

// ============================================================================
// My Tasks — count due today, quick-complete, red badge if overdue
// ============================================================================

export function MyTasksWidget({ staff }: { staff: StaffProfile }) {
  const [remaining, setRemaining] = useState(staff.openTasks);
  // No per-item overdue signal on the profile yet — stays 0 until a task store
  // exists; the red-badge path is wired for when it does.
  const overdue = 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <CheckSquare className="size-4 text-amber-600 dark:text-amber-400" />
            My Tasks
          </span>
          {overdue > 0 && (
            <Badge className="bg-rose-600 text-white hover:bg-rose-600">
              {overdue} overdue
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-end gap-2">
          <span className="text-3xl font-bold">{remaining}</span>
          <span className="text-muted-foreground pb-1 text-xs">due today</span>
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={remaining === 0}
            onClick={() => setRemaining((n) => Math.max(0, n - 1))}
          >
            <CircleCheck className="size-3.5" /> Complete one
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/employee/tasks">
              All tasks <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
        {remaining === 0 && (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            All caught up — nice work!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// My Alerts — swap / time-off / task-overdue / write-up-ack (derived)
// ============================================================================

interface AlertItem {
  id: string;
  text: string;
  tone: "info" | "warning" | "success";
  href?: string;
}

export function MyAlertsWidget({ staff }: { staff: StaffProfile }) {
  // Alerts are derived from real profile signals; item-level swap/time-off/
  // write-up feeds attach here once those stores exist (Areas E/G).
  const alerts: AlertItem[] = [];
  if (!isOnboarded(staff)) {
    alerts.push({
      id: "onboarding",
      text: "Finish your onboarding to unlock full access.",
      tone: "warning",
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4 text-violet-600 dark:text-violet-400" />
          My Alerts
        </span>

        {alerts.length === 0 ? (
          <div className="text-muted-foreground mt-4 flex flex-col items-center gap-1 py-2 text-center">
            <CircleCheck className="size-5 text-emerald-500" />
            <p className="text-xs">You&apos;re all caught up.</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  a.tone === "warning" &&
                    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
                  a.tone === "info" &&
                    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-200",
                  a.tone === "success" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-800",
                )}
              >
                {a.text}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Quick Actions — the one role-contextual primary action
// ============================================================================

export function QuickActionsBar({ role }: { role: FacilityStaffRole }) {
  const action = ROLE_PRIMARY_ACTION[role] ?? ROLE_PRIMARY_ACTION.reception;
  return (
    <div className="from-primary/10 to-primary/5 border-primary/20 flex items-center justify-between gap-3 rounded-2xl border bg-linear-to-r p-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/15 text-primary flex size-10 items-center justify-center rounded-xl">
          <Zap className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold">Quick action</p>
          <p className="text-muted-foreground text-xs">
            The fastest way to start your shift.
          </p>
        </div>
      </div>
      <Button asChild className="shrink-0">
        <Link href={action.href}>
          {action.label} <ArrowRight className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

// ============================================================================
// Onboarding Progress — prominent until complete
// ============================================================================

export function OnboardingProgress({ staff }: { staff: StaffProfile }) {
  const tasks = useOnboarding(staff.id);
  if (tasks.length === 0) return null;

  const done = tasks.filter((t) => !!t.completedAt).length;
  const pct = Math.round((done / tasks.length) * 100);

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold">
              Welcome aboard — let&apos;s get set up
            </p>
            <p className="text-muted-foreground text-xs">
              {done} of {tasks.length} complete · {pct}%
            </p>
          </div>
        </div>
        <ClipboardList className="size-5 text-amber-500/60" />
      </div>
      <Progress value={pct} className="mt-3 h-2" />
      <ul className="mt-3 space-y-1.5">
        {tasks.map((task) => (
          <OnboardingRow key={task.id} task={task} staffId={staff.id} />
        ))}
      </ul>
    </div>
  );
}

function OnboardingRow({
  task,
  staffId,
}: {
  task: OnboardingTask;
  staffId: string;
}) {
  const done = !!task.completedAt;
  // Manager-action tasks cannot be self-completed by the staff member.
  const waitingOnManager = task.requiresManager && !done;

  return (
    <li className="border-border/50 bg-background/60 flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            done && "text-muted-foreground line-through",
          )}
        >
          {task.name}
        </p>
        <p className="text-muted-foreground text-xs">{task.description}</p>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span>{ONBOARDING_TYPE_LABEL[task.type]}</span>
          {task.dueDate && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> Due {task.dueDate}
            </span>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {done ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CircleCheck className="size-4" /> Done
          </span>
        ) : waitingOnManager ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <Hourglass className="size-3" /> Waiting for manager
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() =>
              setOnboardingTaskComplete(staffId, task.id, true, "self")
            }
          >
            Complete
          </Button>
        )}
      </div>
    </li>
  );
}
