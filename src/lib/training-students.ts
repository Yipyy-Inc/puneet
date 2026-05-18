/**
 * Training Students — per-pet rollups for the Students tab.
 *
 * Each "student" is a pet that appears in at least one TrainingEnrollment,
 * regardless of status (enrolled, completed, dropped, waitlisted). We
 * collapse that pet's full enrollment history into a single row showing
 * their current activity, total sessions attended, payment state, etc.
 */
import type { Pet, VaccinationRecord } from "@/types/pet";
import type {
  SeriesPaymentStatus,
  SessionAttendance,
  TrainingEnrollment,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";

/** How many days of lead time we consider "expiring soon". Anything inside
 *  this window (or already past expiry) lights up the warning flag. */
export const VACCINE_EXPIRY_WINDOW_DAYS = 30;

/** After this many consecutive absences, a pet trips the No-Show Risk flag
 *  on their Training Profile and the system optionally fires an automated
 *  follow-up message to the owner. Eventually a Settings → Training control
 *  will own this value per-facility. */
export const NO_SHOW_RISK_THRESHOLD = 2;

/** Count consecutive absences from a pet's most recent attendance record
 *  backwards. "Excused" doesn't count because the owner did communicate.
 *  Returns 0 when there are no absences or the most recent attendance was
 *  successful. */
export function getConsecutiveNoShows(
  petId: number,
  attendances: SessionAttendance[],
): number {
  const sorted = attendances
    .filter((a) => a.petId === petId)
    .slice()
    .sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1));
  let count = 0;
  for (const a of sorted) {
    if (a.status === "absent") count++;
    else break;
  }
  return count;
}

/** Convenience — true when the pet is at or over the configured threshold. */
export function isAtNoShowRisk(
  petId: number,
  attendances: SessionAttendance[],
  threshold: number = NO_SHOW_RISK_THRESHOLD,
): boolean {
  return getConsecutiveNoShows(petId, attendances) >= threshold;
}

export type TrainingStudentStatus =
  | "active"
  | "completed"
  | "waitlisted"
  | "dropped";

export interface TrainingStudentRow {
  petId: number;
  petName: string;
  petBreed: string;
  petImageUrl?: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  /** "active" when there's any current enrollment; falls back to whatever
   *  status best summarizes their most recent enrollment. */
  status: TrainingStudentStatus;
  /** The enrollment surfaced as their "current" activity — either the
   *  active series, or the most recent if none are active. */
  primaryEnrollment: TrainingEnrollment | null;
  /** Display label for the active program/series column. */
  activeProgramLabel: string | null;
  /** Total sessions attended across every enrollment for this pet. */
  sessionsCompleted: number;
  /** ISO date of the most recent past session date the pet was enrolled in.
   *  Used as a recency signal — null when the pet hasn't been to any session. */
  lastSessionDate: string | null;
  /** Payment status of the primary enrollment — drives the package badge. */
  paymentStatus: SeriesPaymentStatus | null;
  /** True when at least one vaccine is expired or expiring within the window. */
  hasVaccineWarning: boolean;
  /** Soonest expiring vaccine (in days). Negative = already expired. */
  soonestVaccineDays: number | null;
  /** Name of the soonest-expiring vaccine — for tooltip text. */
  soonestVaccineName: string | null;
  /** Total enrollment records — handy for the "X programs" tooltip. */
  enrollmentCount: number;
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00").getTime();
  const to = new Date(toISO + "T00:00:00").getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/** Compute the soonest expiring (or expired) vaccine for a pet. */
export function computeVaccineWarning(
  petId: number,
  records: VaccinationRecord[],
  todayISO: string,
): {
  hasWarning: boolean;
  soonestDays: number | null;
  soonestName: string | null;
} {
  const petRecords = records.filter((r) => r.petId === petId);
  if (petRecords.length === 0) {
    return { hasWarning: false, soonestDays: null, soonestName: null };
  }
  let soonest: VaccinationRecord | null = null;
  let soonestDays = Number.POSITIVE_INFINITY;
  for (const r of petRecords) {
    if (!r.expiryDate) continue;
    const days = daysBetween(todayISO, r.expiryDate);
    if (days < soonestDays) {
      soonestDays = days;
      soonest = r;
    }
  }
  if (!soonest || soonestDays === Number.POSITIVE_INFINITY) {
    return { hasWarning: false, soonestDays: null, soonestName: null };
  }
  return {
    hasWarning: soonestDays <= VACCINE_EXPIRY_WINDOW_DAYS,
    soonestDays,
    soonestName: soonest.vaccineName,
  };
}

/** Map a TrainingEnrollment.status onto the student-level status used in the
 *  Students tab. "enrolled" rolls up to "active". */
function mapStudentStatus(
  primary: TrainingEnrollment | null,
): TrainingStudentStatus {
  if (!primary) return "completed";
  if (primary.status === "enrolled") return "active";
  if (primary.status === "waitlisted") return "waitlisted";
  if (primary.status === "completed") return "completed";
  return "dropped";
}

/** Pick the enrollment that best represents the pet's "current" state:
 *  prefer active (enrolled), then waitlisted, then the most recent record by
 *  enrollmentDate as a final fallback. */
function pickPrimaryEnrollment(
  rows: TrainingEnrollment[],
): TrainingEnrollment | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) =>
    a.enrollmentDate < b.enrollmentDate ? 1 : -1,
  );
  return (
    sorted.find((e) => e.status === "enrolled") ??
    sorted.find((e) => e.status === "waitlisted") ??
    sorted[0]
  );
}

