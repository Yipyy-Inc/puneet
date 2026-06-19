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
import { ShieldCheck, Box } from "lucide-react";
import type { CustomServiceModule } from "@/types/facility";
import { EligibilityConditionBuilder } from "./EligibilityConditionBuilder";
import { ServiceDependenciesSection } from "./ServiceDependenciesSection";
import { GeographicRestriction } from "./GeographicRestriction";

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

            <EligibilityConditionBuilder
              conditions={rules.conditions}
              onChange={(conditions) => updateRules({ conditions })}
            />

            <div className="grid gap-1.5">
              <Label className="text-xs">Message when denied</Label>
              <Input
                value={rules.deniedMessage ?? ""}
                onChange={(e) => updateRules({ deniedMessage: e.target.value })}
                placeholder="This service requires..."
                className="text-xs"
              />
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ── Part B: Dependencies ── */}
      <ServiceDependenciesSection
        value={deps}
        onChange={updateDeps}
        currentModuleId={data.id}
      />

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
                <Label className="text-xs">Maximum pets per session</Label>
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
                <Label className="text-xs">Maximum concurrent sessions</Label>
                <Input
                  type="number"
                  value={cap.maxConcurrentSessions ?? 1}
                  onChange={(e) =>
                    updateCap({
                      maxConcurrentSessions: parseInt(e.target.value) || 1,
                    })
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
              <div className="grid gap-1.5">
                <Label className="text-xs">Overbooking buffer (%)</Label>
                <Input
                  type="number"
                  value={cap.overbookingBufferPercent ?? 0}
                  onChange={(e) =>
                    updateCap({
                      overbookingBufferPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  min={0}
                  max={100}
                  className="h-8 text-xs"
                />
                <p className="text-muted-foreground text-[11px]">
                  Allow this % over capacity for walk-ins.
                </p>
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
                    onCheckedChange={(v) => updateCap({ waitlistEnabled: !!v })}
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
                        onCheckedChange={(v) => updateCap({ autoPromote: !!v })}
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

      <Separator />

      {/* ── Part D: Geographic Restriction ── */}
      <GeographicRestriction
        value={data.geographicRestriction}
        onChange={(geo) => onChange({ geographicRestriction: geo })}
        category={data.category}
      />
    </div>
  );
}
