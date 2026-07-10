/**
 * HQ Training Analytics — the Monday-morning numbers an owner with
 * multiple branches wants at a glance:
 *
 *   - Total students enrolled across every location
 *   - Total sessions completed this month
 *   - Total training revenue (paid + deposit lifecycle)
 *   - Top performing location by active classes
 *   - Top instructors by average student rating
 *
 * Pure aggregator — the HQ page does the queries and passes data in. Lives
 * at the lib layer so the rollups are unit-testable without standing up
 * the renderer.
 */
import type {
  SessionAttendance,
  TrainingEnrollment,
} from "@/lib/training-enrollment";
import type { TrainingSeries } from "@/lib/training-series";
import type { Location } from "@/types/location";
import type { Trainer, TrainingPackage } from "@/types/training";

/** Per-location rollup surfaced as a row in the HQ Overview's location
 *  breakdown grid. */
export interface HqTrainingLocationRow {
  locationId: string;
  locationName: string;
  color?: string;
  /** Distinct pets currently enrolled at this location (any active series). */
  studentsEnrolled: number;
  /** Series with status === "active" that belong to this location. */
  activeSeries: number;
  /** Attended sessions (present | late) that happened this month at this
   *  location. */
  sessionsThisMonth: number;
  /** Sum of `pricePaid` (deposit + full) attributed to this location for
   *  enrollments that started in any of the past 90 days. */
  revenue: number;
}

/** Leaderboard row in the "Top instructors" panel. */
export interface HqTrainingInstructorRow {
  instructorId: string;
  instructorName: string;
  photoUrl?: string;
  /** Average exercise rating across every session this instructor has run,
   *  scaled to 0-5 with one decimal. `null` when the instructor has no
   *  ratings on file. */
  averageRating: number | null;
  ratingsCount: number;
  totalSessions: number;
  /** Number of distinct students this instructor has taught. */
  uniqueStudents: number;
  /** Revenue from this instructor's enrolments (paid + deposit). */
  revenue: number;
}

/** Network-wide performance for one training program (course type). */
export interface HqTrainingProgramRow {
  programId: string;
  programName: string;
  /** Non-waitlisted enrolments across every series of this program. */
  enrollments: number;
  /** completed ÷ enrolled (0-1). */
  completionRate: number;
  /** graduated (completed with full progress) ÷ enrolled (0-1). */
  graduationRate: number;
  /** Revenue (paid + deposit) across this program's enrolments. */
  revenue: number;
  /** Distinct locations that offer this program. */
  locationIds: string[];
}

export interface HqTrainingOverview {
  totalStudentsEnrolled: number;
  totalSessionsThisMonth: number;
  totalRevenue: number;
  activeSeriesCount: number;
  /** The location with the highest active-series count this month — the
   *  "running the most classes" highlight the spec calls out. */
  topLocation: HqTrainingLocationRow | null;
  /** Top 5 instructors by average rating (filtered to ones with ≥3
   *  ratings so a single 5-star reading doesn't crown a brand-new hire). */
  topInstructors: HqTrainingInstructorRow[];
  /** Weighted network-wide average student rating (0-5, one decimal) across
   *  every rated session — the baseline each instructor is compared against.
   *  `null` when no ratings are on file. */
  networkAverageRating: number | null;
  /** Per-location breakdown — every accessible location, ordered by
   *  studentsEnrolled descending. */
  locationBreakdown: HqTrainingLocationRow[];
  /** Per-program performance across the network, ordered by enrolments. */
  programPerformance: HqTrainingProgramRow[];
  /** ISO month key (YYYY-MM) the "this month" rollups were computed against. */
  monthKey: string;
}

