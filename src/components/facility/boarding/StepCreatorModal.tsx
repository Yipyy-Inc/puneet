"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staffMembers } from "@/data/staff";
import { addonTypeEnum } from "@/types/boarding";
import type {
  DailyCareStep,
  DailyCareTaskType,
  CustomLogType,
} from "@/types/boarding";

// Step Type is a UI concept (spec 4.3). Enrichment and Custom both compile to a
// "custom" task — Enrichment leaves logType empty (routes to the enrichment log
// modal), Custom carries a declared Log Type.
type StepTypeValue =
  | "potty"
  | "feeding"
  | "medication"
  | "kennel_clean"
  | "water_refill"
  | "addon"
  | "enrichment"
  | "custom";

const STEP_TYPES: { value: StepTypeValue; label: string }[] = [
  { value: "potty", label: "Potty Round" },
  { value: "feeding", label: "Feeding" },
  { value: "medication", label: "Medication" },
  { value: "kennel_clean", label: "Kennel Cleaning" },
  { value: "water_refill", label: "Water Refill" },
  { value: "addon", label: "Add-On Service" },
  { value: "enrichment", label: "Enrichment" },
  { value: "custom", label: "Custom" },
];

const CUSTOM_LOG_TYPES: { value: CustomLogType; label: string }[] = [
  { value: "confirm", label: "Simple Confirm" },
  { value: "chips", label: "Outcome Chips" },
  { value: "notes", label: "Notes Only" },
  { value: "photo", label: "Photo Required" },
];

type AppliesKind = "all" | "feeding_plan" | "medications" | "addon" | "tags";

const APPLIES_TO: { value: AppliesKind; label: string }[] = [
  { value: "all", label: "All Boarding Guests" },
  { value: "feeding_plan", label: "Dogs with a feeding plan" },
  { value: "medications", label: "Dogs with medications" },
  { value: "addon", label: "Dogs with this add-on booked" },
  { value: "tags", label: "Dogs with tags" },
];

type AssignKind = "unassigned" | "role" | "person";

const COMMON_TAGS = [
  "Allergy",
  "Meds",
  "Post-Surgery",
  "Heat Cycle",
  "Anxiety",
  "Senior",
  "Dog Selective",
  "Escape Artist",
];

