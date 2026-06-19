"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import type {
  CustomServiceModule,
  CustomServiceCategory,
} from "@/types/facility";
import { cn } from "@/lib/utils";

type GeoConfig = NonNullable<CustomServiceModule["geographicRestriction"]>;

const DEFAULT_GEO: GeoConfig = {
  enabled: false,
  mode: "radius",
  radius: 10,
  radiusUnit: "mi",
  postalCodes: [],
};

interface GeographicRestrictionProps {
  value: GeoConfig | undefined;
  onChange: (geo: GeoConfig) => void;
  category: CustomServiceCategory;
}

export function GeographicRestriction({
  value,
  onChange,
  category,
}: GeographicRestrictionProps) {
  const geo = value ?? DEFAULT_GEO;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="size-5" />
        <h3 className="text-sm font-semibold">Geographic Restriction</h3>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Restrict to a service area?</p>
          <p className="text-muted-foreground text-xs">
            Define where this service is available
            {category === "transport"
              ? " — recommended for transport / taxi services."
              : "."}
          </p>
        </div>
        <Switch
          checked={geo.enabled}
          onCheckedChange={(enabled) => onChange({ ...geo, enabled })}
        />
      </div>

      {geo.enabled && (
        <div className="mt-4 space-y-4">
          <div
            role="radiogroup"
            aria-label="Service area mode"
            className="flex gap-3"
          >
            {(
              [
                { value: "radius", label: "Radius from facility" },
                { value: "postal_codes", label: "Postal codes / areas" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={geo.mode === opt.value}
                onClick={() => onChange({ ...geo, mode: opt.value })}
                className={cn(
                  "flex-1 rounded-lg border-2 p-3 text-left text-sm font-medium transition-colors",
                  geo.mode === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-border/80 hover:bg-accent/30",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {geo.mode === "radius" ? (
            <div className="grid gap-1.5">
              <Label className="text-xs">Service radius from facility</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={geo.radius ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...geo,
                      radius: parseFloat(e.target.value) || undefined,
                    })
                  }
                  placeholder="10"
                  className="w-28"
                />
                <Select
                  value={geo.radiusUnit ?? "mi"}
                  onValueChange={(v) =>
                    onChange({ ...geo, radiusUnit: v as "mi" | "km" })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mi">miles</SelectItem>
                    <SelectItem value="km">km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label className="text-xs">Postal codes / neighbourhoods</Label>
              <Textarea
                rows={3}
                value={(geo.postalCodes ?? []).join(", ")}
                onChange={(e) =>
                  onChange({
                    ...geo,
                    postalCodes: e.target.value
                      .split(/[\n,]/)
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="e.g. H2X 1Y4, H3B, Plateau, Mile End"
                className="resize-none text-sm"
              />
              <p className="text-muted-foreground text-[11px]">
                Separate entries with commas or new lines.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
