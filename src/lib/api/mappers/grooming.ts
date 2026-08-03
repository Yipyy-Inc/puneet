import type { GroomingAddOn, GroomingPackage } from "@/types/grooming";
import type { PetSize } from "@/types/base";

// ============================================================================
// grooming_services (+ size prices) → the GroomingPackage the screens expect.
//
// THE TYPE IS CALLED GroomingPackage AND THE TABLE IS CALLED grooming_services.
// That is not drift — it is the collision the migration exists to end (see the
// header of 20260805100000): the mock calls a SERVICE a "package" while
// `grooming-prepaid-packages.ts` calls a PUNCH CARD the same thing. The table
// took the honest name; the TypeScript keeps the old one until the screens are
// renamed, which is a separate change with its own blast radius.
//
// ── FIELDS WITH NO COLUMN BEHIND THEM ──────────────────────────────────────
//
// GroomingPackage carries more than slice 1 built. Rather than let them arrive
// as `undefined` and be discovered one render at a time, they are listed here:
//
//   purchaseCount        — a derived sales figure. Reported as 0 because the
//                          honest value needs the appointment history, and a
//                          made-up number on a "most popular" badge is worse
//                          than a zero.
//   stylistPricing       — per-stylist price overrides
//   tierAdjustments      — groomer-tier modifiers
//   ageGroupPricing      — age-band rules
//   breedOverrides       — per-breed prices
//   productUsage         — shampoo/conditioner consumption
//   assignedStylistIds   — which groomers may perform it
//   requiresEvaluation   — gate before booking
//
// All omitted, all optional in the schema. Their RESOLUTION ORDER is already
// implemented in `resolveEffectivePricing`, and storing them before that logic
// moves would be guessing at a shape the app already has an opinion about.
//
// `defaultAddOns` is a real table (grooming_service_default_add_ons) but is not
// mapped here: the rates screen does not read it, and loading a join no caller
// wants on every service row is a cost with no reader. It gets its own query
// when the service dialog's rule builder migrates.
// ============================================================================

export const SERVICE_SELECT = `
  id, legacy_id, name, description, base_price, duration_min,
  coat_adjustments, coat_adjustment_mode, matted_surcharge_default,
  includes, is_active, is_popular,
  eligible_pet_sizes, eligible_coat_types, eligible_breeds,
  required_skill_level, min_booking_notice_hours, max_per_day,
  display_order, color, image_url, created_at,
  grooming_service_size_prices ( size_label, price, duration_min )
` as const;

interface SizePriceRow {
  size_label: string;
  price: number;
  duration_min: number | null;
}

export interface ServiceRow {
  id: string;
  legacy_id: string | null;
  name: string;
  description: string;
  base_price: number;
  duration_min: number;
  coat_adjustments: unknown;
  coat_adjustment_mode: string;
  matted_surcharge_default: number;
  includes: string[] | null;
  is_active: boolean;
  is_popular: boolean;
  eligible_pet_sizes: string[] | null;
  eligible_coat_types: string[] | null;
  eligible_breeds: string[] | null;
  required_skill_level: string | null;
  min_booking_notice_hours: number | null;
  max_per_day: number | null;
  display_order: number;
  color: string | null;
  image_url: string | null;
  created_at: string;
  grooming_service_size_prices: SizePriceRow[] | null;
}

/**
 * The app id is `legacy_id` when the row has one, else the uuid.
 *
 * Not cosmetic: the whole screen keys on it, and a service CREATED through this
 * API has no legacy_id at all (nothing is minting "groom-pkg-004"). Falling
 * back to the uuid means a brand-new service is addressable the moment it
 * exists, instead of being a row with an empty id that the list cannot select.
 */
function appId(row: { legacy_id: string | null; id: string }): string {
  return row.legacy_id ?? row.id;
}

