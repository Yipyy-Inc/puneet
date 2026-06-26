import { buildDunningState, getFacilitySuspensionFlag } from "@/data/dunning";
import type { DunningState, FacilitySuspensionFlag } from "@/types/dunning";

// Query factory for the dunning sequence. The live clock is injected here so
// the builders stay pure.
export const dunningQueries = {
  state: () => ({
    queryKey: ["dunning", "state"] as const,
    queryFn: async (): Promise<DunningState> => buildDunningState(new Date()),
  }),

  forFacility: (facilityId: number) => ({
    queryKey: ["dunning", "facility", facilityId] as const,
    queryFn: async (): Promise<FacilitySuspensionFlag | null> =>
      getFacilitySuspensionFlag(facilityId, new Date()),
  }),
};
