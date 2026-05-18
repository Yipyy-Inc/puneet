/**
 * Mock training series — scheduled occurrences of course types, covering all
 * five spec statuses so the series list demos every state on first load.
 *
 * Dates are anchored to today's reference (2026-05-17) so that "active"
 * series straddle the current week, "completed" series sit in the recent
 * past, and "upcoming" / "draft" series are spread over the coming weeks.
 */
import {
  calculateSessionDates,
  generateSeriesSessions,
  type TrainingSeries,
  type TrainingSeriesSession,
} from "@/lib/training-series";
import type {
  SeriesPaymentStatus,
  TrainingEnrollment,
} from "@/lib/training-enrollment";

const NOW_ISO = "2026-05-17T12:00:00Z";

interface Seed {
  id: string;
  courseTypeId: string;
  courseTypeName: string;
  seriesName: string;
  startDate: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration: number;
  numberOfWeeks: number;
  location: string;
  instructorId: string;
  instructorName: string;
  maxCapacity: number;
  status: TrainingSeries["status"];
  /** How many of the auto-generated sessions should be marked complete. */
  completedSessionCount?: number;
  /** Per-session enrollment count (fills every session uniformly). */
  enrolledCount: number;
  enrollmentRules: TrainingSeries["enrollmentRules"];
}

function buildSessions(
  seed: Seed,
  seriesId: string,
): TrainingSeriesSession[] {
  const base = generateSeriesSessions({
    courseTypeId: seed.courseTypeId,
    courseTypeName: seed.courseTypeName,
    seriesName: seed.seriesName,
    startDate: seed.startDate,
    dayOfWeek: seed.dayOfWeek,
    startTime: seed.startTime,
    endTime: seed.endTime,
    duration: seed.duration,
    numberOfWeeks: seed.numberOfWeeks,
    location: seed.location,
    instructorId: seed.instructorId,
    instructorName: seed.instructorName,
    maxCapacity: seed.maxCapacity,
    enrollmentRules: seed.enrollmentRules,
    status: seed.status,
  });

  return base.map((s, idx) => {
    let sessionStatus: TrainingSeriesSession["status"] = "scheduled";
    if (seed.status === "cancelled") {
      sessionStatus = "cancelled";
    } else if (seed.status === "completed") {
      sessionStatus = "completed";
    } else if (seed.status === "active") {
      if (
        seed.completedSessionCount !== undefined &&
        idx < seed.completedSessionCount
      ) {
        sessionStatus = "completed";
      }
    }
    return {
      ...s,
      seriesId,
      status: sessionStatus,
      enrolledCount:
        seed.status === "draft" ? 0 : seed.enrolledCount,
    };
  });
}

const standardRules: TrainingSeries["enrollmentRules"] = {
  bookingOpensDate: "2026-01-01",
  bookingClosesDate: "2026-12-31",
  depositRequired: 50,
  fullPaymentAmount: 300,
  waitlistEnabled: true,
  allowDropIns: false,
};

