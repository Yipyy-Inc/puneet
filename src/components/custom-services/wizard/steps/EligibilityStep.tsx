"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ShieldCheck, Link2, Box } from "lucide-react";
import type {
  CustomServiceModule,
  EligibilityCondition,
  EligibilityConditionType,
} from "@/types/facility";

const CONDITION_TYPES: {
  value: EligibilityConditionType;
  label: string;
}[] = [
  { value: "pet_type", label: "Pet Type" },
  { value: "evaluation", label: "Evaluation" },
  { value: "membership", label: "Membership" },
  { value: "waiver", label: "Waiver Signed" },
  { value: "service_booked", label: "Service Booked" },
  { value: "tag", label: "Pet Tag" },
  { value: "vaccination", label: "Vaccination" },
  { value: "age", label: "Pet Age" },
  { value: "weight", label: "Pet Weight" },
];

const OPERATORS: { value: string; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "has", label: "Has" },
  { value: "not_has", label: "Does Not Have" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
];

interface EligibilityStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function EligibilityStep({ data, onChange }: EligibilityStepProps) {
  const rules = data.eligibilityRules ?? {
    enabled: false,
    operator: "all" as const,
    conditions: [],
    deniedMessage: "",
  };
  const deps = data.serviceDependencies ?? {
    requiresServices: [],
    addonOnly: false,
    addonFor: [],
    excludesWith: [],
  };
  const cap = data.capacity ?? {
    enabled: false,
    maxPerSlot: 1,
    slotDurationMinutes: 60,
    resources: [],
    waitlistEnabled: false,
    maxWaitlist: 0,
    autoPromote: false,
    notifyOnAvailability: false,
  };

  const updateRules = (
    patch: Partial<NonNullable<CustomServiceModule["eligibilityRules"]>>,
  ) => {
    onChange({ eligibilityRules: { ...rules, ...patch } });
  };

  const updateDeps = (
    patch: Partial<NonNullable<CustomServiceModule["serviceDependencies"]>>,
  ) => {
    onChange({ serviceDependencies: { ...deps, ...patch } });
  };

  const updateCap = (
    patch: Partial<NonNullable<CustomServiceModule["capacity"]>>,
  ) => {
    onChange({ capacity: { ...cap, ...patch } });
  };

  const addCondition = () => {
    const cond: EligibilityCondition = {
      id: `ec-${Date.now()}`,
      type: "pet_type",
      operator: "equals",
      value: "Dog",
      label: "",
    };
    updateRules({ conditions: [...rules.conditions, cond] });
  };

  const updateCondition = (
    idx: number,
    patch: Partial<EligibilityCondition>,
  ) => {
    const conds = rules.conditions.map((c, i) =>
      i === idx ? { ...c, ...patch } : c,
    );
    updateRules({ conditions: conds });
  };

