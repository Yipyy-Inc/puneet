"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

// Shared "assignable task with a schedule" editor. Reused by onboarding MANAGER
// tasks (Table 0: when-due on-hire / within-N-days / by-first-shift, assigned to
// Manager/Owner/position) and by offboarding tasks (2.1: due on-termination /
// within-N-days / before-last-day, assigned to Manager/Owner/HR). Parents map
// their domain task ↔ TaskConfigValue and pick the assignee / schedule options.

export interface TaskConfigValue {
  id: string;
  name: string;
  description: string;
  assignedTo: string;
  schedule: string;
  scheduleDays?: number;
  required: boolean;
}

export interface Option {
  value: string;
  label: string;
}

export interface ScheduleOption extends Option {
  /** Show a numeric N-days input when this schedule is selected. */
  needsDays?: boolean;
}

export function makeTaskId(prefix = "task"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

interface TaskConfigEditorProps {
  tasks: TaskConfigValue[];
  onChange: (tasks: TaskConfigValue[]) => void;
  assigneeOptions: Option[];
  scheduleOptions: ScheduleOption[];
  scheduleLabel?: string;
  addLabel?: string;
  emptyText?: string;
}

export function TaskConfigEditor({
  tasks,
  onChange,
  assigneeOptions,
  scheduleOptions,
  scheduleLabel = "When due",
  addLabel = "Add task",
  emptyText = "No tasks yet.",
}: TaskConfigEditorProps) {
  const patch = (id: string, p: Partial<TaskConfigValue>) =>
    onChange(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)));

  const remove = (id: string) => onChange(tasks.filter((t) => t.id !== id));

  const add = () =>
    onChange([
      ...tasks,
      {
        id: makeTaskId(),
        name: "New task",
        description: "",
        assignedTo: assigneeOptions[0]?.value ?? "",
        schedule: scheduleOptions[0]?.value ?? "",
        required: true,
      },
    ]);

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyText}</p>
      ) : (
        tasks.map((task) => {
          const sched = scheduleOptions.find((s) => s.value === task.schedule);
          return (
            <div key={task.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={task.name}
                  placeholder="Task name"
                  className="h-8"
                  onChange={(e) => patch(task.id, { name: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  title="Remove task"
                  onClick={() => remove(task.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Textarea
                rows={2}
                value={task.description}
                placeholder="Description (optional)"
                onChange={(e) =>
                  patch(task.id, { description: e.target.value })
                }
              />
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Assigned to</Label>
                  <Select
                    value={task.assignedTo}
                    onValueChange={(v) => patch(task.id, { assignedTo: v })}
                  >
                    <SelectTrigger size="sm" className="h-8 w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assigneeOptions.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{scheduleLabel}</Label>
                  <Select
                    value={task.schedule}
                    onValueChange={(v) => patch(task.id, { schedule: v })}
                  >
                    <SelectTrigger size="sm" className="h-8 w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {sched?.needsDays && (
                  <div className="space-y-1">
                    <Label className="text-xs">Days</Label>
                    <Input
                      type="number"
                      min={1}
                      value={task.scheduleDays ?? 1}
                      className="h-8 w-20"
                      onChange={(e) =>
                        patch(task.id, {
                          scheduleDays: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
                <label className="text-muted-foreground ml-auto flex items-center gap-1.5 pb-1.5 text-xs">
                  <Switch
                    checked={task.required}
                    onCheckedChange={(v) => patch(task.id, { required: v })}
                  />
                  Required
                </label>
              </div>
            </div>
          );
        })
      )}
      <Button variant="outline" size="sm" className="gap-1" onClick={add}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}
