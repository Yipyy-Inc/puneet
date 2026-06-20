/**
 * Waitlist auto-promote — fires whenever a student leaves a series and a
 * spot opens up. Walks the same priority order the trainer sees on the
 * Waitlist tab (manager-curated `waitlistPosition`, then first-come-first-
 * served) and dispatches an Offer Spot invitation to the next eligible
 * client.
 *
 * Pure of UI concerns — the caller passes the cache + the current
 * enrollment list and decides how to surface the resulting toast.
 */
import type { QueryClient } from "@tanstack/react-query";
import type {
  TrainingEnrollment,
  WaitlistOffer,
} from "@/lib/training-enrollment";

/** Sort comparator — keep in sync with the Waitlist tab's display order. */
export function compareWaitlistPriority(
  a: TrainingEnrollment,
  b: TrainingEnrollment,
): number {
  const aHas = a.waitlistPosition !== undefined;
  const bHas = b.waitlistPosition !== undefined;
  if (aHas && bHas) {
    return (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0);
  }
  if (aHas !== bHas) return aHas ? -1 : 1;
  return a.enrollmentDate.localeCompare(b.enrollmentDate);
}

interface AutoPromoteInput {
  queryClient: QueryClient;
  seriesId: string;
  enrollments: TrainingEnrollment[];
  /** Exclude the just-removed enrollment from the candidate scan — useful
   *  when the caller has the cache still showing them as enrolled at the
   *  moment auto-promote is invoked. */
  excludeEnrollmentId?: string;
  holdHours: number;
}

export interface AutoPromoteResult {
  promoted: TrainingEnrollment | null;
}

/** Builds the WaitlistOffer payload from the current wall clock + hold. */
function buildOffer(holdHours: number): WaitlistOffer {
  const sent = new Date();
  const expires = new Date(sent.getTime() + holdHours * 60 * 60 * 1000);
  return {
    sentAtISO: sent.toISOString(),
    expiresAtISO: expires.toISOString(),
    reminderSentAtISO: null,
    outcome: "active",
  };
}

/** Walks the same cache key set the Waitlist tab + Session view use so any
 *  consumer reading from the query cache re-renders with the new offer. */
function fanOutOffer(
  queryClient: QueryClient,
  enrollmentId: string,
  offer: WaitlistOffer,
): void {
  const nowISO = new Date().toISOString();
  const cache = queryClient.getQueryCache();
  cache
    .findAll({ queryKey: ["training", "series-enrollments"] })
    .forEach((query) => {
      queryClient.setQueryData<TrainingEnrollment[]>(
        query.queryKey,
        (prev = []) =>
          prev.map((e) =>
            e.id === enrollmentId ? { ...e, offer, updatedAt: nowISO } : e,
          ),
      );
    });
  cache.findAll({ queryKey: ["training", "series"] }).forEach((query) => {
    const key = query.queryKey;
    if (key[3] !== "enrollments") return;
    queryClient.setQueryData<TrainingEnrollment[]>(key, (prev = []) =>
      prev.map((e) =>
        e.id === enrollmentId ? { ...e, offer, updatedAt: nowISO } : e,
      ),
    );
  });
}

/** Pick the next eligible candidate and write an offer onto them. Returns
 *  the promoted enrollment, or null if no one's waiting. */
export function autoPromoteNextWaitlist(
  input: AutoPromoteInput,
): AutoPromoteResult {
  const { queryClient, seriesId, enrollments, excludeEnrollmentId, holdHours } =
    input;

  const candidate = enrollments
    .filter(
      (e) =>
        e.seriesId === seriesId &&
        e.id !== excludeEnrollmentId &&
        e.status === "waitlisted" &&
        (!e.offer || e.offer.outcome !== "active"),
    )
    .slice()
    .sort(compareWaitlistPriority)[0];

  if (!candidate) return { promoted: null };

  const offer = buildOffer(holdHours);
  fanOutOffer(queryClient, candidate.id, offer);
  return { promoted: { ...candidate, offer } };
}
