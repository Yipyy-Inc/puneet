"use client";

import { Fragment } from "react";
import { format12h } from "@/lib/care-log-scheduler";
import type { DailyCareStep } from "@/types/boarding";
import type { ScheduledTask } from "@/types/care-log";

// Scoped print rules. Because this <style> only exists in the DOM while the
// Daily Care page is mounted, the "hide everything but the sheet" rules never
// affect printing on other pages. The <thead> gives a running header that the
// browser repeats (and reserves space for) on every printed page.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #dc-print-sheet, #dc-print-sheet * { visibility: visible !important; }
  #dc-print-sheet {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    color: #000;
  }
  #dc-print-sheet table { page-break-inside: auto; }
  #dc-print-sheet tr { page-break-inside: avoid; }
  @page { margin: 14mm 12mm; }
}
`;

function assignedLabel(assigned: DailyCareStep["assignedStaff"]): string {
  if (!assigned || assigned.kind === "unassigned") return "All Staff";
  if (assigned.kind === "person") return assigned.staffName;
  return assigned.role;
}

function taskDetailLine(step: DailyCareStep, task: ScheduledTask): string {
  const bits: string[] = [];
  if (task.details && task.details !== step.name) bits.push(task.details);
  if (task.subDetails?.length) bits.push(...task.subDetails);
  // The folded dose has no line of its own on the sheet staff carry, so it has
  // to ride on the meal's — otherwise the printout loses it entirely.
  if (task.withMeds?.length) {
    bits.push(
      `WITH MEAL: ${task.withMeds.map((m) => `${m.name} ${m.dosage}`).join(", ")}`,
    );
  }
  return bits.join(" · ");
}

type Props = {
  facilityName: string;
  /** ISO "YYYY-MM-DD" — the day being printed. */
  date: string;
  staffName: string;
  /** Human time the sheet was printed, e.g. "3:45 PM". */
  printedAt: string;
  steps: DailyCareStep[];
  tasksByStep: Map<string, ScheduledTask[]>;
};

/**
 * Print-only Daily Care sheet — a clean black-and-white task list with a
 * tickable checkbox per pet. Hidden on screen (`hidden`) and shown only for
 * print (`print:block`); the scoped CSS excludes all app chrome/navigation.
 */
export function DailyCarePrintSheet({
  facilityName,
  date,
  staffName,
  printedAt,
  steps,
  tasksByStep,
}: Props) {
  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Only blocks that have pets today are worth printing.
  const printableSteps = steps.filter(
    (s) => (tasksByStep.get(s.id)?.length ?? 0) > 0,
  );

  return (
    <div id="dc-print-sheet" className="hidden text-black print:block">
      <style>{PRINT_CSS}</style>
      <table className="w-full border-collapse text-[11px] leading-snug">
        <thead>
          <tr>
            <th colSpan={2} className="border-b-2 border-black pb-1 text-left">
              <span className="text-[12px] font-bold">
                {facilityName} · Daily Care · {dateLabel} · Printed at{" "}
                {printedAt || "—"} by {staffName}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {printableSteps.map((step) => {
            const tasks = tasksByStep.get(step.id) ?? [];
            return (
              <Fragment key={step.id}>
                <tr>
                  <td colSpan={2} className="pt-3 pb-0.5">
                    <span className="text-[12px] font-bold">{step.name}</span>
                    <span className="ml-2">
                      {format12h(step.time)} ·{" "}
                      {assignedLabel(step.assignedStaff)}
                    </span>
                    {step.description && (
                      <div className="text-[10px] italic">
                        {step.description}
                      </div>
                    )}
                  </td>
                </tr>
                {tasks.map((task) => {
                  const detail = taskDetailLine(step, task);
                  const avoid = task.avoidList?.length
                    ? task.avoidList.join(", ")
                    : "";
                  return (
                    <tr key={task.id} className="align-top">
                      <td className="w-7 py-1 pl-1">
                        <span
                          aria-hidden
                          className="inline-block size-3.5 border border-black"
                        />
                      </td>
                      <td className="border-b border-black/30 py-1">
                        <span className="font-semibold">{task.petName}</span>
                        <span> — {task.kennelName}</span>
                        {detail && <div className="text-[10px]">{detail}</div>}
                        {avoid && (
                          <div className="text-[10px] font-semibold">
                            Avoid: {avoid}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
          {printableSteps.length === 0 && (
            <tr>
              <td colSpan={2} className="py-4 text-center italic">
                No scheduled tasks for this day.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
