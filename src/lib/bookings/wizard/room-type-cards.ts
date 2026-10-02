import type {
  BoardingService,
  OfferedLodging,
} from "@/lib/api/mappers/boarding-service";
import { petMatchesRules } from "@/lib/capacity-engine";
import {
  boardingPetFactsFor,
  isPetEligibleForBoarding,
  lodgingTypesServing,
} from "@/lib/pricing/boarding-service-choice";
import {
  cleanFeatures,
  loosestLimits,
  roomLimitsOf,
  type RoomLimits,
} from "@/lib/rooms/room-facts";
import type { Pet } from "@/types/pet";
import type { RoomCategory, RoomRule } from "@/types/rooms";

// ============================================================================
// The booking wizard's "Choose a room" cards (the client's mock, 2026-10-01).
//
// A card is a BOARDING SERVICE — the facility's menu, which is where the
// nightly price lives — and the lodging types it may be booked into. A
// facility with no menu gets its lodging types as cards, at their own rates,
// which is what every booking before the menu was sold at.
//
// What a card says about the room — the size words, the limit its rules set,
// the chips — is the lodging type's (20261002122808). Staff read the types
// directly; a customer cannot, so their menu carries each service's types as
// the projection allows (`BoardingService.lodging`), and the cards read
// whichever is there.
//
// For the pet the cards are being chosen for: whether it may have one (the
// service's rules, the lodging's), and — staff only, never a customer — how
// many units are free for the stay.
// ============================================================================

export interface LodgingAvailability {
  categoryId: string;
  totalActive: number;
  availableUnits: number;
  eligible: boolean;
  eligibilityMessage: string | null;
}

export interface RoomTypeCard {
  /** The service's row id, or the lodging type's id with no menu. */
  id: string;
  kind: "service" | "lodging";
  name: string;
  /** Per `unit`; null when the facility has not priced it. */
  price: number | null;
  unit: "night" | "day";
  /** Each pet after the first sharing one room; null = the room, once. */
  additionalPetPrice: number | null;
  imageUrl: string | null;
  /** The size words ("4 × 4 ft"), the facility's own. */
  dimensions: string | null;
  /** What the lodging's rules let in — the other half of the size line. */
  limits: RoomLimits;
  /** The chips. */
  features: string[];
  /** The lodging types it may be booked into, by app id. */
  lodgingIds: string[];
  /** Staff: units free for the stay, and how many there are. */
  free: number | null;
  total: number | null;
  /** A lodging that holds more than one pet of a family. */
  shareable: boolean;
  /** Why this pet cannot have it, or null. */
  blocked: "not-offered" | "rule" | "full" | null;
  /** The facility's own words for a lodging rule the pet fails. */
  ruleMessage: string | null;
}

/** A lodging type, whichever way it was read. */
interface Lodging {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  dimensions: string | null;
  features: string[];
  holdsSeveral: boolean;
  rules: RoomRule[];
}

function fromCategory(category: RoomCategory): Lodging {
  return {
    id: category.id,
    name: category.name,
    description: category.description ?? null,
    imageUrl: category.imageUrl ?? null,
    dimensions: category.dimensionsLabel ?? null,
    features: category.features ?? [],
    holdsSeveral:
      category.spaceType === "area" || (category.defaultCapacity ?? 1) > 1,
    rules: category.rules ?? [],
  };
}

function fromOffered(lodging: OfferedLodging): Lodging {
  return { ...lodging, features: lodging.features ?? [] };
}

/** The first rule message the pet fails, in the facility's words. */
function failingMessage(rules: readonly RoomRule[], pet: Pet): string | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (!petMatchesRules(pet, [rule])) return rule.clientMessage || null;
  }
  return null;
}

