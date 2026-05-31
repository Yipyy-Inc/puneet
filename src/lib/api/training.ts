import {
  trainers,
  trainingClasses,
  trainingSessions,
  enrollments,
  trainerNotes,
  progressRecords,
  trainingPackages,
} from "@/data/training";
import {
  seriesEnrollments,
  trainingSeriesList,
} from "@/data/training-series";
import { defaultTrainingDisciplines } from "@/data/training-disciplines";
import {
  defaultTrainingCourseTypes,
  type CourseCurriculumWeek,
} from "@/lib/training-config";
import { defaultTrainingPathways } from "@/data/training-pathways";
import { defaultHomeworkTemplates } from "@/data/training-homework-templates";
import { trainingExercises } from "@/data/training-exercises";
import { vaccinationRecords } from "@/data/pet-data";
import {
  getAttendanceForPet,
  getHomeworkForEnrollments,
  getReportCardsForPet,
  sessionAttendances,
  trainingHomeworkRecords,
  trainingReportCardRecords,
} from "@/data/training-history";
import { clientTrainingPackages } from "@/data/client-training-packages";
import {
  defaultTrainingModuleSettings,
  type TrainingModuleSettings,
} from "@/lib/training-module-settings";
import type { MakeupSession } from "@/lib/training-makeup";
import type { TrainingDropInBooking } from "@/lib/training-drop-ins";
import type { TrainingTimeBlock } from "@/lib/training-time-blocks";

/** Seeded dog-specific private session plans (mock), keyed by petId. Charlie
 *  (14) is a reactive dog doing 1-on-1 work (session-006, an adaptive Private
 *  session), so a tailored plan is seeded to demonstrate the dog-specific
 *  pre-load in the live session view + the Custom Session Plan builder. Other
 *  pets default to an empty plan the trainer builds in the student profile. */
const seededPrivateSessionPlans: Record<number, CourseCurriculumWeek[]> = {
  14: [
    {
      sessionNumber: 1,
      title: "Threshold & engagement",
      exerciseIds: ["ex-behav-threshold", "ex-behav-engage", "ex-behav-lat"],
    },
  ],
};

