import type {
  Enrollment,
  EnrollmentStatus,
  TrainingClass,
  TrainingClassStatus,
  TrainingSession,
} from "@/types/training";
import { wallClockParts } from "@/lib/time/facility-time";
import {
  defaultTrainingCourseTypes,
  type TrainingCourseType,
} from "@/lib/training-config";
import type {
  SeriesStatus,
  TrainingSeries,
  TrainingSeriesSession,
} from "@/lib/training-series";
import type {
  SeriesPaymentStatus,
  TrainingEnrollment,
} from "@/lib/training-enrollment";

// ============================================================================
// The training book, in the shapes the training screens already draw.
//
// The calendar, the session view, the students list, make-ups and the
// report-card pickers were written against `@/data/training`: a
// `TrainingClass` per course, a `TrainingSession` per date and an
// `Enrollment` per dog. The facility's real classes are `training_series`
// rows with their `training_series_sessions` and
// `training_series_enrollments` (20260826110000). This maps one onto the
// other so those screens show the facility's own book without each of them
// being rewritten:
//
//   training_series             → TrainingClass   (id = series uuid)
//   training_series_sessions    → TrainingSession (id = session uuid)
//   training_series_enrollments → Enrollment      (id = enrollment uuid)
//
// and, for the booking modal's training step and the Students tab, which
// were written against `@/data/training-series`:
//
//   training_series             → TrainingSeries     (with its sessions)
//   training_series_enrollments → TrainingEnrollment
//
// A series names its course by `course_type_name`. When that is one of the
// catalogue's course types the series files under it; otherwise the course
// is the name itself, so a series is never unbookable for want of a match.
//
// A series with room for one dog is a private class; anything larger is a
// group. A session's roster is every dog enrolled in its series.
// ============================================================================

export interface BookSeriesRow {
  id: string;
  name: string;
  course_type_name: string;
  staff_id: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  start_date: string;
  number_of_sessions: number;
  capacity: number;
  total_price: number;
  status: "draft" | "active" | "completed" | "cancelled";
  locations: { name: string } | null;
  staff: {
    legacy_id: string | null;
    first_name: string;
    last_name: string;
  } | null;
}

export interface BookSessionRow {
  id: string;
  series_id: string;
  session_number: number;
  start_at: string;
  end_at: string;
  status: "scheduled" | "completed" | "cancelled";
  /** 20260912170021 — the trainer's preparation, kept on the session. */
  briefed_at?: string | null;
  planned_exercise_ids?: string[] | null;
}

