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
  ClipboardCheck,
  Zap,
  Clock,
  Hourglass,
  Scissors,
  Dumbbell,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import type {
  StaffProfile,
  FacilityStaffRole,
  PermissionKey,
  EffectivePermissions,
} from "@/types/facility-staff";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import { useEmployeeTodayCounts } from "@/lib/employee-today-counts";
import { useScopedNotifications } from "@/lib/employee-notification-scope";
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

// ============================================================================
// Section 4A / Table 6 — the Quick Action, derived from PERMISSIONS.
//
// Listed in priority order: the viewer gets the first action whose permission
// they hold. There is no role-name switch — `primaryRoles` is used ONLY to
// disambiguate a multi-role viewer who qualifies for several actions, where the
// spec says to use their PRIMARY role's action (e.g. a groomer who is also a
// daycare attendant gets the grooming action; someone whose primary IS daycare
// gets the daycare board even though grooming sits higher in the table).
// ============================================================================

type QuickAction = {
  id: string;
  /** Any one of these keys grants the action (OR). */
  permKeys: PermissionKey[];
  label: string;
  href: string;
  /** Primary roles this action belongs to — tie-break only, never a gate. */
  primaryRoles?: FacilityStaffRole[];
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "grooming",
    permKeys: ["perform_grooming"],
    label: "Start next grooming appointment",
    href: "/employee/grooming",
    primaryRoles: ["groomer"],
  },
  {
    id: "daycare",
    permKeys: ["daycare_check_in_out"],
    label: "View daycare board",
    // Daycare has no standalone page — occupancy is the Occupancy Calendar
    // (kennel-view). Every daycare_check_in_out holder also holds view_bookings.
    href: "/employee/kennel-view",
    primaryRoles: ["daycare_attendant"],
  },
  {
    id: "kennel",
    permKeys: ["boarding_log_feeding", "boarding_daily_care_log"],
    label: "Log kennel round",
    href: "/employee/daily-care",
    primaryRoles: ["boarding_attendant", "caretaker"],
  },
  {
    id: "training",
    permKeys: ["run_training_sessions"],
    label: "Start training session",
    href: "/employee/training",
    primaryRoles: ["trainer"],
  },
  {
    id: "check-in",
    permKeys: ["check_in_out"],
    label: "Check in next arrival",
    href: "/employee/bookings",
    primaryRoles: ["reception"],
  },
  {
    id: "cleaning",
    permKeys: ["log_cleaning"],
    label: "Log cleaning task",
    href: "/employee/tasks",
    primaryRoles: ["sanitation"],
  },
  {
    id: "bookings",
    permKeys: ["view_bookings"],
    label: "View today's bookings",
    href: "/employee/bookings",
    primaryRoles: ["manager", "owner", "admin", "supervisor", "accountant"],
  },
];

/** Personal-only fallback — every account holds view_own_schedule. */
const PERSONAL_QUICK_ACTION: QuickAction = {
  id: "schedule",
  permKeys: [],
  label: "View my schedule",
  href: "/employee/schedule",
};

// ============================================================================
// Section 4C — Quick Access shortcuts, generated from PERMISSIONS.
//
// Priority: (1) their primary service module, (2) Bookings, (3) Clients,
// (4) Daily Care, (5) My Schedule as the universal fallback.
//
// THE RULE: a shortcut must never point at a screen the viewer would be blocked
// from. Each candidate carries the SAME key(s) that gate its destination (the
// nav section / the route's RequirePermission), so a shortcut can only appear
// when the target is genuinely reachable. Note Daily Care uses the route's real
// gate (log_feedings OR boarding_daily_care_log) — NOT "any log permission" —
// which is why e.g. Sanitation (log_cleaning only) correctly gets no Daily Care
// shortcut rather than a link into an AccessRestricted screen.
// ============================================================================

export type QuickAccessItem = {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  accent: string;
};

type QuickAccessCandidate = QuickAccessItem & {
  permKeys: PermissionKey[];
  /** Which primary role treats this as *their* module (priority-1 pick). */
  primaryRoles?: FacilityStaffRole[];
};

const SERVICE_SHORTCUTS: QuickAccessCandidate[] = [
  {
    title: "Grooming",
    description: "Today's grooming queue",
    href: "/employee/grooming",
    icon: Scissors,
    accent: "text-rose-600",
    permKeys: [
      "view_grooming_queue",
      "grooming_view_own_calendar",
      "grooming_view_all_calendars",
    ],
    primaryRoles: ["groomer"],
  },
  {
    title: "Training",
    description: "Training sessions",
    href: "/employee/training",
    icon: Dumbbell,
    accent: "text-emerald-600",
    permKeys: ["training_view_own_calendar", "training_manage_programs"],
    primaryRoles: ["trainer"],
  },
  {
    title: "Boarding",
    description: "Boarding occupancy",
    // Boarding has no standalone page — occupancy lives on the Occupancy
    // Calendar (kennel-view). Every boarding_view_dashboard holder also holds
    // view_bookings, so the target is always reachable.
    href: "/employee/kennel-view",
    icon: Moon,
    accent: "text-indigo-600",
    permKeys: ["boarding_view_dashboard"],
    primaryRoles: ["boarding_attendant", "caretaker"],
  },
  {
    title: "Daycare",
    description: "Daycare occupancy",
    // Daycare has no standalone page — see Boarding above; routed to the
    // Occupancy Calendar (kennel-view), reachable via view_bookings.
    href: "/employee/kennel-view",
    icon: Sun,
    accent: "text-orange-600",
    permKeys: ["daycare_view_dashboard"],
    primaryRoles: ["daycare_attendant"],
  },
];

