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
};
