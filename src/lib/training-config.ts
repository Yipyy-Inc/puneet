/**
 * Training Module Configuration
 *
 * Defines the structure for training course types (class catalog)
 * that facilities can configure and customize.
 */

/** Delivery/booking format for a course type. Richer than the
 *  class/package-level classTypeEnum (group|private): adds semi-private and
 *  drop-in. Controls which booking flow and calendar view a course uses. */
export type TrainingClassFormat =
  | "group"
  | "private"
  | "semi-private"
  | "drop-in";

/** Ordered list for rendering the Class Format dropdown. */
export const TRAINING_CLASS_FORMATS: TrainingClassFormat[] = [
  "group",
  "private",
  "semi-private",
  "drop-in",
];

/** Human-readable labels for each class format. */
export const TRAINING_CLASS_FORMAT_LABELS: Record<TrainingClassFormat, string> =
  {
    group: "Group",
    private: "Private 1-on-1",
    "semi-private": "Semi-Private",
    "drop-in": "Drop-In",
  };

/** How a course's session plan behaves.
 *  - `structured` — the course has a week-by-week session plan; the live
 *    session pre-loads each week's exercises automatically.
 *  - `adaptive` — no pre-loaded plan; the trainer builds the exercise list
 *    from scratch each session (e.g. a Reactive Rover Recovery class that
 *    works on whatever each dog needs that day). The trainer can still
 *    pre-plan a single session as a one-off from the upcoming session card. */
export type CurriculumStyle = "structured" | "adaptive";

/** Ordered list + labels for rendering the Curriculum Style toggle. */
export const CURRICULUM_STYLES: CurriculumStyle[] = ["structured", "adaptive"];
export const CURRICULUM_STYLE_LABELS: Record<CurriculumStyle, string> = {
  structured: "Structured",
  adaptive: "Adaptive",
};

/** One session/week of a course's curriculum — the exercises planned for that
 *  session. The exercise ids come from the exercise library
 *  (data/training-exercises.ts). This is what powers the auto-pre-load of the
 *  live session Exercises step: when a trainer opens session N of the course,
 *  the exercises listed for week N appear without searching. */
export interface CourseCurriculumWeek {
  /** 1-based week / session number within the course (1..defaultWeeks). */
  sessionNumber: number;
  /** Optional focus label for the week, e.g. "Foundations: sit & down". */
  title?: string;
  /** Exercise ids planned for this session, in teaching order. */
  exerciseIds: string[];
}

