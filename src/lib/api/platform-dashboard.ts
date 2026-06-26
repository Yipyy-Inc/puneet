import {
  buildBusinessHealth,
  buildNeedsAttention,
  buildPlatformEvents,
} from "@/data/platform-dashboard";
import type {
  BusinessHealth,
  NeedsAttention,
  PlatformEvent,
} from "@/types/platform-dashboard";

// Query factory for the platform admin command center (/dashboard).
// The live clock is injected here (queryFn) so the builders stay pure.
export const platformDashboardQueries = {
  businessHealth: () => ({
    queryKey: ["platform-dashboard", "business-health"] as const,
    queryFn: async (): Promise<BusinessHealth> =>
      buildBusinessHealth(new Date()),
  }),

  needsAttention: () => ({
    queryKey: ["platform-dashboard", "needs-attention"] as const,
    queryFn: async (): Promise<NeedsAttention> =>
      buildNeedsAttention(new Date()),
  }),

  activity: () => ({
    queryKey: ["platform-dashboard", "activity"] as const,
    queryFn: async (): Promise<PlatformEvent[]> =>
      buildPlatformEvents(new Date()),
  }),
};
