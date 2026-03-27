"use client";

import { Plus, Trash2, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import type { CustomServiceModule, FacilityResource } from "@/types/facility";
import { cn } from "@/lib/utils";

interface CalendarAvailabilityStepProps {
  data: CustomServiceModule;
  resources: FacilityResource[];
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function CalendarAvailabilityStep({
  data,
  resources,
  onChange,
}: CalendarAvailabilityStepProps) {
  const cal = data.calendar;

  const updateCal = (updates: Partial<typeof cal>) => {
    onChange({ calendar: { ...cal, ...updates } });
  };

  const addDurationOption = () => {
    updateCal({
      durationOptions: [
        ...cal.durationOptions,
        { minutes: 60, label: "60 min", price: undefined },
      ],
    });
  };

  const removeDurationOption = (index: number) => {
    updateCal({
      durationOptions: cal.durationOptions.filter((_, i) => i !== index),
    });
  };

  const updateDurationOption = (
    index: number,
    updates: Partial<{ minutes: number; label: string; price: number }>,
  ) => {
    const next = [...cal.durationOptions];
    next[index] = { ...next[index], ...updates };
    updateCal({ durationOptions: next });
  };

  const toggleResource = (resourceId: string) => {
    const existing = cal.assignedResourceIds ?? [];
    const updated = existing.includes(resourceId)
      ? existing.filter((id) => id !== resourceId)
      : [...existing, resourceId];
    updateCal({ assignedResourceIds: updated });
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
        <div className="space-y-0.5">
          <Label
            htmlFor="cal-enabled"
            className="cursor-pointer text-sm font-semibold"
          >
            Enable Calendar & Availability
          </Label>
          <p className="text-muted-foreground text-xs">
            Allow scheduling with specific time slots on your facility calendar.
          </p>
        </div>
        <Switch
          id="cal-enabled"
          checked={cal.enabled}
          onCheckedChange={(enabled) => updateCal({ enabled })}
        />
      </div>

      {!cal.enabled && (
        <div className="bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Calendar is disabled. This service won&apos;t appear on the
            scheduling calendar. You can still enable online booking and manual
            staff assignment.
          </span>
        </div>
      )}

      <div
        className={cn(
          "space-y-6",
          !cal.enabled && "pointer-events-none opacity-50",
        )}
      >
        {/* Duration Mode */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Duration Mode</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Fixed: all sessions are the same length. Variable: clients choose
              from multiple options.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Duration mode"
            className="flex gap-3"
          >
            {(["fixed", "variable"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={cal.durationMode === mode}
                onClick={() => updateCal({ durationMode: mode })}
                className={cn(
                  "flex-1 rounded-lg border-2 p-3 text-left transition-colors",
                  cal.durationMode === mode
                    ? "border-primary bg-primary/5 text-primary"
                    : `border-border hover:border-border/80 hover:bg-accent/30`,
                )}
              >
                <p className="text-sm font-semibold capitalize">{mode}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {mode === "fixed"
                    ? "One session length for all bookings"
                    : "Clients select from multiple durations"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration Options */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            Duration Option{cal.durationMode === "variable" ? "s" : ""}
          </Label>
          {cal.durationOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                step={5}
                value={opt.minutes}
                onChange={(e) =>
                  updateDurationOption(i, {
                    minutes: parseInt(e.target.value) || 0,
                    label: `${e.target.value} min`,
                  })
                }
                className="w-24"
                placeholder="60"
              />
              <span className="text-muted-foreground shrink-0 text-xs">
                min
              </span>
              <Input
                value={opt.label}
                onChange={(e) =>
                  updateDurationOption(i, { label: e.target.value })
                }
                className="flex-1"
                placeholder="Label (e.g. 60 min)"
              />
              {cal.durationMode === "variable" && (
                <>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={opt.price ?? ""}
                    onChange={(e) =>
                      updateDurationOption(i, {
                        price: parseFloat(e.target.value) || undefined,
                      })
                    }
                    className="w-24"
                    placeholder="Price"
                  />
                </>
              )}
              {cal.durationOptions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeDurationOption(i)}
                >
                  <Trash2 className="text-destructive size-3.5" />
                </Button>
              )}
            </div>
          ))}
          {cal.durationMode === "variable" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDurationOption}
              className="mt-1"
            >
              <Plus className="size-3.5" />
              Add Duration
            </Button>
          )}
        </div>

        <Separator />

        {/* Buffer + Max Simultaneous */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="buffer-time">Buffer Time (minutes)</Label>
            <Input
              id="buffer-time"
              type="number"
              min={0}
              step={5}
              value={cal.bufferTimeMinutes}
              onChange={(e) =>
                updateCal({ bufferTimeMinutes: parseInt(e.target.value) || 0 })
              }
            />
            <p className="text-muted-foreground text-xs">
              Time between bookings for cleanup or prep.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-simultaneous">Max Simultaneous Bookings</Label>
            <Input
              id="max-simultaneous"
              type="number"
              min={1}
              value={cal.maxSimultaneousBookings}
              onChange={(e) =>
                updateCal({
                  maxSimultaneousBookings: parseInt(e.target.value) || 1,
                })
              }
            />
            <p className="text-muted-foreground text-xs">
              How many bookings can overlap at the same time slot.
            </p>
          </div>
        </div>

        <Separator />

        {/* Assignment Mode */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold">Assigned To</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">
              What resource this service consumes when booked.
            </p>
          </div>
          <Select
            value={cal.assignedTo}
            onValueChange={(v) =>
              updateCal({ assignedTo: v as typeof cal.assignedTo })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff Member</SelectItem>
              <SelectItem value="resource">
                Facility Resource (room, pool, van…)
              </SelectItem>
              <SelectItem value="room">Room / Kennel</SelectItem>
              <SelectItem value="combination">
                Combination (staff + resource)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resource selection (only when assignedTo resource/combination) */}
        {(cal.assignedTo === "resource" || cal.assignedTo === "combination") &&
          resources.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Assign Resources</Label>
              <p className="text-muted-foreground text-xs">
                Select which resources this service can use. Availability is
                tracked per resource.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {resources.map((res) => {
                  const isChecked = (cal.assignedResourceIds ?? []).includes(
                    res.id,
                  );
                  return (
                    <label
                      key={res.id}
                      className={cn(
                        `flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors`,
                        isChecked
                          ? "border-primary bg-primary/5"
                          : `border-border hover:bg-accent/30`,
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleResource(res.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{res.name}</p>
                        <p className="text-muted-foreground text-xs capitalize">
                          {res.type} · capacity {res.capacity}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