export function rowToService(row: ServiceRow): GroomingPackage {
  // The four size keys the type declares. A tier the facility has not priced is
  // LEFT OUT rather than defaulted to base_price: `sizePricing.large`
  // being absent means "no large price", and filling it with the base price
  // would quietly invent one.
  const sizePricing: Partial<Record<PetSize, number>> = {};
  for (const p of row.grooming_service_size_prices ?? []) {
    if (
      p.size_label === "small" ||
      p.size_label === "medium" ||
      p.size_label === "large" ||
      p.size_label === "giant"
    ) {
      sizePricing[p.size_label] = Number(p.price);
    }
  }

  return {
    id: appId(row),
    name: row.name,
    description: row.description,
    basePrice: Number(row.base_price),
    duration: row.duration_min,
    sizePricing,
    coatAdjustments: {
      ...(row.coat_adjustments as Record<string, number>),
      mode: row.coat_adjustment_mode as "flat" | "percent",
    },
    mattedSurchargeDefault: Number(row.matted_surcharge_default),
    includes: row.includes ?? [],
    isActive: row.is_active,
    isPopular: row.is_popular,
    // See the header: 0 is the honest answer until the sales history is real.
    purchaseCount: 0,
    createdAt: row.created_at,
    eligiblePetSizes: (row.eligible_pet_sizes ?? []) as PetSize[],
    eligibleCoatTypes: (row.eligible_coat_types ??
      []) as GroomingPackage["eligibleCoatTypes"],
    eligibleBreeds: row.eligible_breeds ?? [],
    ...(row.required_skill_level
      ? {
          requiredSkillLevel:
            row.required_skill_level as GroomingPackage["requiredSkillLevel"],
        }
      : {}),
    ...(row.min_booking_notice_hours !== null
      ? { minBookingNoticeHours: row.min_booking_notice_hours }
      : {}),
    ...(row.max_per_day !== null ? { maxPerDay: row.max_per_day } : {}),
    ...(row.color ? { color: row.color } : {}),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
  } as GroomingPackage;
}

/** The write direction. Only the columns that exist — anything the screen sends
 *  for an unbacked field is dropped here rather than silently accepted into a
 *  jsonb bucket where it would look stored and never be read. */
export function serviceToRow(
  input: Partial<GroomingPackage>,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.description !== undefined) row.description = input.description;
  if (input.basePrice !== undefined) row.base_price = input.basePrice;
  if (input.duration !== undefined) row.duration_min = input.duration;
  if (input.mattedSurchargeDefault !== undefined)
    row.matted_surcharge_default = input.mattedSurchargeDefault;
  if (input.includes !== undefined) row.includes = input.includes;
  if (input.isActive !== undefined) row.is_active = input.isActive;
  if (input.isPopular !== undefined) row.is_popular = input.isPopular;
  if (input.eligiblePetSizes !== undefined)
    row.eligible_pet_sizes = input.eligiblePetSizes;
  if (input.eligibleCoatTypes !== undefined)
    row.eligible_coat_types = input.eligibleCoatTypes;
  if (input.eligibleBreeds !== undefined)
    row.eligible_breeds = input.eligibleBreeds;
  if (input.requiredSkillLevel !== undefined)
    row.required_skill_level = input.requiredSkillLevel;
  if (input.minBookingNoticeHours !== undefined)
    row.min_booking_notice_hours = input.minBookingNoticeHours;
  if (input.maxPerDay !== undefined) row.max_per_day = input.maxPerDay;
  if (input.color !== undefined) row.color = input.color;
  if (input.imageUrl !== undefined) row.image_url = input.imageUrl;

  // The mode travels INSIDE coatAdjustments in the type and is its own column
  // in the table, so it is split out rather than written into the jsonb where
  // the CHECK constraint could never see it.
  if (input.coatAdjustments !== undefined) {
    const { mode, ...amounts } = input.coatAdjustments as Record<
      string,
      unknown
    >;
    row.coat_adjustments = amounts;
    if (mode === "flat" || mode === "percent") row.coat_adjustment_mode = mode;
  }

  return row;
}

/** Size prices are a child table, so they are written separately — see the
 *  route. Returned as rows ready to insert, minus the service id. */
export function sizePricesToRows(
  sizePricing: Partial<Record<PetSize, number>> | undefined,
): { size_label: string; price: number }[] {
  if (!sizePricing) return [];
  return Object.entries(sizePricing)
    .filter(([, price]) => typeof price === "number")
    .map(([size_label, price]) => ({ size_label, price: price as number }));
}

// ── Add-ons ─────────────────────────────────────────────────────────────────

export const ADD_ON_SELECT = `
  id, legacy_id, name, description, price, duration_min, is_active, display_order
` as const;

export interface AddOnRow {
  id: string;
  legacy_id: string | null;
  name: string;
  description: string;
  price: number;
  duration_min: number;
  is_active: boolean;
  display_order: number;
}

export function rowToAddOn(row: AddOnRow): GroomingAddOn {
  return {
    id: appId(row),
    name: row.name,
    description: row.description,
    price: Number(row.price),
    duration: row.duration_min,
    isActive: row.is_active,
  };
}
