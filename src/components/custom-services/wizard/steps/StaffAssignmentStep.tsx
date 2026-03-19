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
import type { CustomServiceModule } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    description: "Task created before the session begins (e.g. prepare equipment).",
  },
  {
    value: "execution",
    label: "Execution Task",
    description: "Task created for the active session period.",
  },
  {
    value: "cleanup",
    label: "Cleanup Task",
    description: "Task created after the session ends (e.g. clean and reset area).",
  },
];

interface StaffAssignmentStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function StaffAssignmentStep({ data, onChange }: StaffAssignmentStepProps) {
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

  return (
    <div className="space-y-6">
      {/* Auto-Assign */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <Label htmlFor="auto-assign" className="text-sm font-semibold cursor-pointer">
              Auto-Assign Staff
            </Label>
            <p className="text-xs text-muted-foreground">
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
        <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 p-3">
          Staff assignment will be manual. A manager must assign a staff member
          before or after the booking is confirmed.
        </p>
      )}

      <Separator />

      {/* Required Role */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Required Staff Role</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
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

      {/* Task Generation */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-semibold">Automatic Task Generation</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select which tasks are automatically created in the task queue when a
            booking is confirmed. Tasks will be assigned to the designated staff member.
          </p>
        </div>
        <div className="space-y-2">
          {TASK_OPTIONS.map((task) => {
            const isChecked = sa.taskGeneration.includes(task.value);
            return (
              <label
                key={task.value}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
                  isChecked
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/30",
                )}
              >
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggleTask(task.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{task.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {task.description}
                  </p>
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
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="space-y-0.5">
              <Label htmlFor="yipyygo" className="text-sm font-medium cursor-pointer">
                YipyyGo App Required
              </Label>
              <p className="text-xs text-muted-foreground">
                Staff must use the YipyyGo mobile app to manage this service.
              </p>
            </div>
            <Switch
              id="yipyygo"
              checked={data.yipyyGoRequired}
              onCheckedChange={(yipyyGoRequired) => onChange({ yipyyGoRequired })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="space-y-0.5">
              <Label htmlFor="requires-eval" className="text-sm font-medium cursor-pointer">
                Evaluation Required
              </Label>
              <p className="text-xs text-muted-foreground">
                Pets must pass a facility evaluation before being eligible for this service.
              </p>
            </div>
            <Switch
              id="requires-eval"
              checked={data.requiresEvaluation}
              onCheckedChange={(requiresEvaluation) => onChange({ requiresEvaluation })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="space-y-0.5">
              <Label htmlFor="show-sidebar" className="text-sm font-medium cursor-pointer">
                Show in Sidebar
              </Label>
              <p className="text-xs text-muted-foreground">
                Display this service as a quick-access item in the facility sidebar.
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
