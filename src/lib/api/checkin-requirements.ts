import {
  getCheckinConfig,
  saveCheckinConfig,
  type ExpressCheckinConfig,
} from "@/data/checkin-requirements";

// Query layer for express check-in requirements (facility-wide defaults +
// per-service overrides). The TanStack Query cache is the single source of
// truth; persistence lives in @/data/checkin-requirements.

export const checkinKeys = {
  all: ["checkin-requirements"] as const,
  config: () => [...checkinKeys.all, "config"] as const,
};

export const checkinQueries = {
  config: () => ({
    queryKey: checkinKeys.config(),
    queryFn: async (): Promise<ExpressCheckinConfig> => getCheckinConfig(),
  }),
};

export const checkinMutations = {
  save: () => ({
    mutationFn: async (
      config: ExpressCheckinConfig,
    ): Promise<ExpressCheckinConfig> => saveCheckinConfig(config),
  }),
};