const DAYS: { value: number; label: string }[] = [
  { value: 0, label: "Su" },
  { value: 1, label: "Mo" },
  { value: 2, label: "Tu" },
  { value: 3, label: "We" },
  { value: 4, label: "Th" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
];

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function prettifyAddon(v: string): string {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const ADDON_OPTIONS = addonTypeEnum.options.map((v) => ({
  value: v,
  label: prettifyAddon(v),
}));

function stepTypeOf(step: DailyCareStep): StepTypeValue {
  switch (step.taskType) {
    case "potty":
    case "feeding":
    case "medication":
    case "kennel_clean":
    case "water_refill":
    case "addon":
      return step.taskType;
    default:
      // custom / bedding_change — a declared Log Type means "Custom", else
      // it's an Enrichment step.
      return step.logType ? "custom" : "enrichment";
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The step being edited, or null to create a new one. */
  step: DailyCareStep | null;
  /** All current steps — used to default Requires Head Count for the last
   *  potty round of the day. */
  existingSteps: DailyCareStep[];
  onSubmit: (data: Omit<DailyCareStep, "id" | "sortOrder">) => void;
};

/**
 * Step Creator (spec 4.3) — create or edit a Daily Care step. Every field maps
 * to a DailyCareStep field (F1): appliesTo, assignedStaff, requiresHeadCount,
 * activeDays, logType. The parent persists the result via setConfig.
 */
export function StepCreatorModal({
  open,
  onOpenChange,
  step,
  existingSteps,
  onSubmit,
}: Props) {
  const activeStaff = staffMembers.filter((s) => s.isActive);
  const roles = [...new Set(activeStaff.map((s) => s.role))];

  const [name, setName] = useState(step?.name ?? "");
  const [time, setTime] = useState(step?.time ?? "");
  const [stepType, setStepType] = useState<StepTypeValue>(
    step ? stepTypeOf(step) : "potty",
  );
  const [description, setDescription] = useState(step?.description ?? "");
  const [logType, setLogType] = useState<CustomLogType>(
    step?.logType ?? "confirm",
  );

  // Applies-to (F1).
  const [appliesKind, setAppliesKind] = useState<AppliesKind>(
    step?.appliesTo?.kind ?? "all",
  );
  const [appliesAddonId, setAppliesAddonId] = useState(
    step?.appliesTo?.kind === "addon" ? (step.appliesTo.addonId ?? "") : "",
  );
  const [appliesTags, setAppliesTags] = useState<string[]>(
    step?.appliesTo?.kind === "tags" ? step.appliesTo.tags : [],
  );

  // Assigned staff (F1).
  const [assignKind, setAssignKind] = useState<AssignKind>(
    step?.assignedStaff?.kind ?? "unassigned",
  );
  const [assignRole, setAssignRole] = useState(
    step?.assignedStaff?.kind === "role" ? step.assignedStaff.role : "",
  );
  const [assignPerson, setAssignPerson] = useState(
    step?.assignedStaff?.kind === "person" ? step.assignedStaff.staffId : "",
  );

  // Active days (F1) — default all 7.
  const [activeDays, setActiveDays] = useState<number[]>(
    step?.activeDays ?? ALL_DAYS,
  );

  // Requires head count (F1). null = follow the "last potty round" default;
  // a boolean means the user set it explicitly.
  const [headCountOverride, setHeadCountOverride] = useState<boolean | null>(
    step ? (step.requiresHeadCount ?? false) : null,
  );

  // Default ON for the last potty round of the day.
  const isLastPottyRound =
    stepType === "potty" &&
    time !== "" &&
    existingSteps
      .filter((s) => s.taskType === "potty" && s.enabled && s.id !== step?.id)
      .every((s) => s.time <= time);
  const requiresHeadCount = headCountOverride ?? isLastPottyRound;

  const isCustom = stepType === "custom";
  const canSubmit = name.trim().length > 0 && time !== "";

  function toggleDay(d: number) {
    setActiveDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  function toggleTag(tag: string) {
    setAppliesTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function buildAssignedStaff(): DailyCareStep["assignedStaff"] {
    if (assignKind === "role" && assignRole) {
      return { kind: "role", role: assignRole };
    }
    if (assignKind === "person" && assignPerson) {
      const p = activeStaff.find((s) => s.id === assignPerson);
      if (p) return { kind: "person", staffId: p.id, staffName: p.name };
    }
    return { kind: "unassigned" };
  }

  function buildAppliesTo(): DailyCareStep["appliesTo"] {
    if (appliesKind === "feeding_plan") return { kind: "feeding_plan" };
    if (appliesKind === "medications") return { kind: "medications" };
    if (appliesKind === "addon") {
      return appliesAddonId
        ? { kind: "addon", addonId: appliesAddonId }
        : { kind: "addon" };
    }
    if (appliesKind === "tags") return { kind: "tags", tags: appliesTags };
    return undefined; // "all" — undefined means all boarding guests.
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const taskType: DailyCareTaskType =
      stepType === "enrichment" || stepType === "custom" ? "custom" : stepType;
    onSubmit({
      name: name.trim(),
      time,
      taskType,
      description: description.trim() || undefined,
      logType: isCustom ? logType : undefined,
      assignedStaff: buildAssignedStaff(),
      appliesTo: buildAppliesTo(),
      requiresHeadCount: requiresHeadCount ? true : undefined,
      activeDays:
        activeDays.length === 7
          ? undefined
          : [...activeDays].sort((a, b) => a - b),
      enabled: step?.enabled ?? true,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{step ? "Edit Step" : "Add Step"}</DialogTitle>
          <DialogDescription>
            Every field drives how this step appears and logs in the Daily Care
            List.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto py-1 pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="step-name" className="text-xs">
                Step Name
              </Label>
              <Input
                id="step-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning Potty Round"
                aria-invalid={name.trim().length === 0}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Step Type</Label>
              <Select
                value={stepType}
                onValueChange={(v) => setStepType(v as StepTypeValue)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="step-time" className="text-xs">
                Time of Day
              </Label>
              <Input
                id="step-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-invalid={time === ""}
              />
            </div>
          </div>

          {isCustom && (
            <div className="space-y-1.5">
              <Label className="text-xs">Log Type</Label>
              <Select
                value={logType}
                onValueChange={(v) => setLogType(v as CustomLogType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_LOG_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value}>
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="step-desc" className="text-xs">
              Description (optional)
            </Label>
            <Textarea
              id="step-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Staff instructions for this step..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Applies to (F1) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Who This Task Applies To</Label>
            <Select
              value={appliesKind}
              onValueChange={(v) => setAppliesKind(v as AppliesKind)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLIES_TO.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {appliesKind === "addon" && (
              <Select value={appliesAddonId} onValueChange={setAppliesAddonId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select add-on" />
                </SelectTrigger>
                <SelectContent>
                  {ADDON_OPTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {appliesKind === "tags" && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {COMMON_TAGS.map((tag) => {
                  const selected = appliesTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      data-selected={selected}
                      className="data-[selected=true]:border-primary data-[selected=true]:bg-primary/10 data-[selected=false]:text-muted-foreground rounded-md border px-2 py-1 text-xs font-medium transition-colors"
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned staff (F1) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Assigned Staff</Label>
              <Select
                value={assignKind}
                onValueChange={(v) => setAssignKind(v as AssignKind)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    Unassigned (All Staff)
                  </SelectItem>
                  <SelectItem value="role">By Role</SelectItem>
                  <SelectItem value="person">Specific Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignKind === "role" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={assignRole} onValueChange={setAssignRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {assignKind === "person" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Staff Member</Label>
                <Select value={assignPerson} onValueChange={setAssignPerson}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Active days (F1) */}
          <div className="space-y-1.5">
            <Label className="text-xs">Active Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const selected = activeDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    data-selected={selected}
                    className="data-[selected=true]:border-primary data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[selected=false]:text-muted-foreground size-9 rounded-md border text-xs font-medium transition-colors"
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[11px]">
              {activeDays.length === 7
                ? "Runs every day."
                : `Runs on ${activeDays.length} ${activeDays.length === 1 ? "day" : "days"}.`}
            </p>
          </div>

          {/* Requires head count (F1) */}
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label className="text-sm font-medium">Requires Head Count</Label>
              <p className="text-muted-foreground mt-0.5 text-xs">
                The Last Call rollcall — staff must account for every dog before
                completing this step. Defaults on for the last potty round.
              </p>
            </div>
            <Switch
              checked={requiresHeadCount}
              onCheckedChange={(v) => setHeadCountOverride(v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {step ? "Save changes" : "Add step"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
