"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  saveOffboardingTemplate,
  useStaffHrConfig,
  type OffboardingTemplate,
  type OffboardingTask,
} from "@/data/staff-onboarding";
import {
  TaskConfigEditor,
  type TaskConfigValue,
  type Option,
  type ScheduleOption,
} from "./TaskConfigEditor";

// Offboarding tasks (2.1 / Table 3): assigned to Manager / Owner / HR; due on
// termination date / within N days / before last day.
const OFFBOARDING_ASSIGNEES: Option[] = [
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
  { value: "hr", label: "HR" },
];
const OFFBOARDING_SCHEDULE: ScheduleOption[] = [
  { value: "on_termination", label: "On termination date" },
  { value: "within_days", label: "Within N days", needsDays: true },
  { value: "before_last_day", label: "Before last day" },
];

const taskToValue = (t: OffboardingTask): TaskConfigValue => ({
  id: t.id,
  name: t.name,
  description: t.description,
  assignedTo: t.assignedTo,
  schedule: t.due,
  scheduleDays: t.days,
  required: t.required,
});

const valueToTask = (v: TaskConfigValue): OffboardingTask => ({
  id: v.id,
  name: v.name,
  description: v.description,
  assignedTo: v.assignedTo as OffboardingTask["assignedTo"],
  due: v.schedule as OffboardingTask["due"],
  days: v.scheduleDays,
  required: v.required,
});

export function OffboardingTemplateEditor({
  template,
  onBack,
}: {
  template: OffboardingTemplate;
  onBack: () => void;
}) {
  // Reason options come from the editable Staff & HR config (the same list the
  // status-change dialog offers), so a reason-scoped template actually matches
  // a termination. `appliesToReasons` stores the reason LABEL string.
  const { terminationReasons } = useStaffHrConfig();
  const [draft, setDraft] = useState<OffboardingTemplate>(template);
  const dirty = JSON.stringify(draft) !== JSON.stringify(template);

  const patch = (p: Partial<OffboardingTemplate>) =>
    setDraft((d) => ({ ...d, ...p }));

  const toggleReason = (reason: string, on: boolean) =>
    patch({
      appliesToReasons: on
        ? [...new Set([...draft.appliesToReasons, reason])]
        : draft.appliesToReasons.filter((r) => r !== reason),
    });

  const save = () => {
    saveOffboardingTemplate(draft);
    toast.success("Template saved");
    onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Templates
        </Button>
        <Button
          onClick={save}
          disabled={!dirty}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Save template
        </Button>
      </div>

      {/* Template settings — name + applies-to reasons */}
      <Card>
        <CardHeader>
          <CardTitle>Template settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Applies to reasons</Label>
            <p className="text-muted-foreground text-xs">
              None selected = universal (applies to all departure reasons).
            </p>
            <div className="flex flex-wrap gap-2">
              {terminationReasons.map((reason) => (
                <label
                  key={reason}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                >
                  <Checkbox
                    checked={draft.appliesToReasons.includes(reason)}
                    onCheckedChange={(v) => toggleReason(reason, v === true)}
                  />
                  {reason}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager tasks — shared task-config editor (reused from onboarding 1.2) */}
      <Card>
        <CardHeader>
          <CardTitle>Manager tasks</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Steps the facility completes when the staffer leaves.
          </p>
        </CardHeader>
        <CardContent>
          <TaskConfigEditor
            tasks={draft.managerTasks.map(taskToValue)}
            onChange={(values) =>
              patch({ managerTasks: values.map(valueToTask) })
            }
            assigneeOptions={OFFBOARDING_ASSIGNEES}
            scheduleOptions={OFFBOARDING_SCHEDULE}
            scheduleLabel="Due"
            addLabel="Add task"
            emptyText="No tasks yet."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={!dirty}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Save template
        </Button>
      </div>
    </div>
  );
}
