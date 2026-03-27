import { clients } from "@/data/clients";
import {
  petPhotos,
  vaccinationRecords,
  reportCards,
  petRelationships,
  careInstructions,
} from "@/data/pet-data";
import type { Pet } from "@/types/pet";

const allPets: Pet[] = clients.flatMap((c) => c.pets as Pet[]);

export const petQueries = {
  all: () => ({
    queryKey: ["pets"] as const,
    queryFn: async () => allPets,
  }),
  detail: (id: number) => ({
    queryKey: ["pets", id] as const,
    queryFn: async () => allPets.find((p) => p.id === id),
  }),
  byClient: (clientId: number) => ({
    queryKey: ["pets", "by-client", clientId] as const,
    queryFn: async () =>
      clients.find((c) => c.id === clientId)?.pets as Pet[] | undefined,
  }),
  evaluations: (petId: number) => ({
    queryKey: ["pets", petId, "evaluations"] as const,
    queryFn: async () => {
      const pet = allPets.find((p) => p.id === petId);
      return pet?.evaluations ?? [];
    },
  }),
  vaccinations: (petId: number) => ({
    queryKey: ["pets", petId, "vaccinations"] as const,
    queryFn: async () => vaccinationRecords.filter((v) => v.petId === petId),
  }),
  photos: (petId: number) => ({
    queryKey: ["pets", petId, "photos"] as const,
    queryFn: async () => petPhotos.filter((p) => p.petId === petId),
  }),
  reportCards: (petId: number) => ({
    queryKey: ["pets", petId, "report-cards"] as const,
    queryFn: async () => reportCards.filter((r) => r.petId === petId),
  }),
  relationships: (petId: number) => ({
    queryKey: ["pets", petId, "relationships"] as const,
    queryFn: async () => petRelationships.filter((r) => r.petId === petId),
  }),
  careInstructions: (petId: number) => ({
    queryKey: ["pets", petId, "care-instructions"] as const,
    queryFn: async () => careInstructions.find((c) => c.petId === petId),
  }),
};
