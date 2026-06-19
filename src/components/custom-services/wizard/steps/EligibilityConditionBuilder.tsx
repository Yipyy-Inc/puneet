"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type {
  EligibilityCondition,
  EligibilityConditionType,
} from "@/types/facility";
import { facilitySpeciesConfig, vaccinationRules } from "@/data/settings";
import { cn } from "@/lib/utils";

const CONDITION_TYPES: {
  value: EligibilityConditionType;
  label: string;
}[] = [
  { value: "pet_type", label: "Pet Species" },
  { value: "age", label: "Pet Age (months)" },
  { value: "weight", label: "Pet Weight (lbs)" },
  { value: "vaccination", label: "Vaccination Status" },
  { value: "evaluation", label: "Completed Evaluation" },
  { value: "account_standing", label: "Account Standing" },
  { value: "membership", label: "Membership" },
  { value: "waiver", label: "Waiver Signed" },
  { value: "service_booked", label: "Service Booked" },
  { value: "tag", label: "Pet Tag" },
];

const EVALUATION_OPTIONS = [
  { value: "temperament", label: "Temperament Assessment" },
  { value: "swim_test", label: "Swim Test" },
  { value: "health_check", label: "Health Check" },
];

const ACCOUNT_STANDING_OPTIONS = [
  { value: "no_outstanding_balance", label: "No outstanding balance" },
  { value: "good_standing", label: "Account in good standing" },
];

const VACCINE_NAMES = Array.from(
  new Set(vaccinationRules.map((v) => v.vaccineName)),
);

/** Sensible defaults when a condition's type changes. */
function defaultsForType(
  type: EligibilityConditionType,
): Partial<EligibilityCondition> {
  switch (type) {
    case "pet_type":
      return {
        operator: "in_list",
        value: [],
        minValue: undefined,
        maxValue: undefined,
      }; // species list
    case "vaccination":
      return {
        operator: "has",
        value: [],
        minValue: undefined,
        maxValue: undefined,
      };
    case "age":
    case "weight":
      return {
        operator: "between",
        value: "",
        minValue: undefined,
        maxValue: undefined,
      };
    case "evaluation":
      return {
        operator: "equals",
        value: "temperament",
        minValue: undefined,
        maxValue: undefined,
      };
    case "account_standing":
      return {
        operator: "equals",
        value: "no_outstanding_balance",
        minValue: undefined,
        maxValue: undefined,
      };
    case "waiver":
      return {
        operator: "has",
        value: true,
        minValue: undefined,
        maxValue: undefined,
      };
    default:
      return {
        operator: "has",
        value: "",
        minValue: undefined,
        maxValue: undefined,
      };
  }
}

/** Human-readable summary used for display elsewhere (review panel, etc.). */
function buildLabel(cond: EligibilityCondition): string {
  const list = Array.isArray(cond.value) ? cond.value : [];
  switch (cond.type) {
    case "pet_type":
      return list.length ? `Species: ${list.join(", ")}` : "Pet species";
    case "age":
      return `Age ${cond.minValue ?? "?"}–${cond.maxValue ?? "?"} months`;
    case "weight":
      return `Weight ${cond.minValue ?? "?"}–${cond.maxValue ?? "?"} lbs`;
    case "vaccination":
      return list.length
        ? `Vaccines: ${list.join(", ")}`
        : "Vaccination on file";
    case "evaluation": {
      const ev = EVALUATION_OPTIONS.find((o) => o.value === cond.value);
      return `Completed: ${ev?.label ?? cond.value}`;
    }
    case "account_standing":
      return cond.value === "good_standing"
        ? "Account in good standing"
        : "No outstanding balance";
    default:
      return `${cond.type}: ${String(cond.value)}`;
  }
}

