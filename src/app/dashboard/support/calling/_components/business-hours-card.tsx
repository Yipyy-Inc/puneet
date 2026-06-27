"use client";

import { Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import {
  updateBusinessHours,
  useSupportCallingSettings,
} from "@/lib/support-calling-settings-store";
import { DAY_LABELS, DAYS } from "./settings-utils";

export function BusinessHoursCard() {
  const settings = useSupportCallingSettings();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-green-600" />
          Business Hours
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Calls outside these hours route to the after-hours voicemail greeting.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {DAYS.map((day) => {
            const h = settings.businessHours[day];
            return (
              <div key={day} className="flex items-center gap-3">
                <Switch
                  checked={h.enabled}
                  onCheckedChange={(v) =>
                    updateBusinessHours(day, { enabled: v })
                  }
                  aria-label={`${DAY_LABELS[day]} open`}
                />
                <span
                  className={cn(
                    "w-9 text-sm font-semibold",
                    !h.enabled && "text-muted-foreground",
                  )}
                >
                  {DAY_LABELS[day]}
                </span>
                {h.enabled ? (
                  <div className="flex items-center gap-2">
                    <TimePickerLux
                      value={h.open}
                      onValueChange={(v) =>
                        updateBusinessHours(day, { open: v })
                      }
                      displayMode="popover"
                      stepMinutes={15}
                    />
                    <span className="text-muted-foreground">—</span>
                    <TimePickerLux
                      value={h.close}
                      onValueChange={(v) =>
                        updateBusinessHours(day, { close: v })
                      }
                      displayMode="popover"
                      stepMinutes={15}
                      min={h.open}
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
