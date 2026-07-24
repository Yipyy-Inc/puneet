"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { FacilityStaffRole } from "@/types/facility-staff";
import {
  saveOnboardingTemplate,
  type OnboardingTemplate,
  type OnboardingTask,
  type OnboardingTaskType,
  type OnboardingWhenDue,
  type OnboardingAssignee,
} from "@/data/staff-onboarding";
import {
  TaskConfigEditor,
  type TaskConfigValue,
  type Option,
  type ScheduleOption,
} from "./TaskConfigEditor";
import { EmployeeTaskEditor } from "./EmployeeTaskEditor";

const ROLE_OPTIONS: FacilityStaffRole[] = [
  "owner",
  "admin",
  "manager",
  "supervisor",
  "reception",
  "groomer",
  "trainer",
  "caretaker",
  "daycare_attendant",
  "boarding_attendant",
  "retail",
  "accountant",
  "sanitation",
];

const humanizeRole = (r: string) =>
  r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Manager task (Table 0): assigned to Manager / Owner / a position; due on-hire
// / within-N-days / by-first-shift.
const MANAGER_ASSIGNEES: Option[] = [
  { value: "manager", label: "Manager" },
  { value: "owner", label: "Owner" },
  ...ROLE_OPTIONS.map((r) => ({ value: r, label: humanizeRole(r) })),
];
const MANAGER_SCHEDULE: ScheduleOption[] = [
  { value: "on_hire", label: "On hire" },
  { value: "within_days", label: "Within N days", needsDays: true },
  { value: "by_first_shift", label: "By first shift" },
];

const managerToValue = (t: OnboardingTask): TaskConfigValue => ({
  id: t.id,
  name: t.name,
  description: t.description ?? "",
  assignedTo: t.assignedTo ?? "manager",
  schedule: t.when ?? "on_hire",
  scheduleDays: t.whenDays,
  required: t.required ?? true,
});

export function OnboardingTemplateEditor({
  template,
  onBack,
}: {
  template: OnboardingTemplate;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<OnboardingTemplate>(template);
  const dirty = JSON.stringify(draft) !== JSON.stringify(template);

  const patch = (p: Partial<OnboardingTemplate>) =>
    setDraft((d) => ({ ...d, ...p }));

  const toggleRole = (role: FacilityStaffRole, on: boolean) =>
    patch({
      appliesToRoles: on
        ? [...new Set([...draft.appliesToRoles, role])]
        : draft.appliesToRoles.filter((r) => r !== role),
    });

  // Map the shared editor's values back to OnboardingTask, preserving fields the
  // generic editor doesn't touch (type / requiresManager / completion state).
  const applyManagerTasks = (values: TaskConfigValue[]) => {
    const byId = new Map(draft.managerTasks.map((t) => [t.id, t]));
    const managerTasks: OnboardingTask[] = values.map((v) => {
      const orig = byId.get(v.id);
      return {
        ...orig,
        id: v.id,
        name: v.name,
        description: v.description,
        requiresManager: true,
        type: (orig?.type ?? "custom") as OnboardingTaskType,
        when: v.schedule as OnboardingWhenDue,
        whenDays: v.scheduleDays,
        assignedTo: v.assignedTo as OnboardingAssignee,
        required: v.required,
      };
    });
    patch({ managerTasks });
  };

  const save = () => {
    saveOnboardingTemplate(draft);
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

      {/* Template settings (3D) */}
      <Card>
        <CardHeader>
          <CardTitle>Template settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch
                checked={draft.status === "active"}
                onCheckedChange={(v) =>
                  patch({ status: v ? "active" : "draft" })
                }
              />
              <Label>{draft.status === "active" ? "Active" : "Draft"}</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Completion deadline (days)</Label>
              <Input
                type="number"
                min={1}
                value={draft.completionDeadlineDays}
                onChange={(e) =>
                  patch({ completionDeadlineDays: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Invite expiry (days)</Label>
              <Input
                type="number"
                min={3}
                max={30}
                value={draft.inviteExpiryDays}
                onChange={(e) =>
                  patch({ inviteExpiryDays: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Welcome message</Label>
            <Textarea
              rows={2}
              value={draft.welcomeMessage}
              onChange={(e) => patch({ welcomeMessage: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Applies to roles</Label>
            <p className="text-muted-foreground text-xs">
              None selected = applies to all roles.
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <label
                  key={role}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                >
                  <Checkbox
                    checked={draft.appliesToRoles.includes(role)}
                    onCheckedChange={(v) => toggleRole(role, v === true)}
                  />
                  {humanizeRole(role)}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager tasks (Table 0) — shared task-config editor */}
      <Card>
        <CardHeader>
          <CardTitle>Manager tasks</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Steps the facility completes for the new hire.
          </p>
        </CardHeader>
        <CardContent>
          <TaskConfigEditor
            tasks={draft.managerTasks.map(managerToValue)}
            onChange={applyManagerTasks}
            assigneeOptions={MANAGER_ASSIGNEES}
            scheduleOptions={MANAGER_SCHEDULE}
            scheduleLabel="When due"
            addLabel="Add manager task"
            emptyText="No manager tasks yet."
          />
        </CardContent>
      </Card>

      {/* Employee self-complete tasks (Table 1) */}
      <Card>
        <CardHeader>
          <CardTitle>Employee self-complete tasks</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            What the new hire fills in from their onboarding link.
          </p>
        </CardHeader>
        <CardContent>
          <EmployeeTaskEditor
            tasks={draft.employeeTasks}
            onChange={(employeeTasks) => patch({ employeeTasks })}
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
