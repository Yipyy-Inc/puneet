import type { FacilitySubscription, FacilityRequest } from "@/types/facility";
import type { FacilityListItem } from "@/types/platform-dashboard";

import { facilities } from "@/data/facilities";
import { facilityConfig } from "@/data/facility-config";
import {
  facilitySubscriptions,
  getSubscriptionsByStatus,
} from "@/data/facility-subscriptions";
import { facilityRequests } from "@/data/facility-requests";

export const facilityQueries = {
  config: () => ({
    queryKey: ["facility", "config"] as const,
    queryFn: async () => facilityConfig,
  }),

  list: () => ({
    queryKey: ["facility", "list"] as const,
    queryFn: async (): Promise<FacilityListItem[]> =>
      facilities.map((f) => ({
        id: f.id,
        name: f.name,
        status: String((f as { status?: unknown }).status ?? ""),
        plan: String((f as { plan?: unknown }).plan ?? ""),
      })),
  }),

  subscriptions: () => ({
    queryKey: ["facility", "subscriptions"] as const,
    queryFn: async (): Promise<FacilitySubscription[]> => facilitySubscriptions,
  }),

  subscriptionsByStatus: (
    status: "active" | "trial" | "suspended" | "cancelled" | "expired",
  ) => ({
    queryKey: ["facility", "subscriptions", status] as const,
    queryFn: async (): Promise<FacilitySubscription[]> =>
      getSubscriptionsByStatus(status),
  }),

  requests: () => ({
    queryKey: ["facility", "requests"] as const,
    queryFn: async (): Promise<FacilityRequest[]> => facilityRequests,
  }),

  requestById: (id: number) => ({
    queryKey: ["facility", "requests", id] as const,
    queryFn: async (): Promise<FacilityRequest | undefined> =>
      facilityRequests.find((r) => r.id === id),
  }),
};
