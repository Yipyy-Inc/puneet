"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, MessageSquare } from "lucide-react";
import { format12h } from "@/lib/care-log-scheduler";
import { metaFor } from "@/components/daily-care/task-type-meta";
import {
  outcomeBadgeClass,
  getOutcomeOption,
} from "@/components/daily-care/outcome-meta";
import type { TaskExecution } from "@/types/care-log";
import type { JournalNote } from "@/data/journal-notes-store";

type Props = {
  executions: TaskExecution[];
  /** Manual, non-task notes added to this guest's journal. */
  notes?: JournalNote[];
};

// A unified timeline row — either a logged task execution or a manual note.
type TimelineItem = { date: string; time: string } & (
  | { kind: "exec"; exec: TaskExecution }
  | { kind: "note"; note: JournalNote }
);

function shortDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Permanent, append-only history of every action logged for this guest, plus
 * manual journal notes — merged into one reverse-chronological timeline.
 * Per spec: cannot be edited or deleted, only corrected with a note.
 */
export function JournalActivityLog({ executions, notes = [] }: Props) {
  const items: TimelineItem[] = [
    ...executions.map(
      (exec): TimelineItem => ({
        kind: "exec",
        exec,
        date: exec.date,
        time: exec.executedAt,
      }),
    ),
    ...notes.map(
      (note): TimelineItem => ({
        kind: "note",
        note,
        date: note.date,
        time: note.time,
      }),
    ),
  ].sort((a, b) =>
    a.date !== b.date
      ? b.date.localeCompare(a.date)
      : b.time.localeCompare(a.time),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" />
          Activity Log
          <Badge variant="secondary" className="text-[10px]">
            {items.length} {items.length === 1 ? "entry" : "entries"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No activity logged yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              if (item.kind === "note") {
                const { note } = item;
                return (
                  <li
                    key={note.id}
                    className="flex items-start gap-2.5 text-xs/relaxed"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sky-100 dark:bg-sky-950/40">
                      <MessageSquare className="size-3 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium">Note</span>
                        <span className="text-muted-foreground">
                          {shortDate(note.date)} · {format12h(note.time)} ·{" "}
                          {note.author}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{note.text}</p>
                    </div>
                  </li>
                );
              }

              const { exec } = item;
              const meta = metaFor(exec.taskType);
              const Icon = meta.Icon;
              const outcomeOpt = getOutcomeOption(
                exec.taskType,
                String(exec.outcome),
              );
              return (
                <li
                  key={exec.id}
                  className="flex items-start gap-2.5 text-xs/relaxed"
                >
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-md ${meta.bg}`}
                  >
                    <Icon className={`size-3 ${meta.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{meta.label}</span>
                      {outcomeOpt && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${outcomeBadgeClass(outcomeOpt.tone)}`}
                        >
                          {outcomeOpt.label}
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {shortDate(exec.date)} · {format12h(exec.executedAt)} ·{" "}
                        {exec.staffName ?? exec.staffInitials}
                      </span>
                    </div>
                    {exec.notes && (
                      <p className="text-muted-foreground italic">
                        &ldquo;{exec.notes}&rdquo;
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
