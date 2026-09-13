import { describe, expect, test } from "bun:test";

import {
  attendanceStatusOf,
  parseExerciseRatings,
  rowToSessionAttendance,
  type TrainingAttendanceHistoryRow,
} from "@/lib/api/mappers/training-attendance-history";

// A dog's training history is read from training_attendance_history(). A
// wrong status here is a dog shown absent from a class it came to; a rating
// the database refuses is a whole session's attendance that fails to save.

const row = (
  over: Partial<TrainingAttendanceHistoryRow>,
): TrainingAttendanceHistoryRow => ({
  booking_id: "b1",
  booking_ref: 101,
  facility_id: "f1",
  timezone: "America/Toronto",
  session_id: "s1",
  session_number: 2,
  session_start_at: "2026-09-16T00:00:00Z",
  session_end_at: "2026-09-16T01:00:00Z",
  series_id: "series-1",
  enrollment_id: "e1",
  pet_ref: 7,
  pet_name: "Kofi",
  checked_in_at: null,
  checked_out_at: null,
  mark: null,
  session_notes: null,
  exercises: [],
  recorded_at: null,
  updated_at: null,
  ...over,
});

describe("attendanceStatusOf", () => {
  test("an excused dog reads excused, not absent", () => {
    expect(attendanceStatusOf({ mark: "excused", checked_in_at: null })).toBe(
      "excused",
    );
  });

  test("a check-in marked late reads late; unmarked reads present", () => {
    const at = "2026-09-16T00:10:00Z";
    expect(attendanceStatusOf({ mark: "late", checked_in_at: at })).toBe(
      "late",
    );
    expect(attendanceStatusOf({ mark: null, checked_in_at: at })).toBe(
      "present",
    );
  });
});

describe("parseExerciseRatings", () => {
  test("takes named exercises rated 1 to 5, trimming the name", () => {
    expect(
      parseExerciseRatings([
        { exerciseName: " Sit ", rating: 4 },
        { exerciseName: "Recall", rating: 1 },
      ]),
    ).toEqual([
      { exerciseName: "Sit", rating: 4 },
      { exerciseName: "Recall", rating: 1 },
    ]);
  });

  test("refuses what the database would refuse", () => {
    expect(parseExerciseRatings("Sit")).toBeNull();
    expect(
      parseExerciseRatings([{ exerciseName: "Sit", rating: 6 }]),
    ).toBeNull();
    expect(
      parseExerciseRatings([{ exerciseName: "Sit", rating: 2.5 }]),
    ).toBeNull();
    expect(
      parseExerciseRatings([{ exerciseName: "  ", rating: 3 }]),
    ).toBeNull();
    expect(parseExerciseRatings([{ rating: 3 }])).toBeNull();
    expect(
      parseExerciseRatings(
        Array.from({ length: 51 }, () => ({ exerciseName: "Sit", rating: 3 })),
      ),
    ).toBeNull();
  });
});

describe("rowToSessionAttendance", () => {
  test("carries the ratings, and the facility's day", () => {
    const attendance = rowToSessionAttendance(
      row({
        checked_in_at: "2026-09-16T00:02:00Z",
        exercises: [{ exerciseName: "Sit", rating: 5 }],
      }),
    );
    expect(attendance.exercises).toEqual([{ exerciseName: "Sit", rating: 5 }]);
    // 20:00 in Toronto on the 15th is 00:00Z on the 16th.
    expect(attendance.sessionDate).toBe("2026-09-15");
  });

  test("a row whose exercises cannot be read shows none", () => {
    expect(
      rowToSessionAttendance(row({ exercises: { nope: true } })).exercises,
    ).toEqual([]);
  });
});
