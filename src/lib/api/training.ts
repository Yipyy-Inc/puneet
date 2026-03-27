import {
  trainers,
  trainingClasses,
  trainingSessions,
  enrollments,
  trainerNotes,
  progressRecords,
  trainingPackages,
} from "@/data/training";

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
};
