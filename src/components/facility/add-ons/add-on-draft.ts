import type {
  AddOn,
  AddOnCoatType,
  AddOnInput,
  AddOnWeightTier,
} from "@/types/add-on";

// ============================================================================
// What the add-on editor holds while somebody types — and nothing else.
//
// Numbers are kept as the TEXT typed ("", "12.5") so a half-typed price never
// becomes 0 on the way through; they are parsed once, on save. The three
// "all or customise" choices of the reference's Pet details are their own
// switches here, because an empty list means "every pet" in the table and a
// facility that picks Customize and has not chosen yet must not be saved as
// "every pet" by accident.
// ============================================================================

export interface OverrideDraft {
  price: string;
  duration: string;
  /** "same" = the add-on's own tax, else an explicit choice. */
  tax: "same" | "on" | "off";
}

export interface AddOnDraft {
  name: string;
  categoryId: string | null;
  description: string;
  isActive: boolean;
  imageUrl: string;
  colorCode: string;
  locationIds: string[];
  price: string;
  taxable: boolean;
  duration: string;
  overrideByLocation: boolean;
  overrides: Record<string, OverrideDraft>;
  requiresStaff: boolean;
  appliesToAllServices: boolean;
  serviceRefs: string[];
  allTypes: boolean;
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  fullWeightRange: boolean;
  eligibleWeightTiers: AddOnWeightTier[];
  allCoats: boolean;
  eligibleCoatTypes: AddOnCoatType[];
}

export function draftFrom(addOn: AddOn | null): AddOnDraft {
  const overrides: Record<string, OverrideDraft> = {};
  for (const o of addOn?.overrides ?? []) {
    overrides[o.locationId] = {
      price: o.price === null ? "" : String(o.price),
      duration: o.durationMin === null ? "" : String(o.durationMin),
      tax: o.taxable === null ? "same" : o.taxable ? "on" : "off",
    };
  }
  return {
    name: addOn?.name ?? "",
    categoryId: addOn?.categoryId ?? null,
    description: addOn?.description ?? "",
    isActive: addOn?.isActive ?? true,
    imageUrl: addOn?.imageUrl ?? "",
    colorCode: addOn?.colorCode ?? "",
    locationIds: addOn?.locationIds ?? [],
    price: addOn ? String(addOn.price) : "",
    taxable: addOn?.taxable ?? true,
    duration: addOn && addOn.durationMin > 0 ? String(addOn.durationMin) : "",
    overrideByLocation: (addOn?.overrides.length ?? 0) > 0,
    overrides,
    requiresStaff: addOn?.requiresStaff ?? false,
    appliesToAllServices: addOn?.appliesToAllServices ?? true,
    serviceRefs: addOn?.serviceRefs ?? [],
    allTypes:
      (addOn?.eligibleSpecies.length ?? 0) === 0 &&
      (addOn?.eligibleBreeds.length ?? 0) === 0,
    eligibleSpecies: addOn?.eligibleSpecies ?? [],
    eligibleBreeds: addOn?.eligibleBreeds ?? [],
    fullWeightRange: (addOn?.eligibleWeightTiers.length ?? 0) === 0,
    eligibleWeightTiers: addOn?.eligibleWeightTiers ?? [],
    allCoats: (addOn?.eligibleCoatTypes.length ?? 0) === 0,
    eligibleCoatTypes: addOn?.eligibleCoatTypes ?? [],
  };
}

/** A price or a count typed as text, or null when it is not one. */
function parsed(text: string, whole = false): number | null {
  const trimmed = text.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return whole ? Math.round(n) : Math.round(n * 100) / 100;
}

export type DraftProblem =
  | "nameRequired"
  | "priceInvalid"
  | "servicesNoneChosen"
  | "petDetailsNoneChosen";

/** The first thing stopping a save, or null. */
export function draftProblem(draft: AddOnDraft): DraftProblem | null {
  if (!draft.name.trim()) return "nameRequired";
  if (parsed(draft.price) === null) return "priceInvalid";
  if (!draft.appliesToAllServices && draft.serviceRefs.length === 0) {
    return "servicesNoneChosen";
  }
  if (
    (!draft.allTypes && draft.eligibleSpecies.length === 0) ||
    (!draft.fullWeightRange && draft.eligibleWeightTiers.length === 0) ||
    (!draft.allCoats && draft.eligibleCoatTypes.length === 0)
  ) {
    return "petDetailsNoneChosen";
  }
  return null;
}

/**
 * The editor's state as the API takes it. Every field is sent, so a save is
 * what the form shows — and `overrides` replaces the stored ones, including
 * with none when the facility turned "by location" off.
 */
export function draftToInput(
  draft: AddOnDraft,
  locationIds: readonly string[],
): AddOnInput {
  // Only locations that still exist, and only rows that override something.
  const overrides = draft.overrideByLocation
    ? locationIds
        .map((locationId) => {
          const o = draft.overrides[locationId];
          if (!o) return null;
          const price = parsed(o.price);
          const durationMin = parsed(o.duration, true);
          const taxable = o.tax === "same" ? null : o.tax === "on";
          if (price === null && durationMin === null && taxable === null) {
            return null;
          }
          return { locationId, price, durationMin, taxable };
        })
        .filter((o) => o !== null)
    : [];

  return {
    name: draft.name.trim(),
    categoryId: draft.categoryId,
    description: draft.description.trim(),
    isActive: draft.isActive,
    imageUrl: draft.imageUrl.trim() || null,
    colorCode: draft.colorCode.trim() || null,
    locationIds: draft.locationIds,
    price: parsed(draft.price) ?? 0,
    taxable: draft.taxable,
    durationMin: parsed(draft.duration, true) ?? 0,
    requiresStaff: draft.requiresStaff,
    appliesToAllServices: draft.appliesToAllServices,
    serviceRefs: draft.appliesToAllServices ? [] : draft.serviceRefs,
    eligibleSpecies: draft.allTypes ? [] : draft.eligibleSpecies,
    eligibleBreeds: draft.allTypes ? [] : draft.eligibleBreeds,
    eligibleWeightTiers: draft.fullWeightRange ? [] : draft.eligibleWeightTiers,
    eligibleCoatTypes: draft.allCoats ? [] : draft.eligibleCoatTypes,
    overrides,
  };
}

/**
 * "Duplicate": every field of the original, under a new name, INACTIVE — the
 * services' "copied as a draft" pattern, so a copy never goes on sale before
 * somebody has looked at it.
 */
export function duplicateInput(addOn: AddOn, name: string): AddOnInput {
  return {
    ...draftToInput(
      draftFrom(addOn),
      addOn.overrides.map((o) => o.locationId),
    ),
    name,
    isActive: false,
    displayOrder: addOn.displayOrder + 1,
  };
}
