import {
  getAllBreeds,
  setBreedRestricted,
  getBreedRestrictionMessage,
  saveBreedRestrictionMessage,
  type Breed,
} from "@/data/breeds";

// Breeds domain query layer. The facility breed catalog, restriction state, and
// the customer-facing restriction message are read/written here so the TanStack
// Query cache is the single source of truth (the POS/booking flow reads the same
// factory to block restricted breeds and surface the configured message).

export const breedKeys = {
  all: ["breeds"] as const,
  restrictionMessage: ["breeds", "restriction-message"] as const,
};

export const breedQueries = {
  all: () => ({
    queryKey: breedKeys.all,
    queryFn: async (): Promise<Breed[]> => getAllBreeds(),
  }),
  restrictionMessage: () => ({
    queryKey: breedKeys.restrictionMessage,
    queryFn: async (): Promise<string> => getBreedRestrictionMessage(),
  }),
};

export type SetBreedRestrictedVars = { name: string; restricted: boolean };

export const breedMutations = {
  setRestricted: () => ({
    mutationFn: async ({
      name,
      restricted,
    }: SetBreedRestrictedVars): Promise<Breed[]> => {
      setBreedRestricted(name, restricted);
      return getAllBreeds();
    },
  }),
  setRestrictionMessage: (message: string) => ({
    mutationFn: async (): Promise<string> => {
      saveBreedRestrictionMessage(message);
      return message;
    },
  }),
};
