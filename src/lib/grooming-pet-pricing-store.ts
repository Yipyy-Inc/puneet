// localStorage-backed store for pet-specific pricing overrides created from
// the booking dialog's "Save price for {pet}" checkbox. The static mock
// catalogue in @/data/grooming-pet-pricing seeds the table; entries created
// at runtime live here and survive a page refresh.
//
// Mock-only persistence — when a real backend exists, swap the
// load/save/clear helpers for API calls and the rest of the wizard keeps
// working.

import type { PetServicePricingOverride } from "@/types/grooming";

const STORAGE_KEY = "grooming.pet-pricing.overrides.v1";
export const GROOMING_PET_PRICING_EVENT = "grooming-pet-pricing-changed";

function readRaw(): PetServicePricingOverride[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PetServicePricingOverride[]) : [];
  } catch {
    return [];
  }
}

function writeRaw(list: PetServicePricingOverride[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(GROOMING_PET_PRICING_EVENT));
  } catch {
    // Quota exceeded or private-mode error — silently ignore; the override
    // will live only for the current session.
  }
}

/** Currently-saved overrides from localStorage. Safe on the server (returns []). */
export function loadCustomPetPricingOverrides(): PetServicePricingOverride[] {
  return readRaw();
}

/**
 * Upsert a pet/package override. If an entry for the same petId+packageId
 * already exists, it's replaced (so toggling the checkbox repeatedly doesn't
 * accumulate stale rows). Returns the resulting list.
 */
export function saveCustomPetPricingOverride(
  override: Omit<PetServicePricingOverride, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): PetServicePricingOverride[] {
  const list = readRaw();
  const next: PetServicePricingOverride = {
    id: override.id ?? `psp-local-${Date.now()}`,
    createdAt: override.createdAt ?? new Date().toISOString(),
    petId: override.petId,
    packageId: override.packageId,
    customPrice: override.customPrice,
    customDurationMin: override.customDurationMin,
    note: override.note,
    createdBy: override.createdBy,
  };
  const filtered = list.filter(
    (o) => !(o.petId === next.petId && o.packageId === next.packageId),
  );
  const updated = [...filtered, next];
  writeRaw(updated);
  return updated;
}

/** Remove the override for a pet/package combo, if any. */
export function clearCustomPetPricingOverride(
  petId: number,
  packageId: string,
): PetServicePricingOverride[] {
  const list = readRaw();
  const updated = list.filter(
    (o) => !(o.petId === petId && o.packageId === packageId),
  );
  if (updated.length !== list.length) writeRaw(updated);
  return updated;
}
