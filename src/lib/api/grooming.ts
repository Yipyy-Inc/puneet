import {
  groomingAppointments,
  groomingPackages,
  groomingProducts,
  inventoryOrders,
  stylists,
  stylistAvailability,
} from "@/data/grooming";
import { groomingPrepaidPackages } from "@/data/grooming-prepaid-packages";
import type { GroomingPrepaidPackage } from "@/data/grooming-prepaid-packages";
import { groomingWaitlist } from "@/data/grooming-waitlist";
import type { GroomingWaitlistEntry } from "@/data/grooming-waitlist";
import { petNotes } from "@/data/pet-notes";
import type { PetNote } from "@/types/pet";
import { petServicePricing } from "@/data/grooming-pet-pricing";
import { groomingPetPreferences } from "@/data/grooming-pet-preferences";
import type { GroomingPetPreference } from "@/data/grooming-pet-preferences";
import { loadCustomPetPricingOverrides } from "@/lib/grooming-pet-pricing-store";
import type {
  GroomingAppointment,
  Stylist,
  GroomingPackage,
  GroomingProduct,
  InventoryOrder,
  StylistAvailability,
  AlertNote,
  PetServicePricingOverride,
  DefaultAddOnCondition,
  CoatType,
  AgeGroupPricingRule,
  AgeGroupAdjustment,
  StylistSkillLevel,
} from "@/types/grooming";
import type { PetSize } from "@/types/base";

export const groomingQueries = {
  appointments: () => ({
    queryKey: ["grooming", "appointments"] as const,
    queryFn: async () => groomingAppointments as GroomingAppointment[],
  }),
  appointment: (id: string) => ({
    queryKey: ["grooming", "appointments", id] as const,
    queryFn: async () =>
      groomingAppointments.find((a) => a.id === id) as
        | GroomingAppointment
        | undefined,
  }),
  appointmentsByStylist: (stylistId: string) => ({
    queryKey: ["grooming", "appointments", "by-stylist", stylistId] as const,
    queryFn: async () =>
      groomingAppointments.filter(
        (a) => a.stylistId === stylistId,
      ) as GroomingAppointment[],
  }),
  stylists: () => ({
    queryKey: ["grooming", "stylists"] as const,
    queryFn: async () => stylists as Stylist[],
  }),
  stylist: (id: string) => ({
    queryKey: ["grooming", "stylists", id] as const,
    queryFn: async () =>
      stylists.find((s) => s.id === id) as Stylist | undefined,
  }),
  stylistAvailability: (stylistId: string) => ({
    queryKey: ["grooming", "stylists", stylistId, "availability"] as const,
    queryFn: async () =>
      stylistAvailability.filter(
        (a) => a.stylistId === stylistId,
      ) as StylistAvailability[],
  }),
  allStylistAvailability: () => ({
    queryKey: ["grooming", "stylist-availability"] as const,
    queryFn: async () => stylistAvailability as StylistAvailability[],
  }),
  packages: () => ({
    queryKey: ["grooming", "packages"] as const,
    queryFn: async () => groomingPackages as GroomingPackage[],
  }),
  prepaidPackages: () => ({
    queryKey: ["grooming", "prepaid-packages"] as const,
    queryFn: async () => groomingPrepaidPackages as GroomingPrepaidPackage[],
  }),
  products: () => ({
    queryKey: ["grooming", "products"] as const,
    queryFn: async () => groomingProducts as GroomingProduct[],
  }),
  product: (id: string) => ({
    queryKey: ["grooming", "products", id] as const,
    queryFn: async () =>
      groomingProducts.find((p) => p.id === id) as GroomingProduct | undefined,
  }),
  inventoryOrders: () => ({
    queryKey: ["grooming", "inventory-orders"] as const,
    queryFn: async () => inventoryOrders as InventoryOrder[],
  }),
  waitlist: () => ({
    queryKey: ["grooming", "waitlist"] as const,
    queryFn: async () => groomingWaitlist as GroomingWaitlistEntry[],
  }),
  petNotes: (petId: number) => ({
    queryKey: ["pet-notes", "pet", petId] as const,
    queryFn: async () =>
      petNotes.filter((n) => n.scope === "pet" && n.petId === petId) as PetNote[],
  }),
  clientNotes: (clientId: number) => ({
    queryKey: ["pet-notes", "client", clientId] as const,
    queryFn: async () =>
      petNotes.filter(
        (n) => n.scope === "client" && n.clientId === clientId,
      ) as PetNote[],
  }),
  petServicePricing: (petId: number) => ({
    queryKey: ["pet-service-pricing", petId] as const,
    queryFn: async () => {
      const local = loadCustomPetPricingOverrides();
      return mergePetServicePricing(petServicePricing, local).filter(
        (p) => p.petId === petId,
      ) as PetServicePricingOverride[];
    },
  }),
  allPetServicePricing: () => ({
    queryKey: ["pet-service-pricing"] as const,
    queryFn: async () => {
      const local = loadCustomPetPricingOverrides();
      return mergePetServicePricing(
        petServicePricing,
        local,
      ) as PetServicePricingOverride[];
    },
  }),
  petPreferences: () => ({
    queryKey: ["grooming", "pet-preferences"] as const,
    queryFn: async () => groomingPetPreferences as GroomingPetPreference[],
  }),
};

