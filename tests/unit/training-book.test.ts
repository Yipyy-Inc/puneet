import { describe, expect, test } from "bun:test";

import {
  buildTrainingBook,
  courseOf,
  type BookEnrollmentRow,
  type BookSeriesRow,
  type BookSessionRow,
} from "@/lib/api/mappers/training-book";

// The calendar, session view and students list draw these shapes; the rows
// are the facility's training_series book. A wrong roster or a UTC date here
// is a dog shown in the wrong class, or a class on the wrong day.

const series = (over: Partial<BookSeriesRow>): BookSeriesRow => ({
  id: "s1",
  name: "Puppy basics",
  course_type_name: "Puppy",
  staff_id: "uuid-staff",
  day_of_week: 2,
  start_time: "18:00:00",
  duration_minutes: 60,
  start_date: "2026-09-15",
  number_of_sessions: 2,
  capacity: 6,
  total_price: 240,
  status: "active",
  locations: { name: "Plateau" },
  staff: { legacy_id: "fs-train-01", first_name: "Léa", last_name: "Roy" },
  ...over,
});

const session = (over: Partial<BookSessionRow>): BookSessionRow => ({
  id: "x1",
  series_id: "s1",
  session_number: 1,
  // 18:00 in Toronto (EDT, UTC-4) is 22:00Z.
  start_at: "2026-09-15T22:00:00Z",
  end_at: "2026-09-15T23:00:00Z",
  status: "scheduled",
  ...over,
});

const enrollment = (over: Partial<BookEnrollmentRow>): BookEnrollmentRow => ({
  id: "e1",
  series_id: "s1",
  status: "enrolled",
  enrolled_at: "2026-09-01T12:00:00Z",
  pets: { ref: 7, name: "Kofi", breed: "Beagle" },
  clients: { ref: 3, name: "Ana", phone: null, email: "a@example.invalid" },
  ...over,
});

const build = (input: {
  series?: BookSeriesRow[];
  sessions?: BookSessionRow[];
  enrollments?: BookEnrollmentRow[];
  attended?: Map<string, Map<number, number>>;
}) =>
  buildTrainingBook({
    series: input.series ?? [series({})],
    sessions: input.sessions ?? [session({})],
    enrollments: input.enrollments ?? [],
    attended: input.attended ?? new Map(),
    timeZone: "America/Toronto",
  });

describe("the training book", () => {
  test("a session is dated on the facility's clock, not UTC", () => {
    const book = build({
      // 23:30 in Toronto is already the next day in UTC.
      sessions: [
        session({
          start_at: "2026-09-16T03:30:00Z",
          end_at: "2026-09-16T04:30:00Z",
        }),
      ],
    });
    expect(book.sessions[0].date).toBe("2026-09-15");
    expect(book.sessions[0].startTime).toBe("23:30");
  });

  test("a series with room for one dog is a private class", () => {
    const book = build({ series: [series({ capacity: 1 })] });
    expect(book.classes[0].classType).toBe("private");
    expect(build({}).classes[0].classType).toBe("group");
  });

  test("the roster is the enrolled dogs — not the waitlist, not the withdrawn", () => {
    const book = build({
      enrollments: [
        enrollment({ id: "e1" }),
        enrollment({ id: "e2", status: "waitlisted" }),
        enrollment({ id: "e3", status: "cancelled" }),
        enrollment({ id: "e4", status: "completed" }),
      ],
    });
    expect(book.sessions[0].attendees).toEqual(["e1", "e4"]);
    expect(book.classes[0].enrolledCount).toBe(1);
    expect(book.enrollments.find((e) => e.id === "e3")?.status).toBe("dropped");
  });

  test("a cancelled series cancels its sessions", () => {
    const book = build({ series: [series({ status: "cancelled" })] });
    expect(book.sessions[0].status).toBe("cancelled");
    expect(book.classes[0].status).toBe("inactive");
  });

  test("the trainer is named by the staff app id", () => {
    expect(build({}).classes[0].trainerId).toBe("fs-train-01");
    const noLegacy = build({
      series: [
        series({ staff: { legacy_id: null, first_name: "A", last_name: "B" } }),
      ],
    });
    expect(noLegacy.classes[0].trainerId).toBe("uuid-staff");
  });

  test("attended sessions are counted per dog", () => {
    const book = build({
      enrollments: [enrollment({})],
      attended: new Map([["s1", new Map([[7, 2]])]]),
    });
    expect(book.enrollments[0].sessionsAttended).toBe(2);
    expect(book.enrollments[0].totalSessions).toBe(2);
  });

  test("a series files under the catalogue course it names, or under its own name", () => {
    expect(
      courseOf({ course_type_name: "puppy preschool", name: "Tue puppies" }),
    ).toEqual({
      id: "puppy-preschool",
      name: "Puppy Preschool",
      catalogue: true,
    });
    const own = courseOf({ course_type_name: "", name: "Scent work" });
    expect(own.catalogue).toBe(false);
    expect(own.name).toBe("Scent work");
    const book = build({
      series: [series({ course_type_name: "Scent work" })],
    });
    expect(book.extraCourseTypes.map((c) => c.name)).toEqual(["Scent work"]);
    expect(book.series[0].courseTypeId).toBe(own.id);
  });

  test("an active series that has not started yet is upcoming", () => {
    const later = buildTrainingBook({
      series: [series({})],
      sessions: [session({})],
      enrollments: [],
      attended: new Map(),
      timeZone: "America/Toronto",
      today: "2026-09-10",
    });
    expect(later.series[0].status).toBe("upcoming");
    const running = buildTrainingBook({
      series: [series({})],
      sessions: [session({})],
      enrollments: [],
      attended: new Map(),
      timeZone: "America/Toronto",
      today: "2026-09-20",
    });
    expect(running.series[0].status).toBe("active");
  });

  test("a series enrollment carries its progress and how it stands on payment", () => {
    const book = buildTrainingBook({
      series: [series({ number_of_sessions: 4 })],
      sessions: [session({})],
      enrollments: [enrollment({})],
      attended: new Map([["s1", new Map([[7, 1]])]]),
      paid: new Map([["s1", new Map([[7, "deposit" as const]])]]),
      timeZone: "America/Toronto",
    });
    const e = book.seriesEnrollments[0];
    expect(e.progress).toBe(25);
    expect(e.currentSessionNumber).toBe(2);
    expect(e.paymentStatus).toBe("deposit");
  });

  test("a session knows which booking is each dog's place in it", () => {
    const book = buildTrainingBook({
      series: [series({})],
      sessions: [session({})],
      enrollments: [enrollment({})],
      attended: new Map(),
      bookingRefs: new Map([["x1", new Map([[7, 5012]])]]),
      timeZone: "America/Toronto",
    });
    expect(book.sessions[0].bookingRefByPet).toEqual({ 7: 5012 });
  });
});
