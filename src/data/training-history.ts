/**
 * Mock per-session training history.
 *
 * The Training History tab on a pet's Training Profile reads from these two
 * lists. Each `SessionAttendance` is a record of a single session a pet
 * attended (or didn't) — date, status, exercises with ratings, summary —
 * and each `TrainingHomework` is the homework that was unlocked from a
 * particular session.
 *
 * Buddy (petId 1) has the richest record so the page demos well end-to-end;
 * Max and Bella have a few entries each so the multi-pet path also works.
 */
import type {
  SessionAttendance,
  SessionConditions,
  SessionExerciseRating,
  TrainingHomework,
} from "@/lib/training-enrollment";

const NOW_ISO = "2026-05-17T12:00:00Z";

interface SessionSeed {
  index: number; // 0-based
  date: string; // ISO date
  status: SessionAttendance["status"];
  trainerNotes: string;
  exercises: SessionExerciseRating[];
  /** Optional environment context — seeded for outdoor sessions so the
   *  History tab demos the conditions chips on real data. */
  conditions?: SessionConditions;
  homework?: {
    title: string;
    description: string;
    instructions: string[];
    /** Cadence text shown on the Homework tab — keep it short. */
    frequency: string;
  };
}

// ── Buddy (petId=1) — series-001 "Basic Obedience — March Saturdays" ────────
// Completed series, 6 sessions, Buddy attended all six. Ratings progress
// from "developing" to "great" by week six.
const BUDDY_SERIES_001: SessionSeed[] = [
  {
    index: 0,
    date: "2026-03-07",
    status: "present",
    trainerNotes:
      "Strong first session — Buddy was excited but settled with food rewards. Owner caught on to clicker timing quickly.",
    exercises: [
      { exerciseName: "Sit on cue", rating: 3 },
      { exerciseName: "Down on cue", rating: 2, notes: "Slow to lure into position." },
      { exerciseName: "Name recognition", rating: 4 },
    ],
    homework: {
      title: "Practice sit and down with food rewards",
      description: "Two 3-minute reps per day at home, low-distraction.",
      instructions: [
        "Reward within 1 second of the dog completing the cue.",
        "Use small, soft, high-value treats.",
        "Stop the session before the dog disengages.",
      ],
      frequency: "2x per day · 3 min each",
    },
  },
  {
    index: 1,
    date: "2026-03-14",
    status: "present",
    trainerNotes:
      "Improving fast. Sit is becoming reliable on first cue. Owner started fading lures.",
    exercises: [
      { exerciseName: "Sit on cue", rating: 4 },
      { exerciseName: "Down on cue", rating: 3 },
      { exerciseName: "Stay (5s)", rating: 2 },
    ],
    homework: {
      title: "Hand-cue sit + 5-second stays",
      description: "Practice hand cue without verbal, then add short stays.",
      instructions: [
        "Three reps of hand-cue sit, no verbal.",
        "Five reps of 5-second stay, releasing on a word.",
        "End on a successful rep.",
      ],
      frequency: "Daily · 5 min",
    },
  },
  {
    index: 2,
    date: "2026-03-21",
    status: "late",
    trainerNotes:
      "Buddy arrived 15 min late but quickly caught up. Loose-leash walking is the main gap right now.",
    exercises: [
      { exerciseName: "Stay (10s)", rating: 3 },
      { exerciseName: "Loose-leash walking", rating: 2, notes: "Pulls toward distractions." },
      { exerciseName: "Polite greeting", rating: 3 },
    ],
    homework: {
      title: "U-turns on a loose leash",
      description: "Reverse direction whenever Buddy pulls. Reward the catch-up.",
      instructions: [
        "Carry treats in your left hand at the seam.",
        "Pivot away the moment leash goes tight.",
        "Reward when Buddy chooses to follow.",
      ],
      frequency: "Every walk",
    },
  },
  {
    index: 3,
    date: "2026-03-28",
    status: "present",
    trainerNotes:
      "Big jump on loose-leash. Stay duration is now consistent at 10s with the owner standing still.",
    exercises: [
      { exerciseName: "Stay (15s)", rating: 4 },
      { exerciseName: "Loose-leash walking", rating: 3 },
      { exerciseName: "Recall on cue (short)", rating: 4 },
    ],
    homework: {
      title: "Recall game with two handlers",
      description: "Have two people call Buddy back and forth in a hallway.",
      instructions: [
        "Use a high-value reward only when responsive.",
        "Vary which handler calls so Buddy doesn't pattern.",
        "Five reps total — quit while fun.",
      ],
      frequency: "3x per week",
    },
  },
  {
    index: 4,
    date: "2026-04-04",
    status: "present",
    trainerNotes:
      "Generalising well to outdoor distractions. We added a 1-step recall away from a sniffing dog and Buddy chose the owner three times in a row.",
    exercises: [
      { exerciseName: "Recall (outdoor)", rating: 4 },
      { exerciseName: "Loose-leash walking", rating: 4 },
      { exerciseName: "Polite greeting", rating: 4 },
      { exerciseName: "Settle on mat", rating: 3 },
    ],
    conditions: {
      weather: ["sunny", "hot"],
      distractionLevel: "high",
    },
    homework: {
      title: "Settle on a mat at home",
      description: "Reward sustained calm on a designated mat for 1-2 minutes.",
      instructions: [
        "Place the mat in a low-traffic spot.",
        "Drop treats between Buddy's paws while he stays.",
        "Release with a word and remove the mat between reps.",
      ],
      frequency: "Daily · 2 min",
    },
  },
  {
    index: 5,
    date: "2026-04-11",
    status: "present",
    trainerNotes:
      "Final session — Buddy passed every CGC-style task. Excellent foundation for the intermediate series. Recommended Advanced Obedience next.",
    exercises: [
      { exerciseName: "Sit on cue", rating: 5 },
      { exerciseName: "Down on cue", rating: 5 },
      { exerciseName: "Stay (30s)", rating: 4 },
      { exerciseName: "Loose-leash walking", rating: 4 },
      { exerciseName: "Recall (with distraction)", rating: 4 },
    ],
    homework: {
      title: "Maintenance — daily mini-sessions",
      description: "Five 2-minute drills covering all six exercises.",
      instructions: [
        "Rotate exercises so Buddy never knows what's next.",
        "End on success.",
        "Keep building duration on stays.",
      ],
      frequency: "Daily · 10 min",
    },
  },
];

