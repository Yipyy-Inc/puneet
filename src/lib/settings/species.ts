import { z } from "zod";

// ============================================================================
// WHICH ANIMALS THIS FACILITY TAKES.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `facilitySpeciesConfig` in `src/data/settings.ts` — a hand-authored fixture,
// `["Dog", "Cat"]` and the noun "pets", identical for every facility in the
// product. A cats-only business and a dogs-only kennel read the same list, and
// nothing could be set. It was never a settings domain; the one consumer
// imported the fixture directly.
//
// ── WHY IT BECAME ONE ─────────────────────────────────────────────────────
//
// A daycare rate can now say which animals it is for, which is only a real
// question if a facility can say which animals it takes. Asked for by the
// client on 2026-09-21: "if we setup dog and cat in the facility settings so
// they can choose it is for dog or cat".
//
// ── CASE IS NOT MEANINGFUL, AND THE DATA PROVES IT ────────────────────────
//
// `pets.species` is free text and already disagrees with itself: Pawradise
// holds one pet recorded "dog" and another "Dog". Any rule that compares a
// rate's species to a pet's must fold case, or a rate set for Dogs silently
// excludes half the dogs. `sameSpecies` is the only comparison anything should
// use.
//
// The list is the facility's own WORDS — "Dog", "Chien", "Rabbit" — so it is
// never translated and never validated against a fixed set. A facility that
// boards rabbits is not a data error.
// ============================================================================

export const speciesConfigSchema = z.object({
  /** The animals this facility takes, in the facility's own words. */
  species: z.array(z.string().trim().min(1)).default([]),
  /**
   * What this facility calls its animals collectively — "pets", or "dogs" for
   * a dog-only business. Used in client-facing labels.
   */
  petNounPlural: z.string().trim().min(1).default("pets"),
});

export type SpeciesConfig = z.infer<typeof speciesConfigSchema>;

/**
 * The shipped default, and it is NOT empty.
 *
 * An empty list would mean "this facility takes no animals", which is never
 * true and would hide every rate from every pet the moment a rate named a
 * species. Dog and cat are what the fixture said and what every facility in
 * the data actually holds; a facility that takes neither edits two rows.
 */
export const DEFAULT_SPECIES: SpeciesConfig = {
  species: ["Dog", "Cat"],
  petNounPlural: "pets",
};

/** Case-folded and trimmed — the only way two species names are compared. */
export function sameSpecies(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Does a rate offered to `rateSpecies` apply to a pet of `petSpecies`?
 *
 * An empty or absent list means EVERY species: a facility that has never
 * touched the field keeps every rate working, which is the only safe default
 * when the alternative is a booking that cannot be priced.
 */
export function speciesAllows(
  rateSpecies: string[] | undefined,
  petSpecies: string | undefined,
): boolean {
  if (!rateSpecies || rateSpecies.length === 0) return true;
  if (!petSpecies) return true;
  return rateSpecies.some((s) => sameSpecies(s, petSpecies));
}