/**
 * Combine the static mock catalogue with any localStorage-saved overrides.
 * Local entries replace catalogue entries for the same pet/package combo —
 * the user just saved a new price, so it should win on the next render.
 */
function mergePetServicePricing(
  base: PetServicePricingOverride[],
  local: PetServicePricingOverride[],
): PetServicePricingOverride[] {
  if (local.length === 0) return base;
  const localKeys = new Set(local.map((o) => `${o.petId}:${o.packageId}`));
  const filtered = base.filter(
    (o) => !localKeys.has(`${o.petId}:${o.packageId}`),
  );
  return [...filtered, ...local];
}

/**
 * Resolve the effective price + duration for a given pet/package/stylist
 * combination. Priority order:
 *   1. Pet-specific override saved on the pet profile
 *   2. Stylist-specific package price (senior groomers charge more)
 *   3. Package size-pricing default, plus a matching age-group adjustment
 *      when the pet's age falls inside one of the package's age-group rules
 *
 * The `source` discriminator tells the UI which precedence won so it can
 * surface a "Saved price for {pet}" badge instead of looking like a typo.
 *
 * Age adjustments only apply to the size-default tier — explicit pet and
 * stylist overrides bypass them, because those overrides are recorded
 * with the final price the facility wants charged.
 */
export type EffectivePricing = {
  price: number;
  durationMin: number;
  source:
    | "pet-custom"
    | "breed-override"
    | "stylist-specific"
    | "service-default";
  /** Populated when source = "pet-custom" — staff note explaining the override. */
  note?: string;
  /**
   * Pre-adjustment size-default price. Same as `price` when no age rule
   * matched; otherwise the size-default before the age adjustment was
   * applied. Lets the booking summary render the discount/surcharge as a
   * separate line item.
   */
  baseBeforeAdjustment?: number;
  /** Age-group rule that fired, if any. */
  ageAdjustment?: {
    label: string;
    /** Signed dollar delta actually applied to the price (negative = discount). */
    delta: number;
    mode: AgeGroupAdjustment["mode"];
    amount: number;
  };
  /** Coat-type adjustment that fired, if any (delta on top of size price). */
  coatAdjustment?: {
    coatType: string;
    /** Signed dollar delta applied (positive = surcharge). */
    delta: number;
  };
};

/**
 * True when the pet's age (in months) falls inside the rule's range. An
 * undefined bound is treated as "open" on that side.
 */
function ageInRange(
  rule: AgeGroupPricingRule,
  petAgeMonths: number,
): boolean {
  if (rule.minMonths !== undefined && petAgeMonths < rule.minMonths) {
    return false;
  }
  if (rule.maxMonths !== undefined && petAgeMonths >= rule.maxMonths) {
    return false;
  }
  return true;
}

