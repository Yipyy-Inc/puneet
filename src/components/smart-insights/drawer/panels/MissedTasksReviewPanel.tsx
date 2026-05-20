"use client";

import { ClipboardX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DrawerFooter } from "../shared/DrawerFooter";
import type { InsightPanelProps } from "../panel-types";

/**
 * Insight 3.4 Take Action — informational view of missed grooming tasks.
 * Spec is explicit: does NOT auto-fix. Manager decides retraining vs. task
 * timing vs. making the task optional.
 */

interface MissedTaskRow {
  id: string;
  task: string;
  groomer: string;
  date: string;
  appointment: string;
  reason?: string;
}

const MISSED: MissedTaskRow[] = [
  { id: "T-1", task: "Photo for report card", groomer: "Lucas Martin", date: "May 18", appointment: "Daisy · Spaniel cut" },
  { id: "T-2", task: "Photo for report card", groomer: "Sophie Côté", date: "May 18", appointment: "Mango · Bath & brush" },
  { id: "T-3", task: "Brush teeth", groomer: "Lucas Martin", date: "May 17", appointment: "Otis · Senior groom" },
  { id: "T-4", task: "Photo for report card", groomer: "Lucas Martin", date: "May 17", appointment: "Pepper · Full" },
  { id: "T-5", task: "Express anal glands", groomer: "Sophie Côté", date: "May 16", appointment: "Hazel · Spa" },
  { id: "T-6", task: "Photo for report card", groomer: "Sophie Côté", date: "May 16", appointment: "Cooper · Full" },
  { id: "T-7", task: "Photo for report card", groomer: "J-F Roy", date: "May 15", appointment: "Bella · Bath & brush" },
  { id: "T-8", task: "Trim sanitary area", groomer: "Lucas Martin", date: "May 14", appointment: "Luna · Full" },
];

const BY_TASK = MISSED.reduce<Record<string, number>>((acc, m) => {
  acc[m.task] = (acc[m.task] ?? 0) + 1;
  return acc;
}, {});

const BY_GROOMER = MISSED.reduce<Record<string, number>>((acc, m) => {
  acc[m.groomer] = (acc[m.groomer] ?? 0) + 1;
  return acc;
}, {});

export function MissedTasksReviewPanel({
  onComplete,
  onCancel,
}: InsightPanelProps) {
  return (
    <div className="flex h-full flex-col gap-5 px-1">
      <div className="rounded-lg border bg-slate-50 p-3 text-sm">
        <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide">
          <ClipboardX className="size-3.5" />
          Missed tasks · last 30 days
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-muted-foreground text-xs">By task type</p>
            <ul className="space-y-1 text-sm">
              {Object.entries(BY_TASK)
                .sort((a, b) => b[1] - a[1])
                .map(([task, count]) => (
                  <li key={task} className="flex items-center justify-between gap-1">
                    <span className="truncate">{task}</span>
                    <Badge variant="outline">{count}</Badge>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">By groomer</p>
            <ul className="space-y-1 text-sm">
              {Object.entries(BY_GROOMER)
                .sort((a, b) => b[1] - a[1])
                .map(([groomer, count]) => (
                  <li key={groomer} className="flex items-center justify-between gap-1">
                    <span className="truncate">{groomer}</span>
                    <Badge variant="outline">{count}</Badge>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {MISSED.map((t) => (
          <li
            key={t.id}
            className="flex items-start justify-between gap-3 rounded-md border p-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t.task}</p>
              <p className="text-muted-foreground text-xs">
                {t.appointment} · {t.groomer} · {t.date}
              </p>
            </div>
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
              Missed
            </Badge>
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
        Smart Insights does <b>not</b> auto-fix this. Use the data above to
        decide: retrain, change task timing, or mark the task optional in your
        Grooming settings.
      </p>

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