export function roomTypeCards(input: {
  services: readonly BoardingService[];
  categories: readonly RoomCategory[];
  /** For the stay and the pet the cards are for; empty for a customer. */
  availability: readonly LodgingAvailability[];
  pet: Pet | null;
  /** Staff see counts; a customer never does. */
  showCounts: boolean;
}): RoomTypeCard[] {
  const boarding = input.categories.filter(
    (c) => c.service === "boarding" && c.visibleToClients && c.active !== false,
  );
  const availabilityOf = (id: string) =>
    input.availability.find((a) => a.categoryId === id);

  const summarise = (lodgings: readonly Lodging[]) => {
    const rows = lodgings
      .map((l) => availabilityOf(l.id))
      .filter((a): a is LodgingAvailability => !!a);
    const counted = rows.length > 0;
    // The units this pet could have; where it can have none, what is free at
    // all — the mock says "8 of 14 free" beside "Too small for Mango", since
    // the room is not full, the pet does not fit.
    const eligibleRows = rows.filter((a) => a.eligible);
    const free = (eligibleRows.length > 0 ? eligibleRows : rows).reduce(
      (sum, a) => sum + a.availableUnits,
      0,
    );
    const total = rows.reduce((sum, a) => sum + a.totalActive, 0);
    // Who may have it: the engine's answer where it ran (staff, dates
    // chosen), else the rules themselves — which is all a customer has.
    let ruleBlocked = false;
    let ruleMessage: string | null = null;
    if (counted) {
      ruleBlocked = rows.every((a) => !a.eligible);
      ruleMessage =
        rows.find((a) => !a.eligible && a.eligibilityMessage)
          ?.eligibilityMessage ?? null;
    } else if (input.pet && lodgings.length > 0) {
      const pet = input.pet;
      ruleBlocked = lodgings.every((l) => !petMatchesRules(pet, l.rules));
      ruleMessage = ruleBlocked
        ? (lodgings
            .map((l) => failingMessage(l.rules, pet))
            .find((m) => m !== null) ?? null)
        : null;
    }
    return { counted, free, total, ruleBlocked, ruleMessage };
  };

  const facts = (lodgings: readonly Lodging[]) => ({
    dimensions: lodgings.find((l) => l.dimensions)?.dimensions ?? null,
    limits: loosestLimits(lodgings.map((l) => roomLimitsOf(l.rules))),
    features: cleanFeatures(lodgings.flatMap((l) => l.features)),
    shareable: lodgings.some((l) => l.holdsSeveral),
  });

  if (input.services.length === 0) {
    return boarding
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => {
        const lodging = fromCategory(category);
        const s = summarise([lodging]);
        return {
          id: category.id,
          kind: "lodging" as const,
          name: category.name,
          price: category.defaultBasePrice ?? null,
          unit: "night" as const,
          additionalPetPrice: null,
          imageUrl: category.imageUrl ?? null,
          ...facts([lodging]),
          lodgingIds: [category.id],
          free: input.showCounts && s.counted ? s.free : null,
          total: input.showCounts && s.counted ? s.total : null,
          blocked: s.ruleBlocked
            ? ("rule" as const)
            : s.counted && s.free === 0
              ? ("full" as const)
              : null,
          ruleMessage: s.ruleMessage,
        };
      });
  }

  const petFacts = input.pet ? boardingPetFactsFor([input.pet]) : null;
  return input.services
    .filter((service) => service.isActive)
    .map((service) => {
      const lodgings =
        boarding.length > 0
          ? lodgingTypesServing(boarding, service).map(fromCategory)
          : (service.lodging ?? []).map(fromOffered);
      const s = summarise(lodgings);
      const offered = petFacts
        ? isPetEligibleForBoarding(service, petFacts)
        : true;
      const first = lodgings[0];
      return {
        id: service.rowId,
        kind: "service" as const,
        name: service.name,
        price: Number.isFinite(service.price) ? service.price : null,
        unit: service.unit,
        additionalPetPrice: service.additionalPetPrice ?? null,
        imageUrl: service.imageUrl ?? first?.imageUrl ?? null,
        ...facts(lodgings),
        lodgingIds: lodgings.map((l) => l.id),
        free: input.showCounts && s.counted ? s.free : null,
        total: input.showCounts && s.counted ? s.total : null,
        blocked: !offered
          ? ("not-offered" as const)
          : s.ruleBlocked
            ? ("rule" as const)
            : s.counted && s.free === 0
              ? ("full" as const)
              : null,
        ruleMessage: s.ruleMessage,
      };
    });
}
