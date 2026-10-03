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
 * "All evaluations", one row per pet — the client's mock lists each pet once
 * with where it stands (2026-10-03). That is its latest finished result; else
 * the evaluation being answered; else the visit it is booked for. Beside a
 * row that is not itself the visit, the pet's next visit still to come — so a
 * pet that did not pass and is booked again reads "Scheduled …".
 */
export function latestPerPet(rows: readonly AllRow[]): AllRow[] {
  const time = (value: string | null) =>
    value ? new Date(value).getTime() : 0;
  const byPet = new Map<string, AllRow[]>();
  for (const row of rows) {
    byPet.set(row.pet.id, [...(byPet.get(row.pet.id) ?? []), row]);
  }
  return [...byPet.values()].flatMap((list) => {
    const finished = list
      .filter((row) => row.state === "sent" || row.state === "in_review")
      .sort((a, b) => time(b.completedAt) - time(a.completedAt));
    const answering = list.filter((row) => row.state === "in_progress");
    const booked = list
      .filter((row) => row.state === "scheduled")
      .sort((a, b) => time(a.scheduledAt) - time(b.scheduledAt));
    const base = finished[0] ?? answering[0] ?? booked[0];
    if (!base) return [];
    const next = base.state === "scheduled" ? null : (booked[0] ?? null);
    return [{ ...base, nextVisitAt: next?.scheduledAt ?? null }];
  });
}

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
