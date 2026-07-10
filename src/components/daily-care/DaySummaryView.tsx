"use client";

import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Printer,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Flag,
  Pill,
  UtensilsCrossed,
  ClipboardCheck,
  StickyNote,
  BookOpen,
} from "lucide-react";
import { format12h } from "@/lib/care-log-scheduler";
import { getOutcomeOption } from "./outcome-meta";
import { petFlagsStore } from "@/data/pet-flags-store";
import { headCountStore } from "@/data/head-count-store";
import { shiftNotesStore } from "@/data/shift-notes-store";
import { downloadReportPdf } from "@/lib/report-export";
import type { ScheduledTask, TaskExecution } from "@/types/care-log";
import type { DailyCareStep } from "@/types/boarding";
import type { BoardingGuest } from "@/data/boarding";

type Props = {
  date: string;
  facilityId: number;
  facilityName: string;
  guests: BoardingGuest[];
  executions: TaskExecution[];
  sortedSteps: DailyCareStep[];
  tasksByStep: Map<string, ScheduledTask[]>;
  headCountDoneStepIds: ReadonlySet<string>;
  onClose: () => void;
};

function prettyDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Read-only end-of-day summary for a PAST date, aggregated entirely from the
 * care-log executions + the flag / head-count / shift-note stores already in
 * place. Printable (window.print) and exportable to PDF via the shared
 * downloadReportPdf (A9) helper.
 */
