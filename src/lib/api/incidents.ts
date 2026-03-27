import type { Incident } from "@/types/incidents";

import { incidents } from "@/data/incidents";

export const incidentQueries = {
  all: () => ({
    queryKey: ["incidents"] as const,
    queryFn: async (): Promise<Incident[]> => incidents,
  }),

  byId: (id: string) => ({
    queryKey: ["incidents", id] as const,
    queryFn: async (): Promise<Incident | undefined> =>
      incidents.find((i) => i.id === id),
  }),
};
