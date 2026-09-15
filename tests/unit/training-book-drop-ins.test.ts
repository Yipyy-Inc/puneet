import { describe, expect, test } from "bun:test";

import {
  buildTrainingBook,
  type BookEnrollmentRow,
  type BookSeriesRow,
  type BookSessionBookingRow,
  type BookSessionRow,
} from "@/lib/api/mappers/training-book";

// A drop-in is a dog booked into one session of a series it is not enrolled
// in. Enrolled dogs' session bookings and offered make-up guests are not.

const series: BookSeriesRow = {
  id: "series-a",
  name: "Puppy Basics",
  course_type_name: "Puppy Basics",
  staff_id: null,
  day_of_week: 2,
  start_time: "18:00:00",
  duration_minutes: 60,
  start_date: "2026-09-15",
  number_of_sessions: 6,
  capacity: 8,
  total_price: 240,
  status: "active",
  locations: null,
  staff: null,
};

// 2026-09-15 22:00 UTC is 18:00 in Toronto.
const session: BookSessionRow = {
  id: "session-1",
  series_id: "series-a",
  session_number: 1,
  start_at: "2026-09-15T22:00:00Z",
  end_at: "2026-09-15T23:00:00Z",
  status: "scheduled",
};

const enrolled: BookEnrollmentRow = {
  id: "enr-1",
  series_id: "series-a",
  status: "enrolled",
  enrolled_at: "2026-09-01T12:00:00Z",
  pets: { ref: 1, name: "Kofi", breed: "Beagle" },
  clients: { ref: 10, name: "Ada", phone: null, email: null },
};

function booking(
  ref: number,
  pet: { ref: number; name: string },
  overrides: Partial<BookSessionBookingRow> = {},
): BookSessionBookingRow {
  return {
    ref,
    training_series_session_id: "session-1",
    status: "confirmed",
    total_cost: 45,
    created_at: "2026-09-10T12:00:00Z",
    updated_at: null,
    checkedIn: false,
    clients: { ref: 20, name: "Ben", phone: "5145550142", email: null },
    pets: [{ ...pet, breed: null }],
    ...overrides,
  };
}

function build(bookings: BookSessionBookingRow[]) {
  return buildTrainingBook({
    series: [series],
    sessions: [session],
    enrollments: [enrolled],
    attended: new Map(),
    // Pet 3 is here to make up a class it missed in another series.
    makeupGuests: [
      { hostSessionId: "session-1", seriesId: "series-b", petRef: 3 },
    ],
    sessionBookings: bookings,
    timeZone: "America/Toronto",
    today: "2026-09-15",
  });
}

describe("buildTrainingBook drop-ins", () => {
  test("only a dog not enrolled and not a make-up guest is a drop-in", () => {
    const book = build([
      booking(100, { ref: 1, name: "Kofi" }),
      booking(101, { ref: 2, name: "Maple" }),
      booking(102, { ref: 3, name: "Juno" }),
    ]);
    expect(book.dropInBookings.map((d) => d.petName)).toEqual(["Maple"]);
  });

  test("the session date and time are the facility's", () => {
    const [dropIn] = build([
      booking(101, { ref: 2, name: "Maple" }),
    ]).dropInBookings;
    expect(dropIn.sessionDate).toBe("2026-09-15");
    expect(dropIn.sessionStartTime).toBe("18:00");
    expect(dropIn.sessionNumber).toBe(1);
    expect(dropIn.price).toBe(45);
    expect(dropIn.seriesId).toBe("series-a");
  });

  test("status follows the booking and the check-in", () => {
    const statuses = build([
      booking(101, { ref: 2, name: "Maple" }),
      booking(103, { ref: 4, name: "Olive" }, { checkedIn: true }),
      booking(104, { ref: 5, name: "Pip" }, { status: "cancelled" }),
      booking(105, { ref: 6, name: "Rex" }, { status: "no_show" }),
    ]).dropInBookings.map((d) => [d.petName, d.status]);
    expect(statuses).toEqual([
      ["Maple", "booked"],
      ["Olive", "checked-in"],
      ["Pip", "cancelled"],
      ["Rex", "no-show"],
    ]);
  });

  test("a booking for a session outside the book is ignored", () => {
    const book = build([
      booking(
        106,
        { ref: 7, name: "Sky" },
        {
          training_series_session_id: "unknown-session",
        },
      ),
    ]);
    expect(book.dropInBookings).toEqual([]);
  });
});