function applyAgeAdjustment(
  basePrice: number,
  adjustment: AgeGroupAdjustment,
): number {
  switch (adjustment.mode) {
    case "flat-add":
      return basePrice + adjustment.amount;
    case "flat-subtract":
      return Math.max(0, basePrice - adjustment.amount);
    case "percent":
      return Math.max(
        0,
        Math.round(basePrice * (1 + adjustment.amount / 100) * 100) / 100,
      );
  }
}

export function resolveEffectivePricing(args: {
  petId?: number;
  petSize?: PetSize;
  petBreed?: string;
  petCoatType?: CoatType;
  /** Pet age in months. When provided, age-group rules are evaluated. */
  petAgeMonths?: number;
  stylistId?: string;
  package: GroomingPackage;
  petPricingOverrides: PetServicePricingOverride[];
}): EffectivePricing {
  const {
    petId,
    petSize,
    petBreed,
    petCoatType,
    petAgeMonths,
    stylistId,
    package: pkg,
    petPricingOverrides,
  } = args;

  // 1. Pet-specific override — saved override for this exact pet/package
  //    combination wins over every other tier.
  if (petId !== undefined) {
    const petOverride = petPricingOverrides.find(
      (p) => p.petId === petId && p.packageId === pkg.id,
    );
    if (petOverride && petOverride.customPrice !== undefined) {
      return {
        price: petOverride.customPrice,
        durationMin: petOverride.customDurationMin ?? pkg.duration,
        source: "pet-custom",
        note: petOverride.note,
      };
    }
  }

  // 2. Breed override — full-price override keyed by the pet's breed string.
  //    Breeds normalize to lowercase for the lookup so the rule matches
  //    regardless of how staff capitalized it on the pet profile.
  if (petBreed && pkg.breedOverrides) {
    const normalized = petBreed.trim().toLowerCase();
    const match = Object.entries(pkg.breedOverrides).find(
      ([k]) => k.trim().toLowerCase() === normalized,
    );
    if (match) {
      return {
        price: match[1],
        durationMin: pkg.duration,
        source: "breed-override",
      };
    }
  }

  // 3. Stylist-specific package price — a senior groomer can charge more for
  //    the same service. Sits below breed-override but above the size+coat
  //    default since it's an explicit per-stylist amount.
  if (stylistId && pkg.stylistPricing && pkg.stylistPricing[stylistId]) {
    return {
      price: pkg.stylistPricing[stylistId],
      durationMin: pkg.duration,
      source: "stylist-specific",
    };
  }

  // 4. Size-pricing default + coat adjustment + age adjustment
  const sizePrice =
    petSize && pkg.sizePricing[petSize] !== undefined
      ? pkg.sizePricing[petSize]
      : pkg.basePrice;

  // Coat adjustment is a signed delta added on top of size pricing — captures
  // "double-coat dogs need 15 extra minutes of brushing" style surcharges
  // without requiring a full per-breed override.
  let coatAdjustment: EffectivePricing["coatAdjustment"] | undefined;
  let postCoatPrice = sizePrice;
  if (petCoatType && pkg.coatAdjustments) {
    const delta = pkg.coatAdjustments[petCoatType];
    if (typeof delta === "number" && delta !== 0) {
      coatAdjustment = { coatType: petCoatType, delta };
      postCoatPrice = Math.max(0, sizePrice + delta);
    }
  }

  // Find the first matching age rule (rules are evaluated in declared order).
  let ageAdjustment: EffectivePricing["ageAdjustment"] | undefined;
  let finalPrice = postCoatPrice;
  if (petAgeMonths !== undefined && pkg.ageGroupPricing) {
    const match = pkg.ageGroupPricing.find((r) => ageInRange(r, petAgeMonths));
    if (match) {
      const adjusted = applyAgeAdjustment(postCoatPrice, match.adjustment);
      ageAdjustment = {
        label: match.label,
        delta: adjusted - postCoatPrice,
        mode: match.adjustment.mode,
        amount: match.adjustment.amount,
      };
      finalPrice = adjusted;
    }
  }

  return {
    price: finalPrice,
    durationMin: pkg.duration,
    source: "service-default",
    baseBeforeAdjustment:
      ageAdjustment || coatAdjustment ? sizePrice : undefined,
    coatAdjustment,
    ageAdjustment,
  };
}

