"use client";

import { useMemo } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Enrollment } from "@/types/training";
import type { StudentBriefingRow } from "@/lib/training-pre-session";
import { StudentAttendanceCard } from "./student-attendance-card";
import type { AttendanceMark } from "./session-view-types";

interface Props {
  rows: StudentBriefingRow[];
  enrollmentById: Map<string, Enrollment>;
  /** Synthetic enrollment IDs (prefixed `drop-`) for guest dogs joining
   *  this session via the drop-in flow. Drives the Drop-in badge. */
  dropInEnrollmentIds?: Set<string>;
  attendance: Record<string, AttendanceMark>;
  onMark: (enrollmentId: string, mark: AttendanceMark) => void;
  onDone: () => void;
}

export function SessionAttendanceSection({
  rows,
  enrollmentById,
  dropInEnrollmentIds,
  attendance,
  onMark,
  onDone,
}: Props) {
  const markedCount = useMemo(
    () => rows.filter((r) => attendance[r.enrollmentId]).length,
    [rows, attendance],
  );

  if (rows.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <ClipboardList className="text-muted-foreground size-8" />
        <p className="font-medium">No enrolled students for this session.</p>
        <p className="text-muted-foreground text-sm">
          Once students enroll, they&#39;ll appear here for the trainer to mark
          attendance.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Attendance</h2>
          <p className="text-muted-foreground text-xs">
            Tap each card to mark Present, Absent, or Late. Time is recorded
            automatically.
          </p>
        </div>
        <span className="text-muted-foreground rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums dark:bg-slate-800">
          {markedCount} / {rows.length} marked
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <StudentAttendanceCard
            key={row.enrollmentId}
            row={row}
            enrollment={enrollmentById.get(row.enrollmentId)}
            isDropIn={dropInEnrollmentIds?.has(row.enrollmentId) ?? false}
            mark={attendance[row.enrollmentId]}
            onMark={(status) =>
              onMark(row.enrollmentId, {
                status,
                markedAtISO: new Date().toISOString(),
              })
            }
          />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t bg-white/95 px-4 py-3 backdrop-blur dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            {markedCount === rows.length
              ? "All students marked. Continue to Exercises."
              : `${rows.length - markedCount} student${
                  rows.length - markedCount === 1 ? "" : "s"
                } still to mark`}
          </p>
          <Button
            onClick={onDone}
            disabled={markedCount === 0}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            Done with Attendance
          </Button>
        </div>
      </div>
    </div>
  );
}