// ── Buddy — series-005 "Advanced Obedience — Tuesday Evenings" ──────────────
// Active series, 6 sessions total; Buddy has attended sessions 1-4 so far.
const BUDDY_SERIES_005: SessionSeed[] = [
  {
    index: 0,
    date: "2026-04-21",
    status: "present",
    trainerNotes:
      "First advanced session. Buddy held a sit-stay through one other dog walking past at 15 feet.",
    exercises: [
      { exerciseName: "Sit-stay with distraction", rating: 3 },
      { exerciseName: "Off-leash recall (indoor)", rating: 3 },
    ],
    homework: {
      title: "Heel patterns at home",
      description: "Practice figure-8 heel patterns in a hallway.",
      instructions: [
        "Reward eye contact at every change of direction.",
        "Reset whenever Buddy forges.",
        "Three short sets per day.",
      ],
      frequency: "3x per day · 2 min each",
    },
  },
  {
    index: 1,
    date: "2026-04-28",
    status: "present",
    trainerNotes:
      "Heel patterns translating to the outdoor yard. Long-line recall is solid at 30 feet.",
    exercises: [
      { exerciseName: "Heel patterns", rating: 4 },
      { exerciseName: "Long-line recall (30ft)", rating: 4 },
      { exerciseName: "Down-stay at distance", rating: 3 },
    ],
    conditions: {
      weather: ["sunny"],
      distractionLevel: "medium",
    },
    homework: {
      title: "Drop-on-recall foundations",
      description: "Pair recall with an immediate down on a hand signal.",
      instructions: [
        "Start at 5 feet with no distractions.",
        "Reward separately for the recall and the down.",
        "Quit at 5 successful reps.",
      ],
      frequency: "Daily · 5 reps",
    },
  },
  {
    index: 2,
    date: "2026-05-05",
    status: "late",
    trainerNotes:
      "Buddy arrived 20 min late after a vet appointment. Worked on Place and emergency stop only.",
    exercises: [
      { exerciseName: "Place on cot", rating: 4 },
      { exerciseName: "Emergency stop", rating: 3, notes: "Stops on cue but doesn't always look back." },
    ],
  },
  {
    index: 3,
    date: "2026-05-12",
    status: "present",
    trainerNotes:
      "Excellent night. Buddy held a down-stay while the owner walked out of sight for 30 seconds.",
    exercises: [
      { exerciseName: "Down-stay (out of sight)", rating: 4 },
      { exerciseName: "Off-leash recall (outdoor)", rating: 4 },
      { exerciseName: "Heel patterns", rating: 5 },
    ],
    conditions: {
      weather: ["cloudy", "windy"],
      distractionLevel: "high",
    },
    homework: {
      title: "Add a real-world distraction to off-leash recall",
      description: "Practice off-leash recall at a quiet park or back yard.",
      instructions: [
        "Always set up for success — use a long line as backup.",
        "Reward heavily for first response, even partial.",
        "Five reps max, end on the strongest one.",
      ],
      frequency: "3x per week",
    },
  },
];

