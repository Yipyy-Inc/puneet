"use client";

import { Info, UtensilsCrossed, Pill, Backpack } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomServiceModule } from "@/types/facility";

interface CareInstructionsStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

type CareMode = "required" | "optional" | "disabled";

const MODE_OPTIONS: { value: CareMode; label: string; description: string }[] =
  [
    {
      value: "required",
      label: "Required",
      description: "Staff must fill this in before the booking is complete",
    },
    {
      value: "optional",
      label: "Optional",
      description: "Shown to staff but not mandatory",
    },
    {
      value: "disabled",
      label: "Disabled",
      description: "Hidden entirely — not relevant for this service",
    },
  ];

const CARE_FIELDS: {
  key: keyof NonNullable<CustomServiceModule["careInstructions"]>;
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
];

export function CareInstructionsStep({
  data,
  onChange,
}: CareInstructionsStepProps) {
  const care = data.careInstructions ?? {
    feeding: "optional",
    medication: "optional",
    belongings: "optional",
  };

  const update = (key: keyof typeof care, value: CareMode) => {
    onChange({ careInstructions: { ...care, [key]: value } });
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
        {CARE_FIELDS.map(({ key, label, description, Icon }) => (
          <div
            key={key}
            className="border-border bg-card flex items-start gap-4 rounded-xl border p-4"
          >
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Icon className="text-muted-foreground size-4" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <Label className="text-sm font-semibold">{label}</Label>
              <p className="text-muted-foreground text-xs">{description}</p>
            </div>

            <Select
              value={care[key]}
              onValueChange={(v) => update(key, v as CareMode)}
            >
              <SelectTrigger className="w-32 shrink-0">
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
          </div>
        ))}
      </div>
    </div>
  );
}
