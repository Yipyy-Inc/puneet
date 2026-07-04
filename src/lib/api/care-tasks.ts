import {
  getCareTasksConfig,
  saveCareTasksConfig,
  type CareTasksConfig,
} from "@/data/care-tasks";

// Care-tasks query layer: feeding & medication option lists. The TanStack Query
// cache is the single source of truth; persistence lives in @/data/care-tasks.

export const careTaskKeys = {
  all: ["care-tasks"] as const,
  config: () => [...careTaskKeys.all, "config"] as const,
};

export const careTaskQueries = {
  config: () => ({
    queryKey: careTaskKeys.config(),
    queryFn: async (): Promise<CareTasksConfig> => getCareTasksConfig(),
  }),
};

export const careTaskMutations = {
  save: () => ({
    mutationFn: async (config: CareTasksConfig): Promise<CareTasksConfig> =>
      saveCareTasksConfig(config),
  }),
};
