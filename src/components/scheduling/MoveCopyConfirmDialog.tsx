"use client";

import { ArrowRight, Copy, Move } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ScheduleEmployee, Position } from "@/types/scheduling";

export interface PendingDrop {
  shiftId: string;
  targetEmployeeId: string | undefined;
  targetDate: string;
  sourceEmployeeId: string | undefined;
  sourceDate: string;
  positionId: string;
  startTime: string;
  endTime: string;
}

interface MoveCopyConfirmDialogProps {
  pending: PendingDrop | null;
  employees: ScheduleEmployee[];
  positions: Position[];
  onConfirm: (action: "move" | "copy") => void;
  onCancel: () => void;
}

function formatPrettyDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function MoveCopyConfirmDialog({
  pending,
  employees,
  positions,
  onConfirm,
  onCancel,
}: MoveCopyConfirmDialogProps) {
  const open = pending !== null;

  const sourceName = pending?.sourceEmployeeId
    ? (employees.find((e) => e.id === pending.sourceEmployeeId)?.name ??
      "Open shift")
    : "Open shift";
  const targetName = pending?.targetEmployeeId
    ? (employees.find((e) => e.id === pending.targetEmployeeId)?.name ??
      "Open shift")
    : "Open shift";
  const position = pending
    ? positions.find((p) => p.id === pending.positionId)
    : undefined;

  const sameEmployee =
    pending?.sourceEmployeeId === pending?.targetEmployeeId;
  const sameDate = pending?.sourceDate === pending?.targetDate;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move or copy shift?</DialogTitle>
          <DialogDescription>
            Choose an action to avoid accidental changes.
          </DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-3 text-sm">
            {position && (
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: position.color ?? "#6366f1" }}
                />
                <span className="font-semibold">{position.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {pending.startTime} – {pending.endTime}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  From
                </p>
                <p className="truncate font-medium">{sourceName}</p>
                <p className="text-muted-foreground">
                  {formatPrettyDate(pending.sourceDate)}
                </p>
              </div>
              <ArrowRight className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1 text-right">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  To
                </p>
                <p className="truncate font-medium">{targetName}</p>
                <p className="text-muted-foreground">
                  {formatPrettyDate(pending.targetDate)}
                </p>
              </div>
            </div>
            {sameEmployee && sameDate && (
              <p className="text-muted-foreground text-xs italic">
                Same employee and date — copy will create a duplicate.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={() => onConfirm("copy")}
            className="gap-2"
          >
            <Copy className="size-4" />
            Copy
          </Button>
          <Button onClick={() => onConfirm("move")} className="gap-2">
            <Move className="size-4" />
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
