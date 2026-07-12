"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CalendarClock,
  Plus,
  Trash2,
  ClipboardList,
  Star,
  Timer,
  CheckCircle2,
  CheckCheck,
  Eye,
  AlertTriangle,
  Clock,
  UserCog,
  GraduationCap,
} from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import {
  usePerformanceVisibility,
  setPerformanceVisibility,
} from "@/lib/staff-performance-visibility";
import {
  useOnboarding,
  initOnboarding,
  addOnboardingTask,
  removeOnboardingTask,
  setOnboardingTaskComplete,
  ONBOARDING_TYPE_LABEL,
} from "@/data/staff-onboarding";

// Local editable models — this is a mock with no fs-* shift/task/rating join, so
// these tabs are genuine admin-editable state rather than fabricated read-only
// numbers. State is lifted to the parent so it survives tab switches.
// TODO: back with real scheduling / onboarding / notes stores when they exist.

export interface ShiftItem {
  id: string;
  date: string;
  start: string;
  end: string;
}

export interface NoteEntry {
  id: string;
  body: string;
  at: string;
}

// ============================================================================
// Schedule
// ============================================================================

export function ScheduleTab({
  shifts,
  onAdd,
  onRemove,
}: {
  shifts: ShiftItem[];
  onAdd: (shift: Omit<ShiftItem, "id">) => void;
  onRemove: (id: string) => void;
}) {
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");

  const canAdd = date !== "" && start !== "" && end !== "" && start < end;

  return (
    <div className="space-y-4">
      <div className="border-border/60 bg-card/60 rounded-xl border p-4">
        <div className="mb-3 text-sm font-semibold">Add a shift</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start</Label>
            <Input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End</Label>
            <Input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              disabled={!canAdd}
              onClick={() => {
                onAdd({ date, start, end });
                setDate("");
              }}
            >
              <Plus className="size-3.5" /> Add
            </Button>
          </div>
        </div>
      </div>

      {shifts.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No shifts scheduled"
          description="Add shifts above. They'll appear here in date order."
        />
      ) : (
        <div className="divide-border/60 border-border/60 divide-y overflow-hidden rounded-xl border">
          {[...shifts]
            .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
            .map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <CalendarClock className="text-muted-foreground size-4" />
                  <div>
                    <div className="text-sm font-medium">
                      {new Date(s.date + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { weekday: "short", month: "short", day: "numeric" },
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {s.start} – {s.end}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => onRemove(s.id)}
                  aria-label="Remove shift"
                >
                  <Trash2 className="size-3.5 text-rose-600" />
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Onboarding
// ============================================================================

// Manager-side onboarding (spec 7.3): full checklist, check off on behalf of the
// staff, add custom tasks, "Mark all complete", and a stalled-onboarding flag.
const STALLED_OVERDUE_MIN = 1; // any overdue incomplete task flags the checklist

export function OnboardingTab({ staff }: { staff: StaffProfile }) {
  const tasks = useOnboarding(staff.id);
  const [today] = useState(() => new Date().toISOString().split("T")[0]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newRequiresManager, setNewRequiresManager] = useState(false);

  const done = tasks.filter((t) => !!t.completedAt).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const allComplete = tasks.length > 0 && done === tasks.length;
  const overdue = tasks.filter(
    (t) => !t.completedAt && t.dueDate && t.dueDate < today,
  );
  // Stalled flag surfaced to managers (Smart Insights hook — mocked as a banner).
  const stalled = !allComplete && overdue.length >= STALLED_OVERDUE_MIN;

  if (tasks.length === 0) {
    return (
      <div className="border-border/60 flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
        <GraduationCap className="text-muted-foreground/50 size-7" />
        <p className="text-sm font-medium">No onboarding checklist yet</p>
        <p className="text-muted-foreground max-w-xs text-xs">
          Start a role-appropriate checklist for {staff.firstName}.
        </p>
        <Button
          size="sm"
          className="mt-1"
          onClick={() =>
            initOnboarding(
              staff.id,
              staff.primaryRole,
              staff.employment.hireDate,
            )
          }
        >
          <Plus className="size-3.5" /> Start onboarding checklist
        </Button>
      </div>
    );
  }

  const markAllComplete = () => {
    for (const t of tasks) {
      if (!t.completedAt) {
        setOnboardingTaskComplete(staff.id, t.id, true, "Manager");
      }
    }
    toast.success("All onboarding tasks marked complete");
  };

  const addTask = () => {
    if (!newName.trim()) return;
    addOnboardingTask(staff.id, {
      name: newName.trim(),
      description: newDesc.trim(),
      requiresManager: newRequiresManager,
      type: "custom",
    });
    setNewName("");
    setNewDesc("");
    setNewRequiresManager(false);
    toast.success("Task added");
  };

  return (
    <div className="space-y-4">
      {stalled && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs">
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              Onboarding stalled
            </p>
            <p className="text-amber-700 dark:text-amber-300">
              {overdue.length} task{overdue.length === 1 ? "" : "s"} past due
              with no recent progress. Follow up with {staff.firstName}.
            </p>
          </div>
        </div>
      )}

      <div className="border-border/60 bg-card/60 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-semibold">Onboarding progress</span>
            <span className="text-muted-foreground ml-2">
              {done} of {tasks.length} · {pct}%
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={allComplete}
            onClick={markAllComplete}
          >
            <CheckCheck className="size-3.5" /> Mark all complete
          </Button>
        </div>
        <Progress value={pct} className="mt-2 h-2" />
      </div>

      {/* Checklist — manager can check off any task on behalf of the staff. */}
      <div className="divide-border/60 border-border/60 divide-y overflow-hidden rounded-xl border">
        {tasks.map((task) => {
          const taskDone = !!task.completedAt;
          const taskOverdue = !taskDone && task.dueDate && task.dueDate < today;
          return (
            <div key={task.id} className="flex items-start gap-3 px-4 py-3">
              <Checkbox
                checked={taskDone}
                className="mt-0.5"
                onCheckedChange={(v) =>
                  setOnboardingTaskComplete(staff.id, task.id, !!v, "Manager")
                }
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      taskDone && "text-muted-foreground line-through",
                    )}
                  >
                    {task.name}
                  </span>
                  {task.requiresManager && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-violet-100 px-1.5 py-0.5 text-[9px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                      <UserCog className="size-2.5" /> Manager
                    </span>
                  )}
                </div>
                {task.description && (
                  <p className="text-muted-foreground text-xs">
                    {task.description}
                  </p>
                )}
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                  <span>{ONBOARDING_TYPE_LABEL[task.type]}</span>
                  {task.dueDate && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        taskOverdue && "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      <Clock className="size-3" /> Due {task.dueDate}
                    </span>
                  )}
                  {taskDone && task.completedBy && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Completed by {task.completedBy}
                    </span>
                  )}
                </div>
              </div>
              {task.type === "custom" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  onClick={() => removeOnboardingTask(staff.id, task.id)}
                  aria-label="Remove task"
                >
                  <Trash2 className="size-3.5 text-rose-600" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add a custom task */}
      <div className="border-border/60 bg-card/60 space-y-2 rounded-xl border p-4">
        <p className="text-sm font-semibold">Add a task</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Task name"
          />
          <Input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description (optional)"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={newRequiresManager}
              onCheckedChange={setNewRequiresManager}
            />
            Manager-action task (staff can&apos;t self-complete)
          </label>
          <Button size="sm" disabled={!newName.trim()} onClick={addTask}>
            <Plus className="size-3.5" /> Add task
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Notes (internal management notes)
// ============================================================================

export function NotesTab({
  internalNote,
  onSaveInternal,
  log,
  onAddLog,
}: {
  internalNote: string;
  onSaveInternal: (value: string) => void;
  log: NoteEntry[];
  onAddLog: (body: string) => void;
}) {
  const [draft, setDraft] = useState(internalNote);
  const [entry, setEntry] = useState("");

  return (
    <div className="space-y-4">
      <div className="border-border/60 bg-card/60 rounded-xl border p-4">
        <Label className="text-xs">Internal note</Label>
        <p className="text-muted-foreground mb-2 text-[11px]">
          Visible to managers and owners only.
        </p>
        <Textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Overnight shifts only, handles hand stripping."
        />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              onSaveInternal(draft.trim());
              toast.success("Internal note saved");
            }}
          >
            Save note
          </Button>
        </div>
      </div>

      <div className="border-border/60 bg-card/60 rounded-xl border p-4">
        <Label className="text-xs">Add a management note</Label>
        <div className="mt-2 flex gap-2">
          <Input
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Log a note about this staff member…"
          />
          <Button
            disabled={entry.trim() === ""}
            onClick={() => {
              onAddLog(entry.trim());
              setEntry("");
            }}
          >
            <Plus className="size-3.5" /> Add
          </Button>
        </div>
        {log.length > 0 && (
          <ul className="mt-3 space-y-2">
            {log.map((n) => (
              <li
                key={n.id}
                className="border-border/50 bg-background rounded-lg border p-2.5 text-sm"
              >
                <p>{n.body}</p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  {new Date(n.at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Performance
// ============================================================================

export function PerformanceTab({
  profile,
  onboardingPct,
}: {
  profile: StaffProfile;
  onboardingPct: number;
}) {
  const shared = usePerformanceVisibility(profile.id);
  return (
    <div className="space-y-4">
      {/* Manager control: share performance with the staff member (Task 29). */}
      <div className="border-border/60 bg-card/60 flex items-center justify-between gap-3 rounded-xl border p-3">
        <div className="flex items-center gap-2.5">
          <Eye className="text-muted-foreground size-4" />
          <div>
            <p className="text-sm font-medium">
              Share performance with {profile.firstName}
            </p>
            <p className="text-muted-foreground text-xs">
              When on, they can see their completion rate, punctuality, and
              client ratings in their portal.
            </p>
          </div>
        </div>
        <Switch
          checked={shared}
          onCheckedChange={(v) => setPerformanceVisibility(profile.id, v)}
          aria-label="Share performance with staff member"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={ClipboardList}
          label="Open tasks"
          value={String(profile.openTasks)}
          tone="text-amber-600 dark:text-amber-400"
        />
        <MetricCard
          icon={CalendarClock}
          label="Upcoming shifts"
          value={String(profile.upcomingAppointments)}
          tone="text-primary"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Onboarding"
          value={`${onboardingPct}%`}
          tone="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Metrics with no data source yet — honest empty states, not fabricated. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <EmptyMetric icon={CheckCircle2} label="Task completion rate" />
        <EmptyMetric icon={Timer} label="Punctuality" />
        <EmptyMetric icon={Star} label="Client ratings" />
      </div>
      <p className="text-muted-foreground text-xs">
        Completion, punctuality, and client-rating history will appear here once
        connected to the scheduling and report-card data.
      </p>
    </div>
  );
}

// ============================================================================
// Shared bits
// ============================================================================

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className={cn("bg-muted/50 rounded-lg p-2", tone)}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-muted-foreground text-xs">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyMetric({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="border-border/60 bg-muted/20 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-4 text-center">
      <Icon className="text-muted-foreground/50 size-5" />
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div className="text-muted-foreground/70 text-[10px]">No data yet</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border/60 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed py-10 text-center">
      <Icon className="text-muted-foreground/50 size-7" />
      <div className="text-sm font-semibold">{title}</div>
      <p className="text-muted-foreground max-w-xs text-xs">{description}</p>
    </div>
  );
}
