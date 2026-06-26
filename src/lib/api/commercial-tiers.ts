import { buildTiersWithUsage } from "@/data/commercial-tiers";
import type { TierWithUsage } from "@/types/commercial-tiers";

// Query factory for the commercial Tiers & Pricing admin. Swapping to a real
// API only requires changing the queryFn here.
export const commercialTiersQueries = {
  list: () => ({
    queryKey: ["commercial", "tiers"] as const,
    queryFn: async (): Promise<TierWithUsage[]> => buildTiersWithUsage(),
  }),
};
