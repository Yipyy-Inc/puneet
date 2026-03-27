import { clients } from "@/data/clients";
import type { Client } from "@/types/client";

export const clientQueries = {
  all: () => ({
    queryKey: ["clients"] as const,
    queryFn: async (): Promise<Client[]> => clients,
  }),
  detail: (id: number) => ({
    queryKey: ["clients", id] as const,
    queryFn: async () => clients.find((c) => c.id === id) ?? null,
  }),
  search: (query: string) => ({
    queryKey: ["clients", "search", query] as const,
    queryFn: async () => {
      const q = query.toLowerCase();
      return clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      );
    },
  }),
};
