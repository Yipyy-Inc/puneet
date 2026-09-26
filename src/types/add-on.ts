import { z } from "zod";

// ============================================================================
// AN ADD-ON — one list for every service (20260926230000).
//
// The shape of Settings > Services > Add-ons, section by section: basic info,
// the locations that offer it, price / tax / duration with an override per
// location, whether it needs a staff member, the services it applies to, and
// the pets it is for. Nothing else: a price unit, a maximum quantity, a
// per-booking scope, scheduling, tasks and default/required flags were all
// left behind with the JSON they lived in. A booking line is price x quantity,
// and defaults belong to the SERVICE.
// ============================================================================

/** The size tiers a weight range is chosen from (<=15, <=35, <=70 lb, above). */
export const ADD_ON_WEIGHT_TIERS = ["small", "medium", "large", "giant"] as const;
export type AddOnWeightTier = (typeof ADD_ON_WEIGHT_TIERS)[number];

/** The coat types a pet record can hold — `pets.coat_type`'s check, exactly. */
export const ADD_ON_COAT_TYPES = [
  "short",
  "medium",
  "long",
  "wire",
  "curly",
  "hairless",
] as const;
export type AddOnCoatType = (typeof ADD_ON_COAT_TYPES)[number];

/**
 * One service an add-on applies to, when it does not apply to all of them:
 * `boarding:<uuid>`, `daycare:<uuid>`, `grooming:<uuid>`, `training`,
 * `evaluation` or `custom:<module slug>`. The table checks the same pattern.
 */
export const SERVICE_REF =
  /^((boarding|daycare|grooming):[0-9a-f-]{36}|training|evaluation|custom:[a-z0-9_-]+)$/;

/** Override by business: a null field is the add-on's own value. */
export interface AddOnLocationOverride {
  locationId: string;
  price: number | null;
  taxable: boolean | null;
  durationMin: number | null;
}

export interface AddOn {
  /** The row's uuid. */
  id: string;
  /**
   * The id it had before the one list — a JSON add-on's string id, or a
   * grooming add-on's legacy id. Bookings, forms and service defaults written
   * before 2026-09-26 name add-ons by it, so every reader matches this OR `id`.
   */
  legacyId: string | null;
  categoryId: string | null;
  name: string;
  description: string;
  isActive: boolean;
  imageUrl: string | null;
  colorCode: string | null;
  /** The locations that offer it. EMPTY MEANS EVERY LOCATION. */
  locationIds: string[];
  price: number;
  taxable: boolean;
  durationMin: number;
  requiresStaff: boolean;
  /** "All services (including future ones)". */
  appliesToAllServices: boolean;
  /** The services it applies to when not all. See `SERVICE_REF`. */
  serviceRefs: string[];
  /** Pet details. EMPTY MEANS EVERY PET, the services' own convention. */
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  eligibleWeightTiers: AddOnWeightTier[];
  eligibleCoatTypes: AddOnCoatType[];
  displayOrder: number;
  overrides: AddOnLocationOverride[];
  createdAt: string;
  updatedAt: string;
}

export interface AddOnCategory {
  id: string;
  name: string;
  displayOrder: number;
}

const overrideSchema = z.object({
  locationId: z.guid(),
  price: z.number().min(0).max(100000).nullable(),
  taxable: z.boolean().nullable(),
  durationMin: z.number().int().min(0).max(1440).nullable(),
});

/** What the editor sends. Every key optional so a PATCH names only what moved. */
export const addOnInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  categoryId: z.guid().nullable().optional(),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().max(2048).nullable().optional(),
  colorCode: z.string().max(32).nullable().optional(),
  locationIds: z.array(z.guid()).max(200).optional(),
  price: z.number().min(0).max(100000).optional(),
  taxable: z.boolean().optional(),
  durationMin: z.number().int().min(0).max(1440).optional(),
  requiresStaff: z.boolean().optional(),
  appliesToAllServices: z.boolean().optional(),
  serviceRefs: z.array(z.string().regex(SERVICE_REF)).max(500).optional(),
  eligibleSpecies: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  eligibleBreeds: z.array(z.string().trim().min(1).max(80)).max(500).optional(),
  eligibleWeightTiers: z.array(z.enum(ADD_ON_WEIGHT_TIERS)).optional(),
  eligibleCoatTypes: z.array(z.enum(ADD_ON_COAT_TYPES)).optional(),
  displayOrder: z.number().int().optional(),
  /** Replaces every override when present; absent leaves them alone. */
  overrides: z.array(overrideSchema).max(200).optional(),
});

export type AddOnInput = z.infer<typeof addOnInputSchema>;