const seeds: Seed[] = [
  // ── Completed series (recent past) ────────────────────────────────────────
  {
    id: "series-001",
    courseTypeId: "basic-obedience",
    courseTypeName: "Basic Obedience / Beginner Manners",
    seriesName: "Basic Obedience — March Saturdays",
    startDate: "2026-03-07",
    dayOfWeek: 6,
    startTime: "10:00",
    endTime: "11:00",
    duration: 60,
    numberOfWeeks: 6,
    location: "Training Room B",
    instructorId: "trainer-001",
    instructorName: "Marcus Chen",
    maxCapacity: 8,
    status: "completed",
    enrolledCount: 7,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-02-01",
      bookingClosesDate: "2026-03-05",
      fullPaymentAmount: 240,
    },
  },
  {
    id: "series-002",
    courseTypeId: "intermediate-obedience",
    courseTypeName: "Intermediate / Level 2 Obedience",
    seriesName: "Intermediate — April Thursdays",
    startDate: "2026-04-02",
    dayOfWeek: 4,
    startTime: "18:00",
    endTime: "19:00",
    duration: 60,
    numberOfWeeks: 4,
    location: "Training Room A",
    instructorId: "trainer-001",
    instructorName: "Marcus Chen",
    maxCapacity: 10,
    status: "completed",
    enrolledCount: 8,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-03-01",
      bookingClosesDate: "2026-03-30",
    },
  },

  // ── Active series (currently running) ─────────────────────────────────────
  {
    id: "series-003",
    courseTypeId: "puppy-preschool",
    courseTypeName: "Puppy Preschool",
    seriesName: "Puppy Preschool — May Cohort",
    startDate: "2026-05-02",
    dayOfWeek: 6,
    startTime: "10:00",
    endTime: "11:00",
    duration: 60,
    numberOfWeeks: 4,
    location: "Training Room A",
    instructorId: "trainer-003",
    instructorName: "Jake Wilson",
    maxCapacity: 8,
    status: "active",
    completedSessionCount: 2,
    enrolledCount: 6,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-04-01",
      bookingClosesDate: "2026-04-30",
      fullPaymentAmount: 180,
    },
  },
  {
    id: "series-004",
    courseTypeId: "reactive-rover",
    courseTypeName: "Reactive Rover Recovery",
    seriesName: "Reactive Rover — Sundays Cohort 4",
    startDate: "2026-04-12",
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "10:30",
    duration: 90,
    numberOfWeeks: 8,
    location: "Indoor Arena",
    instructorId: "trainer-002",
    instructorName: "Sophie Martinez",
    maxCapacity: 4,
    status: "active",
    completedSessionCount: 5,
    enrolledCount: 4,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-03-01",
      bookingClosesDate: "2026-04-10",
      depositRequired: 100,
      fullPaymentAmount: 520,
    },
  },
  {
    id: "series-005",
    courseTypeId: "advanced-obedience",
    courseTypeName: "Advanced Obedience",
    seriesName: "Advanced Obedience — Tuesday Evenings",
    startDate: "2026-04-21",
    dayOfWeek: 2,
    startTime: "19:00",
    endTime: "20:30",
    duration: 90,
    numberOfWeeks: 6,
    location: "Outdoor Training Area",
    instructorId: "trainer-001",
    instructorName: "Marcus Chen",
    maxCapacity: 8,
    status: "active",
    completedSessionCount: 4,
    enrolledCount: 5,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-03-15",
      bookingClosesDate: "2026-04-19",
      fullPaymentAmount: 360,
    },
  },

  // ── Upcoming series (enrollment open, not started) ────────────────────────
  {
    id: "series-006",
    courseTypeId: "basic-obedience",
    courseTypeName: "Basic Obedience / Beginner Manners",
    seriesName: "Basic Obedience — June Saturdays",
    startDate: "2026-06-06",
    dayOfWeek: 6,
    startTime: "10:00",
    endTime: "11:00",
    duration: 60,
    numberOfWeeks: 6,
    location: "Training Room B",
    instructorId: "trainer-001",
    instructorName: "Marcus Chen",
    maxCapacity: 8,
    status: "upcoming",
    enrolledCount: 4,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-05-01",
      bookingClosesDate: "2026-06-04",
      fullPaymentAmount: 240,
    },
  },
  {
    id: "series-007",
    courseTypeId: "cgc-prep",
    courseTypeName: "Canine Good Citizen Prep",
    seriesName: "CGC Prep — June Cohort",
    startDate: "2026-06-13",
    dayOfWeek: 6,
    startTime: "12:00",
    endTime: "13:00",
    duration: 60,
    numberOfWeeks: 6,
    location: "Training Room B",
    instructorId: "trainer-001",
    instructorName: "Marcus Chen",
    maxCapacity: 10,
    status: "upcoming",
    enrolledCount: 3,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-05-01",
      bookingClosesDate: "2026-06-11",
      fullPaymentAmount: 280,
    },
  },
  {
    id: "series-008",
    courseTypeId: "intermediate-obedience",
    courseTypeName: "Intermediate / Level 2 Obedience",
    seriesName: "Intermediate — July Wednesdays",
    startDate: "2026-07-08",
    dayOfWeek: 3,
    startTime: "18:30",
    endTime: "19:30",
    duration: 60,
    numberOfWeeks: 4,
    location: "Training Room A",
    instructorId: "trainer-003",
    instructorName: "Jake Wilson",
    maxCapacity: 10,
    status: "upcoming",
    enrolledCount: 1,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-05-15",
      bookingClosesDate: "2026-07-06",
      fullPaymentAmount: 220,
    },
  },

  // ── Draft series (not yet published for enrollment) ───────────────────────
  {
    id: "series-009",
    courseTypeId: "basic-obedience",
    courseTypeName: "Basic Obedience / Beginner Manners",
    seriesName: "Agility-style Foundations — July Saturdays",
    startDate: "2026-07-11",
    dayOfWeek: 6,
    startTime: "14:00",
    endTime: "15:30",
    duration: 90,
    numberOfWeeks: 6,
    location: "Agility Course",
    instructorId: "trainer-004",
    instructorName: "Elena Kowalski",
    maxCapacity: 6,
    status: "draft",
    enrolledCount: 0,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-06-01",
      bookingClosesDate: "2026-07-09",
      fullPaymentAmount: 380,
    },
  },
  {
    id: "series-010",
    courseTypeId: "reactive-rover",
    courseTypeName: "Reactive Rover Recovery",
    seriesName: "Reactive Rover — Late Summer Cohort",
    startDate: "2026-08-02",
    dayOfWeek: 0,
    startTime: "09:00",
    endTime: "10:30",
    duration: 90,
    numberOfWeeks: 8,
    location: "Indoor Arena",
    instructorId: "trainer-002",
    instructorName: "Sophie Martinez",
    maxCapacity: 4,
    status: "draft",
    enrolledCount: 0,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-06-15",
      bookingClosesDate: "2026-07-30",
      depositRequired: 100,
      fullPaymentAmount: 520,
    },
  },

  // ── Cancelled series ──────────────────────────────────────────────────────
  {
    id: "series-011",
    courseTypeId: "cgc-prep",
    courseTypeName: "Canine Good Citizen Prep",
    seriesName: "CGC Prep — April Cohort",
    startDate: "2026-04-04",
    dayOfWeek: 6,
    startTime: "12:00",
    endTime: "13:00",
    duration: 60,
    numberOfWeeks: 6,
    location: "Training Room B",
    instructorId: "trainer-001",
    instructorName: "Marcus Chen",
    maxCapacity: 10,
    status: "cancelled",
    enrolledCount: 2,
    enrollmentRules: {
      ...standardRules,
      bookingOpensDate: "2026-03-01",
      bookingClosesDate: "2026-04-02",
      fullPaymentAmount: 280,
    },
  },
];

