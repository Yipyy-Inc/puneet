"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { format12h } from "@/lib/care-log-scheduler";
import { metaFor } from "@/components/daily-care/task-type-meta";
import {
  outcomeBadgeClass,
  getOutcomeOption,
} from "@/components/daily-care/outcome-meta";
import type { TaskExecution } from "@/types/care-log";

type Props = {
  executions: TaskExecution[];
};

/**
 * Permanent, append-only history of every action logged for this guest.
 * Per spec: cannot be edited or deleted, only corrected with a note.
 */
export function JournalActivityLog({ executions }: Props) {
  const sorted = [...executions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.executedAt.localeCompare(a.executedAt);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" />
          Activity Log
          <Badge variant="secondary" className="text-[10px]">
            {sorted.length} {sorted.length === 1 ? "entry" : "entries"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No activity logged yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {sorted.map((exec) => {
              const meta = metaFor(exec.taskType);
              const Icon = meta.Icon;
              const outcomeOpt = getOutcomeOption(
                exec.taskType,
                String(exec.outcome),
              );
              const dateLabel = new Date(exec.date + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" },
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
                        {dateLabel} · {format12h(exec.executedAt)} ·{" "}
                        {exec.staffInitials}
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
