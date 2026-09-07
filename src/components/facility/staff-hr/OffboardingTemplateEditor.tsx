"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type {
  OffboardingTemplate,
  OffboardingTask,
} from "@/data/staff-onboarding";
import {
  useStaffHrConfig,
  useSaveOffboardingTemplate,
} from "@/lib/api/staff-onboarding";
import {
  TaskConfigEditor,
  type TaskConfigValue,
  type Option,
  type ScheduleOption,
} from "./TaskConfigEditor";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// Offboarding tasks (2.1 / Table 3): assigned to Manager / Owner / HR; due on
// termination date / within N days / before last day.
// The label is a KEY; the option list is built inside the component so it
// can be translated. Both arrays are handed to a Select that renders `label`
// itself, so a key left unresolved would show on screen.
const OFFBOARDING_ASSIGNEE_KEYS: Option[] = [
  { value: "manager", label: "assigneeManager" },
  { value: "owner", label: "assigneeOwner" },
  { value: "hr", label: "assigneeHr" },
];
const OFFBOARDING_SCHEDULE_KEYS: ScheduleOption[] = [
  { value: "on_termination", label: "scheduleOnTermination" },
  { value: "within_days", label: "scheduleWithinDays", needsDays: true },
  { value: "before_last_day", label: "scheduleBeforeLastDay" },
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
  const t = useSettingsText().section("offboarding-templates");
  // Reason options come from the editable Staff & HR config (the same list the
  // status-change dialog offers), so a reason-scoped template actually matches
  // a termination. `appliesToReasons` stores the reason LABEL string.
  const { terminationReasons } = useStaffHrConfig();
  const { mutate: saveTemplate, isPending: saving } =
    useSaveOffboardingTemplate();
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

  // Navigating back happens in onSuccess, not alongside the call. This wrote to
  // the mock store while the LIST it returns to reads Postgres, so a save said
  // "Template saved", closed the editor, and lost the edit — the two halves of
  // the screen were talking to different systems.
  const save = () => {
    saveTemplate(draft, {
      onSuccess: () => {
        toast.success(t("templateSaved"));
        onBack();
      },
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : t("couldNotSave")),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft className="size-4" />
          {t("backToTemplates")}
        </Button>
        {/* §1: there is no second action colour. */}
        <Button onClick={save} disabled={!dirty || saving}>
          {t("saveTemplate")}
        </Button>
      </div>

      {/* Template settings — name + applies-to reasons */}
      <Card>
        <CardHeader>
          <CardTitle>{t("templateSettings")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>{t("name")}</Label>
            <Input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("appliesToReasons")}</Label>
            <p className="text-muted-foreground text-xs">
              {t("appliesToReasonsHelp")}
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
          <CardTitle>{t("managerTasks")}</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("managerTasksHelp")}
          </p>
        </CardHeader>
        <CardContent>
          <TaskConfigEditor
            tasks={draft.managerTasks.map(taskToValue)}
            onChange={(values) =>
              patch({ managerTasks: values.map(valueToTask) })
            }
            assigneeOptions={OFFBOARDING_ASSIGNEE_KEYS.map((o) => ({
              ...o,
              label: t(o.label),
            }))}
            scheduleOptions={OFFBOARDING_SCHEDULE_KEYS.map((o) => ({
              ...o,
              label: t(o.label),
            }))}
            text={{
              scheduleLabel: t("due"),
              addLabel: t("addTask"),
              emptyText: t("noTasksYet"),
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

      <div className="flex justify-end">
        <Button onClick={save} disabled={!dirty || saving}>
          {t("saveTemplate")}
        </Button>
      </div>
    </div>
  );
}
