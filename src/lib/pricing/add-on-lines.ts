import type { ExtraService } from "@/types/booking";
import type { ServiceAddOn } from "@/types/facility";

// ============================================================================
// Add-on lines — merged, totalled and checked the SAME way on both sides.
//
// The booking form prices a stay's add-ons in `applyDynamicPricingRules`, and
// since 2026-09-25 the server re-prices a customer's boarding request's
// add-ons too, before it will auto-confirm one. Two copies of "merge the
// lines, then price × quantity" would drift, and a drift here is invisible:
// the quote and the server's number disagree by a cent and the booking just
// stays a request. So both sides import these.
// ============================================================================

/**
 * One line per add-on per pet, whole quantities, nothing at or below zero —
 * the form sends several rows for one add-on when a pet takes it twice.
 */
export function normalizeExtraServices(
  services: readonly ExtraService[],
): ExtraService[] {
  const map = new Map<string, ExtraService>();

  for (const service of services) {
    if (!service || !service.serviceId) continue;
    if (!Number.isFinite(service.quantity) || !Number.isFinite(service.petId)) {
      continue;
    }
    const quantity = Math.max(0, Math.round(service.quantity));
    if (quantity <= 0) continue;

    const key = `${service.serviceId}::${service.petId}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }

    map.set(key, {
      serviceId: service.serviceId,
      petId: service.petId,
      quantity,
    });
  }

  return Array.from(map.values());
}

/**
 * Catalogue price × quantity. An add-on the catalogue does not hold counts
 * nothing, and a negative price is not a refund.
 */
export function computeAddOnsTotal(
  extraServices: readonly ExtraService[],
  addOnsById: ReadonlyMap<string, ServiceAddOn>,
): number {
  return extraServices.reduce((sum, service) => {
    const addOn = addOnsById.get(service.serviceId);
    if (!addOn) return sum;
    return sum + Math.max(0, addOn.price) * service.quantity;
  }, 0);
}

/**
 * The lines a stored booking carries, read as untrusted input: whatever is
 * not a `{ serviceId, quantity, petId }` is dropped rather than guessed at.
 */
export function addOnLinesFrom(value: unknown): ExtraService[] {
  if (!Array.isArray(value)) return [];
  return normalizeExtraServices(
    value.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const { serviceId, quantity, petId } = entry as Record<string, unknown>;
      return typeof serviceId === "string" &&
        typeof quantity === "number" &&
        typeof petId === "number"
        ? [{ serviceId, quantity, petId }]
        : [];
    }),
  );
}

/**
 * The first add-on the booking had to carry and does not carry in full — a
 * service's default that was taken off — or null when all are there.
 *
 * Compared as a TOTAL per add-on, not per pet. A per-booking add-on sits on
 * "the first pet", and the form and the server need not list a household's
 * pets in the same order; the money is the price × the total either way.
 */
export function missingRequiredLine(
  lines: readonly ExtraService[],
  required: readonly ExtraService[],
): string | null {
  const totals = (list: readonly ExtraService[]) => {
    const sums = new Map<string, number>();
    for (const line of normalizeExtraServices(list)) {
      sums.set(line.serviceId, (sums.get(line.serviceId) ?? 0) + line.quantity);
    }
    return sums;
  };
  const held = totals(lines);
  for (const [serviceId, quantity] of totals(required)) {
    if ((held.get(serviceId) ?? 0) < quantity) return serviceId;
  }
  return null;
}
