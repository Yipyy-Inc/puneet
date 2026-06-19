"use client";

import { Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CustomServiceModule,
  CustomServiceEvaluationType,
  CustomServiceTaskAssignmentMode,
} from "@/types/facility";
import { cn } from "@/lib/utils";

const EVALUATION_TYPES: {
  value: CustomServiceEvaluationType;
  label: string;
}[] = [
  { value: "temperament", label: "Temperament Assessment" },
  { value: "swim_test", label: "Swim Test" },
  { value: "health_check", label: "Health Check" },
  { value: "custom", label: "Custom" },
];

const STAFF_QUALIFICATIONS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  { value: "cpr_first_aid", label: "Pet CPR & First Aid" },
  { value: "water_safety", label: "Water Safety / Lifeguard" },
  { value: "dog_behavior", label: "Dog Behavior Certification" },
  { value: "grooming_cert", label: "Professional Grooming Certification" },
  { value: "vet_tech_license", label: "Vet Tech License" },
  { value: "custom", label: "Custom…" },
];

const TASK_ASSIGNMENT_MODES: {
  value: CustomServiceTaskAssignmentMode;
  label: string;
}[] = [
  { value: "same_as_booking", label: "Same staff as booking" },
  { value: "any_available", label: "Any available staff" },
  { value: "unassigned", label: "Leave unassigned" },
];

const STANDARD_ROLES = [
  { value: "general", label: "General Staff" },
  { value: "pool_staff", label: "Pool Staff" },
  { value: "driver", label: "Driver" },
  { value: "trainer", label: "Trainer" },
  { value: "groomer", label: "Groomer" },
  { value: "vet_tech", label: "Vet Tech" },
  { value: "custom", label: "Custom Role…" },
];

const TASK_OPTIONS: {
  value: "setup" | "execution" | "cleanup";
  label: string;
  description: string;
}[] = [
  {
    value: "setup",
    label: "Setup Task",
    description:
      "Task created before the session begins (e.g. prepare equipment).",
  },
  {
    value: "execution",
    label: "Execution Task",
    description: "Task created for the active session period.",
  },
  {
    value: "cleanup",
    label: "Cleanup Task",
    description:
      "Task created after the session ends (e.g. clean and reset area).",
  },
];

