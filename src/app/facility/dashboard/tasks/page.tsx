"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CalendarClock,
  Users,
  UserCheck,
  BookOpen,
  Plus,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import dynamic from "next/dynamic";
import { TaskWizard } from "./TaskWizard";
import {
  shiftTaskGroups,
  positionTaskGroups,
  standaloneTasks,
  workTaskLibrary,
} from "@/data/work-tasks";

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

// ── Overview stat cards ───────────────────────────────────────────────────────

function OverviewStats() {
  const today = new Date().toISOString().slice(0, 10);

  const activeShiftGroups = shiftTaskGroups.filter((g) => g.isActive).length;
  const activePositionGroups = positionTaskGroups.filter((g) => g.isActive).length;

  const pendingStandalone = standaloneTasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  ).length;

  const overdueStandalone = standaloneTasks.filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    const due = new Date(`${t.dueDate}T${t.dueTime ?? "23:59"}`);
    return due < new Date();
  }).length;

  const dueTodayStandalone = standaloneTasks.filter(
    (t) =>
      t.dueDate === today &&
      t.status !== "completed" &&
      t.status !== "cancelled",
  ).length;

  const stats = [
    {
      label: "Active Shift Groups",
      value: activeShiftGroups,
      sub: `across ${shiftTaskGroups.length} total`,
      icon: CalendarClock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "Position Task Groups",
      value: activePositionGroups,
      sub: `${positionTaskGroups.reduce((s, g) => s + g.taskIds.length, 0)} tasks assigned`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Standalone Pending",
      value: pendingStandalone,
      sub: dueTodayStandalone > 0 ? `${dueTodayStandalone} due today` : "No tasks due today",
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
        <div key={label} className={cn("flex items-start gap-3 rounded-xl border px-4 py-4", bg)}>
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
  const [wizardOpen, setWizardOpen] = useState(false);

  const overdueCount = standaloneTasks.filter((t) => {
    if (t.status === "completed" || t.status === "cancelled") return false;
    return new Date(`${t.dueDate}T${t.dueTime ?? "23:59"}`) < new Date();
  }).length;

  const pendingStandalone = standaloneTasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  ).length;

  return (
    <div className="space-y-5 p-5 md:p-7">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Management</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Shift tasks, position tasks, and one-off staff assignments
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} size="default" className="gap-2 shrink-0">
          <Plus className="size-4" />
          Create Task
        </Button>
      </div>

      {/* Overview stats */}
      <OverviewStats />

      {/* Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-auto flex-wrap gap-0.5">
          <TabsTrigger value="shift" className="gap-1.5 text-xs sm:text-sm">
            <CalendarClock className="size-4" />
            Shift Tasks
            <TabCount n={shiftTaskGroups.filter((g) => g.isActive).length} />
          </TabsTrigger>
          <TabsTrigger value="position" className="gap-1.5 text-xs sm:text-sm">
            <Users className="size-4" />
            Position Tasks
            <TabCount n={positionTaskGroups.filter((g) => g.isActive).length} />
          </TabsTrigger>
          <TabsTrigger value="standalone" className="gap-1.5 text-xs sm:text-sm">
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
            <TabCount n={workTaskLibrary.filter((t) => t.isActive).length} />
          </TabsTrigger>
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
        </div>
      </Tabs>

      {/* Global wizard */}
      <TaskWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