// ── Max (petId=3) — series-001 ───────────────────────────────────────────────
// Three recorded sessions ending with two consecutive absences so Max trips
// the No-Show Risk badge on his Training Profile, and so the check-in board
// can demo the auto-follow-up trigger when staff marks him out for today.
const MAX_SERIES_001: SessionSeed[] = [
  {
    index: 0,
    date: "2026-03-07",
    status: "present",
    trainerNotes: "Engaged but distracted by other dogs in the room.",
    exercises: [
      { exerciseName: "Sit on cue", rating: 2 },
      { exerciseName: "Name recognition", rating: 3 },
    ],
  },
  {
    index: 1,
    date: "2026-03-14",
    status: "absent",
    trainerNotes: "Owner cancelled morning of — booked makeup for next week.",
    exercises: [],
  },
  {
    index: 2,
    date: "2026-03-21",
    status: "absent",
    trainerNotes:
      "No call, no show. Second miss in a row — flag for No-Show Risk follow-up.",
    exercises: [],
  },
];

// ── Bella (petId=13) — series-001 ───────────────────────────────────────────
const BELLA_SERIES_001: SessionSeed[] = [
  {
    index: 0,
    date: "2026-03-07",
    status: "present",
    trainerNotes: "Very food-motivated, attention span was a challenge.",
    exercises: [
      { exerciseName: "Sit on cue", rating: 3 },
      { exerciseName: "Down on cue", rating: 2 },
    ],
  },
  {
    index: 5,
    date: "2026-04-11",
    status: "absent",
    trainerNotes: "Missed the final — earned graduation via makeup session.",
    exercises: [],
  },
];

interface AttendanceBundle {
  petId: number;
  petName: string;
  enrollmentId: string;
  courseTypeId: string;
  seeds: SessionSeed[];
}

const bundles: AttendanceBundle[] = [
  {
    petId: 1,
    petName: "Buddy",
    enrollmentId: "series-enroll-series-001-4",
    courseTypeId: "basic-obedience",
    seeds: BUDDY_SERIES_001,
  },
  {
    petId: 1,
    petName: "Buddy",
    enrollmentId: "series-enroll-series-005-2",
    courseTypeId: "advanced-obedience",
    seeds: BUDDY_SERIES_005,
  },
  {
    petId: 3,
    petName: "Max",
    enrollmentId: "series-enroll-series-001-5",
    courseTypeId: "basic-obedience",
    seeds: MAX_SERIES_001,
  },
  {
    petId: 13,
    petName: "Bella",
    enrollmentId: "series-enroll-series-001-1",
    courseTypeId: "basic-obedience",
    seeds: BELLA_SERIES_001,
  },
];

