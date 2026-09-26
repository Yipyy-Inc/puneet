// ============================================================================
// The one add-ons list, between Postgres and the screen (20260926230000).
//
// `service_add_ons` + `service_add_on_location_overrides`. This file is the
// only place that knows the column names.
// ============================================================================

import type { Database } from "@/types/database";
import {
  ADD_ON_COAT_TYPES,
  ADD_ON_WEIGHT_TIERS,
  type AddOn,
  type AddOnCategory,
  type AddOnCoatType,
  type AddOnInput,
  type AddOnLocationOverride,
  type AddOnWeightTier,
} from "@/types/add-on";

/** The generated write shape. Typed, so a renamed column fails the build. */
export type AddOnUpdate =
  Database["public"]["Tables"]["service_add_ons"]["Update"];

export const ADD_ON_SELECT = `
  id, legacy_id, category_id, name, description, is_active, image_url,
  color_code, location_ids, price, taxable, duration_min, requires_staff,
  applies_to_all_services, service_refs,
  eligible_species, eligible_breeds, eligible_weight_tiers, eligible_coat_types,
  display_order, created_at, updated_at,
  service_add_on_location_overrides ( location_id, price, taxable, duration_min )
` as const;

export const ADD_ON_CATEGORY_SELECT = "id, name, display_order" as const;

export interface AddOnOverrideRow {
  location_id: string;
  price: number | string | null;
  taxable: boolean | null;
  duration_min: number | null;
}

export interface AddOnRow {
  id: string;
  legacy_id: string | null;
  category_id: string | null;
  name: string;
  description: string;
  is_active: boolean;
  image_url: string | null;
  color_code: string | null;
  location_ids: string[] | null;
  price: number | string;
  taxable: boolean;
  duration_min: number;
  requires_staff: boolean;
  applies_to_all_services: boolean;
  service_refs: string[] | null;
  eligible_species: string[] | null;
  eligible_breeds: string[] | null;
  eligible_weight_tiers: string[] | null;
  eligible_coat_types: string[] | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  service_add_on_location_overrides: AddOnOverrideRow[] | null;
}

export interface AddOnCategoryRow {
  id: string;
  name: string;
  display_order: number;
}

/** PostgREST answers `numeric` as a string. */
function num(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Values the table's checks would refuse never reach the screen as if valid. */
function tiers(values: string[] | null): AddOnWeightTier[] {
  return (values ?? []).filter((v): v is AddOnWeightTier =>
    (ADD_ON_WEIGHT_TIERS as readonly string[]).includes(v),
  );
}

function coats(values: string[] | null): AddOnCoatType[] {
  return (values ?? []).filter((v): v is AddOnCoatType =>
    (ADD_ON_COAT_TYPES as readonly string[]).includes(v),
  );
}

export function rowToAddOnOverride(
  row: AddOnOverrideRow,
): AddOnLocationOverride {
  return {
    locationId: row.location_id,
    price: row.price === null ? null : num(row.price),
    taxable: row.taxable,
    durationMin: row.duration_min,
  };
}

export function rowToAddOn(row: AddOnRow): AddOn {
  return {
    id: row.id,
    legacyId: row.legacy_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? "",
    isActive: row.is_active,
    imageUrl: row.image_url,
    colorCode: row.color_code,
    locationIds: row.location_ids ?? [],
    price: num(row.price),
    taxable: row.taxable,
    durationMin: row.duration_min ?? 0,
    requiresStaff: row.requires_staff,
    appliesToAllServices: row.applies_to_all_services,
    serviceRefs: row.service_refs ?? [],
    eligibleSpecies: row.eligible_species ?? [],
    eligibleBreeds: row.eligible_breeds ?? [],
    eligibleWeightTiers: tiers(row.eligible_weight_tiers),
    eligibleCoatTypes: coats(row.eligible_coat_types),
    displayOrder: row.display_order ?? 0,
    overrides: (row.service_add_on_location_overrides ?? []).map(
      rowToAddOnOverride,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToAddOnCategory(row: AddOnCategoryRow): AddOnCategory {
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.display_order ?? 0,
  };
}

/**
 * The columns an input names, and only those — so a PATCH that moves the price
 * does not blank the description. `facility_id` is never here: it comes from
 * the session, in the route.
 */
export function addOnInputToRow(input: AddOnInput): AddOnUpdate {
  const row: AddOnUpdate = {};
  if (input.name !== undefined) row.name = input.name.trim();
  if (input.categoryId !== undefined) row.category_id = input.categoryId;
  if (input.description !== undefined) row.description = input.description;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  if (input.imageUrl !== undefined) {
    row.image_url = input.imageUrl?.trim() || null;
  }
  if (input.colorCode !== undefined) {
    row.color_code = input.colorCode?.trim() || null;
  }
  if (input.locationIds !== undefined) row.location_ids = input.locationIds;
  if (input.price !== undefined) {
    row.price = Math.round(input.price * 100) / 100;
  }
  if (input.taxable !== undefined) row.taxable = input.taxable;
  if (input.durationMin !== undefined) row.duration_min = input.durationMin;
  if (input.requiresStaff !== undefined) {
    row.requires_staff = input.requiresStaff;
  }
  if (input.appliesToAllServices !== undefined) {
    row.applies_to_all_services = input.appliesToAllServices;
  }
  if (input.serviceRefs !== undefined) row.service_refs = input.serviceRefs;
  if (input.eligibleSpecies !== undefined) {
    row.eligible_species = input.eligibleSpecies;
  }
  if (input.eligibleBreeds !== undefined) {
    row.eligible_breeds = input.eligibleBreeds;
  }
  if (input.eligibleWeightTiers !== undefined) {
    row.eligible_weight_tiers = input.eligibleWeightTiers;
  }
  if (input.eligibleCoatTypes !== undefined) {
    row.eligible_coat_types = input.eligibleCoatTypes;
  }
  if (input.displayOrder !== undefined) row.display_order = input.displayOrder;
  return row;
}
