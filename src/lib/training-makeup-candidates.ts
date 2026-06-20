/**
 * Make-up candidate detection — walks attendances + enrollments and surfaces
 * every dog who has an Absent mark that's still inside the facility's
 * make-up eligibility window and hasn't been resolved yet (no scheduled
 * make-up, no manual ineligibility mark).
 *
 * Drives the facility-side "Make-up Sessions" view alongside the customer
 * portal Makeup Sessions tab.
 */
import type { Pet } from "@/types/pet";
import type {
  SessionAttendance,
  TrainingEnrollment,
} from "@/lib/training-enrollment";
import type {
  TrainingSeries,
  TrainingSeriesSession,
} from "@/lib/training-series";
import type { MakeupSession } from "@/lib/training-makeup";

/** Default eligibility window. Mirrors `facility-config.training.makeupSessions
 *  .expirationRules.mustScheduleWithinDays`. Pull-through param exists on the
 *  helper so callers reading the real facility config can override. */
export const DEFAULT_MAKEUP_WINDOW_DAYS = 30;

/** Per-absence row surfaced on the facility-side view. Carries everything
 *  the row card renders plus the matching MakeupSession record (when one
 *  exists) so the row can branch into "Offered / Scheduled / Past window /
 *  Ineligible" states without a second lookup. */
export interface MakeupCandidate {
  /** Stable id — composed of enrollmentId + sessionId so two absences for
   *  the same pet keep their own row. */
  id: string;
  attendance: SessionAttendance;
  enrollment: TrainingEnrollment;
  series: TrainingSeries;
  pet?: Pet;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  /** Days remaining in the make-up window. Negative when past. */
  daysRemaining: number;
  /** True when the candidate is still inside the eligibility window. */
  withinWindow: boolean;
  /** Live make-up record for this absence, if one was issued / requested. */
  makeup: MakeupSession | null;
}

interface ComputeInput {
  attendances: SessionAttendance[];
  enrollments: TrainingEnrollment[];
  seriesById: Map<string, TrainingSeries>;
  petsById?: Map<number, Pet>;
  clientLookup?: (ownerId: number) => {
    name: string;
    phone?: string;
    email?: string;
  } | null;
  makeupSessions: MakeupSession[];
  /** YYYY-MM-DD — anchor for the days-remaining math. Pass the current
   *  date in the caller's locale so the row pills don't drift across
   *  midnight in the user's timezone. */
  todayISO: string;
  /** Eligibility window in days. Defaults to `DEFAULT_MAKEUP_WINDOW_DAYS`. */
  windowDays?: number;
}

/** Walk every absent attendance and produce a `MakeupCandidate` row.
 *  Ordered: in-window first (soonest-expiring first), then past-window.
 *  Already-completed and ineligible-flagged absences drop out entirely
 *  unless `includeResolved` is set. */
