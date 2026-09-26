import { petMatchesRules } from "@/lib/capacity-engine";
import { isCountedInPets } from "@/lib/boarding/lodging-occupancy";
import { lodgingTypesServing } from "@/lib/pricing/boarding-service-choice";
import type { Pet } from "@/types/pet";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// Which kennels a confirmed boarding request may be given, best first.
//
// ── WHY A REQUEST HAS NO KENNEL UNTIL IT IS CONFIRMED ─────────────────────
//
// A customer's request drops its room on purpose
// (`use-customer-booking-request.ts`): a `boarding_stays` row holds its kennel
// against every other booking whatever the booking's status, so an
// unconfirmed request naming one would block it until somebody noticed. The
// wizard still picks a room of the rate's types, but only to price the quote.
//
// Nothing gave it one back when the request was confirmed, by staff or by
// auto-confirm, so the client's question — "when people book this rate, does
// it know which room the dog goes into?" — was answered no until somebody
// dragged the booking onto the kennel board.
//
// ── THE SAME CHOICE THE QUOTE MADE ────────────────────────────────────────
//
// The customer's wizard auto-assigned with `lodgingTypesServing` (the rate's
// room types), room types clients may book (`visibleToClients`), and
// `petMatchesRules` (species and weight). This applies the same three, so the
// kennel a request is given is one of the kind it was priced for. Every pet of
// the booking shares the kennel — a household in separate kennels is
// separate bookings — so the kennel must admit every pet and hold them all.
//
// "Free" is not decided here. The caller skips kennels it knows are taken for
// those nights and lets the database's exclusion constraint refuse a race.
// ============================================================================

/**
 * The kennels, best first, that may take this booking: the rate's room types
 * (all boarding types when it names none, or there is no rate), in the order
 * the facility sorted them, and each type's kennels by name.
 */
export function kennelCandidates(input: {
  categories: readonly RoomCategory[];
  units: readonly FacilityRoom[];
  pets: readonly Pick<Pet, "type" | "weight">[];
  /** The rate's `lodging_type_ids`; null or empty means every type. */
  lodgingTypeIds: readonly string[] | null;
  /** A customer's booking: only room types clients may book. */
  clientsOnly: boolean;
}): FacilityRoom[] {
  const types = lodgingTypesServing(
    input.categories.filter((c) => c.service === "boarding"),
    { lodgingTypeIds: [...(input.lodgingTypeIds ?? [])] },
  )
    .filter((c) => !input.clientsOnly || c.visibleToClients)
    .filter((c) => input.pets.every((pet) => petMatchesRules(pet, c.rules)))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const candidates: FacilityRoom[] = [];
  for (const type of types) {
    const units = input.units
      .filter((u) => u.categoryId === type.id && u.active)
      .filter((u) => {
        // An area counts pets across bookings, and the database judges that;
        // here it only has to be big enough for this household at all.
        const holds = isCountedInPets(type)
          ? (type.maxPetsPerArea as number)
          : (u.capacity ?? type.defaultCapacity);
        return input.pets.length <= holds;
      })
      // By name, numbers read as numbers: "Suite 2" before "Suite 10".
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );
    candidates.push(...units);
  }
  return candidates;
}
