import type { DaycareService } from "@/lib/api/mappers/daycare-service";

// ============================================================================
// WHICH DAYCARE SERVICE, AND WHAT IT COSTS HERE.
//
// One module, because FOUR callers have to agree or money goes wrong quietly:
//
//   · `BookingModal` quotes the customer;
//   · `price-booking.ts` re-prices that quote on the server, and refuses the
//     booking when the two disagree by more than half a cent (`quote_mismatch`);
//   · `auto-confirm.ts` confirms it against the same number;
//   · `booking-service-tax.ts` decides whether it is taxed.
//
// The tax one is the subtle member. It already went out of its way to call the
// SAME function that priced the booking, "so the tax answer can never belong
// to a different rate than the money did". That property is preserved here by
// giving all four one resolver rather than four lookups that happen to agree
// today.
//
// ── THE BOOKING PICKS. IT DOES NOT GUESS ──────────────────────────────────
//
// Until 2026-09-23 nobody chose anything: `daycareRateForHours` took every
// active rate that covered the stay's hours and charged THE CHEAPEST. The
// facility wrote a menu the till ignored and could not explain its own price.
// Now the booking carries a service id and `resolveDaycareService` looks it
// up. The hours heuristic survives only as the fallback for bookings made
// before the cutover — see `resolveDaycareService`.
// ============================================================================

/** What we know about the pet at the moment of choosing. */
export interface DaycarePetFacts {
  /** The facility's own species name, as typed. Case-insensitive on compare. */
  species?: string | null;
  /** The breed as the owner typed it. */
  breed?: string | null;
  /** Weight in pounds, if the record has one. */
  weightLb?: number | null;
  /** Tag ids on the pet — MoéGo's "pet codes". */
  petTags?: string[];
}

/** The weight bands, mirroring `defaultGroomingConfig.petSizeTiers`. */
const WEIGHT_TIERS: { id: string; maxLb?: number }[] = [
  { id: "small", maxLb: 15 },
  { id: "medium", maxLb: 35 },
  { id: "large", maxLb: 70 },
  { id: "giant" },
];

