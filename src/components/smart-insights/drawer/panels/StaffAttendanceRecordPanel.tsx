"use client";

import { Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 6.3 Take Action — staff attendance record (J-F Roy in this case).
 * Spec is explicit: does NOT auto-send anything. Manager has the data in
 * front of them for a conversation. Informational only.
 */

const STAFF = {
  name: "J-F Roy",
  role: "Groomer",
  hiredOn: "Aug 2023",
};

interface ShiftRow {
  date: string;
  scheduled: string;
  arrived: string;
  minutesLate: number;
}

const LAST_10: ShiftRow[] = [
  { date: "May 19", scheduled: "8:00 AM", arrived: "8:14 AM", minutesLate: 14 },
  { date: "May 18", scheduled: "8:00 AM", arrived: "8:11 AM", minutesLate: 11 },
  { date: "May 16", scheduled: "8:00 AM", arrived: "8:00 AM", minutesLate: 0 },
  { date: "May 15", scheduled: "8:00 AM", arrived: "8:18 AM", minutesLate: 18 },
  { date: "May 14", scheduled: "8:00 AM", arrived: "8:09 AM", minutesLate: 9 },
  { date: "May 12", scheduled: "8:00 AM", arrived: "8:15 AM", minutesLate: 15 },
  { date: "May 11", scheduled: "8:00 AM", arrived: "8:02 AM", minutesLate: 2 },
  { date: "May 09", scheduled: "8:00 AM", arrived: "8:13 AM", minutesLate: 13 },
  { date: "May 08", scheduled: "8:00 AM", arrived: "7:58 AM", minutesLate: 0 },
  { date: "May 07", scheduled: "8:00 AM", arrived: "8:12 AM", minutesLate: 12 },
];

const LATE_COUNT = LAST_10.filter((r) => r.minutesLate > 5).length;
const AVG_LATE =
  LAST_10.filter((r) => r.minutesLate > 5).reduce(
    (s, r) => s + r.minutesLate,
    0,
  ) / Math.max(1, LATE_COUNT);

export function StaffAttendanceRecordPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <p className="font-semibold">{STAFF.name}</p>
        <p className="text-muted-foreground text-xs">
          {STAFF.role} · Hired {STAFF.hiredOn}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md border bg-white p-2">
            <p className="text-muted-foreground">Late</p>
            <p className="text-sm font-semibold">{LATE_COUNT}/10</p>
          </div>
          <div className="rounded-md border bg-white p-2">
            <p className="text-muted-foreground">Avg minutes</p>
            <p className="text-sm font-semibold">{AVG_LATE.toFixed(0)}</p>
          </div>
          <div className="rounded-md border bg-white p-2">
            <p className="text-muted-foreground">Threshold</p>
            <p className="text-sm font-semibold">40%</p>
          </div>
        </div>
      </div>

      <ul className="space-y-1.5">
        {LAST_10.map((r, idx) => (
          <li
            key={idx}
            className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground size-3.5" />
              <span className="font-medium">{r.date}</span>
              <span className="text-muted-foreground text-xs">
                · sched {r.scheduled} · arrived {r.arrived}
              </span>
            </div>
            {r.minutesLate > 5 ? (
              <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                +{r.minutesLate}m
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                On time
              </Badge>
            )}
          </li>
        ))}
      </ul>

      <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
        <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
          <AlertCircle className="size-3.5" />
          Smart Insights does not auto-act here
        </div>
        <p>
          Performance and attendance conversations are a human decision. Use
          this data to prepare for a one-on-one — Smart Insights won't send
          warnings, write-ups, or notifications on its own.
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
