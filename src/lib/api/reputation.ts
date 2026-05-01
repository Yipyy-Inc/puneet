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
} from "@/types/reputation";

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
};
