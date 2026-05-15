"use client";

import { Home, Map as MapIcon } from "lucide-react";
import type { Coord } from "@/lib/route-planning";

// Matches the route-planner's home base so the same set of stops renders
// in the same position regardless of which surface is showing the route.
const HOME_COORD: Coord = { x: 50, y: 92 };

interface RouteStop {
  coord: Coord;
  label: number;
  petName: string;
}

interface MobileRouteMapPreviewProps {
  vanColor: string;
  /** Already-confirmed stops on this groomer's route for the chosen date. */
  stops: RouteStop[];
  /**
   * The new appointment's tentative position on the route. Rendered with a
   * dashed pin so it reads as "not booked yet — preview only".
   */
  tentativeStop?: RouteStop;
  /** Optional caption shown above the map. */
  caption?: string;
}

/**
 * Compact, embeddable version of the route planner's RouteMap. Designed for
 * the booking dialog's Step 3 — staff confirms where the new appointment
 * falls on the groomer's route before committing.
 */
export function MobileRouteMapPreview({
  vanColor,
  stops,
  tentativeStop,
  caption,
}: MobileRouteMapPreviewProps) {
  // Build the path: home → confirmed stops → tentative stop (if any) → home.
  const pathPoints = [
    HOME_COORD,
    ...stops.map((s) => s.coord),
    ...(tentativeStop ? [tentativeStop.coord] : []),
    HOME_COORD,
  ]
    .map((c) => `${c.x},${c.y}`)
    .join(" ");

  return (
    <div className="space-y-1">
      {caption && (
        <p className="text-[10px] font-medium text-muted-foreground">
          {caption}
        </p>
      )}
      <div className="relative h-40 w-full overflow-hidden rounded-lg border bg-gradient-to-br from-sky-50/60 via-emerald-50/40 to-violet-50/40 dark:from-sky-950/30 dark:via-emerald-950/20 dark:to-violet-950/20">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)",
            backgroundSize: "10% 10%",
          }}
        />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
        >
          {(stops.length > 0 || tentativeStop) && (
            <polyline
              points={pathPoints}
              fill="none"
              stroke={vanColor}
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2,1.5"
              opacity={0.85}
            />
          )}

          {/* Home base */}
          <g>
            <circle
              cx={HOME_COORD.x}
              cy={HOME_COORD.y}
              r={3.5}
              fill="#0f172a"
              stroke="white"
              strokeWidth={1}
            />
            <text
              x={HOME_COORD.x}
              y={HOME_COORD.y + 1.1}
              textAnchor="middle"
              fontSize={3.2}
              fill="white"
              fontWeight={700}
            >
              H
            </text>
          </g>

          {/* Confirmed stops */}
          {stops.map((s) => (
            <g key={`stop-${s.label}`}>
              <circle
                cx={s.coord.x}
                cy={s.coord.y}
                r={3.6}
                fill={vanColor}
                stroke="white"
                strokeWidth={1}
              />
              <text
                x={s.coord.x}
                y={s.coord.y + 1.2}
                textAnchor="middle"
                fontSize={3.1}
                fill="white"
                fontWeight={700}
              >
                {s.label}
              </text>
              <title>{s.petName}</title>
            </g>
          ))}

          {/* Tentative new appointment — dashed outline, hollow fill */}
          {tentativeStop && (
            <g>
              <circle
                cx={tentativeStop.coord.x}
                cy={tentativeStop.coord.y}
                r={4.2}
                fill="white"
                stroke={vanColor}
                strokeWidth={1.2}
                strokeDasharray="1.2,0.8"
              />
              <text
                x={tentativeStop.coord.x}
                y={tentativeStop.coord.y + 1.3}
                textAnchor="middle"
                fontSize={3.4}
                fill={vanColor}
                fontWeight={700}
              >
                ?
              </text>
              <title>New appointment — {tentativeStop.petName}</title>
            </g>
          )}
        </svg>

        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-slate-700 shadow-sm dark:bg-slate-900/85 dark:text-slate-200">
          <Home className="size-3" /> Home base
        </div>
        <div
          className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-slate-700 shadow-sm dark:bg-slate-900/85 dark:text-slate-200"
          title="Pseudo-map. Pins are derived from address; real geocoding later."
        >
          <MapIcon className="size-3" /> Preview
        </div>
      </div>
    </div>
  );
}
