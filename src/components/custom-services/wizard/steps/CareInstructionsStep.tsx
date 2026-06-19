"use client";

import {
  Info,
  UtensilsCrossed,
  Pill,
  Backpack,
  ShieldAlert,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CustomServiceModule,
  CareInstructionDisplay,
} from "@/types/facility";

interface CareInstructionsStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

type CareMode = "required" | "optional" | "disabled";
type CareSection = "feeding" | "medication" | "belongings" | "safetyNotes";

const MODE_OPTIONS: { value: CareMode; label: string }[] = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "disabled", label: "Disabled" },
];

const DISPLAY_OPTIONS: {
  value: CareInstructionDisplay;
  label: string;
  description: string;
}[] = [
  {
    value: "highlight",
    label: "Highlight",
    description: "Shown prominently at the top of the pet card",
  },
  { value: "standard", label: "Standard", description: "Shown normally" },
  {
    value: "reference",
    label: "Reference Only",
    description: "Collapsed by default, expandable",
  },
];

const CARE_FIELDS: {
  key: CareSection;
  label: string;
  description: string;
  Icon: React.ElementType;
}[] = [
  {
    key: "feeding",
    label: "Feeding Instructions",
    description:
      "Meal times, portion sizes, food type, and special dietary needs.",
    Icon: UtensilsCrossed,
  },
  {
    key: "medication",
    label: "Medications",
    description: "Prescription drugs, supplements, and dosage schedules.",
    Icon: Pill,
  },
  {
    key: "belongings",
    label: "Belongings",
    description: "Items the pet brings (bed, toys, leash) tracked for return.",
    Icon: Backpack,
  },
  {
    key: "safetyNotes",
    label: "Special Safety Notes",
    description:
      "Physical limitations, behavioral flags, or emergency protocols specific to this service (e.g. swim ability, life-jacket requirements, allergies).",
    Icon: ShieldAlert,
  },
];

export function CareInstructionsStep({
  data,
  onChange,
}: CareInstructionsStepProps) {
  const care = data.careInstructions ?? {
    feeding: "optional" as CareMode,
    medication: "optional" as CareMode,
    belongings: "optional" as CareMode,
  };

  const modeOf = (key: CareSection): CareMode => care[key] ?? "optional";
  const displayOf = (key: CareSection): CareInstructionDisplay =>
    care.staffDisplay?.[key] ?? "standard";

  const updateMode = (key: CareSection, value: CareMode) => {
    onChange({ careInstructions: { ...care, [key]: value } });
  };

  const updateDisplay = (key: CareSection, value: CareInstructionDisplay) => {
    onChange({
      careInstructions: {
        ...care,
        staffDisplay: { ...care.staffDisplay, [key]: value },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 flex items-start gap-2 rounded-lg p-3 text-xs">
        <Info className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
        <p className="text-muted-foreground">
          Configure which care-instruction sections appear on booking detail
          pages for this service. Staff see <strong>Required</strong> sections
          with a red badge. <strong>Optional</strong> sections are shown but not
          enforced. <strong>Disabled</strong> sections are hidden entirely.
        </p>
      </div>

      <div className="space-y-4">
        {CARE_FIELDS.map(({ key, label, description, Icon }) => {
          const mode = modeOf(key);
          return (
            <div
              key={key}
              className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start"
            >
              <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="text-muted-foreground size-4" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-sm font-semibold">{label}</Label>
                <p className="text-muted-foreground text-xs">{description}</p>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                <Select
                  value={mode}
                  onValueChange={(v) => updateMode(key, v as CareMode)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {mode !== "disabled" && (
                  <Select
                    value={displayOf(key)}
                    onValueChange={(v) =>
                      updateDisplay(key, v as CareInstructionDisplay)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Staff view" />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPLAY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex flex-col text-left">
                            <span>{opt.label}</span>
                            <span className="text-muted-foreground text-[11px]">
                              {opt.description}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-400">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <p>
          These settings define the <strong>template</strong> for every booking
          of this service. The pet-specific instructions a customer enters per
          booking appear in these same sections as instance-level data.
        </p>
      </div>
    </div>
  );
}