/** Human-readable summary of an age-group rule, used in the service setup UI. */
export function describeAgeGroupRule(rule: AgeGroupPricingRule): string {
  const range = (() => {
    if (rule.minMonths !== undefined && rule.maxMonths !== undefined) {
      return `${rule.minMonths}–${rule.maxMonths} months`;
    }
    if (rule.minMonths !== undefined) {
      return `${rule.minMonths}+ months`;
    }
    if (rule.maxMonths !== undefined) {
      return `under ${rule.maxMonths} months`;
    }
    return "any age";
  })();
  const adj = rule.adjustment;
  const adjLabel =
    adj.mode === "flat-add"
      ? `+$${adj.amount}`
      : adj.mode === "flat-subtract"
        ? `−$${adj.amount}`
        : `${adj.amount >= 0 ? "+" : ""}${adj.amount}%`;
  return `${range} · ${adjLabel}`;
}

// ============================================================================
// Default Add-On Auto-Attach
// ============================================================================

export type AutoAttachPet = {
  petSize?: PetSize;
  petWeight?: number;
  coatType?: CoatType;
  breed?: string;
};

/**
 * Returns true when the pet satisfies the condition. An undefined pet
 * attribute fails the check rather than accidentally matching — better to
 * skip an auto-add than to attach a $25 de-shedding treatment to a
 * short-coat dog because nobody filled in the coat type yet.
 */
export function evaluateAddOnCondition(
  condition: DefaultAddOnCondition,
  pet: AutoAttachPet,
): boolean {
  switch (condition.kind) {
    case "weight-gte":
      return pet.petWeight !== undefined && pet.petWeight >= condition.value;
    case "weight-lte":
      return pet.petWeight !== undefined && pet.petWeight <= condition.value;
    case "pet-size-in":
      return !!pet.petSize && condition.values.includes(pet.petSize);
    case "coat-type-in":
      return !!pet.coatType && condition.values.includes(pet.coatType);
    case "breed-includes":
      return (
        !!pet.breed &&
        pet.breed.toLowerCase().includes(condition.value.toLowerCase())
      );
  }
}

/**
 * Resolve which of a package's default add-ons should auto-attach for the
 * given pet. A rule with no conditions always fires; with conditions, every
 * condition must pass.
 */
export function resolveAutoAddOns(
  pkg: GroomingPackage,
  pet: AutoAttachPet,
): string[] {
  if (!pkg.defaultAddOns || pkg.defaultAddOns.length === 0) return [];
  const out: string[] = [];
  for (const rule of pkg.defaultAddOns) {
    const conditions = rule.conditions ?? [];
    const allPass = conditions.every((c) => evaluateAddOnCondition(c, pet));
    if (allPass) out.push(rule.addOnId);
  }
  return out;
}

/** Human-readable summary of a condition list, used by the service setup UI. */
export function describeAddOnConditions(
  conditions: DefaultAddOnCondition[] | undefined,
): string {
  if (!conditions || conditions.length === 0) return "Always attached";
  return conditions
    .map((c) => {
      switch (c.kind) {
        case "weight-gte":
          return `weight ≥ ${c.value} lbs`;
        case "weight-lte":
          return `weight ≤ ${c.value} lbs`;
        case "pet-size-in":
          return `size: ${c.values.join(", ")}`;
        case "coat-type-in":
          return `coat: ${c.values.join(", ")}`;
        case "breed-includes":
          return `breed includes "${c.value}"`;
      }
    })
    .join(" and ");
}

