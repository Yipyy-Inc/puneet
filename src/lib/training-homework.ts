/**
 * Standalone Homework board aggregation.
 *
 * The "Homework" view inside the Students tab joins three sources to produce
 * a single row per homework record:
 *   - The TrainingHomework itself (title, frequency, due date, status flags)
 *   - The TrainingEnrollment it belongs to (pet, owner, series)
 *   - The TrainingSeries (so we can resolve the assigned-by trainer)
 *
 * This avoids storing trainer/pet redundantly on TrainingHomework — both
 * derive cleanly from the enrollment + series chain.
 *
 * Also exposes the cache fan-out helpers used by the board + dialog + per-pet
 * Homework tab so a single mutation lights up every consumer in sync.
 */
import type { QueryClient } from "@tanstack/react-query";
import type {
  TrainingEnrollment,
  TrainingHomework,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import type { Pet } from "@/types/pet";
import type { Trainer } from "@/types/training";

/** Lifecycle the board cares about. "completed" wins regardless of dates;
 *  otherwise the next-due date drives Overdue / Due Soon / Active. */
export type HomeworkBoardStatus =
  | "overdue"
  | "due-soon"
  | "active"
  | "completed";

/** Anything due within this many days from today (inclusive) counts as
 *  "due soon" for the board. Picked to roughly match a one-week window so
 *  the Due-This-Week KPI lines up with the badge. */
export const DUE_SOON_WINDOW_DAYS = 7;

export interface HomeworkBoardRow {
  /** The underlying homework record id — used as the row key and for
   *  edit/complete/delete mutations. */
  id: string;
  homework: TrainingHomework;
  enrollmentId: string;
  petId: number;
  petName: string;
  petBreed: string;
  petImageUrl?: string;
  ownerId: number;
  ownerName: string;
  /** Short display label for the series, e.g. "Basic Obedience · Saturdays". */
  seriesName: string;
  /** The trainer who runs the series — used as "assigned by" in the table. */
  instructorId?: string;
  instructorName?: string;
  /** Status — completed wins, then overdue, then due-soon, then active. */
  status: HomeworkBoardStatus;
  /** Cached today comparison so the consumer doesn't have to re-derive it. */
  isOverdue: boolean;
  isDueToday: boolean;
  isDueThisWeek: boolean;
}

function parseDateOnly(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime();
}

function diffDays(from: string, to: string): number {
  const ms = parseDateOnly(to) - parseDateOnly(from);
  return Math.round(ms / 86_400_000);
}

/** Resolve the board status from the homework's `completed` flag + nextDueDate
 *  vs `today`. Today should always be an ISO `YYYY-MM-DD` slice. */
export function getHomeworkBoardStatus(
  homework: TrainingHomework,
  today: string,
  windowDays: number = DUE_SOON_WINDOW_DAYS,
): HomeworkBoardStatus {
  if (homework.completed) return "completed";
  if (!homework.nextDueDate) return "active";
  const days = diffDays(today, homework.nextDueDate);
  if (days < 0) return "overdue";
  if (days <= windowDays) return "due-soon";
  return "active";
}

interface AggregateInput {
  homework: TrainingHomework[];
  enrollments: TrainingEnrollment[];
  series: TrainingSeries[];
  trainers: Trainer[];
  pets: Pet[];
  /** `YYYY-MM-DD` — drives overdue / due-soon classification. Caller passes
   *  the mock's today so the demo lights up consistently. */
  today: string;
}

export function aggregateHomeworkBoard(
  input: AggregateInput,
): HomeworkBoardRow[] {
  const enrollmentById = new Map(input.enrollments.map((e) => [e.id, e]));
  const seriesById = new Map(input.series.map((s) => [s.id, s]));
  const trainerById = new Map(input.trainers.map((t) => [t.id, t]));
  const petById = new Map(input.pets.map((p) => [p.id, p]));

  const rows: HomeworkBoardRow[] = [];
  for (const hw of input.homework) {
    const enrollment = enrollmentById.get(hw.enrollmentId);
    if (!enrollment) continue;
    const series = seriesById.get(enrollment.seriesId);
    const trainer = series ? trainerById.get(series.instructorId) : undefined;
    const pet = petById.get(enrollment.petId);
    const status = getHomeworkBoardStatus(hw, input.today);
    rows.push({
      id: hw.id,
      homework: hw,
      enrollmentId: hw.enrollmentId,
      petId: enrollment.petId,
      petName: enrollment.petName,
      petBreed: enrollment.petBreed,
      petImageUrl: pet?.imageUrl,
      ownerId: enrollment.ownerId,
      ownerName: enrollment.ownerName,
      seriesName: enrollment.seriesName,
      instructorId: trainer?.id,
      instructorName: trainer?.name,
      status,
      isOverdue: status === "overdue",
      isDueToday: !!hw.nextDueDate && diffDays(input.today, hw.nextDueDate) === 0 && !hw.completed,
      isDueThisWeek:
        !!hw.nextDueDate &&
        !hw.completed &&
        diffDays(input.today, hw.nextDueDate) >= 0 &&
        diffDays(input.today, hw.nextDueDate) <= DUE_SOON_WINDOW_DAYS,
    });
  }
  return rows;
}

/** Bump `nextDueDate` forward — used when staff marks a homework as
 *  "practiced today" without completing it. The cadence is intentionally
 *  loose: a frequency string of "Daily" pushes one day, anything else
 *  defaults to a week. The string is freeform so we can only do a soft
 *  heuristic here. */
export function bumpNextDueDate(
  homework: TrainingHomework,
  fromIso: string,
): string {
  const frequency = (homework.frequency ?? "").toLowerCase();
  const days =
    /daily|every day|each day|every walk/.test(frequency)
      ? 1
      : /3x.*week|three times.*week/.test(frequency)
        ? 2
        : 7;
  const d = new Date(`${fromIso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** True when the given homework cache scope (the third query-key segment)
 *  should receive the given record. The `allHomework` cache is unscoped;
 *  per-enrollment caches only accept records whose enrollmentId is in their
 *  scope. */
function scopeAcceptsRecord(
  scope: unknown,
  record: TrainingHomework,
): boolean {
  if (scope === "all") return true;
  if (Array.isArray(scope)) {
    return scope.includes(record.enrollmentId);
  }
  return false;
}

/** Insert-or-replace a homework record across every cached training-homework
 *  query. Used by the standalone dialog (add + edit), the per-pet Homework
 *  tab, and the board's row actions so a single mutation lights up every
 *  consumer in sync. */
export function fanOutHomeworkUpsert(
  queryClient: QueryClient,
  record: TrainingHomework,
): void {
  const cache = queryClient.getQueryCache();
  cache.findAll({ queryKey: ["training", "homework"] }).forEach((query) => {
    const key = query.queryKey;
    if (key.length !== 3) return;
    const scope = key[2];
    if (!scopeAcceptsRecord(scope, record)) {
      // The record doesn't belong in this scope, but it might have been here
      // previously (an enrollment change is rare but possible). Drop it
      // either way so a stale copy doesn't linger.
      queryClient.setQueryData<TrainingHomework[]>(key, (prev = []) =>
        prev.filter((h) => h.id !== record.id),
      );
      return;
    }
    queryClient.setQueryData<TrainingHomework[]>(key, (prev = []) => {
      const idx = prev.findIndex((h) => h.id === record.id);
      if (idx === -1) return [...prev, record];
      const next = prev.slice();
      next[idx] = record;
      return next;
    });
  });
}

/** Remove a homework record by id from every cached training-homework
 *  query. */
export function fanOutHomeworkDelete(
  queryClient: QueryClient,
  id: string,
): void {
  const cache = queryClient.getQueryCache();
  cache.findAll({ queryKey: ["training", "homework"] }).forEach((query) => {
    const key = query.queryKey;
    if (key.length !== 3) return;
    queryClient.setQueryData<TrainingHomework[]>(key, (prev = []) =>
      prev.filter((h) => h.id !== id),
    );
  });
}
