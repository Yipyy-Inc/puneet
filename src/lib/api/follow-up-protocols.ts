import type { FollowUpProtocol } from "@/types/incidents";
import {
  followUpProtocols,
  suggestProtocols,
} from "@/data/follow-up-protocols";

export const followUpProtocolQueries = {
  all: () => ({
    queryKey: ["follow-up-protocols"] as const,
    queryFn: async (): Promise<FollowUpProtocol[]> => followUpProtocols,
  }),

  byId: (id: string) => ({
    queryKey: ["follow-up-protocols", id] as const,
    queryFn: async (): Promise<FollowUpProtocol | undefined> =>
      followUpProtocols.find((p) => p.id === id),
  }),

  suggestionsFor: (severity: string, type: string) => ({
    queryKey: ["follow-up-protocols", "suggest", severity, type] as const,
    queryFn: async (): Promise<FollowUpProtocol[]> =>
      suggestProtocols(severity, type),
  }),
};