// Maps each mock series to the TrainingPackage (program) it's an instance of.
// Drives the per-card "series run" count on the Course Catalog. Series IDs
// without an entry here render with a count of 0 against their program.
const PROGRAM_BY_SERIES: Record<string, string> = {
  "series-001": "pkg-002", // Basic Obedience — March → Basic Obedience Package
  "series-002": "pkg-003", // Intermediate — April → Advanced Training Package
  "series-003": "pkg-001", // Puppy Preschool — May → Puppy Starter Pack
  "series-004": "pkg-005", // Reactive Rover — Sundays → Reactive Dog Program
  "series-005": "pkg-003", // Advanced Obedience — Tuesdays → Advanced Training Package
  "series-006": "pkg-002", // Basic Obedience — June → Basic Obedience Package
  "series-007": "pkg-007", // CGC Prep — June → CGC Test Prep
  "series-008": "pkg-003", // Intermediate — July → Advanced Training Package
  "series-009": "pkg-004", // Agility Foundations — July → Agility Starter Package
  "series-010": "pkg-005", // Reactive Rover — Late Summer → Reactive Dog Program
  "series-011": "pkg-007", // CGC Prep — April → CGC Test Prep
};

/** Multi-location assignment for each mock series — distributes the demo
 *  catalog across the 3 Doggieville locations so the HQ overview surfaces
 *  meaningful per-branch numbers. Plateau (main) carries the most volume,
 *  matching its flagship role; Laval as the newest gets the fewest series. */
const LOCATION_BY_SERIES: Record<string, string> = {
  "series-001": "loc-dv-main", // Basic Obedience — March
  "series-002": "loc-dv-main", // Intermediate — April
  "series-003": "loc-dv-ouest", // Puppy Preschool — May
  "series-004": "loc-dv-main", // Reactive Rover — Sundays
  "series-005": "loc-dv-main", // Advanced Obedience — Tuesdays
  "series-006": "loc-dv-laval", // Basic Obedience — June
  "series-007": "loc-dv-main", // CGC Prep — June
  "series-008": "loc-dv-ouest", // Intermediate — July
  "series-009": "loc-dv-ouest", // Agility Foundations — July
  "series-010": "loc-dv-laval", // Reactive Rover — Late Summer
  "series-011": "loc-dv-main", // CGC Prep — April
};

