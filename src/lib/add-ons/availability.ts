import { weightTierFor } from "@/lib/pricing/daycare-service-choice";
import { sameSpecies } from "@/lib/settings/species";
import type { AddOn, AddOnCoatType, AddOnWeightTier } from "@/types/add-on";

// ============================================================================
// WHICH ADD-ONS A BOOKING MAY OFFER, AND ON WHAT TERMS (2026-09-26).
//
// One answer for every picker and for the server's re-price, so the wizard and
// the bill cannot disagree. An add-on is offered when it is active, at the
// booking's location, for the booking's service, and for the pet — the gates
// the reference's add-on setup asks, in its order. The terms are the add-on's
// own price, tax and duration, or the location's override of any of them.
//
// WHAT IS NOT KNOWN DOES NOT EXCLUDE, the rule the services already follow
// (`isPetEligible`, `isOfferedAt`): a pet with no weight on its record is not
// refused by a weight limit, and a booking whose location or service is not
// chosen yet is not refused by those. Staff can still choose; the limits are
// about eligibility, not about data entry.
// ============================================================================

/** What is known about the pet the add-on would be for. */
export interface AddOnPetFacts {
  /** The facility's own species name, as typed. */
  species?: string | null;
  /** The breed as the owner typed it. */
  breed?: string | null;
  weightLb?: number | null;
  coatType?: string | null;
}

/** Where the add-on would be booked. */
export interface AddOnBookingFacts {
  /**
   * "boarding", "daycare", "grooming", "training", "evaluation", or a custom
   * module's slug — what `bookings.service` holds.
   */
  careType: string;
  /** The chosen boarding, daycare or grooming service's row uuid, if chosen. */
  serviceId?: string | null;
  locationId?: string | null;
  pet?: AddOnPetFacts | null;
  /**
   * The facility's breed list. Breeds are chosen WITHIN each type, so a breed
   * limit applies to a pet only when it names a breed of that pet's type: a
   * limit of Poodle leaves every cat alone. Without the list nothing can tell
   * which type a breed belongs to, and breed limits do not exclude.
   */
  breeds?: readonly { name: string; species: string }[];
}

/** Why an add-on is not offered — for tests and for the server's refusal. */
export type AddOnUnavailable =
  | "inactive"
  | "location"
  | "service"
  | "species"
  | "breed"
  | "weight"
  | "coat";

export interface AddOnTerms {
  /** Null when it may be offered. */
  unavailable: AddOnUnavailable | null;
  price: number;
  taxable: boolean;
  /** Minutes it adds to the appointment. */
  durationMin: number;
}

/**
 * The add-on's price, tax and minutes at one location: its own, or that
 * location's override of any of them. No location, its own.
 */
export function termsAt(
  addOn: Pick<AddOn, "price" | "taxable" | "durationMin" | "overrides">,
  locationId?: string | null,
): Omit<AddOnTerms, "unavailable"> {
  const override = locationId
    ? addOn.overrides.find((o) => o.locationId === locationId)
    : undefined;
  return {
    price: override?.price ?? addOn.price,
    taxable: override?.taxable ?? addOn.taxable,
    durationMin: override?.durationMin ?? addOn.durationMin,
  };
}

export function addOnFor(addOn: AddOn, at: AddOnBookingFacts): AddOnTerms {
  const priced = termsAt(addOn, at.locationId);
  const terms = (unavailable: AddOnUnavailable | null): AddOnTerms => ({
    unavailable,
    ...priced,
  });

  if (!addOn.isActive) return terms("inactive");
  if (
    addOn.locationIds.length > 0 &&
    at.locationId &&
    !addOn.locationIds.includes(at.locationId)
  ) {
    return terms("location");
  }
  if (!appliesToService(addOn, at.careType, at.serviceId)) {
    return terms("service");
  }
  return terms(petProblem(addOn, at));
}

/** The add-ons a booking may offer, in the facility's own order. */
export function offeredAddOns(
  addOns: readonly AddOn[],
  at: AddOnBookingFacts,
): { addOn: AddOn; terms: AddOnTerms }[] {
  return addOns
    .map((addOn) => ({ addOn, terms: addOnFor(addOn, at) }))
    .filter(({ terms }) => terms.unavailable === null);
}

