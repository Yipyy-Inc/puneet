// ============================================================================
// The boarding menu, between Postgres and the screen.
//
// `boarding_services` + `boarding_service_location_prices` (20260924210000),
// built to the shape `daycare_services` proved a day earlier. This file is the
// only place that knows the column names.
//
// ── WHAT IS DIFFERENT FROM DAYCARE, AND WHY ───────────────────────────────
//
// `unit`. A boarding service is priced per NIGHT or per DAY, and MoéGo is
// explicit that the two are different numbers for the same stay: "Monday to
// Wednesday is 2 nights or 3 days". Which one a facility charges is theirs to
// say, so the unit travels with the price and `stayUnits` below is the only
// place that turns a date range into a quantity.
//
// `lodgingTypeIds`. A boarding service names the lodging types it may be
// booked into — the whole point of Phase 5's split. EMPTY MEANS EVERY TYPE,
// the same convention every eligibility array here uses.
//
// There is no `maxDurationHours` and no rollover: a boarding stay is measured
// in nights, and a stay that runs long is a stay that runs long, not a
// different service.
// ============================================================================

import type { Database } from "@/types/database";

/** The generated write shape. Typed, so a renamed column fails the build. */
export type BoardingServiceUpdate =
  Database["public"]["Tables"]["boarding_services"]["Update"];

/** Per night, or per day. MoéGo asks the facility which, and means it. */
export type BoardingPriceUnit =
  Database["public"]["Enums"]["boarding_price_unit"];

export const BOARDING_SERVICE_SELECT = `
  id, legacy_id, category_id, name, description, image_url, color,
  price, unit, taxable,
  lodging_type_ids,
  eligible_species, eligible_breeds, eligible_weight_tiers,
  eligible_pet_tags, blocked_pet_tags,
  location_ids,
  requires_evaluation, requires_evaluation_online,
  display_order, is_active, created_at,
  boarding_service_location_prices ( price, location_id )
` as const;

export interface BoardingServicePriceRow {
  price: number | string;
  /** Null = the facility-wide price. A branch's own row replaces it, for that
   *  branch only — see the two partial unique indexes in 20260924210000. */
  location_id: string | null;
}

export interface BoardingServiceRow {
  id: string;
  legacy_id: string | null;
  category_id: string | null;
  name: string;
  description: string;
  image_url: string | null;
  color: string | null;
  price: number | string;
  unit: BoardingPriceUnit;
  taxable: boolean;
  lodging_type_ids: string[] | null;
  eligible_species: string[] | null;
  eligible_breeds: string[] | null;
  eligible_weight_tiers: string[] | null;
  eligible_pet_tags: string[] | null;
  blocked_pet_tags: string[] | null;
  location_ids: string[] | null;
  requires_evaluation: boolean;
  requires_evaluation_online: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  boarding_service_location_prices: BoardingServicePriceRow[] | null;
}

/** One branch's price for a service, for the screen that shows them all. */
export interface BoardingServiceBranchPrice {
  locationId: string | null;
  price: number;
}

export interface BoardingService {
  id: string;
  /** The uuid, always — `id` may be a legacy string. Needed to write prices. */
  rowId: string;
  categoryId: string | null;
  name: string;
  description: string;
  imageUrl: string | null;
  color: string | null;
  /** What this costs HERE: the branch's own price where it set one. */
  price: number;
  /** The facility-wide price, whatever branch was asked about. */
  facilityPrice: number;
  /** Per night or per day. `stayUnits` is what turns dates into a quantity. */
  unit: BoardingPriceUnit;
  taxable: boolean;
  /**
   * The lodging types this may be booked into. EMPTY MEANS EVERY TYPE.
   *
   * These are `room_categories.id` uuids. A type that has since been deleted
   * leaves a dead id here — the table's own comment says so — which is why
   * `servesLodgingType` asks whether a resolvable type matches rather than
   * trusting the list's length alone.
   */
  lodgingTypeIds: string[];
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  eligibleWeightTiers: string[];
  eligiblePetTags: string[];
  blockedPetTags: string[];
  locationIds: string[];
  requiresEvaluation: boolean;
  requiresEvaluationOnline: boolean;
  displayOrder: number;
  isActive: boolean;
  /** Every branch that has priced it, for the HQ screen. */
  locationPricing: BoardingServiceBranchPrice[];
}

/**
 * The app id is `legacy_id` when the row has one, else the uuid.
 *
 * Not cosmetic: every service the Phase 5 migration carried over from a room
 * category carries `'svc-' || rc.legacy_id`, and a service CREATED through
 * this API has no legacy id at all. Falling back to the uuid means a brand-new
 * service is addressable the moment it exists.
 */
function appId(row: { legacy_id: string | null; id: string }): string {
  return row.legacy_id ?? row.id;
}

