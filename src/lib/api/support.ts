import type { SupportTicket, SLAConfig, SupportAgent } from "@/types/support";

import {
  supportTickets,
  slaConfigs,
  supportAgents,
} from "@/data/support-tickets";

export const supportQueries = {
  tickets: () => ({
    queryKey: ["support", "tickets"] as const,
    queryFn: async (): Promise<SupportTicket[]> => supportTickets,
  }),

  ticketById: (id: string) => ({
    queryKey: ["support", "tickets", id] as const,
    queryFn: async (): Promise<SupportTicket | undefined> =>
      supportTickets.find((t) => t.id === id),
  }),

  slaConfigs: () => ({
    queryKey: ["support", "sla"] as const,
    queryFn: async (): Promise<SLAConfig[]> => slaConfigs,
  }),

  agents: () => ({
    queryKey: ["support", "agents"] as const,
    queryFn: async (): Promise<SupportAgent[]> => supportAgents,
  }),
};