export function DaySummaryView({
  date,
  facilityId,
  facilityName,
  guests,
  executions,
  sortedSteps,
  tasksByStep,
  headCountDoneStepIds,
  onClose,
}: Props) {
  const summary = useMemo(() => {
    const guestName = new Map(guests.map((g) => [g.id, g.petName]));
    const isLogged = (t: ScheduledTask) =>
      executions.some((e) => e.taskId === t.id);
    const stepComplete = (s: DailyCareStep) =>
      headCountDoneStepIds.has(s.id) ||
      (tasksByStep.get(s.id) ?? []).every(isLogged);

    // Blocks that had work to do (tasks, or a head count) — completed vs missed.
    const applicable = sortedSteps.filter(
      (s) => (tasksByStep.get(s.id)?.length ?? 0) > 0 || s.requiresHeadCount,
    );
    const completedSteps = applicable.filter(stepComplete);
    const missedSteps = applicable.filter((s) => !stepComplete(s));

    // Health flags raised for the day.
    const flags = guests.flatMap((g) => {
      const f = petFlagsStore.getSnapshot(date, g.id);
      return f
        ? [
            {
              petName: g.petName,
              reason: f.reason,
              createdBy: f.createdBy,
              createdAt: f.createdAt,
            },
          ]
        : [];
    });

    const toRow = (e: TaskExecution) => ({
      petName: guestName.get(e.guestId) ?? e.guestId,
      label:
        getOutcomeOption(e.taskType, String(e.outcome))?.label ??
        String(e.outcome),
      time: e.executedAt,
      staff: e.staffName ?? e.staffInitials,
      notes: e.notes,
    });
    const meds = executions
      .filter((e) => e.taskType === "medication")
      .map(toRow);
    const feeds = executions.filter((e) => e.taskType === "feeding").map(toRow);

    // Head-count confirmation(s) for any Last Call step.
    const headCounts = sortedSteps
      .filter((s) => s.requiresHeadCount)
      .flatMap((s) => {
        const record = headCountStore.getSnapshot(facilityId, date, s.id);
        return record ? [{ stepName: s.name, record }] : [];
      });

    const notes = shiftNotesStore.getSnapshot(facilityId, date);

    // Guest Journals updated that day = any pet with at least one log.
    const updatedIds = new Set(executions.map((e) => e.guestId));
    const journals = guests
      .filter((g) => updatedIds.has(g.id))
      .map((g) => ({
        petName: g.petName,
        count: executions.filter((e) => e.guestId === g.id).length,
      }));

    return {
      applicable,
      completedSteps,
      missedSteps,
      flags,
      meds,
      feeds,
      headCounts,
      notes,
      journals,
    };
  }, [
    date,
    facilityId,
    guests,
    executions,
    sortedSteps,
    tasksByStep,
    headCountDoneStepIds,
  ]);

  function handleExportPdf() {
    const L: string[] = [];
    L.push(`${facilityName} — Day Summary`);
    L.push(prettyDate(date));
    L.push("");
    L.push(
      `Task blocks: ${summary.completedSteps.length}/${summary.applicable.length} completed, ${summary.missedSteps.length} missed`,
    );
    if (summary.missedSteps.length > 0) {
      summary.missedSteps.forEach((s) => L.push(`  - Missed: ${s.name}`));
    }
    L.push("");
    L.push(`Health flags (${summary.flags.length})`);
    summary.flags.forEach((f) =>
      L.push(
        `  - ${f.petName}${f.reason ? `: ${f.reason}` : ""} — ${f.createdBy}`,
      ),
    );
    L.push("");
    L.push(`Medication logs (${summary.meds.length})`);
    summary.meds.forEach((m) =>
      L.push(`  - ${format12h(m.time)} ${m.petName}: ${m.label} (${m.staff})`),
    );
    L.push("");
    L.push(`Feeding outcomes (${summary.feeds.length})`);
    summary.feeds.forEach((f) =>
      L.push(`  - ${format12h(f.time)} ${f.petName}: ${f.label} (${f.staff})`),
    );
    L.push("");
    L.push("Head count");
    if (summary.headCounts.length === 0) {
      L.push("  - Not completed");
    } else {
      summary.headCounts.forEach(({ stepName, record }) => {
        L.push(
          `  - ${stepName}: ${record.insideGuestIds.length}/${record.total} inside at ${format12h(
            record.completedAt,
          )} by ${record.staffName}`,
        );
        if (record.cannotLocate.length > 0) {
          L.push(`    Cannot locate: ${record.cannotLocate.length}`);
        }
      });
    }
    L.push("");
    L.push(`Shift notes (${summary.notes.length})`);
    summary.notes.forEach((n) => L.push(`  - ${n.author}: ${n.text}`));
    L.push("");
    L.push(`Guest Journals updated (${summary.journals.length})`);
    summary.journals.forEach((j) =>
      L.push(`  - ${j.petName} (${j.count} ${j.count === 1 ? "log" : "logs"})`),
    );

    downloadReportPdf(
      `day-summary-${date}`,
      `${facilityName} — Day Summary — ${date}`,
      L,
    );
  }

  return (
    <div className="bg-background fixed inset-0 z-60 overflow-y-auto print:static print:overflow-visible">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Header + actions (actions hidden when printing). */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Day Summary</h1>
            <p className="text-muted-foreground text-sm">
              {facilityName} · {prettyDate(date)}
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 size-4" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileDown className="mr-2 size-4" />
              Export PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close day summary"
            >
              <X className="size-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Blocks completed vs missed */}
          <section className="rounded-lg border p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold">Task blocks</h2>
              <Badge
                variant="outline"
                className="gap-1 border-green-300 bg-green-50 text-green-700"
              >
                <CheckCircle2 className="size-3" />
                {summary.completedSteps.length}/{summary.applicable.length}{" "}
                completed
              </Badge>
              {summary.missedSteps.length > 0 && (
                <Badge
                  variant="outline"
                  className="gap-1 border-red-300 bg-red-50 text-red-700"
                >
                  <AlertCircle className="size-3" />
                  {summary.missedSteps.length} missed
                </Badge>
              )}
            </div>
            {summary.missedSteps.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {summary.missedSteps.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <AlertCircle className="size-3.5 shrink-0 text-red-500" />
                    Missed: {s.name} ({format12h(s.time)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Every applicable block was completed.
              </p>
            )}
          </section>

          {/* Health flags */}
          <SummarySection
            icon={<Flag className="size-4 text-red-500" />}
            title="Health flags"
            count={summary.flags.length}
          >
            {summary.flags.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Flag className="mt-0.5 size-3.5 shrink-0 fill-red-500 text-red-500" />
                <span>
                  <span className="font-medium">{f.petName}</span>
                  {f.reason ? ` — ${f.reason}` : ""}{" "}
                  <span className="text-muted-foreground">
                    by {f.createdBy}
                  </span>
                </span>
              </li>
            ))}
          </SummarySection>

          {/* Medication logs */}
          <SummarySection
            icon={<Pill className="size-4" />}
            title="Medication logs"
            count={summary.meds.length}
          >
            {summary.meds.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground w-14 shrink-0 tabular-nums">
                  {format12h(m.time)}
                </span>
                <span className="font-medium">{m.petName}</span>
                <Badge variant="outline" className="text-[10px]">
                  {m.label}
                </Badge>
                <span className="text-muted-foreground truncate">
                  {m.staff}
                </span>
              </li>
            ))}
          </SummarySection>

          {/* Feeding outcomes */}
          <SummarySection
            icon={<UtensilsCrossed className="size-4" />}
            title="Feeding outcomes"
            count={summary.feeds.length}
          >
            {summary.feeds.map((f, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground w-14 shrink-0 tabular-nums">
                  {format12h(f.time)}
                </span>
                <span className="font-medium">{f.petName}</span>
                <Badge variant="outline" className="text-[10px]">
                  {f.label}
                </Badge>
                <span className="text-muted-foreground truncate">
                  {f.staff}
                </span>
              </li>
            ))}
          </SummarySection>

          {/* Head-count confirmation */}
          <section className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              <h2 className="text-sm font-semibold">Head count (Last Call)</h2>
            </div>
            {summary.headCounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No head count was completed for this day.
              </p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {summary.headCounts.map(({ stepName, record }, i) => (
                  <li key={i}>
                    <span className="font-medium">
                      {record.insideGuestIds.length}/{record.total} dogs inside
                    </span>{" "}
                    at {format12h(record.completedAt)} by {record.staffName} (
                    {stepName})
                    {record.cannotLocate.length > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        {" "}
                        · {record.cannotLocate.length} could not be located
                      </span>
                    )}
                    {record.overrideNote && (
                      <span className="text-muted-foreground italic">
                        {" "}
                        — &ldquo;{record.overrideNote}&rdquo;
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Shift notes */}
          <SummarySection
            icon={<StickyNote className="size-4 text-amber-500" />}
            title="Shift notes"
            count={summary.notes.length}
          >
            {summary.notes.map((n) => (
              <li key={n.id}>
                <span className="font-medium">{n.author}:</span>{" "}
                <span className="whitespace-pre-wrap">{n.text}</span>
              </li>
            ))}
          </SummarySection>

          {/* Guest Journals updated */}
          <SummarySection
            icon={<BookOpen className="size-4" />}
            title="Guest Journals updated"
            count={summary.journals.length}
          >
            {summary.journals.map((j, i) => (
              <li key={i} className="flex items-center gap-2">
                <BookOpen className="size-3.5 shrink-0" />
                <span className="font-medium">{j.petName}</span>
                <span className="text-muted-foreground">
                  {j.count} {j.count === 1 ? "log" : "logs"}
                </span>
              </li>
            ))}
          </SummarySection>
        </div>
      </div>
    </div>
  );
}

function SummarySection({
  icon,
  title,
  count,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="text-[10px]">
          {count}
        </Badge>
      </div>
      {count === 0 ? (
        <p className="text-muted-foreground text-sm">None.</p>
      ) : (
        <ul className="space-y-1 text-sm">{children}</ul>
      )}
    </section>
  );
}
