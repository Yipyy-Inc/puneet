"use client";

import { Sparkles, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 3.6 Take Action — informational view of the stations board.
 * Recommendation text in the card already suggests assigning a dedicated
 * cleaning role during peak hours; this panel surfaces the current state.
 */

interface Station {
  id: string;
  name: string;
  status: "available" | "in_use" | "needs_cleaning";
  minutesInStatus?: number;
  groomer?: string;
}

const STATIONS: Station[] = [
  { id: "S-1", name: "Station 1", status: "in_use", minutesInStatus: 22, groomer: "Lucas Martin" },
  { id: "S-2", name: "Station 2", status: "needs_cleaning", minutesInStatus: 41 },
  { id: "S-3", name: "Station 3", status: "needs_cleaning", minutesInStatus: 38 },
  { id: "S-4", name: "Station 4", status: "in_use", minutesInStatus: 11, groomer: "Sophie Côté" },
  { id: "S-5", name: "Station 5", status: "needs_cleaning", minutesInStatus: 33 },
  { id: "S-6", name: "Station 6", status: "available" },
  { id: "S-7", name: "Station 7", status: "needs_cleaning", minutesInStatus: 47 },
];

const STATUS_STYLE: Record<Station["status"], string> = {
  available: "border-emerald-300 bg-emerald-50 text-emerald-800",
  in_use: "border-blue-300 bg-blue-50 text-blue-800",
  needs_cleaning: "border-amber-300 bg-amber-50 text-amber-900",
};

const STATUS_LABEL: Record<Station["status"], string> = {
  available: "Available",
  in_use: "In use",
  needs_cleaning: "Needs cleaning",
};

const NEEDS_CLEANING = STATIONS.filter((s) => s.status === "needs_cleaning");
const AVG_WAIT =
  NEEDS_CLEANING.reduce((s, st) => s + (st.minutesInStatus ?? 0), 0) /
  Math.max(1, NEEDS_CLEANING.length);

export function StationsBoardPanel({ onComplete, onCancel }: InsightPanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-amber-50/60 p-3 text-sm">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
          <Sparkles className="size-3.5" />
          Current state
        </div>
        <ul className="grid grid-cols-2 gap-y-1 text-sm text-amber-900">
          <li>
            <span className="text-amber-700">Needs cleaning: </span>
            <span className="font-semibold">{NEEDS_CLEANING.length} stations</span>
          </li>
          <li>
            <span className="text-amber-700">Avg wait: </span>
            <span className="font-semibold">{AVG_WAIT.toFixed(0)} min</span>
          </li>
          <li>
            <span className="text-amber-700">In use: </span>
            <span className="font-semibold">
              {STATIONS.filter((s) => s.status === "in_use").length}
            </span>
          </li>
          <li>
            <span className="text-amber-700">Available: </span>
            <span className="font-semibold">
              {STATIONS.filter((s) => s.status === "available").length}
            </span>
          </li>
        </ul>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {STATIONS.map((s) => (
          <li key={s.id} className="rounded-md border p-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{s.name}</span>
              <Badge variant="outline" className={STATUS_STYLE[s.status]}>
                {STATUS_LABEL[s.status]}
              </Badge>
            </div>
            {s.status !== "available" && s.minutesInStatus !== undefined && (
              <p className="text-muted-foreground mt-1 text-xs">
                {s.minutesInStatus} min
                {s.groomer ? ` · ${s.groomer}` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-md border border-dashed bg-slate-50 p-3 text-xs">
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
          <UserPlus className="size-3.5" />
          Recommendation
        </div>
        <p>
          Consider assigning a dedicated cleaning role during peak grooming
          hours (10 AM – 2 PM). The cost is typically much less than the lost
          throughput from idle stations.
        </p>
      </div>

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Mark reviewed"
          onPrimary={() => onComplete()}
          onSecondary={onCancel}
        />
      </div>
    </div>
  );
}
