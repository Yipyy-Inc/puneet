"use client";

import { MapPin, Globe, X } from "lucide-react";
import { useLocationContext } from "@/hooks/use-location-context";
import { useHydrated } from "@/hooks/use-hydrated";

export function LocationFilterBanner() {
  const { currentLocation, isHQView, isMultiLocation, setHQView } =
    useLocationContext();
  const mounted = useHydrated();

  if (!isMultiLocation || !mounted) return null;

  if (isHQView) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm dark:border-sky-900/40 dark:bg-sky-950/30">
        <Globe className="size-4 shrink-0 text-sky-500" />
        <span className="font-medium text-sky-700 dark:text-sky-400">
          HQ View — showing data across all locations
        </span>
      </div>
    );
  }

  if (!currentLocation) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"
      style={{
        borderColor: `${currentLocation.color}30`,
        backgroundColor: `${currentLocation.color}08`,
      }}
    >
      <div
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: currentLocation.color }}
      />
      <MapPin className="size-3.5 shrink-0" style={{ color: currentLocation.color }} />
      <span className="font-medium" style={{ color: currentLocation.color }}>
        {currentLocation.name}
      </span>
      <span className="text-muted-foreground">— filtered to this location</span>
      <button
        onClick={setHQView}
        className="text-muted-foreground hover:text-foreground ml-auto rounded-md p-0.5 transition-colors"
        title="Switch to HQ view (all locations)"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
