"use client";

import { useState } from "react";
import { ArrowLeft, ClockAlert, Users, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerFooter } from "../shared/DrawerFooter";
import { ConfirmBeforeModify } from "../shared/ConfirmBeforeModify";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 6.1 Take Action — overtime report + option to review next week's
 * schedule for efficiency. Per spec, "Consider part-time hire" is a TEXT-ONLY
 * note because Yipyy has no hiring feature.
 */

interface OvertimeRow {
  staffName: string;
  role: string;
  otHours: number;
  otCost: number;
  weeklyHours: number;
}

const OT_ROWS: OvertimeRow[] = [
  { staffName: "Marie Tremblay", role: "Manager", otHours: 12, otCost: 540, weeklyHours: 52 },
  { staffName: "J-F Roy", role: "Groomer", otHours: 9, otCost: 360, weeklyHours: 49 },
  { staffName: "Sophie Côté", role: "Kennel Tech", otHours: 7, otCost: 245, weeklyHours: 47 },
  { staffName: "Lucas Martin", role: "Groomer", otHours: 5, otCost: 200, weeklyHours: 45 },
  { staffName: "Amélie Dubois", role: "Front Desk", otHours: 3, otCost: 105, weeklyHours: 43 },
];

const TOTAL_OT_COST = OT_ROWS.reduce((s, r) => s + r.otCost, 0);

type Mode = "report" | "redistribute";

export function OvertimeReportPanel({ onComplete, onCancel }: InsightPanelProps) {
  const [mode, setMode] = useState<Mode>("report");

  if (mode === "report") {
    return (
      <div className="flex h-full flex-col gap-5 px-1">
        <div className="rounded-lg border bg-red-50 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-900">
            <ClockAlert className="size-3.5" />
            $1,420 over budget · 78 OT hours total
          </div>
          <p className="text-red-900">
            Top 3 staff account for {(((OT_ROWS[0].otHours + OT_ROWS[1].otHours + OT_ROWS[2].otHours) / 78) * 100).toFixed(0)}% of all overtime.
          </p>
        </div>

        <ul className="space-y-2">
          {OT_ROWS.map((r) => (
            <li
              key={r.staffName}
              className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.staffName}</p>
                <p className="text-muted-foreground text-xs">
                  {r.role} · {r.weeklyHours}h this week
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{r.otHours}h OT</p>
                <p className="text-muted-foreground text-xs">${r.otCost}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setMode("redistribute")}
          className="hover:border-primary/40 hover:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-left transition-colors"
        >
          <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <Users className="size-5" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">Review schedule efficiency</span>
            <span className="text-muted-foreground mt-0.5 block text-xs">
              Opens next week's schedule to redistribute hours away from
              high-OT staff
            </span>
          </span>
        </button>

        <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
            <Info className="size-3.5" />
            Informational
          </div>
          <p>
            If overtime stays elevated after redistribution, consider whether a
            part-time hire would be cheaper than continued OT premiums.
          </p>
        </div>

        <div className="mt-auto">
          <DrawerFooter
            primaryLabel="Close"
            onPrimary={onCancel}
            primaryDestructive={false}
          />
        </div>
      </div>
    );
  }

  return (
    <RedistributeFlow onBack={() => setMode("report")} onComplete={() => onComplete()} />
  );
}

function RedistributeFlow({ onBack, onComplete }: { onBack: () => void; onComplete: () => void }) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <BackHeader onBack={onBack} label="Redistribute next week" />
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <p className="font-semibold">Suggested redistributions for next week</p>
        <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>Move 6h from Marie Tremblay (manager) → Amélie Dubois (front desk)</li>
          <li>Move 4h from J-F Roy → Lucas Martin (both groomers, even out load)</li>
          <li>Cap Sophie Côté at 40h next week — shift her overflow to Tom Anderson</li>
        </ul>
      </div>

      <ConfirmBeforeModify
        title="Apply suggested redistribution"
        changes={[
          { field: "Marie Tremblay", from: "52h", to: "46h" },
          { field: "J-F Roy", from: "49h", to: "45h" },
          { field: "Sophie Côté", from: "47h", to: "40h" },
          { field: "Amélie Dubois", from: "43h", to: "49h" },
          { field: "Lucas Martin", from: "45h", to: "49h" },
          { field: "Tom Anderson", from: "32h", to: "39h" },
        ]}
        note="Staff will be notified of their updated next-week schedule. They can accept or request a swap."
      />

      <div className="mt-auto">
        <DrawerFooter
          primaryLabel="Apply schedule"
          onPrimary={onComplete}
          secondaryLabel="Back"
          onSecondary={onBack}
        />
      </div>
    </div>
  );
}

function BackHeader({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-start text-xs uppercase tracking-wide transition-colors"
    >
      <ArrowLeft className="size-3.5" />
      {label}
    </button>
  );
}
