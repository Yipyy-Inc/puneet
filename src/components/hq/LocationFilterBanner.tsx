"use client";

import { Globe, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocationContext } from "@/hooks/use-location-context";
import { useHydrated } from "@/hooks/use-hydrated";
import { locationStyles } from "@/lib/hq/location-styles";

/**
 * Page-level HQ View control (spec Table 17). A small segmented toggle that
 * flips the shared LocationContext between HQ (all locations) and a single
 * location, plus the "HQ View — showing data across all locations" status line
 * the dashboard already used. This is the same signal (`setHQView` /
 * `setLocation`) the removed top-nav selector drove, so every downstream
 * location-scoping consumer is unchanged. Renders only on multi-location
 * facilities; single-location facilities show nothing.
 */
export function LocationFilterBanner() {
  const {
    currentLocation,
    isHQView,
    isMultiLocation,
    locations,
    setHQView,
    setLocation,
  } = useLocationContext();
  const mounted = useHydrated();

  if (!isMultiLocation || !mounted) return null;

  const segment =
    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors";

  return (
    <div className="space-y-1.5">
      {/* Segmented HQ / location toggle — drives the shared LocationContext. */}
      <div className="bg-muted/20 inline-flex max-w-full flex-wrap items-center gap-1 rounded-xl border p-1">
        <button
          type="button"
          onClick={setHQView}
          aria-pressed={isHQView}
          className={cn(
            segment,
            isHQView
              ? "bg-sky-500 text-white"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Globe className="size-3.5" />
          All Locations
        </button>
        {locations.map((loc) => {
          const active = !isHQView && currentLocation?.id === loc.id;
          const s = locationStyles(loc);
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => setLocation(loc.id)}
              aria-pressed={active}
              className={cn(
                segment,
                active
                  ? cn(s.bg, "text-white")
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  active ? "bg-white/80" : s.bg,
                )}
              />
              <span className="max-w-[140px] truncate">{loc.name}</span>
              {!loc.isActive && (
                <span className="text-[9px] opacity-70">· Inactive</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Status line — the pattern the dashboard already showed. */}
      {isHQView ? (
        <p className="flex items-center gap-1.5 px-1 text-xs font-medium text-sky-600 dark:text-sky-400">
          <Globe className="size-3" />
          HQ View — showing data across all locations
        </p>
      ) : currentLocation ? (
        <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-xs">
          <MapPin className="size-3" />
          Filtered to {currentLocation.name}
        </p>
      ) : null}
    </div>
  );
}
