import type {
  BoardingPriceUnit,
  BoardingService,
} from "@/lib/api/mappers/boarding-service";

// ============================================================================
// WHICH BOARDING SERVICE, AND WHAT IT COSTS HERE.
//
// One module, because FOUR callers have to agree or money goes wrong quietly —
// the same four daycare has, and for the same reason:
//
//   · `BookingModal` quotes the customer;
//   · `price-booking.ts` re-prices that quote on the server, and refuses the
//     booking when the two disagree by more than half a cent (`quote_mismatch`);
//   · `auto-confirm.ts` confirms it against the same number;
//   · `booking-service-tax.ts` decides whether it is taxed.
//
// ── THE BOOKING PICKS. IT DOES NOT GUESS ──────────────────────────────────
//
// Until Phase 5 there was nothing to pick: `room_categories` was the kennel
// class AND the nightly rate, so the menu was the building. Now the booking
// carries a service id and `resolveBoardingService` looks it up.
//
// ── AND WHEN IT CARRIES NO ID, THE CLASS RATE STANDS ──────────────────────
//
// This module deliberately does NOT invent a legacy fallback the way daycare's
// `legacyServiceForHours` does. A boarding booking made before the cutover was
// sold at its KENNEL CLASS's nightly rate, and that rate is still on
// `room_categories` where it has always been. Re-pricing it through a service —
// even the service the migration derived from that very class — would re-price
// it at whatever the facility has edited the service to SINCE. So the answer
// here is null, and `boardingPricing` falls through to `classRate`, which is
// what the booking was actually sold at.
//
// That is why the Phase 5 migration carrying every class across at an IDENTICAL
// price matters twice: it makes the cutover price-neutral, and it means a
// facility that never touches the new menu keeps charging exactly what it did.
// ============================================================================

/** What we know about the pet at the moment of choosing. */
export interface BoardingPetFacts {
  /** The facility's own species name, as typed. Case-insensitive on compare. */
  species?: string | null;
  /** The breed as the owner typed it. */
  breed?: string | null;
  /** Weight in pounds, if the record has one. */
  weightLb?: number | null;
  /** Tag ids on the pet — MoéGo's "pet codes". */
  petTags?: string[];
}

/**
 * The weight bands, mirroring `defaultGroomingConfig.petSizeTiers`.
 *
 * Duplicated from `daycare-service-choice.ts` rather than shared: they are the
 * same numbers today, and the day a facility tunes boarding's bands without
 * tuning daycare's, one import would move both. The bands are data, not logic.
 */
export const BOARDING_WEIGHT_TIERS: readonly { id: string; maxLb?: number }[] =
  [
    { id: "small", maxLb: 15 },
    { id: "medium", maxLb: 35 },
    { id: "large", maxLb: 70 },
    { id: "giant" },
  ];

/**
 * What a service's eligibility is judged against, for the pets on ONE
 * booking. A species rule has a single answer only when every pet is one
 * species; breed and weight only when there is one pet. Tags are applied on
 * the server for a customer, because they are the facility's classification
 * and are never sent to one.
 *
 * Shared by the staff room step and the customer's dates step, which both
 * show the menu and must both judge it the same way.
 */
export function boardingPetFactsFor(
  pets: readonly {
    type?: string | null;
    breed?: string | null;
    weight?: number | null;
  }[],
): BoardingPetFacts {
  const species = new Set(
    pets.map((p) => p.type?.trim().toLowerCase()).filter(Boolean),
  );
  const first = pets[0];
  return {
    species: species.size === 1 ? (first?.type ?? null) : null,
    breed: pets.length === 1 ? (first?.breed ?? null) : null,
    weightLb: pets.length === 1 ? (first?.weight ?? null) : null,
    petTags: [],
  };
}

