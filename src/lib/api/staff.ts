"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  taskTemplates,
  staffTasks,
  staffPerformance,
  staffDocuments,
  staffCertifications,
} from "@/data/staff-tasks";
import { facilityStaff } from "@/data/facility-staff";
import type { StaffProfile } from "@/types/facility-staff";
import { liveFetch, liveWrite } from "./live-fetch";
import {
  shiftTasks,
  shiftSwapRequests,
  sickCallIns,
  staffAvailability,
  timeOffRequests,
  shiftTemplates,
} from "@/data/staff-availability";

/**
 * Staff profiles from Postgres, with the mock array as the signed-out
 * fallback. The 47 files that still import `facilityStaff` directly are the
 * follow-up — this is the seam they move onto, one at a time.
 */
async function fetchStaffProfiles(): Promise<StaffProfile[]> {
  return liveFetch<StaffProfile[]>("/api/staff", () => facilityStaff, "staff");
}

export const staffQueries = {
  /** Every staff member at the caller's facility. */
  profiles: () => ({
    queryKey: ["staff", "profiles"] as const,
    queryFn: async () => fetchStaffProfiles(),
  }),
  profile: (staffId: string) => ({
    queryKey: ["staff", "profiles", staffId] as const,
    queryFn: async () =>
      (await fetchStaffProfiles()).find((p) => p.id === staffId) ?? null,
  }),
  taskTemplates: () => ({
    queryKey: ["staff", "task-templates"] as const,
    queryFn: async () => taskTemplates,
  }),
  tasks: () => ({
    queryKey: ["staff", "tasks"] as const,
    queryFn: async () => staffTasks,
  }),
  tasksByStaff: (staffId: string) => ({
    queryKey: ["staff", "tasks", staffId] as const,
    queryFn: async () => staffTasks.filter((t) => t.assignedTo === staffId),
  }),
  performance: () => ({
    queryKey: ["staff", "performance"] as const,
    queryFn: async () => staffPerformance,
  }),
  performanceByStaff: (staffId: string) => ({
    queryKey: ["staff", "performance", staffId] as const,
    queryFn: async () => staffPerformance.find((p) => p.staffId === staffId),
  }),
  documents: () => ({
    queryKey: ["staff", "documents"] as const,
    queryFn: async () => staffDocuments,
  }),
  documentsByStaff: (staffId: string) => ({
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
  availabilityByStaff: (staffId: string) => ({
    queryKey: ["staff", "availability", staffId] as const,
    queryFn: async () => staffAvailability.filter((a) => a.staffId === staffId),
  }),
  timeOffRequests: () => ({
    queryKey: ["staff", "time-off"] as const,
    queryFn: async () => timeOffRequests,
  }),
  timeOffByStaff: (staffId: string) => ({
    queryKey: ["staff", "time-off", staffId] as const,
    queryFn: async () => timeOffRequests.filter((r) => r.staffId === staffId),
  }),
  shiftTemplates: () => ({
    queryKey: ["staff", "shift-templates"] as const,
    queryFn: async () => shiftTemplates,
  }),
};

// ============================================================================
// Writes.
//
// `liveWrite`, not `liveWriteOptional`: a staff edit has nowhere else to go.
// Signed out these must fail loudly rather than pretend, because the only
// alternative — a local copy — is what the screens are being moved OFF.
//
// The RESPONSE is the source of truth for what happened, not the payload that
// was sent. The database silently reverts fields the caller may not set
// (20260802140000), so a mutation that optimistically kept its own input would
// show an edit that was thrown away. Every hook below returns what came back.
// ============================================================================

/** Add someone to the roster. Requires `manage_staff`, enforced by RLS. */
export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: Partial<StaffProfile>) =>
      liveWrite<StaffProfile>("/api/staff", "POST", profile),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["staff", "profiles"] }),
  });
}

/**
 * Change someone's record. Send only what changed — the route merges onto the
 * stored row, so a partial patch cannot blank the fields it omits.
 */
export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      staffId,
      patch,
    }: {
      staffId: string;
      patch: Partial<StaffProfile>;
    }) => liveWrite<StaffProfile>(`/api/staff/${staffId}`, "PATCH", patch),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["staff", "profiles"] }),
  });
}
