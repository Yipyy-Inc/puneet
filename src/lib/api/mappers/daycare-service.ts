// ============================================================================
// The daycare menu, between Postgres and the screen.
//
// `daycare_services` + `daycare_service_location_prices` (20260924120000),
// built to the shape `grooming_services` already proved. This file is the only
// place that knows the column names.
//
// ── EMPTY MEANS NO RESTRICTION ────────────────────────────────────────────
//
// Every eligibility array defaults to `{}` in the database, and an empty array
// reads as "any pet". That is the same decision `grooming_services` records:
// "no restriction" and "not set yet" are the same thing here, and one
// representation for one meaning. So this mapper never turns `[]` into `null`
// or `undefined` on the way out — a caller checking `length === 0` is asking
// the right question.
// ============================================================================

import type { Database } from "@/types/database";

/** The generated write shape. Typed, so a renamed column fails the build. */
export type DaycareServiceUpdate =
  Database["public"]["Tables"]["daycare_services"]["Update"];

export const DAYCARE_SERVICE_SELECT = `
  id, legacy_id, category_id, name, description, image_url, color,
  price, taxable, max_duration_hours,
  rollover_after_minutes, rollover_to_service_id,
  eligible_species, eligible_breeds, eligible_weight_tiers,
  eligible_pet_tags, blocked_pet_tags,
  allowed_section_ids, included_addon_ids, location_ids,
  requires_evaluation, requires_evaluation_online,
  size_pricing, display_order, is_active, created_at,
  daycare_service_location_prices ( price, location_id )
` as const;

export interface DaycareServicePriceRow {
  price: number | string;
  /** Null = the facility-wide price. A branch's own row replaces it, for that
   *  branch only — see the two partial unique indexes in 20260924120000. */
  location_id: string | null;
}

export interface DaycareServiceRow {
  id: string;
  legacy_id: string | null;
  category_id: string | null;
  name: string;
  description: string;
  image_url: string | null;
  color: string | null;
  price: number | string;
  taxable: boolean;
  max_duration_hours: number | string | null;
  rollover_after_minutes: number | null;
  rollover_to_service_id: string | null;
  eligible_species: string[] | null;
  eligible_breeds: string[] | null;
  eligible_weight_tiers: string[] | null;
  eligible_pet_tags: string[] | null;
  blocked_pet_tags: string[] | null;
  allowed_section_ids: string[] | null;
  included_addon_ids: string[] | null;
  location_ids: string[] | null;
  requires_evaluation: boolean;
  requires_evaluation_online: boolean;
  size_pricing: unknown;
  display_order: number;
  is_active: boolean;
  created_at: string;
  daycare_service_location_prices: DaycareServicePriceRow[] | null;
}

/** One branch's price for a service, for the screen that shows them all. */
export interface DaycareServiceBranchPrice {
  locationId: string | null;
  price: number;
}

export interface DaycareService {
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
  taxable: boolean;
  /** Null = no ceiling. Distinct from 0, which no service may have. */
  maxDurationHours: number | null;
  rolloverAfterMinutes: number | null;
  rolloverToServiceId: string | null;
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  eligibleWeightTiers: string[];
  eligiblePetTags: string[];
  blockedPetTags: string[];
  allowedSectionIds: string[];
  includedAddOnIds: string[];
  locationIds: string[];
  requiresEvaluation: boolean;
  requiresEvaluationOnline: boolean;
  displayOrder: number;
  isActive: boolean;
  /** Every branch that has priced it, for the HQ screen. */
  locationPricing: DaycareServiceBranchPrice[];
}

/**
 * The app id is `legacy_id` when the row has one, else the uuid.
 *
 * Not cosmetic: the menu keys on it, the rates migrated out of the
 * `daycare_rates` setting carry their old `rate-full-day` string, and a
 * service CREATED through this API has no legacy id at all. Falling back to
 * the uuid means a brand-new service is addressable the moment it exists.
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
 *
 * A branch that has NOT priced a service is not invented a price here — it
 * falls through to the facility's, which is what it actually charges.
 */
export function effectivePrice(
  row: DaycareServiceRow,
  locationId?: string | null,
): number {
  const rows = row.daycare_service_location_prices ?? [];
  if (locationId) {
    const own = rows.find((p) => p.location_id === locationId);
    if (own) return num(own.price);
  }
  const facilityWide = rows.find((p) => p.location_id === null);
  if (facilityWide) return num(facilityWide.price);
  return num(row.price);
}