/** The band a weight falls in, or null when the record has no weight. */
export function boardingWeightTierFor(
  weightLb: number | null | undefined,
): string | null {
  if (weightLb == null || !Number.isFinite(weightLb) || weightLb <= 0) {
    return null;
  }
  for (const tier of BOARDING_WEIGHT_TIERS) {
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
 * not refused by a weight rule: the honest answer to "is this 40 lb dog
 * allowed" is not "no" when nobody recorded the weight.
 *
 * BLOCKED BEATS ELIGIBLE, and it is checked first — the whole point of a
 * blocking code is that it wins.
 */
export function isPetEligibleForBoarding(
  service: Pick<
    BoardingService,
    | "eligibleSpecies"
    | "eligibleBreeds"
    | "eligibleWeightTiers"
    | "eligiblePetTags"
    | "blockedPetTags"
  >,
  pet: BoardingPetFacts,
): boolean {
  const tags = pet.petTags ?? [];

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
    const tier = boardingWeightTierFor(pet.weightLb);
    // No weight recorded: not excluded. See the note above.
    if (tier && !service.eligibleWeightTiers.includes(tier)) return false;
  }

  return true;
}

/** Is this service offered at this branch? Empty `locationIds` = everywhere. */
export function isBoardingServiceOfferedAt(
  service: Pick<BoardingService, "locationIds">,
  locationId: string | null | undefined,
): boolean {
  if (service.locationIds.length === 0) return true;
  if (!locationId) return true;
  return service.locationIds.includes(locationId);
}

/**
 * May this service be booked into this lodging type?
 *
 * MoéGo: "By default all lodging types are selected. Toggle off All Lodging
 * Types to limit." EMPTY MEANS EVERY TYPE.
 *
 * Asking about NO type is a yes: the wizard picks the service before the
 * kennel, so at that moment nothing has been chosen to contradict.
 */
export function servesLodgingType(
  service: Pick<BoardingService, "lodgingTypeIds">,
  lodgingTypeId: string | null | undefined,
): boolean {
  if (service.lodgingTypeIds.length === 0) return true;
  if (!lodgingTypeId) return true;
  return service.lodgingTypeIds.includes(lodgingTypeId);
}

/**
 * The lodging types a chosen service may actually be booked into.
 *
 * ── THIS EXISTS BECAUSE THE COMPARISON HAS TWO PLAUSIBLE WRONG SIDES ──────
 *
 * A `RoomCategory`'s app `id` is its `legacy_id` — `cat-suite`, `cat-condo` —
 * because 87 screens key on that. `boarding_services.lodging_type_ids` is a
 * `uuid[]`, because Postgres cannot hold `cat-suite` in a uuid column. Both
 * are `string`, so comparing the wrong pair TYPECHECKS and matches nothing.
 *
 * Written as a function rather than inline in the wizard so the comparison can
 * be tested against realistic ids. It was inline first, compared `id`, and
 * emptied the kennel list the moment a service was picked — the screen said
 * the service could not be booked anywhere, with typecheck, lint, 1081 unit
 * tests, 40 checks and 1577 SQL assertions all green over it. A photograph
 * caught it.
 *
 * Empty `lodgingTypeIds` means EVERY type, and no service at all means every
 * type — the pre-cutover path, where the kennel class carries the rate.
 */
export function lodgingTypesServing<T extends { id: string; rowId?: string }>(
  categories: readonly T[],
  service: Pick<BoardingService, "lodgingTypeIds"> | null | undefined,
): T[] {
  if (!service || service.lodgingTypeIds.length === 0) return [...categories];
  const allowed = new Set(service.lodgingTypeIds);
  // `rowId`, never `id`. A category with no uuid is a draft the caller has not
  // saved, and a restriction cannot name a row that does not exist yet.
  return categories.filter(
    (c) => c.rowId !== undefined && allowed.has(c.rowId),
  );
}

/**
 * The lodging types no active boarding service can be booked into.
 *
 * The cutover gave every priced class a service restricted to that class, so
 * a class made AFTER it is covered by nothing unless some service is open to
 * every type — and once staff pick a service in the wizard, that class drops
 * out of the kennel list without a word. The rooms screen warns about these.
 *
 * `rowId`, never `id` — `lodgingTypeIds` holds uuids; see the note on
 * `lodgingTypesServing` above for what comparing the app id does.
 *
 * A facility with NO active service is on the pre-cutover path, where a class
 * books at its own rate; nothing is missing there, so nothing is returned.
 */
export function lodgingTypesNoServiceCanBook<T extends { rowId?: string }>(
  categories: readonly T[],
  services: readonly Pick<BoardingService, "lodgingTypeIds" | "isActive">[],
): T[] {
  const active = services.filter((service) => service.isActive);
  if (active.length === 0) return [];
  if (active.some((service) => service.lodgingTypeIds.length === 0)) return [];
  const covered = new Set(active.flatMap((service) => service.lodgingTypeIds));
  return categories.filter(
    (category) => category.rowId === undefined || !covered.has(category.rowId),
  );
}

/**
 * The services a facility may offer this pet, here, in menu order.
 *
 * Inactive services are excluded: an inactive service is a draft the facility
 * is working on, and offering one is how a customer books something that does
 * not exist yet.
 *
 * `lodgingTypeIds` narrows to the types the stay has actually been assigned —
 * ANY of them, not all. A two-pet stay across a Suite and a Kennel may be
 * served by a service that covers either, which is what a facility restricting
 * a service to "suites" means: the suite pet is eligible.
 *
 * THOSE ARE UUIDS — `RoomCategory.rowId`, never `RoomCategory.id`. The app id
 * is the category's `legacy_id` (`cat-suite`) and the column is a `uuid[]`;
 * both are `string`, so passing the wrong one typechecks and silently matches
 * nothing. `lodgingTypesServing` carries the same warning and a negative
 * control, because that is the mistake this module already made once.
 */
export function eligibleBoardingServices(
  services: BoardingService[],
  pet: BoardingPetFacts,
  options?: {
    locationId?: string | null;
    lodgingTypeIds?: readonly string[];
  },
): BoardingService[] {
  const types = options?.lodgingTypeIds ?? [];
  return services
    .filter((s) => s.isActive)
    .filter((s) => isBoardingServiceOfferedAt(s, options?.locationId))
    .filter((s) => isPetEligibleForBoarding(s, pet))
    .filter(
      (s) => types.length === 0 || types.some((id) => servesLodgingType(s, id)),
    )
    .sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name),
    );
}

