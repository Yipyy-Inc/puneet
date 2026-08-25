"use client";

import { Globe, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Structural, not `Location`/`FacilityLocation` -- this picker only ever reads
// id/shortCode/color, and both the fixture and the real location shape carry
// those (the real one just allows null for shortCode/color).
interface ScopeLocation {
  id: string;
  shortCode?: string | null;
  color?: string | null;
}

interface Props {
  locations: ScopeLocation[];
  /**
   * Selected location IDs. Empty array = all locations / global scope.
   */
  value: string[];
  onChange: (next: string[]) => void;
  /** Compact form for inline placement */
  compact?: boolean;
  /** Custom label for the "all locations" pill */
  allLabel?: string;
  className?: string;
}

export function LocationScopePicker({
  locations,
  value,
  onChange,
  compact,
  allLabel = "All locations",
  className,
}: Props) {
  const isGlobal = value.length === 0;

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const setGlobal = () => onChange([]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        compact ? "" : "bg-muted/20 rounded-lg border p-2",
        className,
      )}
    >
      <button
        type="button"
        onClick={setGlobal}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
          isGlobal
            ? "border-sky-500 bg-sky-500 text-white"
            : "border-input bg-background text-muted-foreground hover:bg-muted",
        )}
      >
        <Globe className="size-3" />
        {allLabel}
      </button>
      {locations.map((loc) => {
        const active = !isGlobal && value.includes(loc.id);
        return (
          <button
            key={loc.id}
            type="button"
            onClick={() => toggle(loc.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "text-white"
                : "border-input bg-background text-muted-foreground hover:bg-muted",
            )}
            style={
              active
                ? {
                    borderColor: loc.color ?? undefined,
                    backgroundColor: loc.color ?? undefined,
                  }
                : undefined
            }
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                backgroundColor: active ? "white" : (loc.color ?? undefined),
              }}
            />
            {loc.shortCode}
          </button>
        );
      })}
    </div>
  );
}

export function LocationScopeBadge({
  locationIds,
  locations,
}: {
  locationIds: string[] | undefined;
  locations: ScopeLocation[];
}) {
  if (!locationIds || locationIds.length === 0) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Globe className="size-3" />
        All locations
      </Badge>
    );
  }
  if (locationIds.length === 1) {
    const loc = locations.find((l) => l.id === locationIds[0]);
    if (!loc) return null;
    return (
      <Badge
        variant="outline"
        className="gap-1 text-[10px]"
        style={{
          borderColor: loc.color ?? undefined,
          color: loc.color ?? undefined,
        }}
      >
        <MapPin className="size-3" />
        {loc.shortCode}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-[10px]">
      <MapPin className="size-3" />
      {locationIds.length} locations
    </Badge>
  );
}