export interface BookEnrollmentRow {
  id: string;
  series_id: string;
  status: "enrolled" | "waitlisted" | "cancelled" | "completed";
  enrolled_at: string;
  pets: { ref: number; name: string; breed: string | null } | null;
  clients: {
    ref: number;
    name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
}

export interface TrainingBook {
  classes: TrainingClass[];
  sessions: TrainingSession[];
  enrollments: Enrollment[];
  series: TrainingSeries[];
  seriesEnrollments: TrainingEnrollment[];
  /** Courses named by a series that the catalogue does not carry. */
  extraCourseTypes: TrainingCourseType[];
}

const normalize = (name: string) => name.trim().toLowerCase();

/** The course a series files under — the catalogue's, or its own name. */
export function courseOf(
  row: Pick<BookSeriesRow, "course_type_name" | "name">,
): {
  id: string;
  name: string;
  catalogue: boolean;
} {
  const name = row.course_type_name.trim() || row.name.trim();
  const match = defaultTrainingCourseTypes.find(
    (c) => normalize(c.name) === normalize(name),
  );
  if (match) return { id: match.id, name: match.name, catalogue: true };
  return {
    id: `course:${normalize(name).replace(/[^a-z0-9]+/g, "-")}`,
    name,
    catalogue: false,
  };
}

const hhmm = (time: string) => time.slice(0, 5);

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const ENROLLMENT_STATUS: Record<BookEnrollmentRow["status"], EnrollmentStatus> =
  {
    enrolled: "enrolled",
    waitlisted: "waitlisted",
    cancelled: "dropped",
    completed: "completed",
  };

/** The staff app id — legacy id when there is one, the rule the staff route uses. */
function trainerIdOf(row: BookSeriesRow): string {
  return row.staff?.legacy_id ?? row.staff_id ?? "";
}

function trainerNameOf(row: BookSeriesRow): string {
  return row.staff
    ? `${row.staff.first_name} ${row.staff.last_name}`.trim()
    : "";
}

export function buildTrainingBook(input: {
  series: BookSeriesRow[];
  sessions: BookSessionRow[];
  enrollments: BookEnrollmentRow[];
  /** series id → pet ref → sessions checked in. */
  attended: Map<string, Map<number, number>>;
  /** series id → pet ref → how its session bookings stand on payment. */
  paid?: Map<string, Map<number, SeriesPaymentStatus>>;
  /** session id → pet ref → the booking that is that dog's place in it. */
  bookingRefs?: Map<string, Map<number, number>>;
  timeZone: string;
  /** Today on the facility's clock — decides "upcoming" versus "active". */
  today?: string;
}): TrainingBook {
  const { series, sessions, enrollments, attended, timeZone } = input;
  const paid = input.paid ?? new Map();
  const today = input.today ?? "";
  const seriesById = new Map(series.map((s) => [s.id, s]));

  const lastDateBySeries = new Map<string, string>();
  for (const s of sessions) {
    const { date } = wallClockParts(s.start_at, timeZone);
    const prev = lastDateBySeries.get(s.series_id);
    if (!prev || date > prev) lastDateBySeries.set(s.series_id, date);
  }

  const rosterBySeries = new Map<string, string[]>();
  const enrolledCount = new Map<string, number>();
  for (const e of enrollments) {
    if (e.status !== "enrolled" && e.status !== "completed") continue;
    rosterBySeries.set(e.series_id, [
      ...(rosterBySeries.get(e.series_id) ?? []),
      e.id,
    ]);
    if (e.status === "enrolled") {
      enrolledCount.set(e.series_id, (enrolledCount.get(e.series_id) ?? 0) + 1);
    }
  }

  const classes: TrainingClass[] = series.map((row) => {
    const startTime = hhmm(row.start_time);
    return {
      id: row.id,
      name: row.name,
      description: row.course_type_name,
      trainerId: trainerIdOf(row),
      trainerName: trainerNameOf(row),
      classType: row.capacity === 1 ? "private" : "group",
      skillLevel: "all-levels",
      dayOfWeek: row.day_of_week,
      startTime,
      endTime: addMinutes(startTime, row.duration_minutes),
      duration: row.duration_minutes,
      capacity: row.capacity,
      enrolledCount: enrolledCount.get(row.id) ?? 0,
      price: Number(row.total_price),
      status:
        row.status === "active" || row.status === "draft"
          ? "active"
          : "inactive",
      location: row.locations?.name ?? "",
      startDate: row.start_date,
      endDate: lastDateBySeries.get(row.id) ?? row.start_date,
      totalSessions: row.number_of_sessions,
    };
  });

  const trainingSessions: TrainingSession[] = [];
  for (const s of sessions) {
    const parent = seriesById.get(s.series_id);
    if (!parent) continue;
    const start = wallClockParts(s.start_at, timeZone);
    const end = wallClockParts(s.end_at, timeZone);
    const status: TrainingClassStatus =
      parent.status === "cancelled" ? "cancelled" : s.status;
    trainingSessions.push({
      id: s.id,
      classId: s.series_id,
      className: parent.name,
      trainerId: trainerIdOf(parent),
      trainerName: trainerNameOf(parent),
      date: start.date,
      startTime: start.time,
      endTime: end.time,
      status,
      attendees: rosterBySeries.get(s.series_id) ?? [],
      notes: "",
      sessionNumber: s.session_number,
      ...(s.briefed_at ? { briefedAt: s.briefed_at } : {}),
      plannedExerciseIds: s.planned_exercise_ids ?? [],
      // Attendance is written against these when the session is completed.
      bookingRefByPet: Object.fromEntries(
        input.bookingRefs?.get(s.id) ?? new Map<number, number>(),
      ),
    });
  }

  const out: Enrollment[] = [];
  for (const e of enrollments) {
    const parent = seriesById.get(e.series_id);
    if (!parent || !e.pets || !e.clients) continue;
    out.push({
      id: e.id,
      classId: e.series_id,
      className: parent.name,
      petId: e.pets.ref,
      petName: e.pets.name,
      petBreed: e.pets.breed ?? "",
      ownerId: e.clients.ref,
      ownerName: e.clients.name ?? "",
      ownerPhone: e.clients.phone ?? "",
      ownerEmail: e.clients.email ?? "",
      enrollmentDate: e.enrolled_at.slice(0, 10),
      status: ENROLLMENT_STATUS[e.status],
      sessionsAttended: attended.get(e.series_id)?.get(e.pets.ref) ?? 0,
      totalSessions: parent.number_of_sessions,
      notes: "",
    });
  }

  // ── The series shape: the booking step and the Students tab ────────────
  const sessionsBySeries = new Map<string, TrainingSeriesSession[]>();
  for (const s of trainingSessions) {
    const list = sessionsBySeries.get(s.classId) ?? [];
    list.push({
      id: s.id,
      seriesId: s.classId,
      sessionNumber: Number(s.sessionNumber ?? list.length + 1),
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      enrolledCount: enrolledCount.get(s.classId) ?? 0,
    });
    sessionsBySeries.set(s.classId, list);
  }

  const extraCourseTypes = new Map<string, TrainingCourseType>();
  const seriesOut: TrainingSeries[] = series.map((row) => {
    const course = courseOf(row);
    if (!course.catalogue && !extraCourseTypes.has(course.id)) {
      extraCourseTypes.set(course.id, {
        id: course.id,
        name: course.name,
        description: "",
        classFormat: row.capacity === 1 ? "private" : "group",
        defaultWeeks: row.number_of_sessions,
        ageRange: { minWeeks: 0 },
        requiredVaccines: [],
        prerequisites: [],
        isActive: true,
        createdAt: "",
        updatedAt: "",
      });
    }
    const own = sessionsBySeries.get(row.id) ?? [];
    const firstDate = own[0]?.date ?? row.start_date;
    const status: SeriesStatus =
      row.status === "active"
        ? today && firstDate > today
          ? "upcoming"
          : "active"
        : row.status;
    const startTime = hhmm(row.start_time);
    return {
      id: row.id,
      courseTypeId: course.id,
      courseTypeName: course.name,
      seriesName: row.name,
      startDate: row.start_date,
      dayOfWeek: row.day_of_week,
      startTime,
      endTime: addMinutes(startTime, row.duration_minutes),
      duration: row.duration_minutes,
      numberOfWeeks: row.number_of_sessions,
      location: row.locations?.name ?? "",
      instructorId: trainerIdOf(row),
      instructorName: trainerNameOf(row),
      maxCapacity: row.capacity,
      enrollmentRules: {
        bookingOpensDate: "",
        bookingClosesDate: "",
        depositRequired: 0,
        fullPaymentAmount: Number(row.total_price),
        waitlistEnabled: true,
        allowDropIns: false,
      },
      status,
      sessions: own,
      createdAt: "",
      updatedAt: "",
    };
  });

  const seriesEnrollments: TrainingEnrollment[] = [];
  for (const e of enrollments) {
    const parent = seriesById.get(e.series_id);
    if (!parent || !e.pets || !e.clients) continue;
    const course = courseOf(parent);
    const done = attended.get(e.series_id)?.get(e.pets.ref) ?? 0;
    const total = parent.number_of_sessions;
    seriesEnrollments.push({
      id: e.id,
      seriesId: e.series_id,
      seriesName: parent.name,
      courseTypeId: course.id,
      courseTypeName: course.name,
      petId: e.pets.ref,
      petName: e.pets.name,
      petBreed: e.pets.breed ?? "",
      ownerId: e.clients.ref,
      ownerName: e.clients.name ?? "",
      ownerPhone: e.clients.phone ?? "",
      ownerEmail: e.clients.email ?? "",
      enrollmentDate: e.enrolled_at.slice(0, 10),
      status: ENROLLMENT_STATUS[e.status],
      sessionsAttended: done,
      totalSessions: total,
      currentSessionNumber: Math.min(done + 1, total),
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      paymentStatus: paid.get(e.series_id)?.get(e.pets.ref) ?? "unpaid",
      notes: "",
      createdAt: e.enrolled_at,
      updatedAt: e.enrolled_at,
    });
  }

  return {
    classes,
    sessions: trainingSessions,
    enrollments: out,
    series: seriesOut,
    seriesEnrollments,
    extraCourseTypes: [...extraCourseTypes.values()],
  };
}
