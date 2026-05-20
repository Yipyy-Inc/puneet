"use client";

import { Star, TrendingDown, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 6.5 Take Action — groomer profile with full performance breakdown.
 * Spec: does NOT auto-act. Performance management is a human decision.
 */

const GROOMER = {
  name: "Lucas Martin",
  role: "Groomer",
  joinedOn: "Mar 2024",
  appointmentsThisMonth: 72,
};

const METRICS = [
  { label: "Revenue / appt", value: "$53", teamAvg: "$80", delta: "-34%", bad: true },
  { label: "Avg rating", value: "4.1 ★", teamAvg: "4.7 ★", delta: "-0.6", bad: true },
  { label: "Cancellation rate", value: "12%", teamAvg: "6%", delta: "+6 pts", bad: true },
  { label: "Appts / week", value: "18", teamAvg: "21", delta: "-3", bad: false },
];

interface RecentAppt {
  date: string;
  pet: string;
  service: string;
  revenue: number;
  rating: number;
  outcome: "completed" | "cancelled" | "missed_task";
}

const RECENT: RecentAppt[] = [
  { date: "May 19", pet: "Daisy", service: "Spaniel cut", revenue: 65, rating: 4, outcome: "completed" },
  { date: "May 18", pet: "Pepper", service: "Full", revenue: 95, rating: 5, outcome: "completed" },
  { date: "May 18", pet: "Otis", service: "Senior groom", revenue: 75, rating: 3, outcome: "missed_task" },
  { date: "May 17", pet: "—", service: "Bath & brush", revenue: 0, rating: 0, outcome: "cancelled" },
  { date: "May 16", pet: "Luna", service: "Full", revenue: 95, rating: 4, outcome: "completed" },
  { date: "May 15", pet: "Charlie", service: "Bath & brush", revenue: 45, rating: 5, outcome: "completed" },
];

export function GroomerProfilePanel({ onComplete, onCancel }: InsightPanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <p className="font-semibold">{GROOMER.name}</p>
        <p className="text-muted-foreground text-xs">
          {GROOMER.role} · Joined {GROOMER.joinedOn} ·{" "}
          {GROOMER.appointmentsThisMonth} appts this month
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-2">
        {METRICS.map((m) => (
          <li key={m.label} className="rounded-md border p-2 text-sm">
            <p className="text-muted-foreground text-xs">{m.label}</p>
            <p className="text-base font-semibold">{m.value}</p>
            <p className="text-muted-foreground text-[11px]">
              Team avg {m.teamAvg}
            </p>
            <Badge
              variant="outline"
              className={
                m.bad
                  ? "mt-1 border-red-300 bg-red-50 text-red-800"
                  : "mt-1 border-gray-300 bg-gray-50 text-gray-700"
              }
            >
              {m.bad ? <TrendingDown className="mr-1 size-3" /> : null}
              {m.delta}
            </Badge>
          </li>
        ))}
      </ul>

      <div>
        <p className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
          Recent appointments
        </p>
        <ul className="space-y-1.5">
          {RECENT.map((a, idx) => (
            <li
              key={idx}
              className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  {a.pet} · {a.service}
                </p>
                <p className="text-muted-foreground text-xs">{a.date}</p>
              </div>
              <div className="text-right text-xs">
                {a.outcome === "completed" && (
                  <>
                    <p className="font-semibold">${a.revenue}</p>
                    <p className="text-muted-foreground">
                      <Star className="mr-0.5 inline size-3 fill-amber-400 stroke-amber-500" />
                      {a.rating}
                    </p>
                  </>
                )}
                {a.outcome === "cancelled" && (
                  <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                    Cancelled
                  </Badge>
                )}
                {a.outcome === "missed_task" && (
                  <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                    Missed task
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
        <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
          <Info className="size-3.5" />
          Manager judgment
        </div>
        <p>
          Smart Insights does not initiate performance actions automatically.
          Use this data to choose: coaching, role adjustment, schedule change,
          or no action.
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
