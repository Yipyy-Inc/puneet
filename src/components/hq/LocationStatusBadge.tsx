"use client";

import { Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocationContext } from "@/hooks/use-location-context";
import { useHydrated } from "@/hooks/use-hydrated";

export function LocationStatusBadge() {
  const { currentLocation, isHQView, isMultiLocation } = useLocationContext();
  const mounted = useHydrated();

  if (!isMultiLocation || !mounted) return null;

  if (isHQView) {
    return (
      <div className="hidden items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 sm:flex dark:border-sky-900/40 dark:bg-sky-950/30">
        <Globe className="size-3 text-sky-500" />
        <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400">
          HQ View
        </span>
      </div>
    );
  }

  if (!currentLocation) return null;

  return (
    <div
      className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 sm:flex"
      style={{
        borderColor: `${currentLocation.color}40`,
        backgroundColor: `${currentLocation.color}10`,
      }}
    >
      <div
        className="size-2 rounded-full"
        style={{ backgroundColor: currentLocation.color }}
      />
      <span
        className="text-[11px] font-semibold"
        style={{ color: currentLocation.color }}
      >
        {currentLocation.shortCode} · {currentLocation.city}
      </span>
    </div>
  );
}
