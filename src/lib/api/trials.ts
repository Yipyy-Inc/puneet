import { buildTrials } from "@/data/trials";
import type { TrialsState } from "@/types/trials";

// Query factory for the trials-management page. The live clock is injected here
// so the builder stays pure.
export const trialsQueries = {
  list: () => ({
    queryKey: ["trials"] as const,
    queryFn: async (): Promise<TrialsState> => buildTrials(new Date()),
  }),
};