export const trainingSeriesList: TrainingSeries[] = seeds.map((seed) => ({
  id: seed.id,
  courseTypeId: seed.courseTypeId,
  courseTypeName: seed.courseTypeName,
  programId: PROGRAM_BY_SERIES[seed.id],
  seriesName: seed.seriesName,
  startDate: seed.startDate,
  dayOfWeek: seed.dayOfWeek,
  startTime: seed.startTime,
  endTime: seed.endTime,
  duration: seed.duration,
  numberOfWeeks: seed.numberOfWeeks,
  location: seed.location,
  locationId: LOCATION_BY_SERIES[seed.id],
  instructorId: seed.instructorId,
  instructorName: seed.instructorName,
  maxCapacity: seed.maxCapacity,
  enrollmentRules: seed.enrollmentRules,
  status: seed.status,
  sessions: buildSessions(seed, seed.id),
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
}));

/** Sum enrolled count across all sessions in a series. */
export function totalEnrolledForSeries(series: TrainingSeries): number {
  return series.sessions.reduce((sum, s) => sum + (s.enrolledCount ?? 0), 0);
}

/** Distinct enrolled count — series-level cap rather than session sum. Useful
 *  for the "X / Y" badge so a 6-week series with 7 students reads as 7/8 not
 *  42/48. */
export function distinctEnrolledForSeries(series: TrainingSeries): number {
  if (series.sessions.length === 0) return 0;
  // Sessions for the same series mirror each other in mocked data, so taking
  // the max session enrollment captures the unique-students count.
  return series.sessions.reduce(
    (max, s) => Math.max(max, s.enrolledCount ?? 0),
    0,
  );
}

/** Used by the dropdown for the Location filter — extracts the unique values
 *  actually present in the series list. */
export function getKnownSeriesLocations(): string[] {
  return Array.from(new Set(seeds.map((s) => s.location))).sort();
}

/** Used by the dropdown for the Course Type filter. */
export function getKnownSeriesCourseTypes(): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const s of seeds) map.set(s.courseTypeId, s.courseTypeName);
  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Used by the dropdown for the Instructor filter. */
export function getKnownSeriesInstructors(): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const s of seeds) map.set(s.instructorId, s.instructorName);
  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Helper used in dates referenced by the series list rendering. */
export { calculateSessionDates };

// ─── Series enrollments (Students tab) ────────────────────────────────────
// A small but realistic roster per series — completed series have all
// students marked completed, active series have mostly enrolled with one or
// two edge cases (dropped / partial attendance), upcoming series have a
// growing roster with mixed payment states, drafts stay empty.
//
// Pet/owner pairs are reused from the clients mock data to keep ids valid.

type StudentSeed = {
  petId: number;
  petName: string;
  petBreed: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
};

const STUDENT_POOL: StudentSeed[] = [
  {
    petId: 1,
    petName: "Buddy",
    petBreed: "Golden Retriever",
    ownerId: 15,
    ownerName: "Alice Johnson",
    ownerPhone: "(514) 555-0101",
    ownerEmail: "alice@example.com",
  },
  {
    petId: 3,
    petName: "Max",
    petBreed: "Labrador Retriever",
    ownerId: 16,
    ownerName: "Sarah Johnson",
    ownerPhone: "(514) 555-0102",
    ownerEmail: "sarah.johnson@email.com",
  },
  {
    petId: 13,
    petName: "Bella",
    petBreed: "French Bulldog",
    ownerId: 28,
    ownerName: "Emily Davis",
    ownerPhone: "(514) 555-0103",
    ownerEmail: "emily.davis@email.com",
  },
  {
    petId: 14,
    petName: "Charlie",
    petBreed: "Beagle",
    ownerId: 29,
    ownerName: "Michael Brown",
    ownerPhone: "(514) 555-0104",
    ownerEmail: "michael.brown@email.com",
  },
  {
    petId: 15,
    petName: "Sadie",
    petBreed: "Border Collie",
    ownerId: 30,
    ownerName: "Jennifer Lee",
    ownerPhone: "(514) 555-0112",
    ownerEmail: "jennifer.lee@email.com",
  },
  {
    petId: 20,
    petName: "Mochi",
    petBreed: "Shiba Inu",
    ownerId: 35,
    ownerName: "Kevin Park",
    ownerPhone: "(514) 555-0110",
    ownerEmail: "kevin.park@email.com",
  },
  {
    petId: 21,
    petName: "Scout",
    petBreed: "Australian Shepherd",
    ownerId: 36,
    ownerName: "Amanda Foster",
    ownerPhone: "(514) 555-0111",
    ownerEmail: "amanda.foster@email.com",
  },
  {
    petId: 22,
    petName: "Rex",
    petBreed: "German Shepherd",
    ownerId: 37,
    ownerName: "David Miller",
    ownerPhone: "(514) 555-0113",
    ownerEmail: "david.miller@email.com",
  },
];

