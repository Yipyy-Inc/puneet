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
import { useSaveOnboardingTemplate } from "@/lib/api/staff-onboarding";
import {
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
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { useStaffRoleLabel } from "@/lib/settings/use-staff-role-label";

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
  const t = useSettingsText().section("onboarding-templates");
  const roleLabel = useStaffRoleLabel();
  const { mutate: saveTemplate, isPending: saving } =
    useSaveOnboardingTemplate();

  // Manager task (Table 0): assigned to Manager / Owner / a position; due
  // on-hire / within-N-days / by-first-shift. Built here rather than at module
  // scope so the labels follow the viewer's language.
  const managerAssignees: Option[] = [
    { value: "manager", label: roleLabel("manager") },
    { value: "owner", label: roleLabel("owner") },
    ...ROLE_OPTIONS.map((r) => ({ value: r, label: roleLabel(r) })),
  ];
  const managerSchedule: ScheduleOption[] = [
    { value: "on_hire", label: t("schedOnHire") },
    { value: "within_days", label: t("schedWithinDays"), needsDays: true },
    { value: "by_first_shift", label: t("schedByFirstShift") },
  ];
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

  // Same correction as the offboarding editor: this wrote to the mock store
  // while the list it returns to reads Postgres, so the save reported success
  // and the edit was gone on reload. Navigation now waits for the write.
  const save = () => {
    saveTemplate(draft, {
      onSuccess: () => {
        toast.success(t("savedToast"));
        onBack();
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : t("saveFailed")),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {t("backToTemplates")}
        </Button>
        {/* §1: there is no second action colour. This was bg-emerald-600,
            which renders --success — a status ink standing in for the one
            primary. */}
        <Button onClick={save} disabled={!dirty || saving}>
          {t("saveTemplate")}
        </Button>
      </div>

      {/* Template settings (3D) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("name")}</Label>
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
              <Label>
                {t(draft.status === "active" ? "statusActive" : "statusDraft")}
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label>{t("completionDeadline")}</Label>
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
              <Label>{t("inviteExpiry")}</Label>
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
            <Label>{t("welcomeMessage")}</Label>
            <Textarea
              rows={2}
              value={draft.welcomeMessage}
              onChange={(e) => patch({ welcomeMessage: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("appliesToRoles")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("appliesToRolesHelp")}
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
                  {roleLabel(role)}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager tasks (Table 0) — shared task-config editor */}
      <Card>
        <CardHeader>
          <CardTitle>{t("managerTasks")}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("managerTasksHelp")}
          </p>
        </CardHeader>
        <CardContent>
          <TaskConfigEditor
            tasks={draft.managerTasks.map(managerToValue)}
            onChange={applyManagerTasks}
            assigneeOptions={managerAssignees}
            scheduleOptions={managerSchedule}
            text={{
              scheduleLabel: t("whenDue"),
              addLabel: t("addManagerTask"),
              emptyText: t("noManagerTasks"),
              taskName: t("taskName"),
              removeTask: t("removeTask"),
              descriptionOptional: t("descriptionOptional"),
              assignedTo: t("assignedTo"),
              days: t("days"),
              required: t("required"),
            }}
          />
        </CardContent>
      </Card>

      {/* Employee self-complete tasks (Table 1) */}
      <Card>
        <CardHeader>
          <CardTitle>{t("employeeTasks")}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("employeeTasksHelp")}
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
        <Button onClick={save} disabled={!dirty || saving}>
          {t("saveTemplate")}
        </Button>
      </div>
    </div>
  );
}