export const trainingQueries = {
  trainers: () => ({
    queryKey: ["training", "trainers"] as const,
    queryFn: async () => trainers,
  }),
  trainerDetail: (id: string) => ({
    queryKey: ["training", "trainers", id] as const,
    queryFn: async () => trainers.find((t) => t.id === id),
  }),
  classes: () => ({
    queryKey: ["training", "classes"] as const,
    queryFn: async () => trainingClasses,
  }),
  classDetail: (id: string) => ({
    queryKey: ["training", "classes", id] as const,
    queryFn: async () => trainingClasses.find((c) => c.id === id),
  }),
  sessions: () => ({
    queryKey: ["training", "sessions"] as const,
    queryFn: async () => trainingSessions,
  }),
  sessionsByClass: (classId: string) => ({
    queryKey: ["training", "sessions", classId] as const,
    queryFn: async () => trainingSessions.filter((s) => s.classId === classId),
  }),
  enrollments: () => ({
    queryKey: ["training", "enrollments"] as const,
    queryFn: async () => enrollments,
  }),
  enrollmentsByClass: (classId: string) => ({
    queryKey: ["training", "enrollments", classId] as const,
    queryFn: async () => enrollments.filter((e) => e.classId === classId),
  }),
  trainerNotes: () => ({
    queryKey: ["training", "notes"] as const,
    queryFn: async () => trainerNotes,
  }),
  notesByEnrollment: (enrollmentId: string) => ({
    queryKey: ["training", "notes", enrollmentId] as const,
    queryFn: async () =>
      trainerNotes.filter((n) => n.enrollmentId === enrollmentId),
  }),
  progressRecords: () => ({
    queryKey: ["training", "progress"] as const,
    queryFn: async () => progressRecords,
  }),
  progressByEnrollment: (enrollmentId: string) => ({
    queryKey: ["training", "progress", enrollmentId] as const,
    queryFn: async () =>
      progressRecords.filter((p) => p.enrollmentId === enrollmentId),
  }),
  packages: () => ({
    queryKey: ["training", "packages"] as const,
    queryFn: async () => trainingPackages,
  }),
  /** Active course types from the Course Catalog — the single source of truth
   *  for what a client can book/enroll in. The booking flow scopes its series
   *  list to a chosen course type from this list. */
  courseTypes: () => ({
    queryKey: ["training", "course-types"] as const,
    queryFn: async () => defaultTrainingCourseTypes.filter((c) => c.isActive),
  }),
  /** Unfiltered course-type catalog — used by editors that need to surface
   *  inactive course types too. */
  allCourseTypes: () => ({
    queryKey: ["training", "course-types", "all"] as const,
    queryFn: async () => defaultTrainingCourseTypes,
  }),
  series: () => ({
    queryKey: ["training", "series"] as const,
    queryFn: async () => trainingSeriesList,
  }),
  seriesDetail: (id: string) => ({
    queryKey: ["training", "series", id] as const,
    queryFn: async () => trainingSeriesList.find((s) => s.id === id),
  }),
  seriesEnrollments: (seriesId: string) => ({
    queryKey: ["training", "series", seriesId, "enrollments"] as const,
    queryFn: async () =>
      seriesEnrollments.filter((e) => e.seriesId === seriesId),
  }),
  /** All series enrollments across every series — used by the Students tab
   *  to roll up per-pet activity. */
  allSeriesEnrollments: () => ({
    queryKey: ["training", "series-enrollments", "all"] as const,
    queryFn: async () => seriesEnrollments,
  }),
  disciplines: () => ({
    queryKey: ["training", "disciplines"] as const,
    queryFn: async () =>
      defaultTrainingDisciplines.filter((d) => d.isActive),
  }),
  /** Unfiltered discipline list — used by Settings → Training so staff can
   *  toggle inactive disciplines back on. */
  allDisciplines: () => ({
    queryKey: ["training", "disciplines", "all"] as const,
    queryFn: async () => defaultTrainingDisciplines,
  }),
  /** Homework templates — saved homework assignments a trainer can load
   *  into the post-session prompt or curate per course in the Course
   *  Catalog. Active templates only (Settings/Catalog UI uses `all` below
   *  for editing hidden templates). */
  homeworkTemplates: () => ({
    queryKey: ["training", "homework-templates"] as const,
    queryFn: async () => defaultHomeworkTemplates.filter((t) => t.isActive),
  }),
  /** Unfiltered template catalog — used by the Course Catalog manager and
   *  the "Save as template" action to validate name uniqueness. */
  allHomeworkTemplates: () => ({
    queryKey: ["training", "homework-templates", "all"] as const,
    queryFn: async () => defaultHomeworkTemplates,
  }),
  /** Active training pathways — feeds the customer "Pathway Journey" panel
   *  and the "Part of {Pathway}" badge on the Training Classes catalog. */
  trainingPathways: () => ({
    queryKey: ["training", "pathways"] as const,
    queryFn: async () => defaultTrainingPathways.filter((p) => p.isActive),
  }),
  /** Unfiltered pathway catalog — used by Settings → Training so staff can
   *  edit/toggle hidden pathways. */
  allTrainingPathways: () => ({
    queryKey: ["training", "pathways", "all"] as const,
    queryFn: async () => defaultTrainingPathways,
  }),
  /** Exercise library — feeds the Session Completion Step 2 picker. The list
   *  is grouped per discipline in the data file; the consumer is responsible
   *  for filtering down to whatever discipline the active session belongs
   *  to. Hidden exercises are filtered out so they stop showing up in the
   *  picker without losing their record in historical attendance logs. */
  exercises: () => ({
    queryKey: ["training", "exercises"] as const,
    queryFn: async () => trainingExercises.filter((e) => !e.isHidden),
  }),
  /** Unfiltered exercise list — used by Settings → Training so staff can
   *  toggle hidden exercises back on or edit them. */
  allExercises: () => ({
    queryKey: ["training", "exercises", "all"] as const,
    queryFn: async () => trainingExercises,
  }),
  /** Vaccination records — the Students tab uses these to flag expiring
   *  vaccines so staff can chase owners before a series cuts them out. */
  vaccinations: () => ({
    queryKey: ["training", "vaccinations"] as const,
    queryFn: async () => vaccinationRecords,
  }),
  /** Every attendance record for a single pet — drives the Training
   *  History tab. */
  attendancesForPet: (petId: number) => ({
    queryKey: ["training", "attendances", "pet", petId] as const,
    queryFn: async () => getAttendanceForPet(petId),
  }),
  /** All attendance records — used when an admin needs facility-wide rollups. */
  allAttendances: () => ({
    queryKey: ["training", "attendances", "all"] as const,
    queryFn: async () => sessionAttendances,
  }),
  /** Homework records for a pet's enrollments — driven from the enrollment
   *  ids rather than petId because homework is per-enrollment in the data
   *  model. */
  homeworkForEnrollments: (enrollmentIds: string[]) => ({
    queryKey: ["training", "homework", enrollmentIds] as const,
    queryFn: async () => getHomeworkForEnrollments(enrollmentIds),
    enabled: enrollmentIds.length > 0,
  }),
  /** Catalog of all homework records — for any view that needs them. */
  allHomework: () => ({
    queryKey: ["training", "homework", "all"] as const,
    queryFn: async () => trainingHomeworkRecords,
  }),
  /** Training report cards for a single pet — feeds the per-pet Report
   *  Cards tab on the Training Profile and the customer-portal view. */
  reportCardsForPet: (petId: number) => ({
    queryKey: ["training", "report-cards", "pet", petId] as const,
    queryFn: async () => getReportCardsForPet(petId),
  }),
  /** Unscoped catalog of every training report card — for any global view
   *  (none today; reserved for a future facility-wide Report Cards board). */
  allReportCards: () => ({
    queryKey: ["training", "report-cards", "all"] as const,
    queryFn: async () => trainingReportCardRecords,
  }),
  /** All client-owned training packages — drives the unscoped catalogs.
   *  Per-pet and per-client variants below match the cache fan-out scopes
   *  in `client-training-packages.ts`. */
  clientTrainingPackages: () => ({
    queryKey: ["training", "client-packages", "all"] as const,
    queryFn: async () => clientTrainingPackages,
  }),
  clientTrainingPackagesForPet: (petId: number) => ({
    queryKey: ["training", "client-packages", "pet", petId] as const,
    queryFn: async () => clientTrainingPackages.filter((p) => p.petId === petId),
  }),
  clientTrainingPackagesForClient: (clientId: number) => ({
    queryKey: ["training", "client-packages", "client", clientId] as const,
    queryFn: async () =>
      clientTrainingPackages.filter((p) => p.clientId === clientId),
  }),
  /** Local-only set of session IDs the trainer has marked "briefed". Pure
   *  client-state — no backend; the query exists so the briefing tasks list
   *  and the panel "Mark briefed" button share the same cache. */
  preSessionBriefedSessionIds: () => ({
    queryKey: ["training", "pre-session", "briefed"] as const,
    queryFn: async (): Promise<string[]> => [],
    staleTime: Infinity,
  }),
  /** Exercises the trainer planned during the pre-session briefing for a
   *  given session. The Session View's Exercises section reads from this
   *  on first mount so the trainer walks in with their plan pre-loaded.
   *  Pure client-state — defaults to an empty list and is mutated via
   *  setQueryData from the briefing panel. */
  plannedExercisesForSession: (sessionId: string) => ({
    queryKey: ["training", "planned-exercises", sessionId] as const,
    queryFn: async (): Promise<string[]> => [],
    staleTime: Infinity,
  }),
  /** A dog-specific, week-by-week session plan built in the student profile for
   *  an individual pet — a "private curriculum" that follows the dog rather than
   *  the course type. Used by adaptive / Private 1-on-1 courses where the plan
   *  is tailored per dog. Seeded for a couple of demo dogs (below); otherwise
   *  empty client-state, mutated via setQueryData from the student profile's
   *  Custom Session Plan editor. The live session reads it to pre-load a private
   *  dog's session. */
  privateSessionPlanForPet: (petId: number) => ({
    queryKey: ["training", "private-session-plan", petId] as const,
    queryFn: async (): Promise<CourseCurriculumWeek[]> =>
      seededPrivateSessionPlans[petId]?.map((w) => ({
        ...w,
        exerciseIds: [...w.exerciseIds],
      })) ?? [],
    staleTime: Infinity,
  }),
  /** Catalog of make-up session records — populated when staff issue a
   *  make-up from the Students tab or offer a slot from the facility-side
   *  Make-up Sessions view. The customer portal + the per-pet History view
   *  both read from this so issuance surfaces everywhere. */
  allMakeupSessions: () => ({
    queryKey: ["training", "makeup-sessions", "all"] as const,
    queryFn: async (): Promise<MakeupSession[]> => [],
    staleTime: Infinity,
  }),
  /** Calendar time blocks — facility-curated unavailable slots that show as
   *  striped gray overlays on the training calendar. Persisted via the
   *  shared cache today; the dialog + day view read from the same key so
   *  a freshly-created block lights up the column instantly. */
  calendarTimeBlocks: () => ({
    queryKey: ["training", "calendar-time-blocks"] as const,
    queryFn: async (): Promise<TrainingTimeBlock[]> => [],
    staleTime: Infinity,
  }),
  /** Drop-in bookings — single-session attendance for series with
   *  `allowDropIns: true`. Pure client-state today; the customer drop-in
   *  dialog writes through this so the facility-side counters and the
   *  session view student list see the booking instantly. */
  dropInBookings: () => ({
    queryKey: ["training", "drop-in-bookings"] as const,
    queryFn: async (): Promise<TrainingDropInBooking[]> => [],
    staleTime: Infinity,
  }),
  /** Facility-wide Training module settings. Pure client-state today —
   *  Settings → Training writes to this cache; consumers (customer Homework
   *  tab, etc.) read from it so a flip propagates to every surface. */
  moduleSettings: () => ({
    queryKey: ["training", "module-settings"] as const,
    queryFn: async (): Promise<TrainingModuleSettings> =>
      defaultTrainingModuleSettings,
    staleTime: Infinity,
  }),
};