function buildAttendance(
  bundle: AttendanceBundle,
  seed: SessionSeed,
): SessionAttendance {
  const sessionNumber = seed.index + 1;
  return {
    id: `attendance-${bundle.enrollmentId}-${sessionNumber}`,
    enrollmentId: bundle.enrollmentId,
    sessionId: `session-${bundle.courseTypeId}-${seed.date}-${seed.index}`,
    sessionNumber,
    sessionDate: seed.date,
    petId: bundle.petId,
    petName: bundle.petName,
    status: seed.status,
    checkInTime:
      seed.status === "absent"
        ? null
        : seed.status === "late"
          ? "10:18 AM"
          : "09:55 AM",
    checkOutTime: seed.status === "absent" ? null : "11:05 AM",
    trainerNotes: seed.trainerNotes,
    exercises: seed.exercises.length > 0 ? seed.exercises : undefined,
    conditions: seed.conditions,
    homeworkUnlocked: seed.status !== "absent" && !!seed.homework,
    certificateGenerated: false,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
}

function addDays(iso: string, days: number): string {
  // ISO date strings are parsed as UTC; we only care about the YYYY-MM-DD
  // slice so this is safe even with the timezone normalization.
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Overrides for `nextDueDate` keyed by homework id. Lets us tune the demo so
 *  the Homework board shows overdue / due-today / due-this-week side-by-side
 *  without changing the assignment dates. Anything not in the map falls back
 *  to `sessionDate + 1 day` as a reasonable default. */
const NEXT_DUE_OVERRIDES: Record<string, string> = {
  // Buddy — basic series leftovers
  "homework-series-enroll-series-001-4-4": "2026-05-14", // 3 days overdue
  "homework-series-enroll-series-001-4-5": "2026-05-17", // due today
  "homework-series-enroll-series-001-4-6": "2026-05-18", // due tomorrow
  // Buddy — advanced series
  "homework-series-enroll-series-005-2-2": "2026-05-20", // due this week
  "homework-series-enroll-series-005-2-4": "2026-05-22", // due Friday
};

function buildHomework(
  bundle: AttendanceBundle,
  seed: SessionSeed,
): TrainingHomework | null {
  if (!seed.homework) return null;
  if (seed.status === "absent") return null;
  const sessionNumber = seed.index + 1;
  const id = `homework-${bundle.enrollmentId}-${sessionNumber}`;
  return {
    id,
    enrollmentId: bundle.enrollmentId,
    sessionNumber,
    sessionDate: seed.date,
    title: seed.homework.title,
    description: seed.homework.description,
    instructions: seed.homework.instructions,
    frequency: seed.homework.frequency,
    nextDueDate: NEXT_DUE_OVERRIDES[id] ?? addDays(seed.date, 1),
    unlocked: true,
    unlockedDate: seed.date,
    completed: false,
    completedDate: null,
  };
}

export const sessionAttendances: SessionAttendance[] = bundles.flatMap((b) =>
  b.seeds.map((s) => buildAttendance(b, s)),
);

// A handful of older homework records are marked completed so the archive
// section in the Homework tab has content to render. Completion date is a
// few days after the homework was assigned to mimic real-world cadence.
const COMPLETED_HOMEWORK_IDS: Record<string, string> = {
  "homework-series-enroll-series-001-4-1": "2026-03-10",
  "homework-series-enroll-series-001-4-2": "2026-03-17",
  "homework-series-enroll-series-001-4-3": "2026-03-24",
  "homework-series-enroll-series-005-2-1": "2026-04-25",
};

export const trainingHomeworkRecords: TrainingHomework[] = bundles
  .flatMap((b) => b.seeds.map((s) => buildHomework(b, s)))
  .filter((h): h is TrainingHomework => h !== null)
  .map((h) => {
    const completedDate = COMPLETED_HOMEWORK_IDS[h.id];
    if (!completedDate) return h;
    return { ...h, completed: true, completedDate, nextDueDate: null };
  });

/** Per-pet helper — used by the History tab to scope to one pet. */
export function getAttendanceForPet(petId: number): SessionAttendance[] {
  return sessionAttendances.filter((a) => a.petId === petId);
}

/** Homework records are scoped by enrollment — pass the enrollmentIds for
 *  the pet to get back every piece of homework they've been assigned. */
export function getHomeworkForEnrollments(
  enrollmentIds: string[],
): TrainingHomework[] {
  if (enrollmentIds.length === 0) return [];
  const set = new Set(enrollmentIds);
  return trainingHomeworkRecords.filter((h) => set.has(h.enrollmentId));
}