/**
 * The service a booking is priced from.
 *
 * ── THE ORDER MATTERS, AND IT IS NOT AN ACCIDENT ──────────────────────────
 *
 * 1. The id the booking carries. This is the whole point: the facility chose,
 *    and every one of the four callers must land on the same row.
 * 2. Failing that, NULL — and the caller falls back to the kennel class's own
 *    nightly rate, which is what a pre-cutover booking was sold at. See the
 *    header: there is deliberately no heuristic here.
 *
 * A chosen service that has since been DELETED also falls through to null
 * rather than silently re-pricing at whatever is cheapest today.
 *
 * Inactive is NOT filtered. A booking already made against a service the
 * facility has since retired must still re-price at what it was sold at —
 * filtering here would turn every such booking into `quote_mismatch` the
 * moment a facility tidied its menu. `eligibleBoardingServices` is what
 * filters for the MENU; this is what resolves a booking that already exists.
 */
export function resolveBoardingService(
  services: BoardingService[],
  input: {
    /** `details.boardingServiceId`, the row uuid, or the legacy id. */
    serviceId?: string | null;
  },
): BoardingService | null {
  if (!input.serviceId) return null;
  return (
    services.find(
      (s) => s.rowId === input.serviceId || s.id === input.serviceId,
    ) ?? null
  );
}

/**
 * How many units a stay is charged for.
 *
 * MoéGo, verbatim, because it is the whole reason `unit` exists: "Monday to
 * Wednesday is 2 nights or 3 days". Per night counts the nights slept; per day
 * counts the calendar days touched, which is one more.
 *
 * A same-day stay is ONE of either — never zero. That matches what
 * `boardingPricing` has always done with `Math.max(nights, 1)`, and a zero
 * here is a free stay nobody agreed to.
 */
export function stayUnits(unit: BoardingPriceUnit, nights: number): number {
  const n = Number.isFinite(nights) ? Math.max(0, Math.trunc(nights)) : 0;
  return unit === "day" ? Math.max(n + 1, 1) : Math.max(n, 1);
}