export interface TrainingCourseType {
  id: string;
  name: string; // Custom class name
  description: string; // Custom description
  /** Discipline this course type falls under (Obedience, Agility, Puppy
   *  Training, etc.). Links the course to the exercise library so the session
   *  exercise picker can suggest the right exercises for it. Disciplines are
   *  configured per facility in Settings — references a TrainingDiscipline id. */
  disciplineId?: string;
  /** Delivery/booking format (Group, Private 1-on-1, Semi-Private, Drop-In).
   *  Controls which booking flow and calendar view this course type uses. */
  classFormat?: TrainingClassFormat;
  /** Whether this course follows a fixed week-by-week plan (`structured`) or is
   *  built from scratch each session (`adaptive`). When unset, the effective
   *  style is derived: Private 1-on-1 courses default to `adaptive` (the plan
   *  follows the individual dog), everything else defaults to `structured`.
   *  Resolve via {@link getEffectiveCurriculumStyle} rather than reading this
   *  field directly. */
  curriculumStyle?: CurriculumStyle;
  defaultWeeks: number; // Default number of weeks
  ageRange: {
    minWeeks: number; // Minimum age in weeks
    maxWeeks?: number; // Maximum age in weeks (optional)
  };
  requiredVaccines: string[]; // Array of required vaccine names
  prerequisites: string[]; // Array of prerequisite course type IDs
  isActive: boolean; // Whether this course type is currently offered
  color?: string; // Calendar/badge color for this course type
  // Course details for customer-facing information
  /** Structured learning outcomes — the bulleted "What you will learn" list
   *  surfaced on the online booking page and client portal catalog. Distinct
   *  from `description`, which stays a single prose paragraph. */
  whatYouWillLearn?: string[];
  whatToBring?: string[]; // List of items to bring
  cancellationPolicy?: string; // Cancellation policy text
  refundPolicy?: string; // Refund policy text
  /** Per-session curriculum — the exercises planned for each week of the
   *  course. Pre-loads the live session's Exercises step so the trainer never
   *  starts from a blank search. Weeks without a plan simply fall back to the
   *  existing discipline/prior-session behaviour. */
  sessionCurriculum?: CourseCurriculumWeek[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Resolve the effective curriculum style for a course type. Honours an explicit
 * `curriculumStyle` when set; otherwise Private 1-on-1 courses are `adaptive` by
 * default (their plan follows the individual dog, built in the student profile),
 * and every other format defaults to `structured`.
 */
export function getEffectiveCurriculumStyle(
  course: Pick<TrainingCourseType, "curriculumStyle" | "classFormat">,
): CurriculumStyle {
  if (course.curriculumStyle) return course.curriculumStyle;
  return course.classFormat === "private" ? "adaptive" : "structured";
}

/**
 * Default system course types (fully editable by facilities)
 */
export const defaultTrainingCourseTypes: TrainingCourseType[] = [
  {
    id: "basic-obedience",
    name: "Basic Obedience / Beginner Manners",
    description:
      "Teaches foundational commands like sit, stay, down, and polite leash walking. Perfect for dogs who are new to training or need a refresher on basic manners. This course focuses on building a strong foundation for future training.",
    disciplineId: "discipline-obedience",
    classFormat: "group",
    whatYouWillLearn: [
      "Sit, down, and stay on cue",
      "Loose-leash walking without pulling",
      "Reliable recall — come when called",
      "Leave it and drop it for impulse control",
      "Calm greetings with people and other dogs",
    ],
    defaultWeeks: 6,
    ageRange: {
      minWeeks: 16, // 16+ weeks
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: [],
    sessionCurriculum: [
      {
        sessionNumber: 1,
        title: "Foundation commands",
        exerciseIds: [
          "ex-obed-sit",
          "ex-obed-down",
          "ex-obed-name",
          "ex-obed-leash-intro",
        ],
      },
      {
        sessionNumber: 2,
        title: "Stay foundations",
        exerciseIds: ["ex-obed-stay", "ex-obed-recall", "ex-obed-hand-signals"],
      },
      {
        sessionNumber: 3,
        title: "Loose leash",
        exerciseIds: [
          "ex-obed-llw",
          "ex-obed-direction-changes",
          "ex-obed-greeting",
        ],
      },
      {
        sessionNumber: 4,
        title: "Leave it and Drop",
        exerciseIds: ["ex-obed-leaveit", "ex-obed-dropit", "ex-obed-place"],
      },
      {
        sessionNumber: 5,
        title: "Distance and duration",
        exerciseIds: [
          "ex-obed-stay-distance",
          "ex-obed-recall-distractions",
          "ex-obed-recall-games",
        ],
      },
      {
        sessionNumber: 6,
        title: "Graduation review",
        // Graduation assessment — all exercises from sessions 1–5.
        exerciseIds: [
          "ex-obed-sit",
          "ex-obed-down",
          "ex-obed-name",
          "ex-obed-leash-intro",
          "ex-obed-stay",
          "ex-obed-recall",
          "ex-obed-hand-signals",
          "ex-obed-llw",
          "ex-obed-direction-changes",
          "ex-obed-greeting",
          "ex-obed-leaveit",
          "ex-obed-dropit",
          "ex-obed-place",
          "ex-obed-stay-distance",
          "ex-obed-recall-distractions",
          "ex-obed-recall-games",
        ],
      },
    ],
    whatToBring: [
      "Your dog on a 6-foot leash (no retractable leashes)",
      "High-value treats (small, soft, easy to swallow)",
      "Your dog's favorite toy (optional)",
      "Water bottle for your dog",
      "Waste bags",
    ],
    cancellationPolicy:
      "Free cancellation up to 48 hours before the series starts. After that, a 25% cancellation fee applies. No refunds after the series begins.",
    refundPolicy:
      "Full refund if cancelled 48+ hours before series start. 75% refund if cancelled 24-48 hours before. No refunds after series begins or if any sessions have been attended.",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "intermediate-obedience",
    name: "Intermediate / Level 2 Obedience",
    description:
      "Adds distractions, distance, and duration to previously learned commands.",
    disciplineId: "discipline-obedience",
    classFormat: "group",
    whatYouWillLearn: [
      "Holding stays with added distance and duration",
      "Recall around moderate distractions",
      "Polite walking past people, dogs, and traffic",
      "Responding to cues the first time, off treats",
    ],
    defaultWeeks: 4,
    ageRange: {
      minWeeks: 20,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: ["basic-obedience"], // Requires Basic Obedience completion
    sessionCurriculum: [
      {
        sessionNumber: 1,
        title: "Distance & duration",
        exerciseIds: ["ex-obed-stay-distance", "ex-obed-stay", "ex-obed-settle"],
      },
      {
        sessionNumber: 2,
        title: "Recall under distraction",
        exerciseIds: [
          "ex-obed-recall-distractions",
          "ex-obed-recall-games",
          "ex-obed-recall",
        ],
      },
      {
        sessionNumber: 3,
        title: "Leash precision",
        exerciseIds: ["ex-obed-llw", "ex-obed-direction-changes", "ex-obed-heel"],
      },
      {
        sessionNumber: 4,
        title: "Proofing & polish",
        exerciseIds: ["ex-obed-leaveit", "ex-obed-dropit", "ex-obed-place"],
      },
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "advanced-obedience",
    name: "Advanced Obedience",
    description: "Focuses on high-level reliability in varied environments.",
    disciplineId: "discipline-obedience",
    classFormat: "group",
    whatYouWillLearn: [
      "Off-leash reliability in open environments",
      "Distance commands and directed sends",
      "Precision heeling with turns and pace changes",
      "Rock-solid stays despite heavy distractions",
    ],
    defaultWeeks: 6,
    ageRange: {
      minWeeks: 24,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: ["intermediate-obedience"], // Requires Intermediate + Assessment
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "reactive-rover",
    name: "Reactive Rover Recovery",
    description: "For leash-reactive dogs. Controlled environment training.",
    disciplineId: "discipline-behavior",
    classFormat: "semi-private",
    // Highly adaptive — the trainer works on whatever each dog needs most that
    // day, so there's no fixed week-by-week plan to pre-load.
    curriculumStyle: "adaptive",
    whatYouWillLearn: [
      "Staying under threshold around triggers",
      "Engage-disengage and look-at-that games",
      "Confident leash walking past other dogs",
      "Calmer, more predictable responses to stressors",
    ],
    defaultWeeks: 8,
    ageRange: {
      minWeeks: 16,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: [], // Private assessment required (handled separately)
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "puppy-preschool",
    name: "Puppy Preschool",
    description: "Socialization and early manners for 8-16 week olds.",
    disciplineId: "discipline-puppy",
    classFormat: "group",
    whatYouWillLearn: [
      "Positive socialization with people, dogs, and sounds",
      "Name recognition and hand targeting",
      "Early sit, down, and settle",
      "Confident handling, crate, and potty routines",
    ],
    defaultWeeks: 4,
    ageRange: {
      minWeeks: 8,
      maxWeeks: 16,
    },
    requiredVaccines: ["DHPP"], // First round of vaccines
    prerequisites: [],
    sessionCurriculum: [
      {
        sessionNumber: 1,
        title: "Socialization & name game",
        exerciseIds: ["ex-puppy-name", "ex-puppy-socialization"],
      },
      {
        sessionNumber: 2,
        title: "Sit & hand target",
        exerciseIds: ["ex-puppy-sit", "ex-puppy-target"],
      },
      {
        sessionNumber: 3,
        title: "Down & handling",
        exerciseIds: ["ex-puppy-down", "ex-puppy-handling"],
      },
      {
        sessionNumber: 4,
        title: "Crate comfort & potty signal",
        exerciseIds: ["ex-puppy-crate", "ex-puppy-potty"],
      },
    ],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cgc-prep",
    name: "Canine Good Citizen Prep",
    description: "Preparation for CGC certification test.",
    disciplineId: "discipline-obedience",
    classFormat: "group",
    whatYouWillLearn: [
      "All 10 AKC Canine Good Citizen test items",
      "Accepting a friendly stranger and grooming",
      "Walking politely through a crowd",
      "Sit, down, stay, and come on cue",
      "Calm reactions to distractions and another dog",
    ],
    defaultWeeks: 6,
    ageRange: {
      minWeeks: 20,
    },
    requiredVaccines: ["Rabies", "DHPP", "Bordetella"],
    prerequisites: ["basic-obedience"], // Requires Basic Obedience
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Available vaccine options for course configuration
 */
export const AVAILABLE_VACCINES = [
  "Rabies",
  "DHPP",
  "Bordetella",
  "Canine Influenza",
  "Lyme",
  "Leptospirosis",
];