type EnrollmentSeed = {
  studentIndex: number; // index into STUDENT_POOL
  status: TrainingEnrollment["status"];
  sessionsAttended: number;
  paymentStatus: SeriesPaymentStatus;
  notes?: string;
  handlerName?: string;
};

const enrollmentSeedsBySeries: Record<string, EnrollmentSeed[]> = {
  // Completed series — everyone finished, all paid.
  "series-001": [
    {
      studentIndex: 2,
      status: "completed",
      sessionsAttended: 6,
      paymentStatus: "paid",
      notes: "Earned graduation certificate.",
    },
    {
      studentIndex: 3,
      status: "completed",
      sessionsAttended: 6,
      paymentStatus: "paid",
    },
    {
      studentIndex: 4,
      status: "completed",
      sessionsAttended: 5,
      paymentStatus: "paid",
      notes: "Missed week 4 — made up via private session.",
    },
    {
      studentIndex: 0,
      status: "completed",
      sessionsAttended: 6,
      paymentStatus: "paid",
    },
    {
      studentIndex: 1,
      status: "completed",
      sessionsAttended: 6,
      paymentStatus: "paid",
    },
    {
      studentIndex: 6,
      status: "completed",
      sessionsAttended: 6,
      paymentStatus: "paid",
    },
    {
      studentIndex: 5,
      status: "dropped",
      sessionsAttended: 2,
      paymentStatus: "refunded",
      notes: "Dropped after week 2 — refunded per policy.",
    },
  ],
  "series-002": [
    {
      studentIndex: 0,
      status: "completed",
      sessionsAttended: 4,
      paymentStatus: "paid",
    },
    {
      studentIndex: 4,
      status: "completed",
      sessionsAttended: 4,
      paymentStatus: "paid",
    },
    {
      studentIndex: 6,
      status: "completed",
      sessionsAttended: 4,
      paymentStatus: "paid",
    },
    {
      studentIndex: 2,
      status: "completed",
      sessionsAttended: 3,
      paymentStatus: "paid",
      notes: "Missed final session.",
    },
  ],

  // Active series — mid-program, mixed attendance.
  "series-003": [
    {
      studentIndex: 2,
      status: "enrolled",
      sessionsAttended: 2,
      paymentStatus: "paid",
      handlerName: "Emily Davis",
    },
    {
      studentIndex: 5,
      status: "enrolled",
      sessionsAttended: 2,
      paymentStatus: "paid",
      notes: "Shy with other puppies — slow but steady.",
    },
    {
      studentIndex: 6,
      status: "enrolled",
      sessionsAttended: 2,
      paymentStatus: "paid",
    },
    {
      studentIndex: 0,
      status: "enrolled",
      sessionsAttended: 1,
      paymentStatus: "deposit",
      notes: "Owner paid deposit only — balance due before session 3.",
    },
    {
      studentIndex: 3,
      status: "enrolled",
      sessionsAttended: 2,
      paymentStatus: "paid",
    },
    {
      studentIndex: 1,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "paid",
      notes: "Joined late — to start session 3.",
    },
  ],
  "series-004": [
    {
      studentIndex: 7,
      status: "enrolled",
      sessionsAttended: 5,
      paymentStatus: "paid",
      notes: "Threshold work going well — 30ft consistently.",
    },
    {
      studentIndex: 3,
      status: "enrolled",
      sessionsAttended: 4,
      paymentStatus: "paid",
      notes: "Some regressions after a triggering walk last week.",
    },
    {
      studentIndex: 5,
      status: "enrolled",
      sessionsAttended: 5,
      paymentStatus: "paid",
    },
    {
      studentIndex: 1,
      status: "enrolled",
      sessionsAttended: 3,
      paymentStatus: "paid",
      notes: "Missed weeks 2 and 4 — eligible for makeups.",
    },
  ],
  "series-005": [
    {
      studentIndex: 4,
      status: "enrolled",
      sessionsAttended: 4,
      paymentStatus: "paid",
      notes: "Working on off-leash recall — strong progress.",
    },
    {
      studentIndex: 0,
      status: "enrolled",
      sessionsAttended: 4,
      paymentStatus: "paid",
    },
    {
      studentIndex: 6,
      status: "enrolled",
      sessionsAttended: 4,
      paymentStatus: "paid",
    },
    {
      studentIndex: 7,
      status: "enrolled",
      sessionsAttended: 3,
      paymentStatus: "paid",
      notes: "Distance commands need work.",
    },
    {
      studentIndex: 2,
      status: "enrolled",
      sessionsAttended: 2,
      paymentStatus: "unpaid",
      notes: "Balance overdue — pinged owner.",
    },
  ],

  // Upcoming series — enrollment open, no sessions yet.
  "series-006": [
    {
      studentIndex: 2,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "paid",
    },
    {
      studentIndex: 5,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "deposit",
    },
    {
      studentIndex: 3,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "deposit",
    },
    {
      studentIndex: 6,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "unpaid",
      notes: "Holding spot — first payment due by booking close.",
    },
  ],
  "series-007": [
    {
      studentIndex: 0,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "paid",
    },
    {
      studentIndex: 4,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "deposit",
    },
    {
      studentIndex: 1,
      status: "waitlisted",
      sessionsAttended: 0,
      paymentStatus: "unpaid",
      notes: "Waitlisted in case a spot opens.",
    },
  ],
  "series-008": [
    {
      studentIndex: 0,
      status: "enrolled",
      sessionsAttended: 0,
      paymentStatus: "deposit",
    },
  ],

  // Drafts — no students yet.
  "series-009": [],
  "series-010": [],

  // Cancelled — partial roster, all refunded.
  "series-011": [
    {
      studentIndex: 4,
      status: "dropped",
      sessionsAttended: 0,
      paymentStatus: "refunded",
      notes: "Refunded after cancellation.",
    },
    {
      studentIndex: 6,
      status: "dropped",
      sessionsAttended: 0,
      paymentStatus: "refunded",
    },
  ],
};