interface AggregateInput {
  locations: Location[];
  seriesList: TrainingSeries[];
  enrollments: TrainingEnrollment[];
  attendances: SessionAttendance[];
  trainers: Trainer[];
  packages: TrainingPackage[];
  /** ISO date inside the month to compute "this month" rollups against. */
  monthAnchor: string;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

/** Best-effort price lookup for an enrollment — match the catalog by
 *  programId, then by name. Returns 0 when no match (safer to under-count
 *  than to invent a price). */
function priceForEnrollment(
  enrollment: TrainingEnrollment,
  series: TrainingSeries | undefined,
  packages: TrainingPackage[],
): number {
  // Series may carry a `programId` pointing at the catalog; if not, fall
  // back to matching by the courseTypeName which mock data uses widely.
  const programId = series
    ? (series as { programId?: string }).programId
    : undefined;
  if (programId) {
    const pkg = packages.find((p) => p.id === programId);
    if (pkg) return pkg.price;
  }
  const byName = packages.find(
    (p) => p.name.toLowerCase() === enrollment.courseTypeName.toLowerCase(),
  );
  if (byName) return byName.price;
  // Last resort — use the series' full-payment amount if available.
  return series?.enrollmentRules.fullPaymentAmount ?? 0;
}

export function aggregateHqTrainingOverview(
  input: AggregateInput,
): HqTrainingOverview {
  const monthKeyStr = monthKey(input.monthAnchor);
  const seriesById = new Map(input.seriesList.map((s) => [s.id, s]));

  // ── Location rollups ─────────────────────────────────────────────────
  const locationRowMap = new Map<string, HqTrainingLocationRow>();
  for (const loc of input.locations) {
    locationRowMap.set(loc.id, {
      locationId: loc.id,
      locationName: loc.name,
      color: loc.color,
      studentsEnrolled: 0,
      activeSeries: 0,
      sessionsThisMonth: 0,
      revenue: 0,
    });
  }

  // Active series + revenue + enrolled students per location.
  const enrolledByLocation = new Map<string, Set<number>>();
  for (const enrollment of input.enrollments) {
    const series = seriesById.get(enrollment.seriesId);
    const locationId = series?.locationId;
    if (!locationId) continue;
    const row = locationRowMap.get(locationId);
    if (!row) continue;
    if (enrollment.status === "enrolled") {
      const set = enrolledByLocation.get(locationId) ?? new Set<number>();
      set.add(enrollment.petId);
      enrolledByLocation.set(locationId, set);
    }
    // Revenue: deposit + paid statuses contribute; refunded/comped do not.
    if (
      enrollment.paymentStatus === "paid" ||
      enrollment.paymentStatus === "deposit"
    ) {
      row.revenue += priceForEnrollment(enrollment, series, input.packages);
    }
  }
  for (const [locationId, petIds] of enrolledByLocation) {
    const row = locationRowMap.get(locationId);
    if (row) row.studentsEnrolled = petIds.size;
  }
  for (const series of input.seriesList) {
    if (series.status !== "active") continue;
    const row = series.locationId
      ? locationRowMap.get(series.locationId)
      : undefined;
    if (row) row.activeSeries += 1;
  }

  // Sessions this month (present | late) per location.
  for (const attendance of input.attendances) {
    if (attendance.status !== "present" && attendance.status !== "late") {
      continue;
    }
    if (monthKey(attendance.sessionDate) !== monthKeyStr) continue;
    // SessionAttendance carries the series-enrollment id; resolve the
    // location via the enrollment → series chain.
    const enrollment = input.enrollments.find(
      (e) => e.id === attendance.enrollmentId,
    );
    const series = enrollment ? seriesById.get(enrollment.seriesId) : undefined;
    const locationId = series?.locationId;
    if (!locationId) continue;
    const row = locationRowMap.get(locationId);
    if (row) row.sessionsThisMonth += 1;
  }

  const locationBreakdown = Array.from(locationRowMap.values()).sort(
    (a, b) => b.studentsEnrolled - a.studentsEnrolled,
  );

  // ── Top instructors leaderboard ──────────────────────────────────────
  const instructorTally = new Map<
    string,
    {
      ratingSum: number;
      ratingCount: number;
      sessionCount: number;
      students: Set<number>;
    }
  >();
  for (const attendance of input.attendances) {
    if (attendance.status === "absent" || attendance.status === "excused") {
      continue;
    }
    const enrollment = input.enrollments.find(
      (e) => e.id === attendance.enrollmentId,
    );
    const series = enrollment ? seriesById.get(enrollment.seriesId) : undefined;
    const instructorId = series?.instructorId;
    if (!instructorId) continue;
    const stats = instructorTally.get(instructorId) ?? {
      ratingSum: 0,
      ratingCount: 0,
      sessionCount: 0,
      students: new Set<number>(),
    };
    stats.sessionCount += 1;
    stats.students.add(attendance.petId);
    for (const exercise of attendance.exercises ?? []) {
      stats.ratingSum += exercise.rating;
      stats.ratingCount += 1;
    }
    instructorTally.set(instructorId, stats);
  }
  // Revenue attributed to each instructor via their series' enrolments.
  const revenueByInstructor = new Map<string, number>();
  for (const enrollment of input.enrollments) {
    const series = seriesById.get(enrollment.seriesId);
    const instructorId = series?.instructorId;
    if (!instructorId) continue;
    if (
      enrollment.paymentStatus === "paid" ||
      enrollment.paymentStatus === "deposit"
    ) {
      revenueByInstructor.set(
        instructorId,
        (revenueByInstructor.get(instructorId) ?? 0) +
          priceForEnrollment(enrollment, series, input.packages),
      );
    }
  }

  // Weighted network-wide average rating — the baseline for comparisons.
  let netRatingSum = 0;
  let netRatingCount = 0;
  for (const stats of instructorTally.values()) {
    netRatingSum += stats.ratingSum;
    netRatingCount += stats.ratingCount;
  }
  const networkAverageRating =
    netRatingCount > 0
      ? Math.round((netRatingSum / netRatingCount) * 10) / 10
      : null;

  const trainerById = new Map(input.trainers.map((t) => [t.id, t]));
  const allInstructorRows: HqTrainingInstructorRow[] = [];
  for (const [instructorId, stats] of instructorTally) {
    const trainer = trainerById.get(instructorId);
    allInstructorRows.push({
      instructorId,
      instructorName: trainer?.name ?? instructorId,
      photoUrl: trainer?.photoUrl,
      averageRating:
        stats.ratingCount > 0
          ? Math.round((stats.ratingSum / stats.ratingCount) * 10) / 10
          : null,
      ratingsCount: stats.ratingCount,
      totalSessions: stats.sessionCount,
      uniqueStudents: stats.students.size,
      revenue: revenueByInstructor.get(instructorId) ?? 0,
    });
  }
  // Need ≥3 ratings to land on the leaderboard so a single 5-star read
  // doesn't crown a fresh hire.
  const topInstructors = allInstructorRows
    .filter((r) => r.averageRating !== null && r.ratingsCount >= 3)
    .sort((a, b) => {
      const ar = a.averageRating ?? 0;
      const br = b.averageRating ?? 0;
      if (ar !== br) return br - ar;
      return b.ratingsCount - a.ratingsCount;
    })
    .slice(0, 5);

  // ── Top-line totals ──────────────────────────────────────────────────
  const totalStudentsEnrolled = locationBreakdown.reduce(
    (sum, r) => sum + r.studentsEnrolled,
    0,
  );
  const totalSessionsThisMonth = locationBreakdown.reduce(
    (sum, r) => sum + r.sessionsThisMonth,
    0,
  );
  const totalRevenue = locationBreakdown.reduce((sum, r) => sum + r.revenue, 0);
  const activeSeriesCount = input.seriesList.filter(
    (s) => s.status === "active",
  ).length;

  // "Top location" = most active classes (series with status === "active").
  // Tiebreak by sessionsThisMonth then by name for stability.
  const topLocation =
    [...locationBreakdown]
      .filter((r) => r.activeSeries > 0)
      .sort((a, b) => {
        if (a.activeSeries !== b.activeSeries) {
          return b.activeSeries - a.activeSeries;
        }
        if (a.sessionsThisMonth !== b.sessionsThisMonth) {
          return b.sessionsThisMonth - a.sessionsThisMonth;
        }
        return a.locationName.localeCompare(b.locationName);
      })[0] ?? null;

  // ── Program performance across the network ───────────────────────────
  const programMap = new Map<
    string,
    {
      name: string;
      started: number;
      completed: number;
      graduated: number;
      revenue: number;
      locations: Set<string>;
    }
  >();
  const ensureProgram = (key: string, name: string) => {
    let p = programMap.get(key);
    if (!p) {
      p = {
        name,
        started: 0,
        completed: 0,
        graduated: 0,
        revenue: 0,
        locations: new Set<string>(),
      };
      programMap.set(key, p);
    }
    return p;
  };
  // Series contribute location coverage (even with zero enrolments).
  for (const s of input.seriesList) {
    const p = ensureProgram(s.courseTypeName, s.courseTypeName);
    if (s.locationId) p.locations.add(s.locationId);
  }
  for (const enrollment of input.enrollments) {
    const p = ensureProgram(
      enrollment.courseTypeName,
      enrollment.courseTypeName,
    );
    const series = seriesById.get(enrollment.seriesId);
    if (series?.locationId) p.locations.add(series.locationId);
    if (enrollment.status === "waitlisted") continue;
    p.started += 1;
    if (enrollment.status === "completed") {
      p.completed += 1;
      if (enrollment.progress >= 100) p.graduated += 1;
    }
    if (
      enrollment.paymentStatus === "paid" ||
      enrollment.paymentStatus === "deposit"
    ) {
      p.revenue += priceForEnrollment(enrollment, series, input.packages);
    }
  }
  const programPerformance: HqTrainingProgramRow[] = Array.from(
    programMap.entries(),
  )
    .map(([key, p]) => ({
      programId: key,
      programName: p.name,
      enrollments: p.started,
      completionRate: p.started > 0 ? p.completed / p.started : 0,
      graduationRate: p.started > 0 ? p.graduated / p.started : 0,
      revenue: p.revenue,
      locationIds: Array.from(p.locations),
    }))
    .sort((a, b) => b.enrollments - a.enrollments);

  return {
    totalStudentsEnrolled,
    totalSessionsThisMonth,
    totalRevenue,
    activeSeriesCount,
    topLocation,
    topInstructors,
    networkAverageRating,
    locationBreakdown,
    programPerformance,
    monthKey: monthKeyStr,
  };
}