/**
 * Returns every alert note that should be shown on an appointment — its own
 * alerts plus any `appliesToFuture` alerts from past appointments for the
 * same pet, deduplicated by text. Pet-level alerts are tagged with the
 * appointment they originated on so the UI can show "carried from…" context.
 */
export function getEffectiveAlertNotes(
  appointment: GroomingAppointment,
  allAppointments: GroomingAppointment[],
): Array<AlertNote & { carriedFromAppointmentId?: string }> {
  const own = (appointment.alertNotes ?? []).map((n) => ({ ...n }));
  const seenText = new Set(own.map((n) => n.text.trim().toLowerCase()));

  const carriedFromOtherBookings = allAppointments
    .filter((a) => a.id !== appointment.id && a.petId === appointment.petId)
    .flatMap((a) =>
      (a.alertNotes ?? [])
        .filter((n) => n.appliesToFuture)
        .map((n) => ({ ...n, carriedFromAppointmentId: a.id })),
    )
    .filter((n) => {
      const key = n.text.trim().toLowerCase();
      if (seenText.has(key)) return false;
      seenText.add(key);
      return true;
    });

  return [...own, ...carriedFromOtherBookings];
}

// ============================================================================
// Service Eligibility (Step 2 — auto-filter the package dropdown by pet)
// ============================================================================

/**
 * Returns true when the package's eligibility filters all admit the pet. An
 * undefined / empty filter on any dimension means "no restriction on that
 * dimension". Breed comparison is case-insensitive and trimmed.
 *
 * When `pet` is partially populated (e.g., size known but coat blank), the
 * package is treated as eligible on the missing dimensions — staff usually
 * picks the service before filling in every pet detail.
 */
export function isPackageEligibleForPet(
  pkg: GroomingPackage,
  pet: { petSize?: PetSize; coatType?: CoatType; breed?: string },
): boolean {
  if (
    pkg.eligiblePetSizes &&
    pkg.eligiblePetSizes.length > 0 &&
    pet.petSize &&
    !pkg.eligiblePetSizes.includes(pet.petSize)
  ) {
    return false;
  }
  if (
    pkg.eligibleCoatTypes &&
    pkg.eligibleCoatTypes.length > 0 &&
    pet.coatType &&
    !pkg.eligibleCoatTypes.includes(pet.coatType)
  ) {
    return false;
  }
  if (
    pkg.eligibleBreeds &&
    pkg.eligibleBreeds.length > 0 &&
    pet.breed &&
    !pkg.eligibleBreeds.some(
      (b) => b.trim().toLowerCase() === pet.breed!.trim().toLowerCase(),
    )
  ) {
    return false;
  }
  return true;
}

// ============================================================================
// Pet History — last-booked service and last groomer
// ============================================================================

/**
 * The most recent grooming appointment for the pet, considering only
 * appointments that actually happened (completed) or are otherwise treated
 * as historical. Sorted descending by date+time so the freshest wins.
 */
function getMostRecentCompletedAppointment(
  petId: number,
  appointments: GroomingAppointment[],
): GroomingAppointment | undefined {
  const finishedStatuses = new Set(["completed", "checked-out"]);
  return appointments
    .filter(
      (a) => a.petId === petId && finishedStatuses.has(a.status as string),
    )
    .sort((a, b) => {
      const aKey = `${a.date} ${a.startTime}`;
      const bKey = `${b.date} ${b.startTime}`;
      return bKey.localeCompare(aKey);
    })[0];
}

/** Package id of the pet's last completed grooming, or undefined. */
export function getLastGroomingPackageForPet(
  petId: number,
  appointments: GroomingAppointment[],
): string | undefined {
  return getMostRecentCompletedAppointment(petId, appointments)?.packageId;
}

/** Stylist id who handled the pet's last completed grooming, or undefined. */
export function getLastGroomerForPet(
  petId: number,
  appointments: GroomingAppointment[],
): string | undefined {
  return getMostRecentCompletedAppointment(petId, appointments)?.stylistId;
}

// ============================================================================
// Apply service edits to upcoming unconfirmed appointments
// ============================================================================