/** The band a weight falls in, or null when the record has no weight. */
export function weightTierFor(
  weightLb: number | null | undefined,
): string | null {
  if (weightLb == null || !Number.isFinite(weightLb) || weightLb <= 0) {
    return null;
  }
  for (const tier of WEIGHT_TIERS) {
    if (tier.maxLb === undefined || weightLb <= tier.maxLb) return tier.id;
  }
  return "giant";
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * May this pet have this service?
 *
 * EMPTY MEANS NO RESTRICTION on every list — that is the table's own rule, and
 * "no restriction" and "not set yet" are the same thing there.
 *
 * WHAT IS NOT KNOWN DOES NOT EXCLUDE. A pet with no weight on its record is
 * not refused by a weight rule: the facility would be told the service is
 * unavailable for a reason nobody can see, and the honest answer to "is this
 * 40 lb dog allowed" is not "no" when nobody recorded the weight. Staff can
 * still pick it; MoéGo's rule is about eligibility, not about data entry.
 *
 * BLOCKED BEATS ELIGIBLE, and it is checked first. A pet carrying a blocked
 * tag is out even if it also carries an eligible one — the whole point of a
 * blocking code is that it wins.
 */
export function isPetEligible(
  service: Pick<
    DaycareService,
    | "eligibleSpecies"
    | "eligibleBreeds"
    | "eligibleWeightTiers"
    | "eligiblePetTags"
    | "blockedPetTags"
  >,
  pet: DaycarePetFacts,
): boolean {
  const tags = pet.petTags ?? [];

  // Blocked first, and it wins outright.
  if (service.blockedPetTags.length > 0) {
    if (service.blockedPetTags.some((t) => tags.includes(t))) return false;
  }

  if (service.eligiblePetTags.length > 0) {
    if (!service.eligiblePetTags.some((t) => tags.includes(t))) return false;
  }

  if (service.eligibleSpecies.length > 0 && pet.species) {
    if (!service.eligibleSpecies.some((s) => same(s, pet.species!))) {
      return false;
    }
  }

  if (service.eligibleBreeds.length > 0 && pet.breed) {
    if (!service.eligibleBreeds.some((b) => same(b, pet.breed!))) return false;
  }

  if (service.eligibleWeightTiers.length > 0) {
    const tier = weightTierFor(pet.weightLb);
    // No weight recorded: not excluded. See the note above.
    if (tier && !service.eligibleWeightTiers.includes(tier)) return false;
  }

  return true;
}

/** Is this service offered at this branch? Empty `locationIds` = everywhere. */
export function isOfferedAt(
  service: Pick<DaycareService, "locationIds">,
  locationId: string | null | undefined,
): boolean {
  if (service.locationIds.length === 0) return true;
  if (!locationId) return true;
  return service.locationIds.includes(locationId);
}

/**
 * What this service costs at this branch.
 *
 * The mapper has already resolved `price` for the branch that was asked about,
 * so this is the branch-aware number. `facilityPrice` is kept beside it for
 * the screen that compares them.
 */
export function servicePrice(service: DaycareService): number {
  return service.price;
}

/**
 * The services a facility may offer this pet, here, in menu order.
 *
 * Inactive services are excluded: an inactive service is a draft the facility
 * is working on, and offering one is how a customer books something that does
 * not exist yet.
 */
export function eligibleDaycareServices(
  services: DaycareService[],
  pet: DaycarePetFacts,
  locationId?: string | null,
): DaycareService[] {
  return services
    .filter((s) => s.isActive)
    .filter((s) => isOfferedAt(s, locationId))
    .filter((s) => isPetEligible(s, pet))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * The service a booking is priced from.
 *
 * ── THE ORDER MATTERS, AND IT IS NOT AN ACCIDENT ──────────────────────────
 *
 * 1. The id the booking carries. This is the whole point: the facility chose,
 *    and every one of the four callers must land on the same row.
 * 2. Failing that, the LEGACY shape — a booking written before the cutover
 *    has no service id, and re-pricing it must still produce the number it
 *    was sold at. That is the hours heuristic, kept for exactly this and
 *    nothing else: the cheapest active service whose ceiling covers the stay.
 * 3. Failing that, null. A null is a rate GAP, which the wizard renders as a
 *    refusal — never a zero, because a zero is a free day nobody agreed to.
 */
export function resolveDaycareService(
  services: DaycareService[],
  input: {
    /** `details.daycareServiceId`, or the row id. */
    serviceId?: string | null;
    /** The longest day of the stay, for the legacy fallback only. */
    hours?: number | null;
    /** Only when every pet is one species. */
    species?: string | null;
  },
): DaycareService | null {
  if (input.serviceId) {
    const chosen = services.find(
      (s) => s.rowId === input.serviceId || s.id === input.serviceId,
    );
    // A chosen service that has since been deleted falls through rather than
    // silently re-pricing at whatever is cheapest today.
    if (chosen) return chosen;
  }

  return legacyServiceForHours(services, input.hours, input.species);
}

/**
 * The pre-cutover rule, preserved so an old booking re-prices at what it was
 * sold at: the CHEAPEST active service whose ceiling covers the stay.
 *
 * A service with no ceiling covers any stay. When nothing covers the hours,
 * the answer is null — a gap — rather than the longest one stretched to fit,
 * because an explicit ceiling is the facility saying "not past here".
 */
export function legacyServiceForHours(
  services: DaycareService[],
  hours: number | null | undefined,
  species?: string | null,
): DaycareService | null {
  const candidates = services
    .filter((s) => s.isActive)
    .filter(
      (s) =>
        s.eligibleSpecies.length === 0 ||
        !species ||
        s.eligibleSpecies.some((x) => same(x, species)),
    );
  if (candidates.length === 0) return null;

  const covers =
    hours == null || !Number.isFinite(hours)
      ? candidates
      : candidates.filter(
          (s) => s.maxDurationHours == null || hours <= s.maxDurationHours,
        );
  if (covers.length === 0) return null;

  return covers.reduce((cheapest, s) =>
    s.price < cheapest.price ? s : cheapest,
  );
}

/**
 * Has the stay run past what this service covers, and into another one?
 *
 * MoéGo's auto-rollover. Both `maxDurationHours` and `rolloverAfterMinutes`
 * must be set — a ceiling with no rollover is just a ceiling — and the target
 * is never this service, which the table refuses outright.
 */
export function rolloverTarget(
  service: DaycareService,
  services: DaycareService[],
  actualHours: number,
): DaycareService | null {
  if (service.maxDurationHours == null) return null;
  if (service.rolloverAfterMinutes == null) return null;
  if (!service.rolloverToServiceId) return null;

  const graceHours = service.rolloverAfterMinutes / 60;
  if (actualHours <= service.maxDurationHours + graceHours) return null;

  return services.find((s) => s.rowId === service.rolloverToServiceId) ?? null;
}