/** Find the most recent session date in the past for any series this pet was
 *  enrolled in. Useful as a "last session date" signal for the row. */
function findLastSessionDate(
  rows: TrainingEnrollment[],
  seriesById: Map<string, TrainingSeries>,
  todayISO: string,
): string | null {
  let latest: string | null = null;
  for (const e of rows) {
    const series = seriesById.get(e.seriesId);
    if (!series) continue;
    for (const sess of series.sessions) {
      if (sess.date > todayISO) continue; // future sessions don't count
      if (sess.status === "cancelled") continue;
      if (!latest || sess.date > latest) latest = sess.date;
    }
  }
  return latest;
}

/** Index pets by id from the clients list for quick lookup. */
type ClientLike = {
  id: number;
  name: string;
  phone?: string;
  pets: Pet[];
};

function indexPets(
  clients: ClientLike[],
): Map<
  number,
  { pet: Pet; ownerId: number; ownerName: string; ownerPhone: string }
> {
  const map = new Map<
    number,
    { pet: Pet; ownerId: number; ownerName: string; ownerPhone: string }
  >();
  for (const c of clients) {
    for (const p of c.pets) {
      map.set(p.id, {
        pet: p,
        ownerId: c.id,
        ownerName: c.name,
        ownerPhone: c.phone ?? "",
      });
    }
  }
  return map;
}

/** Roll up every TrainingEnrollment into one row per pet for the Students tab. */
export function aggregateTrainingStudents(input: {
  enrollments: TrainingEnrollment[];
  series: TrainingSeries[];
  vaccinations: VaccinationRecord[];
  clients: ClientLike[];
  todayISO: string;
}): TrainingStudentRow[] {
  const { enrollments, series, vaccinations, clients, todayISO } = input;
  const seriesById = new Map(series.map((s) => [s.id, s]));
  const petIndex = indexPets(clients);

  const byPet = new Map<number, TrainingEnrollment[]>();
  for (const e of enrollments) {
    const arr = byPet.get(e.petId);
    if (arr) arr.push(e);
    else byPet.set(e.petId, [e]);
  }

  const rows: TrainingStudentRow[] = [];
  for (const [petId, petEnrollments] of byPet) {
    const indexed = petIndex.get(petId);
    const primary = pickPrimaryEnrollment(petEnrollments);
    const status = mapStudentStatus(primary);
    const sessionsCompleted = petEnrollments.reduce(
      (sum, e) => sum + (e.sessionsAttended ?? 0),
      0,
    );
    const lastSessionDate = findLastSessionDate(
      petEnrollments,
      seriesById,
      todayISO,
    );
    const vaccine = computeVaccineWarning(petId, vaccinations, todayISO);

    // Active label: for active/waitlisted students prefer the series name so
    // staff can navigate context fast; for completed/dropped show the most
    // recent series they were in.
    const activeProgramLabel = primary?.seriesName ?? null;

    rows.push({
      petId,
      petName: indexed?.pet.name ?? primary?.petName ?? `Pet #${petId}`,
      petBreed: indexed?.pet.breed ?? primary?.petBreed ?? "",
      petImageUrl: indexed?.pet.imageUrl,
      ownerId: indexed?.ownerId ?? primary?.ownerId ?? 0,
      ownerName: indexed?.ownerName ?? primary?.ownerName ?? "",
      ownerPhone: indexed?.ownerPhone ?? primary?.ownerPhone ?? "",
      status,
      primaryEnrollment: primary,
      activeProgramLabel,
      sessionsCompleted,
      lastSessionDate,
      paymentStatus: primary?.paymentStatus ?? null,
      hasVaccineWarning: vaccine.hasWarning,
      soonestVaccineDays: vaccine.soonestDays,
      soonestVaccineName: vaccine.soonestName,
      enrollmentCount: petEnrollments.length,
    });
  }

  // Sort: active first, then by most-recent activity.
  rows.sort((a, b) => {
    const statusRank: Record<TrainingStudentStatus, number> = {
      active: 0,
      waitlisted: 1,
      completed: 2,
      dropped: 3,
    };
    const aRank = statusRank[a.status];
    const bRank = statusRank[b.status];
    if (aRank !== bRank) return aRank - bRank;
    const aDate = a.lastSessionDate ?? "0000-00-00";
    const bDate = b.lastSessionDate ?? "0000-00-00";
    return bDate.localeCompare(aDate);
  });

  return rows;
}