/**
 * "Unconfirmed" in the spec corresponds to the `"scheduled"` status — the
 * booking exists but the client hasn't checked in. Once a client has
 * checked in / the service is in progress / the appointment is complete or
 * cancelled, the price the facility quoted is locked in and bulk service
 * edits must not touch it.
 */
function isUnconfirmedUpcoming(
  apt: GroomingAppointment,
  todayDate: string,
): boolean {
  return apt.status === "scheduled" && apt.date >= todayDate;
}

/**
 * Returns the appointments that would be touched by propagating a service
 * edit. Used for the "apply to N upcoming unconfirmed appointments?" prompt
 * count, and reused by {@link propagatePackageChangesToUpcoming} below.
 */
export function findAffectedUpcomingAppointments(
  packageId: string,
  appointments: GroomingAppointment[],
  todayDate: string = new Date().toISOString().split("T")[0],
): GroomingAppointment[] {
  return appointments.filter(
    (a) => a.packageId === packageId && isUnconfirmedUpcoming(a, todayDate),
  );
}

/**
 * Add minutes to an HH:MM time string. Clamps to end-of-day so a long
 * service doesn't roll into the next calendar day.
 */
function addMinutesToHHMM(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutesToAdd, 23 * 60 + 59);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/**
 * Returns a new appointments array with every unconfirmed upcoming
 * appointment for the given package re-priced and re-timed using the
 * updated package. Other appointments pass through unchanged.
 *
 * Re-pricing honors the same priority order as new bookings — pet-custom
 * and stylist-specific overrides take precedence, then size pricing + age
 * group. `priceAdjustments` (matting fees, upgrade fees) survive the
 * re-price and are added back on top of the new base.
 */
export function propagatePackageChangesToUpcoming(args: {
  packageId: string;
  updatedPackage: GroomingPackage;
  appointments: GroomingAppointment[];
  petPricingOverrides: PetServicePricingOverride[];
  todayDate?: string;
}): {
  next: GroomingAppointment[];
  affected: GroomingAppointment[];
} {
  const {
    packageId,
    updatedPackage,
    appointments,
    petPricingOverrides,
    todayDate = new Date().toISOString().split("T")[0],
  } = args;

  const affected: GroomingAppointment[] = [];

  const next = appointments.map((a) => {
    if (a.packageId !== packageId || !isUnconfirmedUpcoming(a, todayDate)) {
      return a;
    }
    const pricing = resolveEffectivePricing({
      petId: a.petId,
      petSize: a.petSize,
      stylistId: a.stylistId,
      package: updatedPackage,
      petPricingOverrides,
    });
    const adjustmentsSum = a.priceAdjustments.reduce(
      (s, adj) => s + adj.amount,
      0,
    );
    const updated: GroomingAppointment = {
      ...a,
      packageName: updatedPackage.name,
      basePrice: pricing.price,
      totalPrice: pricing.price + adjustmentsSum,
      endTime: addMinutesToHHMM(a.startTime, pricing.durationMin),
    };
    affected.push(updated);
    return updated;
  });

  return { next, affected };
}

// ============================================================================
// Stylist Skill Level (Step 2 — gate the groomer dropdown)
// ============================================================================

/**
 * Skill-level ranks used for "minimum required" comparisons. A package that
 * `requiredSkillLevel === "senior"` is bookable by stylists at senior or
 * master — never by junior or intermediate.
 */
export const STYLIST_SKILL_RANK: Record<StylistSkillLevel, number> = {
  junior: 0,
  intermediate: 1,
  senior: 2,
  master: 3,
};

export function stylistMeetsSkillRequirement(
  stylist: Pick<Stylist, "capacity">,
  pkg: Pick<GroomingPackage, "requiredSkillLevel">,
): boolean {
  if (!pkg.requiredSkillLevel) return true;
  return (
    STYLIST_SKILL_RANK[stylist.capacity.skillLevel] >=
    STYLIST_SKILL_RANK[pkg.requiredSkillLevel]
  );
}
