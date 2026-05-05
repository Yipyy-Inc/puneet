"use client";

import { AlertTriangle, MapPin, ShieldAlert, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocationContext } from "@/hooks/use-location-context";
import { incidents } from "@/data/incidents";
import { deriveLocationId } from "@/data/locations";
import { Badge } from "@/components/ui/badge";

interface Props {
  petId: number;
  /** When passed, only flag incidents from a different location than this one */
  highlightOtherLocations?: boolean;
  /** Compact display for use inside a check-in modal */
  compact?: boolean;
}

const SEVERITY_TONE: Record<string, string> = {
  low: "text-emerald-700 bg-emerald-50 border-emerald-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  high: "text-orange-700 bg-orange-50 border-orange-200",
  critical: "text-red-700 bg-red-50 border-red-200",
};

/**
 * Surface incident history for a pet at check-in time. Honors the
 * `sharedIncidentHistory` HQ setting — when ON, incidents from any
 * location are visible; when OFF, only the current location's are shown.
 *
 * Use this above any check-in form so the staff member sees the safety
 * history before letting the pet into the facility.
 */
export function PetIncidentSafetyAlert({
  petId,
  highlightOtherLocations = true,
  compact,
}: Props) {
  const { currentLocation, settings, locations } = useLocationContext();

  const petIncidents = incidents.filter((i) => i.petIds.includes(petId));
  if (petIncidents.length === 0) return null;

  const visible = settings.sharedIncidentHistory
    ? petIncidents
    : petIncidents.filter((i) => {
        const incLoc = deriveLocationId(i.id);
        return currentLocation ? incLoc === currentLocation.id : true;
      });

  if (visible.length === 0) return null;

  // Sort newest first, prioritise critical/high severity
  const sorted = visible
    .slice()
    .sort((a, b) => {
      const sevWeight: Record<string, number> = {
        critical: 3,
        high: 2,
        medium: 1,
        low: 0,
      };
      const sevDelta = (sevWeight[b.severity] ?? 0) - (sevWeight[a.severity] ?? 0);
      if (sevDelta !== 0) return sevDelta;
      return new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime();
    });

  const hasCritical = sorted.some(
    (i) => i.severity === "critical" || i.severity === "high",
  );

  return (
    <div
      className={cn(
        "rounded-xl border-2",
        hasCritical
          ? "border-red-300 bg-red-50/60 dark:border-red-900 dark:bg-red-900/20"
          : "border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-900/20",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert
          className={cn(
            "mt-0.5 size-4 shrink-0",
            hasCritical
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400",
          )}
        />
        <div className="flex-1">
          <p
            className={cn(
              "font-semibold",
              hasCritical
                ? "text-red-800 dark:text-red-300"
                : "text-amber-800 dark:text-amber-300",
              compact ? "text-xs" : "text-sm",
            )}
          >
            Incident history — {sorted.length} prior incident
            {sorted.length === 1 ? "" : "s"}
          </p>
          {!settings.sharedIncidentHistory && (
            <p className="text-amber-700 dark:text-amber-400 mt-0.5 text-[10px] italic">
              Shared incident history is OFF — turn it on in HQ Settings to see
              incidents from other locations.
            </p>
          )}

          <div className={cn("space-y-1.5", compact ? "mt-1.5" : "mt-2.5")}>
            {sorted.slice(0, compact ? 2 : 4).map((inc) => {
              const incLoc = deriveLocationId(inc.id);
              const incLocation = locations.find((l) => l.id === incLoc);
              const isOtherLocation =
                highlightOtherLocations &&
                currentLocation &&
                incLocation &&
                incLocation.id !== currentLocation.id;
              return (
                <div
                  key={inc.id}
                  className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5"
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 capitalize text-[10px]",
                      SEVERITY_TONE[inc.severity],
                    )}
                  >
                    {inc.severity}
                  </Badge>
                  <span className="text-muted-foreground text-[10px] tabular-nums">
                    {new Date(inc.incidentDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {incLocation && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white",
                        isOtherLocation && "ring-2 ring-amber-400",
                      )}
                      style={{ backgroundColor: incLocation.color }}
                      title={incLocation.name}
                    >
                      <MapPin className="size-2.5" />
                      {incLocation.shortCode}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs">
                    {inc.title}
                  </span>
                  {isOtherLocation && (
                    <AlertTriangle className="size-3 shrink-0 text-amber-600" />
                  )}
                </div>
              );
            })}
            {sorted.length > (compact ? 2 : 4) && (
              <p className="text-muted-foreground text-[10px]">
                +{sorted.length - (compact ? 2 : 4)} more — view full history in
                pet profile
              </p>
            )}
          </div>

          {hasCritical && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-red-700 dark:text-red-400",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              <ChevronRight className="size-3" />
              Review with manager before allowing into group play
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