/**
 * The live add-ons for one TYPE of service ("boarding", "training", a custom
 * module's slug) — what a rates page counts and what a service's own setup
 * chooses from, where no location, service or pet is known yet.
 */
export function addOnsForCareType(
  addOns: readonly AddOn[],
  careType: string,
): AddOn[] {
  return addOns.filter(
    (addOn) => addOn.isActive && appliesToService(addOn, careType),
  );
}

/**
 * Offered for EVERY pet named — what a picker that attaches an add-on to the
 * whole booking can promise. With no pet named, the booking alone decides.
 */
export function offeredForPets(
  addOns: readonly AddOn[],
  at: Omit<AddOnBookingFacts, "pet">,
  pets: readonly AddOnPetFacts[],
): { addOn: AddOn; terms: AddOnTerms }[] {
  if (pets.length === 0) return offeredAddOns(addOns, at);
  return addOns.flatMap((addOn) => {
    const each = pets.map((pet) => addOnFor(addOn, { ...at, pet }));
    return each.every((terms) => terms.unavailable === null)
      ? [{ addOn, terms: each[0] }]
      : [];
  });
}

/**
 * A pet as the booking screens hold it. A weight of 0 and an empty breed are
 * how the record says "not recorded", so neither is allowed to exclude.
 */
export function addOnPetFacts(pet: {
  type?: string | null;
  breed?: string | null;
  weight?: number | null;
  coatType?: string | null;
}): AddOnPetFacts {
  return {
    species: pet.type || null,
    breed: pet.breed || null,
    weightLb: pet.weight && pet.weight > 0 ? pet.weight : null,
    coatType: pet.coatType || null,
  };
}

/**
 * "All services (including future ones)", or one of the services named. A ref
 * is `boarding:<uuid>`, `daycare:<uuid>`, `grooming:<uuid>`, `training`,
 * `evaluation` or `custom:<slug>`; with no service chosen yet, any service of
 * the booking's type counts.
 */
export function appliesToService(
  addOn: Pick<AddOn, "appliesToAllServices" | "serviceRefs">,
  careType: string,
  serviceId?: string | null,
): boolean {
  if (addOn.appliesToAllServices) return true;
  return addOn.serviceRefs.some((ref) => {
    if (ref === careType || ref === `custom:${careType}`) return true;
    const at = ref.indexOf(":");
    if (at < 0 || ref.slice(0, at) !== careType) return false;
    return !serviceId || ref.slice(at + 1) === serviceId;
  });
}

function petProblem(
  addOn: AddOn,
  at: AddOnBookingFacts,
): AddOnUnavailable | null {
  const pet = at.pet;
  if (!pet) return null;
  const species = pet.species?.trim() || null;

  if (
    addOn.eligibleSpecies.length > 0 &&
    species &&
    !addOn.eligibleSpecies.some((s) => sameSpecies(s, species))
  ) {
    return "species";
  }

  const breed = pet.breed?.trim() || null;
  if (addOn.eligibleBreeds.length > 0 && species && breed && at.breeds) {
    const ofType = new Set(
      at.breeds
        .filter((b) => sameSpecies(b.species, species))
        .map((b) => fold(b.name)),
    );
    const limit = addOn.eligibleBreeds.filter((b) => ofType.has(fold(b)));
    if (limit.length > 0 && !limit.some((b) => fold(b) === fold(breed))) {
      return "breed";
    }
  }

  if (addOn.eligibleWeightTiers.length > 0) {
    const tier = weightTierFor(pet.weightLb) as AddOnWeightTier | null;
    if (tier && !addOn.eligibleWeightTiers.includes(tier)) return "weight";
  }

  const coat = pet.coatType ? (fold(pet.coatType) as AddOnCoatType) : null;
  if (
    addOn.eligibleCoatTypes.length > 0 &&
    coat &&
    !addOn.eligibleCoatTypes.includes(coat)
  ) {
    return "coat";
  }

  return null;
}

function fold(s: string): string {
  return s.trim().toLowerCase();
}
