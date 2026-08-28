"use client";

import { useQuery } from "@tanstack/react-query";
import { UserMinus } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStopEnrollment, workflowQueries } from "@/lib/api/workflows";
import type { WorkflowEnrollment } from "@/types/workflows";

// ============================================================================
// Who is partway through this workflow, and the button that takes one of them
// out.
//
// ── WHY A LIST AND NOT JUST THE COUNT ─────────────────────────────────────
//
// "4 in progress" is only useful if the next question has an answer. The
// question staff actually arrive with is about one person — "Marie called, she
// has rebooked, stop chasing her" — and a tile cannot answer it.
//
// ── STOPPING IS NOT UNDOABLE, SO IT ASKS ──────────────────────────────────
//
// There is no re-enrol: the enrolment key is UNIQUE per occasion, so putting
// somebody back into the same sequence for the same booking is structurally
// impossible by design. That makes this one of the few genuinely one-way
// buttons in the module, and it says how many queued messages go with it
// BEFORE the click rather than after — a sequence stopped at 21:30 usually has
// one waiting for the morning, and that is exactly the one being cancelled.
// ============================================================================

export function WorkflowEnrollments({
  workflowId,
  stepCount,
}: {
  workflowId: string;
  stepCount: number;
}) {
  const enrollments = useQuery(workflowQueries.enrollments(workflowId));
  const rows = enrollments.data ?? [];

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Who is in this</h3>
      {enrollments.isLoading ? (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          Loading…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          Nobody has been enrolled yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border text-sm">
          {rows.map((row) => (
            <EnrollmentRow
              key={row.id}
              workflowId={workflowId}
              enrollment={row}
              stepCount={stepCount}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function EnrollmentRow({
  workflowId,
  enrollment,
  stepCount,
}: {
  workflowId: string;
  enrollment: WorkflowEnrollment;
  stepCount: number;
}) {
  const stop = useStopEnrollment();
  const active = enrollment.status === "active";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 p-3">
      <div className="min-w-0">
        <div className="truncate font-medium">
          {enrollment.clientName ?? "A client"}
        </div>
        <p className="text-muted-foreground text-xs">
          {active
            ? // The snapshot is what THEY are receiving, so the position is
              // read against the workflow's step count only as a hint. An
              // enrolment made before an edit can legitimately have more steps
              // than the workflow now shows.
              `On step ${Math.min(enrollment.currentStep + 1, stepCount)} of ${stepCount}`
            : describeEnding(enrollment)}
          {active && enrollment.nextRunAt
            ? ` · next ${new Date(enrollment.nextRunAt).toLocaleString()}`
            : ""}
        </p>
      </div>

      {active ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={stop.isPending}>
              <UserMinus className="mr-1 size-3.5" /> Stop
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Stop this sequence for {enrollment.clientName ?? "this client"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                They will receive nothing further from this workflow, and
                anything it has already queued for them is cancelled. There is
                no way to put them back into it — the workflow can start for
                them again only on a new occasion.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Leave it running</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() =>
                  stop.mutate(
                    { workflowId, enrollmentId: enrollment.id },
                    {
                      onSuccess: (result) =>
                        toast.success(
                          result.cancelledMessages > 0
                            ? `Stopped. ${result.cancelledMessages} queued message${result.cancelledMessages === 1 ? "" : "s"} cancelled.`
                            : "Stopped. Nothing was waiting to go out.",
                        ),
                      onError: (e: Error) => toast.error(e.message),
                    },
                  )
                }
              >
                Stop it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <Badge variant="secondary">{enrollment.status}</Badge>
      )}
    </li>
  );
}

/**
 * How a finished enrolment ended, in words.
 *
 * The `manual:` prefix is the whole reason the reason is prefixed: "stopped by
 * staff" and "they booked" are different facts, and staff chasing a complaint
 * about an unwanted message need to know which one it was without opening the
 * database.
 */
function describeEnding(enrollment: WorkflowEnrollment): string {
  const reason = enrollment.stoppedReason;
  if (enrollment.status === "completed") return "Finished the sequence";
  if (!reason) return "Ended";
  if (reason.startsWith("manual:")) {
    const note = reason.slice("manual:".length);
    return note === "stopped by staff"
      ? "Stopped by staff"
      : `Stopped — ${note}`;
  }
  if (reason === "booked") return "Stopped — they booked";
  return `Stopped — ${reason}`;
}
