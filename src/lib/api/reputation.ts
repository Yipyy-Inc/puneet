import {
  reputationSettings,
  reputationRequests,
  reputationDashboardStats,
  reputationStaffStats,
  reputationServiceStats,
} from "@/data/reputation";
import type {
  ReputationSettings,
  ReputationRequest,
  ReputationDashboardStats,
  ReputationStaffStat,
  ReputationServiceStat,
  ReputationTemplate,
} from "@/types/reputation";
import { buildReputationTemplate } from "@/lib/reputation/template-schema";

export const reputationQueries = {
  settings: () => ({
    queryKey: ["reputation", "settings"],
    queryFn: async (): Promise<ReputationSettings> => reputationSettings,
  }),
  requests: () => ({
    queryKey: ["reputation", "requests"],
    queryFn: async (): Promise<ReputationRequest[]> => reputationRequests,
  }),
  stats: () => ({
    queryKey: ["reputation", "stats"],
    queryFn: async (): Promise<ReputationDashboardStats> => reputationDashboardStats,
  }),
  staffStats: () => ({
    queryKey: ["reputation", "staff-stats"],
    queryFn: async (): Promise<ReputationStaffStat[]> => reputationStaffStats,
  }),
  serviceStats: () => ({
    queryKey: ["reputation", "service-stats"],
    queryFn: async (): Promise<ReputationServiceStat[]> => reputationServiceStats,
  }),
  /** The consolidated multilingual template object for a facility entity. */
  template: (facilityId: number) => ({
    queryKey: ["reputation", "template", facilityId],
    queryFn: async (): Promise<ReputationTemplate> =>
      buildReputationTemplate(facilityId, reputationSettings),
  }),
};
