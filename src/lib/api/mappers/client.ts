import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import type { Tables } from "@/types/database";

// ============================================================================
// Database rows -> the Client and Pet objects the app already expects.
//
// Same split as bookings: queryable fields are columns, the long tail lives in
// `details`, and this is the one place that knows which is which.
//
// Client carries its pets nested, because that is how the type is shaped and
// how every consumer reads it (`client.pets`). Fetching them separately and
// stitching in each caller would be the same join done worse, N times.
// ============================================================================

type PetRow = Tables<"pets">;
type ClientRow = Tables<"clients"> & { pets?: PetRow[] | null };

export function rowToPet(row: PetRow): Pet {
  const details = (row.details ?? {}) as Record<string, unknown>;

  return {
    ...(details as Partial<Pet>),
    id: row.ref,
    name: row.name,
    type: row.species,
    breed: row.breed ?? "",
    age: row.age_years ?? 0,
    dateOfBirth: row.date_of_birth ?? undefined,
    weight: row.weight === null ? 0 : Number(row.weight),
    color: row.color ?? "",
    microchip: row.microchip ?? "",
    allergies: row.allergies ?? "",
    specialNeeds: row.special_needs ?? "",
    sex: (row.sex as Pet["sex"]) ?? undefined,
    spayedNeutered: row.spayed_neutered ?? undefined,
    coatType: (row.coat_type as Pet["coatType"]) ?? undefined,
    energyLevel: (row.energy_level as Pet["energyLevel"]) ?? undefined,
    petStatus: row.status as Pet["petStatus"],
    imageUrl: row.image_url ?? undefined,
  } as Pet;
}

export function rowToClient(row: ClientRow, facilityName: string): Client {
  const details = (row.details ?? {}) as Record<string, unknown>;

  return {
    ...(details as Partial<Client>),
    id: row.ref,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    status: row.status,
    // The mock Client identifies its facility by NAME, not id. Resolved by the
    // caller rather than stored per row — one lookup instead of one per client.
    facility: facilityName,
    preferredLanguage: row.preferred_language ?? undefined,
    imageUrl: row.image_url ?? undefined,
    address: (row.address as Client["address"]) ?? undefined,
    isBlocked: row.is_blocked,
    blockedAt: row.blocked_at ?? undefined,
    blockedReason: row.blocked_reason ?? undefined,
    lastVisitDate: row.last_visit_date ?? undefined,
    outstandingBalance: Number(row.outstanding_balance),
    noShowCount: row.no_show_count,
    pets: (row.pets ?? []).map(rowToPet),
  } as Client;
}

/**
 * Selects that satisfy the mappers above.
 *
 * Kept beside them because the two must agree: a column dropped from the
 * select becomes `undefined` in the mapped object rather than a type error,
 * which is exactly the failure that reaches production looking like missing
 * data rather than a bug.
 */
export const CLIENT_SELECT = `*, pets ( * )` as const;
export const PET_SELECT = `*` as const;