interface StaffAssignmentStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function StaffAssignmentStep({
  data,
  onChange,
}: StaffAssignmentStepProps) {
  const sa = data.staffAssignment;

  const updateSa = (updates: Partial<typeof sa>) => {
    onChange({ staffAssignment: { ...sa, ...updates } });
  };

  const toggleTask = (task: "setup" | "execution" | "cleanup") => {
    const existing = sa.taskGeneration;
    const updated = existing.includes(task)
      ? existing.filter((t) => t !== task)
      : [...existing, task];
    updateSa({ taskGeneration: updated });
  };

  const taskMode = (task: "setup" | "execution" | "cleanup") =>
    sa.taskAssignmentModes?.[task] ?? "same_as_booking";

  const updateTaskMode = (
    task: "setup" | "execution" | "cleanup",
    mode: CustomServiceTaskAssignmentMode,
  ) => {
    updateSa({
      taskAssignmentModes: { ...sa.taskAssignmentModes, [task]: mode },
    });
  };

  return (
    <div className="space-y-6">
      {/* Auto-Assign */}
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Users className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div className="space-y-0.5">
            <Label
              htmlFor="auto-assign"
              className="cursor-pointer text-sm font-semibold"
            >
              Auto-Assign Staff
            </Label>
            <p className="text-muted-foreground text-xs">
              Automatically assign the next available qualified staff member
              when a booking is confirmed.
            </p>
          </div>
        </div>
        <Switch
          id="auto-assign"
          checked={sa.autoAssign}
          onCheckedChange={(autoAssign) => updateSa({ autoAssign })}
        />
      </div>

      {!sa.autoAssign && (
        <p className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-xs">
          Staff assignment will be manual. A manager must assign a staff member
          before or after the booking is confirmed.
        </p>
      )}

      <Separator />

      {/* Required Role */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Required Staff Role</Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Only staff with this role can be assigned to this service.
          </p>
        </div>
        <Select
          value={sa.requiredRole}
          onValueChange={(v) => updateSa({ requiredRole: v })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STANDARD_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Role Name */}
        {sa.requiredRole === "custom" && (
          <div className="space-y-1.5">
            <Label htmlFor="custom-role-name">Custom Role Name</Label>
            <Input
              id="custom-role-name"
              placeholder="e.g. Party Host"
              value={sa.customRoleName ?? ""}
              onChange={(e) => updateSa({ customRoleName: e.target.value })}
              className="w-full"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Minimum Staff Qualification */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">
            Minimum Staff Qualification
          </Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Beyond role, require a certification or training badge before a
            staff member can be auto- or manually assigned to this service.
          </p>
        </div>
        <Select
          value={sa.requiredQualification ? sa.requiredQualification : "none"}
          onValueChange={(v) =>
            updateSa({ requiredQualification: v === "none" ? "" : v })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAFF_QUALIFICATIONS.map((q) => (
              <SelectItem key={q.value || "none"} value={q.value || "none"}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sa.requiredQualification === "custom" && (
          <div className="space-y-1.5">
            <Label htmlFor="custom-qualification">
              Custom Qualification Name
            </Label>
            <Input
              id="custom-qualification"
              placeholder="e.g. Hydrotherapy Level 2"
              value={sa.customQualification ?? ""}
              onChange={(e) =>
                updateSa({ customQualification: e.target.value })
              }
              className="w-full"
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Staff-to-Pet Ratio */}
      <div className="space-y-1.5">
        <Label htmlFor="staff-pet-ratio" className="text-sm font-semibold">
          Staff-to-Pet Ratio
        </Label>
        <p className="text-muted-foreground text-xs">
          Maximum pets one staff member can supervise at once (e.g. pool,
          socialization classes). Used in capacity calculations. Leave blank for
          no limit.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">1 staff :</span>
          <Input
            id="staff-pet-ratio"
            type="number"
            min={1}
            value={sa.staffToPetRatio ?? ""}
            onChange={(e) =>
              updateSa({
                staffToPetRatio: e.target.value
                  ? parseInt(e.target.value) || undefined
                  : undefined,
              })
            }
            placeholder="—"
            className="w-24"
          />
          <span className="text-muted-foreground text-sm">pets</span>
        </div>
      </div>

      <Separator />

      {/* Task Generation */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">
            Automatic Task Generation
          </Label>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Select which tasks are automatically created in the task queue when
            a booking is confirmed. Tasks will be assigned to the designated
            staff member.
          </p>
        </div>
        <div className="space-y-2">
          {TASK_OPTIONS.map((task) => {
            const isChecked = sa.taskGeneration.includes(task.value);
            return (
              <label
                key={task.value}
                className={cn(
                  `flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors`,
                  isChecked
                    ? "border-primary bg-primary/5"
                    : `border-border hover:bg-accent/30`,
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleTask(task.value)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{task.label}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {task.description}
                  </p>
                  {isChecked && (
                    <div
                      className="mt-2 flex items-center gap-2"
                      onClick={(e) => e.preventDefault()}
                    >
                      <span className="text-muted-foreground text-xs">
                        Assign to:
                      </span>
                      <Select
                        value={taskMode(task.value)}
                        onValueChange={(v) =>
                          updateTaskMode(
                            task.value,
                            v as CustomServiceTaskAssignmentMode,
                          )
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-56"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_ASSIGNMENT_MODES.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Integration flags */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Integration Flags</Label>
        <div className="space-y-3">
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="yipyygo"
                className="cursor-pointer text-sm font-medium"
              >
                YipyyGo App Required
              </Label>
              <p className="text-muted-foreground text-xs">
                Staff must use the YipyyGo mobile app to manage this service.
              </p>
            </div>
            <Switch
              id="yipyygo"
              checked={data.yipyyGoRequired}
              onCheckedChange={(yipyyGoRequired) =>
                onChange({ yipyyGoRequired })
              }
            />
          </div>
          <div className="border-border bg-card space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label
                  htmlFor="requires-eval"
                  className="cursor-pointer text-sm font-medium"
                >
                  Evaluation Required
                </Label>
                <p className="text-muted-foreground text-xs">
                  Pets must pass a facility evaluation before being eligible for
                  this service.
                </p>
              </div>
              <Switch
                id="requires-eval"
                checked={data.requiresEvaluation}
                onCheckedChange={(requiresEvaluation) =>
                  onChange({ requiresEvaluation })
                }
              />
            </div>

            {data.requiresEvaluation && (
              <div className="space-y-2 border-t pt-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="evaluation-type"
                    className="text-xs font-medium"
                  >
                    Which evaluation type is required?
                  </Label>
                  <Select
                    value={data.evaluationType ?? "temperament"}
                    onValueChange={(v) =>
                      onChange({
                        evaluationType: v as CustomServiceEvaluationType,
                      })
                    }
                  >
                    <SelectTrigger id="evaluation-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVALUATION_TYPES.map((ev) => (
                        <SelectItem key={ev.value} value={ev.value}>
                          {ev.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {data.evaluationType === "custom" && (
                  <Input
                    placeholder="Name the required evaluation"
                    value={data.customEvaluationLabel ?? ""}
                    onChange={(e) =>
                      onChange({ customEvaluationLabel: e.target.value })
                    }
                  />
                )}
                <p className="text-muted-foreground text-xs">
                  The evaluation record must be on the pet&apos;s file before
                  staff can confirm the booking.
                </p>
              </div>
            )}
          </div>
          <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
            <div className="space-y-0.5">
              <Label
                htmlFor="show-sidebar"
                className="cursor-pointer text-sm font-medium"
              >
                Show in Sidebar
              </Label>
              <p className="text-muted-foreground text-xs">
                Display this service as a quick-access item in the facility
                sidebar.
              </p>
            </div>
            <Switch
              id="show-sidebar"
              checked={data.showInSidebar}
              onCheckedChange={(showInSidebar) => onChange({ showInSidebar })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
