import {
  taskTemplates,
  staffTasks,
  staffPerformance,
  staffDocuments,
  staffCertifications,
} from "@/data/staff-tasks";
import {
  shiftTasks,
  shiftSwapRequests,
  sickCallIns,
  staffAvailability,
  timeOffRequests,
  shiftTemplates,
} from "@/data/staff-availability";

export const staffQueries = {
  taskTemplates: () => ({
    queryKey: ["staff", "task-templates"] as const,
    queryFn: async () => taskTemplates,
  }),
  tasks: () => ({
    queryKey: ["staff", "tasks"] as const,
    queryFn: async () => staffTasks,
  }),
  tasksByStaff: (staffId: number) => ({
    queryKey: ["staff", "tasks", staffId] as const,
    queryFn: async () => staffTasks.filter((t) => t.assignedTo === staffId),
  }),
  performance: () => ({
    queryKey: ["staff", "performance"] as const,
    queryFn: async () => staffPerformance,
  }),
  performanceByStaff: (staffId: number) => ({
    queryKey: ["staff", "performance", staffId] as const,
    queryFn: async () => staffPerformance.find((p) => p.staffId === staffId),
  }),
  documents: () => ({
    queryKey: ["staff", "documents"] as const,
    queryFn: async () => staffDocuments,
  }),
  documentsByStaff: (staffId: number) => ({
    queryKey: ["staff", "documents", staffId] as const,
    queryFn: async () => staffDocuments.filter((d) => d.staffId === staffId),
  }),
  certifications: () => ({
    queryKey: ["staff", "certifications"] as const,
    queryFn: async () => staffCertifications,
  }),
  shiftTasks: () => ({
    queryKey: ["staff", "shift-tasks"] as const,
    queryFn: async () => shiftTasks,
  }),
  shiftSwapRequests: () => ({
    queryKey: ["staff", "swap-requests"] as const,
    queryFn: async () => shiftSwapRequests,
  }),
  sickCallIns: () => ({
    queryKey: ["staff", "sick-call-ins"] as const,
    queryFn: async () => sickCallIns,
  }),
  availability: () => ({
    queryKey: ["staff", "availability"] as const,
    queryFn: async () => staffAvailability,
  }),
  availabilityByStaff: (staffId: number) => ({
    queryKey: ["staff", "availability", staffId] as const,
    queryFn: async () => staffAvailability.filter((a) => a.staffId === staffId),
  }),
  timeOffRequests: () => ({
    queryKey: ["staff", "time-off"] as const,
    queryFn: async () => timeOffRequests,
  }),
  timeOffByStaff: (staffId: number) => ({
    queryKey: ["staff", "time-off", staffId] as const,
    queryFn: async () => timeOffRequests.filter((r) => r.staffId === staffId),
  }),
  shiftTemplates: () => ({
    queryKey: ["staff", "shift-templates"] as const,
    queryFn: async () => shiftTemplates,
  }),
};
