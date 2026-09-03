"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  Users,
  UserCheck,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  UserX,
} from "lucide-react";
import dynamic from "next/dynamic";
import { taskQueries } from "@/lib/api/facility-tasks";
import { chorelistQueries } from "@/lib/api/task-groups";
import { getOffboardingInstances } from "@/data/staff-onboarding";
import { PageHeader } from "@/components/ui/page-header";

const ShiftTasksTab = dynamic(
  () => import("./ShiftTasksTab").then((m) => m.ShiftTasksTab),
  { ssr: false },
);
const PositionTasksTab = dynamic(
  () => import("./PositionTasksTab").then((m) => m.PositionTasksTab),
  { ssr: false },
);
const StandaloneTasksTab = dynamic(
  () => import("./StandaloneTasksTab").then((m) => m.StandaloneTasksTab),
  { ssr: false },
);
const TaskLibraryTab = dynamic(
  () => import("./TaskLibraryTab").then((m) => m.TaskLibraryTab),
  { ssr: false },
);
const OffboardingTasksTab = dynamic(
  () => import("./OffboardingTasksTab").then((m) => m.OffboardingTasksTab),
  { ssr: false },
);

// ── Overview stat cards ───────────────────────────────────────────────────────

function OverviewStats() {
  const { data } = useQuery(taskQueries.all());
  const tasks = data?.tasks ?? [];
  const { data: groups } = useQuery(chorelistQueries.groups());
  const allGroups = groups ?? [];

  const shiftGroups = allGroups.filter((g) => g.scope === "shift");
  const positionGroups = allGroups.filter((g) => g.scope === "position");
  const activeShiftGroups = shiftGroups.filter((g) => g.isActive).length;
  const activePositionGroups = positionGroups.filter((g) => g.isActive).length;

  const pendingStandalone = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  ).length;

  const overdueStandalone = tasks.filter((t) => t.overdue).length;

  const today = new Date().toDateString();
  const dueTodayStandalone = tasks.filter(
    (t) =>
      t.dueAt !== null &&
      new Date(t.dueAt).toDateString() === today &&
      t.status !== "completed" &&
      t.status !== "cancelled",
  ).length;

  const stats = [
    {
      label: "Active Shift Groups",
      value: activeShiftGroups,
      sub: `across ${shiftGroups.length} total`,
      icon: CalendarClock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Position Task Groups",
      value: activePositionGroups,
      sub: `${positionGroups.reduce((s, g) => s + g.items.length, 0)} chores assigned`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Standalone Pending",
      value: pendingStandalone,
      sub:
        dueTodayStandalone > 0
          ? `${dueTodayStandalone} due today`
          : "No tasks due today",
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Overdue",
      value: overdueStandalone,
      sub: overdueStandalone > 0 ? "Needs attention" : "All on track",
      icon: overdueStandalone > 0 ? AlertTriangle : CheckCircle2,
      color: overdueStandalone > 0 ? "text-red-600" : "text-emerald-600",
      bg:
        overdueStandalone > 0
          ? "bg-red-50 border-red-200"
          : "bg-emerald-50 border-emerald-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={cn("flex items-start gap-3 rounded-xl border p-4", bg)}
        >
          <div className={cn("mt-0.5 shrink-0", color)}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-[11px] font-medium text-slate-700">{label}</p>
            <p className="text-muted-foreground text-[10px]">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab badge counts ──────────────────────────────────────────────────────────

function TabCount({ n }: { n: number }) {
  if (n === 0) return null;
  return (
    <Badge
      variant="secondary"
      className="ml-1.5 h-4 min-w-4 rounded-full px-1 text-[9px]"
    >
      {n}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TaskManagementPage() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams?.get("tab") ?? "shift";

  const { data: taskPayload } = useQuery(taskQueries.all());
  const liveTasks = taskPayload?.tasks ?? [];
  const { data: groupList } = useQuery(chorelistQueries.groups());
  const { data: choreList } = useQuery(chorelistQueries.definitions());

  const overdueCount = liveTasks.filter((t) => t.overdue).length;
  const pendingStandalone = liveTasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  ).length;

  const todayStr = new Date().toISOString().slice(0, 10);
  const offboardingInstances = getOffboardingInstances();
  const offboardingOpen = offboardingInstances.reduce(
    (n, i) => n + i.tasks.filter((t) => !t.completedAt).length,
    0,
  );
  const offboardingOverdue = offboardingInstances.reduce(
    (n, i) =>
      n +
      i.tasks.filter(
        (t) =>
          t.required && !t.completedAt && t.dueDate && t.dueDate < todayStr,
      ).length,
    0,
  );

  return (
    <div className="space-y-5 p-5 md:p-7">
      {/* Page header */}
      {/* The page-level "Create Task" button is gone with `TaskWizard`. It
          opened a 1,114-line wizard whose only outcome was
          `toast.success("Task assigned to …")` — it created nothing, in any
          of its three modes. Every tab now has its own New button that
          writes to Postgres, so there is nothing for a page-level one to do
          that is not already better done one click away. */}
      <PageHeader
        title="Tasks"
        description="Shift tasks, position tasks, and one-off staff assignments"
      />

      {/* Overview stats */}
      <OverviewStats />

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-auto flex-wrap gap-0.5">
          <TabsTrigger value="shift" className="gap-1.5 text-xs sm:text-sm">
            <CalendarClock className="size-4" />
            Shift Tasks
            <TabCount
              n={
                (groupList ?? []).filter(
                  (g) => g.scope === "shift" && g.isActive,
                ).length
              }
            />
          </TabsTrigger>
          <TabsTrigger value="position" className="gap-1.5 text-xs sm:text-sm">
            <Users className="size-4" />
            Position Tasks
            <TabCount
              n={
                (groupList ?? []).filter(
                  (g) => g.scope === "position" && g.isActive,
                ).length
              }
            />
          </TabsTrigger>
          <TabsTrigger
            value="standalone"
            className="gap-1.5 text-xs sm:text-sm"
          >
            <UserCheck className="size-4" />
            Standalone
            {overdueCount > 0 ? (
              <Badge className="ml-1.5 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[9px] text-white">
                {overdueCount}
              </Badge>
            ) : (
              <TabCount n={pendingStandalone} />
            )}
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="size-4" />
            Task Library
            <TabCount n={(choreList ?? []).filter((c) => c.isActive).length} />
          </TabsTrigger>
          {offboardingOpen > 0 && (
            <TabsTrigger
              value="offboarding"
              className="gap-1.5 text-xs sm:text-sm"
            >
              <UserX className="size-4" />
              Offboarding
              {offboardingOverdue > 0 ? (
                <Badge className="ml-1.5 h-4 min-w-4 rounded-full bg-red-500 px-1 text-[9px] text-white">
                  {offboardingOverdue}
                </Badge>
              ) : (
                <TabCount n={offboardingOpen} />
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-5">
          <TabsContent value="shift">
            <ShiftTasksTab />
          </TabsContent>
          <TabsContent value="position">
            <PositionTasksTab />
          </TabsContent>
          <TabsContent value="standalone">
            <StandaloneTasksTab />
          </TabsContent>
          <TabsContent value="library">
            <TaskLibraryTab />
          </TabsContent>
          <TabsContent value="offboarding">
            <OffboardingTasksTab />
          </TabsContent>
        </div>
      </Tabs>

      {/* Global wizard */}
    </div>
  );
}