export function computeMakeupCandidates(
  input: ComputeInput,
  options: { includeResolved?: boolean } = {},
): MakeupCandidate[] {
  const {
    attendances,
    enrollments,
    seriesById,
    petsById,
    clientLookup,
    makeupSessions,
    todayISO,
    windowDays = DEFAULT_MAKEUP_WINDOW_DAYS,
  } = input;
  const enrollmentById = new Map(enrollments.map((e) => [e.id, e]));
  const makeupByMissed = new Map<string, MakeupSession>();
  for (const m of makeupSessions) {
    // First scheduled/offered/pending record wins; ineligible records also
    // shouldn't be replaced by a later identical one. Keyed by sessionId
    // so a single missed session can only carry one active make-up row.
    if (!makeupByMissed.has(m.missedSessionId)) {
      makeupByMissed.set(m.missedSessionId, m);
    }
  }

  const out: MakeupCandidate[] = [];
  for (const att of attendances) {
    if (att.status !== "absent" && att.status !== "excused") continue;
    const enrollment = enrollmentById.get(att.enrollmentId);
    if (!enrollment) continue;
    // Only surface absences that belong to an active enrollment — completed
    // / dropped enrollments don't need future make-up offers.
    if (
      enrollment.status !== "enrolled" &&
      enrollment.status !== "paused" &&
      enrollment.status !== "waitlisted"
    ) {
      continue;
    }
    const series = seriesById.get(enrollment.seriesId);
    if (!series) continue;

    const makeup = makeupByMissed.get(att.sessionId) ?? null;
    if (!options.includeResolved) {
      // Hide rows that have already been resolved one way or the other.
      if (makeup) {
        if (
          makeup.status === "scheduled" ||
          makeup.status === "completed" ||
          makeup.status === "cancelled" ||
          makeup.status === "ineligible"
        ) {
          continue;
        }
      }
    }

    const daysSinceMiss = diffDaysISO(todayISO, att.sessionDate);
    const daysRemaining = windowDays - daysSinceMiss;
    const withinWindow = daysRemaining >= 0;

    const owner = clientLookup ? clientLookup(enrollment.ownerId) : null;

    out.push({
      id: `mc-${enrollment.id}-${att.sessionId}`,
      attendance: att,
      enrollment,
      series,
      pet: petsById?.get(att.petId),
      ownerName: owner?.name ?? enrollment.ownerName,
      ownerPhone: owner?.phone ?? enrollment.ownerPhone,
      ownerEmail: owner?.email ?? enrollment.ownerEmail,
      daysRemaining,
      withinWindow,
      makeup,
    });
  }

  out.sort((a, b) => {
    // In-window rows above past-window rows; inside each bucket, soonest
    // to expire bubbles up so staff act on the most urgent first.
    if (a.withinWindow !== b.withinWindow) return a.withinWindow ? -1 : 1;
    if (a.daysRemaining !== b.daysRemaining)
      return a.daysRemaining - b.daysRemaining;
    return a.attendance.sessionDate.localeCompare(b.attendance.sessionDate);
  });
  return out;
}

/** Sessions across all series that can host a make-up. Filters:
 *   - same course type (so the dog joins a relevant cohort)
 *   - in the future
 *   - has at least one open seat at the time of offer
 *   - exclude the dog's own enrollment's series (no point joining the cohort
 *     they already missed)
 *
 *  The caller passes a `seatsAvailableForSession` resolver because seat
 *  counting depends on enrollment + make-up records combined and is shared
 *  with the calendar capacity badge. */
export interface HostSessionOption {
  series: TrainingSeries;
  session: TrainingSeriesSession;
  seatsAvailable: number;
}

export function listHostSessionsForCandidate(
  candidate: MakeupCandidate,
  allSeries: TrainingSeries[],
  seatsAvailableForSession: (
    series: TrainingSeries,
    session: TrainingSeriesSession,
  ) => number,
  todayISO: string,
): HostSessionOption[] {
  const out: HostSessionOption[] = [];
  for (const s of allSeries) {
    if (s.id === candidate.series.id) continue;
    if (s.courseTypeId !== candidate.series.courseTypeId) continue;
    for (const sess of s.sessions) {
      if (sess.date <= todayISO) continue;
      if (sess.status === "cancelled") continue;
      const seats = seatsAvailableForSession(s, sess);
      if (seats <= 0) continue;
      out.push({ series: s, session: sess, seatsAvailable: seats });
    }
  }
  out.sort((a, b) => {
    if (a.session.date !== b.session.date)
      return a.session.date < b.session.date ? -1 : 1;
    return a.session.startTime < b.session.startTime ? -1 : 1;
  });
  return out;
}

function diffDaysISO(later: string, earlier: string): number {
  const a = new Date(`${later}T00:00:00Z`).getTime();
  const b = new Date(`${earlier}T00:00:00Z`).getTime();
  return Math.floor((a - b) / 86_400_000);
}
