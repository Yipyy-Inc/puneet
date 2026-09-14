"use client";

import type { ClientMessage } from "@/lib/api/mappers/client-message";

// What the facility sent one client — see lib/api/mappers/client-message.ts.
export const clientMessageQueries = {
  forClient: (ref: number) => ({
    queryKey: ["clients", ref, "messages"] as const,
    queryFn: async (): Promise<ClientMessage[]> => {
      if (!(ref > 0)) return [];
      const response = await fetch(`/api/clients/${ref}/messages`);
      if (response.status === 401) return [];
      if (!response.ok) {
        throw new Error(`Failed to load messages (${response.status})`);
      }
      return (await response.json()) as ClientMessage[];
    },
  }),
};
