"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface PointsExpiryValue {
  enabled: boolean;
  days: number;
}

/**
 * Simple inactivity-based points expiry: a toggle (off by default) and the
 * number of inactive days before points lapse. Controlled component.
 */
export function PointsExpiryEditor({
  value,
  onChange,
}: {
  value: PointsExpiryValue;
  onChange: (v: PointsExpiryValue) => void;
}) {
  const months = Math.round((value.days || 0) / 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label className="text-base">Expire points after inactivity</Label>
          <p className="text-muted-foreground text-sm">
            Off by default. When on, a customer&apos;s points expire after a set
            period with no activity.
          </p>
        </div>
        <Switch
          checked={value.enabled}
          onCheckedChange={(checked) =>
            onChange({
              enabled: checked,
              days: checked && value.days <= 0 ? 365 : value.days,
            })
          }
          aria-label="Enable points expiry"
        />
      </div>

      {value.enabled && (
        <div className="space-y-1.5">
          <Label htmlFor="points-expiry-days">
            Days of inactivity before points expire
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="points-expiry-days"
              type="number"
              min={1}
              className="w-32"
              value={value.days || ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  days: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
            <span className="text-muted-foreground text-sm">
              ≈ {months} month{months === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            Customers get a warning email 30 days before their points expire.
          </p>
        </div>
      )}
    </div>
  );
}
