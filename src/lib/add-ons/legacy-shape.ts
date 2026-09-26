import type { AddOn, AddOnCategory, AddOnWeightTier } from "@/types/add-on";
import type {
  AddOnCategory as LegacyAddOnCategory,
  ServiceAddOn,
} from "@/types/facility";

// ============================================================================
// THE ONE ADD-ONS LIST, IN THE SHAPE THE BOOKING SCREENS STILL READ.
//
// About thirty screens read `useServiceAddOns()` — the booking wizard's
// pickers, the confirm step, the ops calendar, request review, custom fees —
// and all of them were written against the JSON `ServiceAddOn`. The one list
// (20260926223644) replaces the JSON; this turns a row back into that shape so
// they move without being edited in the same change. Each is rewritten to the
// new type when the booking side learns the new rules, and this file goes then.
//
// Three choices, each made so nothing a screen does today changes:
//
//   * `id` is the LEGACY id where there is one: bookings written before the
//     one list name add-ons by it (`details.extraServices[].serviceId`).
//   * `pricingType` is `per_item`: one price, and the booking says how many —
//     which is the reference's model, and `price x quantity` is already every
//     reader's arithmetic. `flat` would have locked the quantity at one.
//   * "All services" becomes every built-in care type AND "all", because some
//     screens filter with `applicableServices.includes("boarding")` and would
//     drop an all-services add-on otherwise.
// ============================================================================

const BUILT_IN_SERVICES = [
  "daycare",
  "boarding",
  "grooming",
  "training",
  "evaluation",
] as const;

/** Pound bands of the size tiers, as the old weight filter spoke them. */
const TIER_BANDS: Record<AddOnWeightTier, { min: number; max: number | null }> =
  {
    small: { min: 0, max: 15 },
    medium: { min: 15, max: 35 },
    large: { min: 35, max: 70 },
    giant: { min: 70, max: null },
  };

/** The care types (and custom module slugs) an add-on applies to. */
export function legacyApplicableServices(addOn: AddOn): string[] {
  if (addOn.appliesToAllServices) return ["all", ...BUILT_IN_SERVICES];
  const services = new Set<string>();
  for (const ref of addOn.serviceRefs) {
    if (ref.startsWith("custom:")) services.add(ref.slice("custom:".length));
    else services.add(ref.split(":")[0]);
  }
  return [...services];
}

function legacyWeightRange(tiers: AddOnWeightTier[]): {
  weightMin?: number;
  weightMax?: number;
} {
  if (tiers.length === 0) return {};
  const bands = tiers.map((tier) => TIER_BANDS[tier]);
  const min = Math.min(...bands.map((band) => band.min));
  const open = bands.some((band) => band.max === null);
  const max = open ? null : Math.max(...bands.map((band) => band.max ?? 0));
  return {
    ...(min > 0 ? { weightMin: min } : {}),
    ...(max !== null ? { weightMax: max } : {}),
  };
}

export function toLegacyServiceAddOn(
  addOn: AddOn,
  categories: AddOnCategory[],
): ServiceAddOn {
  const hasPetLimits =
    addOn.eligibleSpecies.length > 0 ||
    addOn.eligibleBreeds.length > 0 ||
    addOn.eligibleWeightTiers.length > 0 ||
    addOn.eligibleCoatTypes.length > 0;

  return {
    id: addOn.legacyId ?? addOn.id,
    name: addOn.name,
    description: addOn.description,
    image: addOn.imageUrl ?? undefined,
    category: categories.find((c) => c.id === addOn.categoryId)?.name,
    colorCode: addOn.colorCode ?? undefined,
    pricingType: "per_item",
    price: addOn.price,
    duration: addOn.durationMin > 0 ? addOn.durationMin : undefined,
    taxable: addOn.taxable,
    petScope: "per_pet",
    applicableServices: legacyApplicableServices(addOn),
    locationIds: addOn.locationIds,
    requiresStaff: addOn.requiresStaff,
    requiresScheduling: false,
    generatesTask: false,
    petTypeFilter: hasPetLimits
      ? {
          types: addOn.eligibleSpecies.length
            ? addOn.eligibleSpecies
            : undefined,
          breeds: addOn.eligibleBreeds.length
            ? addOn.eligibleBreeds
            : undefined,
          coatTypes: addOn.eligibleCoatTypes.length
            ? addOn.eligibleCoatTypes
            : undefined,
          ...legacyWeightRange(addOn.eligibleWeightTiers),
        }
      : undefined,
    isActive: addOn.isActive,
    sortOrder: addOn.displayOrder,
    createdAt: addOn.createdAt,
    updatedAt: addOn.updatedAt,
  };
}

export function toLegacyAddOnCategory(
  category: AddOnCategory,
): LegacyAddOnCategory {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.displayOrder,
    createdAt: "",
    updatedAt: "",
  };
}
