import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";
import type { Tables, TablesInsert } from "@/types/database";

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

// ============================================================================
// Writing: the app's Client and Pet -> database rows.
//
// Mirrors the staff mapper. Fields the schema promotes to columns are set
// explicitly; everything else the caller sends collects into `details`, which is
// the same split the read mappers above undo.
//
// WHAT MAY ACTUALLY BE WRITTEN is not decided here, and deliberately so. A
// customer holds a session and can reach PostgREST directly with the anon key,
// so a rule enforced in a route handler is a rule enforced nowhere. The columns
// that matter — a blocked flag, an outstanding balance, a facility's evaluation
// of an animal — are governed by triggers in 20260803090000. These functions
// only translate.
// ============================================================================

const CLIENT_COLUMN_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "status",
  "facility",
  "preferredLanguage",
  "imageUrl",
  "address",
  "isBlocked",
  "blockedAt",
  "blockedReason",
  "lastVisitDate",
  "outstandingBalance",
  "noShowCount",
  "pets",
];

const PET_COLUMN_FIELDS = [
  "id",
  "clientId",
  "name",
  "type",
  "breed",
  "age",
  "dateOfBirth",
  "weight",
  "color",
  "microchip",
  "allergies",
  "specialNeeds",
  "sex",
  "spayedNeutered",
  "coatType",
  "energyLevel",
  "petStatus",
  "imageUrl",
];

/** `""` is not a date. The read mappers hand back empty strings for absent
 *  values, and round-tripping one into a `date` column is a 500 rather than a
 *  null — the same trap the staff mapper documents for timestamps. */
function dateOrNull(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value : null;
}

export function clientToRow(
  input: Partial<Client>,
  context: { facilityId?: string } = {},
): Partial<TablesInsert<"clients">> {
  const row: Partial<TablesInsert<"clients">> = {};

  if (context.facilityId) row.facility_id = context.facilityId;

  if (input.name !== undefined) row.name = input.name;
  if (input.email !== undefined) row.email = input.email;
  if (input.phone !== undefined) row.phone = input.phone;
  if (input.status !== undefined) row.status = input.status;
  if (input.preferredLanguage !== undefined) {
    row.preferred_language = input.preferredLanguage;
  }
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
  if (input.address !== undefined) {
    row.address = input.address as TablesInsert<"clients">["address"];
  }
  if (input.isBlocked !== undefined) row.is_blocked = input.isBlocked;
  if (input.blockedAt !== undefined)
    row.blocked_at = dateOrNull(input.blockedAt);
  if (input.blockedReason !== undefined)
    row.blocked_reason = input.blockedReason;
  if (input.lastVisitDate !== undefined) {
    row.last_visit_date = dateOrNull(input.lastVisitDate);
  }
  // outstandingBalance is NOT written. It is derived from the bookings ledger
  // (20260806780000) — the sum of what delivered bookings have not settled —
  // and `clients_set_derived_balance` overwrites any value on every write. It
  // stays in CLIENT_COLUMN_FIELDS below so it is not copied into `details`,
  // where a stale second copy would outlive it.
  if (input.noShowCount !== undefined) row.no_show_count = input.noShowCount;

  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!CLIENT_COLUMN_FIELDS.includes(key) && value !== undefined) {
      details[key] = value;
    }
  }
  if (Object.keys(details).length > 0) {
    row.details = details as TablesInsert<"clients">["details"];
  }

  return row;
}

export function petToRow(
  input: Partial<Pet>,
  context: { clientId?: string } = {},
): Partial<TablesInsert<"pets">> {
  const row: Partial<TablesInsert<"pets">> = {};

  // No facility_id, ever. It is derived from the owner by a trigger
  // (pets_set_facility), and accepting one here would be offering a field the
  // database is going to overwrite — which reads as a bug the first time
  // somebody sets it and it does not stick.
  if (context.clientId) row.client_id = context.clientId;

  if (input.name !== undefined) row.name = input.name;
  if (input.type !== undefined) row.species = input.type;
  if (input.breed !== undefined) row.breed = input.breed;
  if (input.age !== undefined) row.age_years = input.age;
  if (input.dateOfBirth !== undefined) {
    row.date_of_birth = dateOrNull(input.dateOfBirth);
  }
  if (input.weight !== undefined) row.weight = input.weight;
  if (input.color !== undefined) row.color = input.color;
  if (input.microchip !== undefined) row.microchip = input.microchip;
  if (input.allergies !== undefined) row.allergies = input.allergies;
  if (input.specialNeeds !== undefined) row.special_needs = input.specialNeeds;
  if (input.sex !== undefined) row.sex = input.sex;
  if (input.spayedNeutered !== undefined) {
    row.spayed_neutered = input.spayedNeutered;
  }
  if (input.coatType !== undefined) row.coat_type = input.coatType;
  if (input.energyLevel !== undefined) row.energy_level = input.energyLevel;
  if (input.petStatus !== undefined) row.status = input.petStatus;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;

  const details: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!PET_COLUMN_FIELDS.includes(key) && value !== undefined) {
      details[key] = value;
    }
  }
  if (Object.keys(details).length > 0) {
    row.details = details as TablesInsert<"pets">["details"];
  }

  return row;
}
