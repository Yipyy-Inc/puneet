"use client";

import { Bed, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { CustomServiceModule } from "@/lib/types";
import { getCategoryMeta } from "@/data/custom-services";
import { cn } from "@/lib/utils";

interface StayBasedStepProps {
  data: CustomServiceModule;
  onChange: (updates: Partial<CustomServiceModule>) => void;
}

export function StayBasedStep({ data, onChange }: StayBasedStepProps) {
  const sb = data.stayBased;

  const updateSb = (updates: Partial<typeof sb>) => {
    onChange({ stayBased: { ...sb, ...updates } });
  };

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Bed className="text-muted-foreground mt-0.5 size-5 shrink-0" />
          <div className="space-y-0.5">
            <Label
              htmlFor="sb-enabled"
              className="cursor-pointer text-sm font-semibold"
            >
              Enable Stay-Based Features
            </Label>
            <p className="text-muted-foreground text-xs">
              Activate when this service spans multiple days and involves
              physical space (kennels, suites, rooms).
            </p>
          </div>
        </div>
        <Switch
          id="sb-enabled"
          checked={sb.enabled}
          onCheckedChange={(enabled) => updateSb({ enabled })}
        />
      </div>

      {!sb.enabled && (
        <div className="bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-lg p-3 text-xs">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Stay-based features are off. This service is treated as a timed
            session or appointment, not a multi-day stay. Enable this for
            boarding-style services.
          </span>
        </div>
      )}

      <div
        className={cn(
          "space-y-4",
          !sb.enabled && "pointer-events-none opacity-50",
        )}
      >
        {/* Requires Room/Kennel */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-0.5">
            <Label
              htmlFor="sb-room"
              className="cursor-pointer text-sm font-medium"
            >
              Requires Room / Kennel Assignment
            </Label>
            <p className="text-muted-foreground text-xs">
              A kennel or room must be assigned before check-in. Staff will be
              prompted to select a space when creating the booking.
            </p>
          </div>
          <Switch
            id="sb-room"
            checked={sb.requiresRoomKennel}
            onCheckedChange={(requiresRoomKennel) =>
              updateSb({ requiresRoomKennel })
            }
          />
        </div>

        {/* Affects Kennel View */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-0.5">
            <Label
              htmlFor="sb-kennel-view"
              className="cursor-pointer text-sm font-medium"
            >
              Show on Kennel / Room View
            </Label>
            <p className="text-muted-foreground text-xs">
              Bookings for this service will appear on the facility Kennel View
              board, occupying a room or kennel slot for the duration of the
              stay.
            </p>
          </div>
          <Switch
            id="sb-kennel-view"
            checked={sb.affectsKennelView}
            onCheckedChange={(affectsKennelView) =>
              updateSb({ affectsKennelView })
            }
          />
        </div>

        {/* Generates Daily Tasks */}
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <div className="space-y-0.5">
            <Label
              htmlFor="sb-daily-tasks"
              className="cursor-pointer text-sm font-medium"
            >
              Generate Daily Care Tasks
            </Label>
            <p className="text-muted-foreground text-xs">
              Automatically create daily tasks (feeding, medication checks, walk
              schedules) for each day of the stay. Task templates are configured
              in the Staff Assignment step.
            </p>
          </div>
          <Switch
            id="sb-daily-tasks"
            checked={sb.generatesDailyTasks}
            onCheckedChange={(generatesDailyTasks) =>
              updateSb({ generatesDailyTasks })
            }
          />
        </div>

        {sb.generatesDailyTasks && (
          <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-400">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Daily tasks will be auto-generated at midnight for each
              in-progress stay. Configure which task types are generated in the{" "}
              <strong>Staff Assignment</strong> step.
            </span>
          </div>
        )}
      </div>

      {/* Category hint */}
      {data.category !== "stay_based" && sb.enabled && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Your selected category is{" "}
            <strong>
              {getCategoryMeta(data.category)?.name ?? data.category}
            </strong>
            . Stay-based features are enabled but consider switching the
            category to &quot;Stay-Based&quot; for the best default settings.
          </span>
        </div>
      )}
    </div>
  );
}