const GENERAL_SHORTCUTS: QuickAccessCandidate[] = [
  {
    title: "Bookings",
    description: "Facility bookings",
    href: "/employee/bookings",
    icon: ClipboardList,
    accent: "text-sky-600",
    permKeys: ["view_bookings"],
  },
  {
    title: "Clients",
    description: "Client directory",
    href: "/employee/clients",
    icon: Users,
    accent: "text-violet-600",
    permKeys: ["view_client_list"],
  },
  {
    title: "Daily Care",
    description: "Log today's rounds",
    href: "/employee/daily-care",
    icon: ClipboardCheck,
    accent: "text-cyan-600",
    permKeys: ["log_feedings", "boarding_daily_care_log"],
  },
];

/** Universal fallbacks — both are always-on keys, so never blocked. */
const UNIVERSAL_SHORTCUTS: QuickAccessItem[] = [
  {
    title: "My Schedule",
    description: "Your shifts this week",
    href: "/employee/schedule",
    icon: Calendar,
    accent: "text-amber-600",
  },
  {
    title: "My Tasks",
    description: "What's assigned to you",
    href: "/employee/tasks",
    icon: CheckSquare,
    accent: "text-slate-600",
  },
];

/**
 * Build the 2–3 Quick Access shortcuts for a viewer from their effective
 * permissions (4C). Pure — the hook wrapper below supplies the map.
 */
export function buildQuickAccess(
  permissions: EffectivePermissions,
  role: FacilityStaffRole,
  max = 3,
): QuickAccessItem[] {
  const permitted = (c: QuickAccessCandidate) =>
    c.permKeys.some((k) => permissions[k] !== false);

  const out: QuickAccessItem[] = [];
  // (1) THEIR primary service module — the one their primary role works in, and
  // only if they can actually access it. A viewer with no service module of
  // their own (manager, reception, accountant, retail…) falls through to
  // Bookings rather than being pointed at someone else's module.
  const primary = SERVICE_SHORTCUTS.find(
    (s) => s.primaryRoles?.includes(role) && permitted(s),
  );
  if (primary) out.push(primary);

  // (2) Bookings, (3) Clients, (4) Daily Care — each only if reachable
  for (const c of GENERAL_SHORTCUTS) {
    if (out.length >= max) break;
    if (permitted(c)) out.push(c);
  }

  // (5) universal fallbacks fill any remaining slots (guarantees ≥1, and ≥2
  // even for a viewer with no module/ops access at all).
  for (const u of UNIVERSAL_SHORTCUTS) {
    if (out.length >= max) break;
    if (!out.some((o) => o.href === u.href)) out.push(u);
  }
  return out.slice(0, max);
}

/** Hook form — reads the acting viewer's effective permissions once. */
export function useQuickAccess(
  role: FacilityStaffRole,
  max = 3,
): QuickAccessItem[] {
  const permissions = useEffectivePermissions();
  return buildQuickAccess(permissions, role, max);
}

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
  // Section 4B — counts come from the viewer's SCOPED data, not a single
  // generic staff field. A groomer sees their assigned appointments; a
  // back-of-house attendant can legitimately read "0 appointments, 6 care
  // tasks". The care-task chip only appears for staff who can log care.
  const { appointments, careTasks, showCareTasks } = useEmployeeTodayCounts(
    staff.id,
  );
  const chips = [
    {
      icon: Calendar,
      label: "appointments today",
      value: appointments,
    },
    ...(showCareTasks
      ? [{ icon: PawPrint, label: "care tasks", value: careTasks }]
      : []),
    { icon: CheckSquare, label: "tasks due", value: staff.openTasks },
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
  // Alerts are derived from real profile signals plus the viewer's
  // PERMISSION-SCOPED notification feed (4D): an employee is only alerted about
  // things their keys justify — never payment/staff-management traffic, and
  // never another module's bookings.
  const notifications = useScopedNotifications();
  const alerts: AlertItem[] = [];
  if (!isOnboarded(staff)) {
    alerts.push({
      id: "onboarding",
      text: "Finish your onboarding to unlock full access.",
      tone: "warning",
    });
  }
  for (const n of notifications.filter((x) => !x.read).slice(0, 4)) {
    alerts.push({
      id: n.id,
      text: n.title,
      tone: n.type === "incident" || n.type === "warning" ? "warning" : "info",
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
// Quick Actions — the one permission-derived primary action (4A / Table 6)
// ============================================================================

export function QuickActionsBar({ role }: { role: FacilityStaffRole }) {
  // One read of the effective map, so the OR-of-keys case needs no hook loop.
  const permissions = useEffectivePermissions();
  const permitted = QUICK_ACTIONS.filter((a) =>
    a.permKeys.some((k) => permissions[k] !== false),
  );
  // Prefer the action belonging to the viewer's PRIMARY role when they qualify
  // for several; otherwise the highest-priority permitted one; else personal.
  const action =
    permitted.find((a) => a.primaryRoles?.includes(role)) ??
    permitted[0] ??
    PERSONAL_QUICK_ACTION;
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