/** Every branch price on a service, for the screen that compares them. */
export function perLocationPricing(
  rows: DaycareServicePriceRow[],
): DaycareServiceBranchPrice[] {
  return rows.map((p) => ({
    locationId: p.location_id,
    price: num(p.price),
  }));
}

export function rowToDaycareService(
  row: DaycareServiceRow,
  options?: { locationId?: string | null },
): DaycareService {
  return {
    id: appId(row),
    rowId: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.image_url,
    color: row.color,
    price: effectivePrice(row, options?.locationId),
    facilityPrice: effectivePrice(row, null),
    taxable: row.taxable,
    maxDurationHours:
      row.max_duration_hours === null ? null : num(row.max_duration_hours),
    rolloverAfterMinutes: row.rollover_after_minutes,
    rolloverToServiceId: row.rollover_to_service_id,
    eligibleSpecies: row.eligible_species ?? [],
    eligibleBreeds: row.eligible_breeds ?? [],
    eligibleWeightTiers: row.eligible_weight_tiers ?? [],
    eligiblePetTags: row.eligible_pet_tags ?? [],
    blockedPetTags: row.blocked_pet_tags ?? [],
    allowedSectionIds: row.allowed_section_ids ?? [],
    includedAddOnIds: row.included_addon_ids ?? [],
    locationIds: row.location_ids ?? [],
    requiresEvaluation: row.requires_evaluation,
    requiresEvaluationOnline: row.requires_evaluation_online,
    displayOrder: row.display_order,
    isActive: row.is_active,
    locationPricing: perLocationPricing(
      row.daycare_service_location_prices ?? [],
    ),
  };
}

/** What the client may write. Anything absent is left alone by a PATCH. */
export interface DaycareServiceInput {
  name?: string;
  description?: string;
  categoryId?: string | null;
  imageUrl?: string | null;
  color?: string | null;
  price?: number;
  taxable?: boolean;
  maxDurationHours?: number | null;
  rolloverAfterMinutes?: number | null;
  rolloverToServiceId?: string | null;
  eligibleSpecies?: string[];
  eligibleBreeds?: string[];
  eligibleWeightTiers?: string[];
  eligiblePetTags?: string[];
  blockedPetTags?: string[];
  allowedSectionIds?: string[];
  includedAddOnIds?: string[];
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
  allowedSectionIds: "allowed_section_ids",
  includedAddOnIds: "included_addon_ids",
  locationIds: "location_ids",
} as const satisfies Record<string, string>;

/**
 * The write shape, built key by key so an absent field is LEFT ALONE rather
 * than nulled. A PATCH that sends only `{ isActive: false }` must not wipe the
 * eligibility a facility spent an afternoon on.
 */
export function daycareServiceToRow(
  input: DaycareServiceInput,
): DaycareServiceUpdate {
  const row: DaycareServiceUpdate = {};

  if (input.name !== undefined) row.name = String(input.name).slice(0, 200);
  if (input.description !== undefined)
    row.description = String(input.description);
  if (input.categoryId !== undefined) row.category_id = input.categoryId;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;
  if (input.color !== undefined) row.color = input.color;
  if (input.price !== undefined) row.price = Math.max(0, Number(input.price));
  if (input.taxable !== undefined) row.taxable = Boolean(input.taxable);

  // Null is NO CEILING and is different from 0, which the table refuses.
  if (input.maxDurationHours !== undefined) {
    row.max_duration_hours =
      input.maxDurationHours === null || input.maxDurationHours <= 0
        ? null
        : Number(input.maxDurationHours);
  }
  if (input.rolloverAfterMinutes !== undefined) {
    row.rollover_after_minutes =
      input.rolloverAfterMinutes === null
        ? null
        : Math.max(0, Math.round(Number(input.rolloverAfterMinutes)));
  }
  if (input.rolloverToServiceId !== undefined)
    row.rollover_to_service_id = input.rolloverToServiceId;

  for (const [key, column] of Object.entries(TEXT_ARRAYS)) {
    const value = input[key as keyof typeof TEXT_ARRAYS];
    // Every column in TEXT_ARRAYS is a `text[] not null default '{}'`, so the
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