function MultiToggle({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const checked = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              checked
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-accent/30",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

interface EligibilityConditionBuilderProps {
  conditions: EligibilityCondition[];
  onChange: (conditions: EligibilityCondition[]) => void;
}

export function EligibilityConditionBuilder({
  conditions,
  onChange,
}: EligibilityConditionBuilderProps) {
  const update = (idx: number, patch: Partial<EligibilityCondition>) => {
    const next = conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    // Refresh the derived label for the edited row.
    next[idx] = { ...next[idx], label: buildLabel(next[idx]) };
    onChange(next);
  };

  const changeType = (idx: number, type: EligibilityConditionType) => {
    const base = { ...conditions[idx], type, ...defaultsForType(type) };
    update(idx, { ...base, label: buildLabel(base) });
  };

  const toggleInList = (idx: number, value: string) => {
    const arr = Array.isArray(conditions[idx].value)
      ? (conditions[idx].value as string[])
      : [];
    update(idx, {
      value: arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value],
    });
  };

  const addCondition = () => {
    // Lint-safe unique id without Date.now()/Math.random().
    const nextNum =
      conditions.reduce((max, c) => {
        const n = parseInt(c.id.replace(/\D/g, ""), 10);
        return Number.isFinite(n) && n > max ? n : max;
      }, 0) + 1;
    const base: EligibilityCondition = {
      id: `ec-${nextNum}`,
      type: "pet_type",
      operator: "in_list",
      value: [],
      label: "Pet species",
    };
    onChange([...conditions, base]);
  };

  const removeCondition = (idx: number) => {
    onChange(conditions.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      {conditions.map((cond, idx) => (
        <div key={cond.id} className="space-y-3 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">{idx + 1}.</span>
            <Select
              value={cond.type}
              onValueChange={(v) =>
                changeType(idx, v as EligibilityConditionType)
              }
            >
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => removeCondition(idx)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>

          {/* Type-specific inputs */}
          {cond.type === "pet_type" && (
            <MultiToggle
              options={facilitySpeciesConfig.species}
              selected={Array.isArray(cond.value) ? cond.value : []}
              onToggle={(v) => toggleInList(idx, v)}
            />
          )}

          {cond.type === "vaccination" && (
            <div className="space-y-1.5">
              <Label className="text-[11px]">
                Must have these vaccines on file
              </Label>
              <MultiToggle
                options={VACCINE_NAMES}
                selected={Array.isArray(cond.value) ? cond.value : []}
                onToggle={(v) => toggleInList(idx, v)}
              />
            </div>
          )}

          {(cond.type === "age" || cond.type === "weight") && (
            <div className="flex items-end gap-2">
              <div className="grid gap-1">
                <Label className="text-[11px]">Min</Label>
                <Input
                  type="number"
                  min={0}
                  value={cond.minValue ?? ""}
                  onChange={(e) =>
                    update(idx, {
                      minValue: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  className="h-8 w-24 text-xs"
                  placeholder="0"
                />
              </div>
              <span className="text-muted-foreground pb-2 text-xs">to</span>
              <div className="grid gap-1">
                <Label className="text-[11px]">Max</Label>
                <Input
                  type="number"
                  min={0}
                  value={cond.maxValue ?? ""}
                  onChange={(e) =>
                    update(idx, {
                      maxValue: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                  className="h-8 w-24 text-xs"
                  placeholder="—"
                />
              </div>
              <span className="text-muted-foreground pb-2 text-xs">
                {cond.type === "age" ? "months" : "lbs"}
              </span>
            </div>
          )}

          {cond.type === "evaluation" && (
            <Select
              value={String(cond.value)}
              onValueChange={(v) => update(idx, { value: v })}
            >
              <SelectTrigger className="h-8 w-64 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVALUATION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {cond.type === "account_standing" && (
            <Select
              value={String(cond.value)}
              onValueChange={(v) => update(idx, { value: v })}
            >
              <SelectTrigger className="h-8 w-64 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_STANDING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {cond.type === "waiver" && (
            <p className="text-muted-foreground text-xs">
              Pet must have a signed waiver on file.
            </p>
          )}

          {(cond.type === "membership" ||
            cond.type === "service_booked" ||
            cond.type === "tag") && (
            <Input
              value={typeof cond.value === "string" ? cond.value : ""}
              onChange={(e) => update(idx, { value: e.target.value })}
              className="h-8 text-xs"
              placeholder={
                cond.type === "membership"
                  ? "Membership tier name"
                  : cond.type === "service_booked"
                    ? "Service name"
                    : "Tag name"
              }
            />
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={addCondition}
      >
        <Plus className="size-3" />
        Add Condition
      </Button>
    </div>
  );
}