function buildSeriesEnrollment(
  series: TrainingSeries,
  seed: EnrollmentSeed,
  idx: number,
): TrainingEnrollment {
  const student = STUDENT_POOL[seed.studentIndex];
  return {
    id: `series-enroll-${series.id}-${idx + 1}`,
    seriesId: series.id,
    seriesName: series.seriesName,
    courseTypeId: series.courseTypeId,
    courseTypeName: series.courseTypeName,
    petId: student.petId,
    petName: student.petName,
    petBreed: student.petBreed,
    ownerId: student.ownerId,
    ownerName: student.ownerName,
    ownerPhone: student.ownerPhone,
    ownerEmail: student.ownerEmail,
    handlerName: seed.handlerName,
    enrollmentDate: series.enrollmentRules.bookingOpensDate,
    status: seed.status,
    sessionsAttended: seed.sessionsAttended,
    totalSessions: series.numberOfWeeks,
    currentSessionNumber: Math.min(
      seed.sessionsAttended + 1,
      series.numberOfWeeks,
    ),
    progress:
      series.numberOfWeeks > 0
        ? Math.round((seed.sessionsAttended / series.numberOfWeeks) * 100)
        : 0,
    paymentStatus: seed.paymentStatus,
    notes: seed.notes ?? "",
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
}

export const seriesEnrollments: TrainingEnrollment[] =
  trainingSeriesList.flatMap((series) => {
    const seeds = enrollmentSeedsBySeries[series.id] ?? [];
    return seeds.map((seed, idx) => buildSeriesEnrollment(series, seed, idx));
  });

export function getEnrollmentsForSeries(seriesId: string): TrainingEnrollment[] {
  return seriesEnrollments.filter((e) => e.seriesId === seriesId);
}

/** Count how many series have been run for each program (TrainingPackage id).
 *  Cancelled series still count — they represent operational history. */
export function seriesCountByProgramId(
  list: TrainingSeries[] = trainingSeriesList,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of list) {
    if (!s.programId) continue;
    out[s.programId] = (out[s.programId] ?? 0) + 1;
  }
  return out;
}
