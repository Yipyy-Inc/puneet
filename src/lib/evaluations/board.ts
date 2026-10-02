import type {
  AllRow,
  BoardViewer,
  VisitReason,
} from "@/lib/evaluations/board-types";
import { isPass, type EvaluationResult } from "@/lib/evaluations/questions";

// ============================================================================
// The small decisions behind Operations › Evaluations (the client's mock,
// 2026-10-02), pure so they are tested rather than trusted. The server
// gathers the rows (board-server.ts); these decide what they say.
// ============================================================================

/** "Pass rate · 90 days": passes over finished evaluations, as a whole percent. */
export function passRateOf(
  results: ReadonlyArray<EvaluationResult | null>,
): number | null {
  const finished = results.filter(
    (result): result is EvaluationResult => result !== null,
  );
  if (finished.length === 0) return null;
  const passed = finished.filter((result) => isPass(result)).length;
  return Math.round((passed / finished.length) * 100);
}

/** "First visit" until the pet has been evaluated before. */
export function visitReason(earlierEvaluations: number): VisitReason {
  return earlierEvaluations > 0 ? "re_evaluation" : "first_visit";
}

/**
 * "Opened · booked daycare": the first service the card unlocked that the pet
 * was booked for after the card went out.
 */
export function bookedServiceSince(input: {
  sentAt: string;
  approvedServices: readonly string[];
  bookings: ReadonlyArray<{ service: string; createdAt: string }>;
}): string | null {
  const sent = new Date(input.sentAt).getTime();
  const first = [...input.bookings]
    .filter(
      (booking) =>
        new Date(booking.createdAt).getTime() > sent &&
        input.approvedServices.includes(booking.service),
    )
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )[0];
  return first?.service ?? null;
}

/** Whether the viewer may review and send a card this evaluator finished. */
export function viewerMayReview(
  viewer: BoardViewer,
  evaluatorStaffId: string | null,
): boolean {
  if (viewer.mayReview) return true;
  return (
    viewer.maySelfSend &&
    viewer.staffId !== null &&
    evaluatorStaffId === viewer.staffId
  );
}

const STATE_ORDER: Record<AllRow["state"], number> = {
  sent: 0,
  in_review: 0,
  in_progress: 1,
  scheduled: 2,
};

/**
 * "All evaluations": the finished ones newest first, then those being
 * answered, then those only booked, soonest first.
 */
export function sortAllRows(rows: readonly AllRow[]): AllRow[] {
  const time = (value: string | null) =>
    value ? new Date(value).getTime() : 0;
  return [...rows].sort((a, b) => {
    const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (byState !== 0) return byState;
    if (a.state === "scheduled") {
      return time(a.scheduledAt) - time(b.scheduledAt);
    }
    return time(b.completedAt) - time(a.completedAt);
  });
}