function num(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * What one branch pays for a service.
 *
 * The branch's own row wins where it exists; otherwise the facility-wide row
 * (`location_id` null); otherwise the service's own `price` column. Asking
 * about no branch returns the facility-wide answer, which is what every caller
 * except the branch selector wants.
 */
export function effectiveBoardingPrice(
  row: BoardingServiceRow,
  locationId?: string | null,
): number {
  const rows = row.boarding_service_location_prices ?? [];
  if (locationId) {
    const own = rows.find((p) => p.location_id === locationId);
    if (own) return num(own.price);
  }
  const facilityWide = rows.find((p) => p.location_id === null);
  if (facilityWide) return num(facilityWide.price);
  return num(row.price);
}

/** Every branch price on a service, for the screen that compares them. */
export function perLocationBoardingPricing(
  rows: BoardingServicePriceRow[],
): BoardingServiceBranchPrice[] {
  return rows.map((p) => ({ locationId: p.location_id, price: num(p.price) }));
}

export function rowToBoardingService(
  row: BoardingServiceRow,
  options?: { locationId?: string | null },
): BoardingService {
  return {
    id: appId(row),
    rowId: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.image_url,
    color: row.color,
    price: effectiveBoardingPrice(row, options?.locationId),
    facilityPrice: effectiveBoardingPrice(row, null),
    unit: row.unit,
    taxable: row.taxable,
    lodgingTypeIds: row.lodging_type_ids ?? [],
    eligibleSpecies: row.eligible_species ?? [],
    eligibleBreeds: row.eligible_breeds ?? [],
    eligibleWeightTiers: row.eligible_weight_tiers ?? [],
    eligiblePetTags: row.eligible_pet_tags ?? [],
    blockedPetTags: row.blocked_pet_tags ?? [],
    locationIds: row.location_ids ?? [],
    requiresEvaluation: row.requires_evaluation,
    requiresEvaluationOnline: row.requires_evaluation_online,
    displayOrder: row.display_order,
    isActive: row.is_active,
    locationPricing: perLocationBoardingPricing(
      row.boarding_service_location_prices ?? [],
    ),
  };
}

/** What the client may write. Anything absent is left alone by a PATCH. */
export interface BoardingServiceInput {
  name?: string;
  description?: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  price?: number;
  unit?: BoardingPriceUnit;
  taxable?: boolean;
  lodgingTypeIds?: string[];
  eligibleSpecies?: string[];
  eligibleBreeds?: string[];
  eligibleWeightTiers?: string[];
  eligiblePetTags?: string[];
  blockedPetTags?: string[];
  locationIds?: string[];
  requiresEvaluation?: boolean;
  requiresEvaluationOnline?: boolean;
  displayOrder?: number;
  isActive?: boolean;
}

const TEXT_ARRAYS = {
  eligibleSpecies: "eligible_species",
  eligibleBreeds: "eligible_breeds",
  eligibleWeightTiers: "eligible_weight_tiers",
  eligiblePetTags: "eligible_pet_tags",
  blockedPetTags: "blocked_pet_tags",
  locationIds: "location_ids",
  lodgingTypeIds: "lodging_type_ids",
} as const satisfies Record<string, string>;

/** The two units the enum admits, and nothing else reaches the database. */
export const BOARDING_PRICE_UNITS: readonly BoardingPriceUnit[] = [
  "night",
  "day",
];

/**
 * The write shape, built key by key so an absent field is LEFT ALONE rather
 * than nulled. A PATCH that sends only `{ isActive: false }` must not wipe the
 * eligibility a facility spent an afternoon on.
 */
export function boardingServiceToRow(
  input: BoardingServiceInput,
): BoardingServiceUpdate {
  const row: BoardingServiceUpdate = {};

  if (input.name !== undefined) row.name = String(input.name).slice(0, 200);
  if (input.description !== undefined)
    row.description = String(input.description);
  if (input.categoryId !== undefined) row.category_id = input.categoryId;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
  if (input.color !== undefined) row.color = input.color;
  if (input.price !== undefined) row.price = Math.max(0, Number(input.price));

  // An unknown unit is DROPPED rather than written: the column is an enum and
  // a bad value is a 500 from Postgres, which reads to the facility as "saving
  // is broken" rather than "that is not a unit".
  if (input.unit !== undefined && BOARDING_PRICE_UNITS.includes(input.unit)) {
    row.unit = input.unit;
  }
  if (input.taxable !== undefined) row.taxable = Boolean(input.taxable);

  for (const [key, column] of Object.entries(TEXT_ARRAYS)) {
    const value = input[key as keyof typeof TEXT_ARRAYS];
    // Every column in TEXT_ARRAYS is a `not null default '{}'` array, so the
    // narrowing is true by construction and `satisfies` above proves the keys.
    if (value !== undefined)
      (row as Record<string, string[]>)[column] = value ?? [];
  }

  if (input.requiresEvaluation !== undefined)
    row.requires_evaluation = Boolean(input.requiresEvaluation);
  if (input.requiresEvaluationOnline !== undefined)
    row.requires_evaluation_online = Boolean(input.requiresEvaluationOnline);
  if (input.displayOrder !== undefined)
    row.display_order = Math.round(Number(input.displayOrder));
  if (input.isActive !== undefined) row.is_active = Boolean(input.isActive);

  return row;
}
