import { clients } from "@/data/clients";
import {
  petPhotos,
  vaccinationRecords,
  petRelationships,
  careInstructions,
} from "@/data/pet-data";
import type { Pet } from "@/types/pet";
import { liveFetch } from "./live-fetch";

const allPets: Pet[] = clients.flatMap((c) => c.pets as Pet[]);

/** Real pets; mocks only when signed out. */
async function fetchPets(clientRef?: number): Promise<Pet[]> {
  const search = clientRef ? `?clientRef=${clientRef}` : "";
  return liveFetch<Pet[]>(
    `/api/pets${search}`,
    () =>
      clientRef
        ? ((clients.find((c) => c.id === clientRef)?.pets as Pet[]) ?? [])
        : allPets,
    "pets",
  );
}

export const petQueries = {
  all: () => ({
    queryKey: ["pets"] as const,
    queryFn: async () => fetchPets(),
  }),
  detail: (id: number) => ({
    queryKey: ["pets", id] as const,
    queryFn: async () => (await fetchPets()).find((p) => p.id === id),
  }),
  byClient: (clientId: number) => ({
    queryKey: ["pets", "by-client", clientId] as const,
    queryFn: async () => fetchPets(clientId),
  }),
  evaluations: (petId: number) => ({
    queryKey: ["pets", petId, "evaluations"] as const,
    queryFn: async () => {
      const pet = (await fetchPets()).find((p) => p.id === petId);
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
  // `reportCards` was here, over the fixture. It had no callers, and report
  // cards are a real table now — `reportCardQueries.byPet` in
  // `@/lib/api/report-cards` narrows them server-side.
  relationships: (petId: number) => ({
    queryKey: ["pets", petId, "relationships"] as const,
    queryFn: async () => petRelationships.filter((r) => r.petId === petId),
  }),
  careInstructions: (petId: number) => ({
    queryKey: ["pets", petId, "care-instructions"] as const,
    queryFn: async () => careInstructions.find((c) => c.petId === petId),
  }),
};
