"use client";

import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomServices } from "@/hooks/use-custom-services";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  UserCheck,
  Wrench,
  Play,
  Trash2,
} from "lucide-react";

type TaskStatus = "pending" | "in_progress" | "completed";
type TaskPhase = "setup" | "execution" | "cleanup";

interface MockTask {
  id: string;
  title: string;
  phase: TaskPhase;
  assignedStaff: string;
  time: string;
  status: TaskStatus;
}

const MOCK_TASKS: MockTask[] = [
  {
    id: "t1",
    title: "Prepare station / area",
    phase: "setup",
    assignedStaff: "Alex R.",
    time: "8:45 AM",
    status: "completed",
  },
  {
    id: "t2",
    title: "Check equipment & supplies",
    phase: "setup",
    assignedStaff: "Alex R.",
    time: "8:55 AM",
    status: "completed",
  },
  {
    id: "t3",
    title: "Run session — Bella (9:00 AM)",
    phase: "execution",
    assignedStaff: "Jordan K.",
    time: "9:00 AM",
    status: "in_progress",
  },
  {
    id: "t4",
    title: "Post-session cleanup",
    phase: "cleanup",
    assignedStaff: "Alex R.",
    time: "10:05 AM",
    status: "pending",
  },
];

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
};

const PHASE_CONFIG: Record<
  TaskPhase,
  { label: string; icon: typeof Wrench; color: string }
> = {
  setup: { label: "Setup", icon: Wrench, color: "text-blue-500" },
  execution: { label: "Execution", icon: Play, color: "text-primary" },
  cleanup: { label: "Cleanup", icon: Trash2, color: "text-orange-500" },
};

export default function CustomServiceTasksPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { getModuleBySlug } = useCustomServices();
  const module = getModuleBySlug(slug ?? "");

  if (!module) return null;

  const { staffAssignment } = module;

  const completedCount = MOCK_TASKS.filter(
    (t) => t.status === "completed",
  ).length;
  const inProgressCount = MOCK_TASKS.filter(
    (t) => t.status === "in_progress",
  ).length;
  const pendingCount = MOCK_TASKS.filter((t) => t.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Staff task tracking for {module.name}
        </p>
      </div>

      {/* Task Config Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Staff Assignment Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Staff Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Required Role</span>
              <Badge variant="secondary" className="capitalize">
                {staffAssignment.customRoleName ?? staffAssignment.requiredRole}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auto-Assign</span>
              <Badge
                variant={staffAssignment.autoAssign ? "default" : "outline"}
              >
                {staffAssignment.autoAssign ? "On" : "Off"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Task Generation Phases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Auto-Generated Phases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(["setup", "execution", "cleanup"] as TaskPhase[]).map(
                (phase) => {
                  const cfg = PHASE_CONFIG[phase];
                  const PhaseIcon = cfg.icon;
                  const isEnabled =
                    staffAssignment.taskGeneration.includes(phase);
                  return (
                    <div
                      key={phase}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border ${
                        isEnabled
                          ? "bg-primary/5 border-primary/20 text-primary"
                          : "bg-muted/40 border-transparent text-muted-foreground"
                      }`}
                    >
                      <PhaseIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </div>
                  );
                },
              )}
            </div>
            {staffAssignment.taskGeneration.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No automatic task generation configured.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Tasks Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedCount}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Play className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Today&apos;s Tasks
            </CardTitle>
            <Button size="sm" variant="outline">
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_TASKS.map((task) => {
              const statusCfg = STATUS_CONFIG[task.status];
              const phaseCfg = PHASE_CONFIG[task.phase];
              const PhaseIcon = phaseCfg.icon;

              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full bg-muted ${phaseCfg.color}`}
                    >
                      <PhaseIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{task.phase}</span>
                        <span>•</span>
                        <span>{task.assignedStaff}</span>
                        <span>•</span>
                        <span>{task.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                    {task.status !== "completed" && (
                      <Button size="sm" variant="ghost">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