  const removeCondition = (idx: number) => {
    updateRules({ conditions: rules.conditions.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-8">
      {/* ── Part A: Eligibility Rules ── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="size-5" />
          <h3 className="text-sm font-semibold">Eligibility Rules</h3>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">
              Restrict who can book this service?
            </p>
            <p className="text-muted-foreground text-xs">
              Set conditions pets/clients must meet
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={rules.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => updateRules({ enabled: true })}
            >
              Yes
            </Button>
            <Button
              variant={!rules.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => updateRules({ enabled: false })}
            >
              No
            </Button>
          </div>
        </div>

        {rules.enabled && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm">Pet must meet:</span>
              <div className="flex gap-1">
                <Button
                  variant={rules.operator === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateRules({ operator: "all" })}
                >
                  All conditions
                </Button>
                <Button
                  variant={rules.operator === "any" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateRules({ operator: "any" })}
                >
                  Any condition
                </Button>
              </div>
            </div>

            {rules.conditions.map((cond, idx) => (
              <div
                key={cond.id}
                className="flex items-start gap-2 rounded-md border p-3"
              >
                <span className="text-muted-foreground mt-1.5 text-xs">
                  {idx + 1}.
                </span>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Select
                      value={cond.type}
                      onValueChange={(v) =>
                        updateCondition(idx, {
                          type: v as EligibilityConditionType,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
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
                    <Select
                      value={cond.operator}
                      onValueChange={(v) =>
                        updateCondition(idx, { operator: v as EligibilityCondition["operator"] })
                      }
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={String(cond.value)}
                      onChange={(e) =>
                        updateCondition(idx, { value: e.target.value })
                      }
                      className="h-8 flex-1 text-xs"
                      placeholder="Value..."
                    />
                  </div>
                  <Input
                    value={cond.label}
                    onChange={(e) =>
                      updateCondition(idx, { label: e.target.value })
                    }
                    className="h-7 text-[11px]"
                    placeholder="Description (e.g., Only dogs allowed)"
                  />
                </div>
                <button
                  onClick={() => removeCondition(idx)}
                  className="text-muted-foreground hover:text-destructive mt-1.5"
                >
                  <Trash2 className="size-3.5" />
                </button>
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

            <div className="grid gap-1.5">
              <Label className="text-xs">Message when denied</Label>
              <Input
                value={rules.deniedMessage ?? ""}
                onChange={(e) =>
                  updateRules({ deniedMessage: e.target.value })
                }
                placeholder="This service requires..."
                className="text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Part B: Dependencies ── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Link2 className="size-5" />
          <h3 className="text-sm font-semibold">Service Dependencies</h3>
        </div>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/30">
            <input
              type="radio"
              name="depType"
              checked={!deps.addonOnly && !deps.requiresServices?.length}
              onChange={() =>
                updateDeps({
                  addonOnly: false,
                  requiresServices: [],
                })
              }
              className="accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Standalone service</p>
              <p className="text-muted-foreground text-xs">
                Can be booked independently
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/30">
            <input
              type="radio"
              name="depType"
              checked={!!deps.requiresServices?.length}
              onChange={() =>
                updateDeps({
                  addonOnly: false,
                  requiresServices: [
                    {
                      moduleId: "boarding",
                      moduleName: "Boarding",
                      type: "concurrent",
                    },
                  ],
                })
              }
              className="accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Requires another service</p>
              <p className="text-muted-foreground text-xs">
                Client must also have a booking for...
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/30">
            <input
              type="radio"
              name="depType"
              checked={!!deps.addonOnly}
              onChange={() =>
                updateDeps({
                  addonOnly: true,
                  addonFor: ["grooming", "boarding"],
                  requiresServices: [],
                })
              }
              className="accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Add-on only</p>
              <p className="text-muted-foreground text-xs">
                Only available as an add-on to another booking
              </p>
            </div>
          </label>
        </div>
      </div>

      <Separator />

      {/* ── Part C: Capacity ── */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Box className="size-5" />
          <h3 className="text-sm font-semibold">Capacity & Resources</h3>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">Limit bookings per time slot?</p>
            <p className="text-muted-foreground text-xs">
              Set maximum concurrent bookings
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={cap.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => updateCap({ enabled: true })}
            >
              Yes
            </Button>
            <Button
              variant={!cap.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => updateCap({ enabled: false })}
            >
              No
            </Button>
          </div>
        </div>

        {cap.enabled && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Max per slot</Label>
                <Input
                  type="number"
                  value={cap.maxPerSlot ?? 1}
                  onChange={(e) =>
                    updateCap({ maxPerSlot: parseInt(e.target.value) || 1 })
                  }
                  min={1}
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Slot duration (min)</Label>
                <Select
                  value={String(cap.slotDurationMinutes ?? 60)}
                  onValueChange={(v) =>
                    updateCap({ slotDurationMinutes: parseInt(v) })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
                Waitlist
              </p>
              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={cap.waitlistEnabled}
                    onCheckedChange={(v) =>
                      updateCap({ waitlistEnabled: !!v })
                    }
                  />
                  <span className="text-sm">Enable waitlist when full</span>
                </label>
                {cap.waitlistEnabled && (
                  <div className="grid grid-cols-3 gap-3 pl-6">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Max spots</Label>
                      <Input
                        type="number"
                        value={cap.maxWaitlist ?? 5}
                        onChange={(e) =>
                          updateCap({
                            maxWaitlist: parseInt(e.target.value) || 0,
                          })
                        }
                        min={0}
                        className="h-7 text-xs"
                      />
                    </div>
                    <label className="flex items-center gap-2 pt-5">
                      <Checkbox
                        checked={cap.autoPromote}
                        onCheckedChange={(v) =>
                          updateCap({ autoPromote: !!v })
                        }
                      />
                      <span className="text-xs">Auto-book</span>
                    </label>
                    <label className="flex items-center gap-2 pt-5">
                      <Checkbox
                        checked={cap.notifyOnAvailability}
                        onCheckedChange={(v) =>
                          updateCap({ notifyOnAvailability: !!v })
                        }
                      />
                      <span className="text-xs">Notify</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
