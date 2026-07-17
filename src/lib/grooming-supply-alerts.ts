/**
 * Grooming Supply Alerts (spec Table 31)
 *
 * Soft reminders — never a hard block — that surface when today's booked
 * add-ons will draw down a consumable that's low on stock. Joins each add-on
 * to the product it consumes, then compares today's projected usage against
 * the product's low-stock threshold.
 *
 * The add-on → product map is mock (add-ons carry no product wiring of their
 * own), and so are the per-use quantities. Stock + thresholds come from the
 * real inventory data in `@/data/grooming` (the Grooming → Inventory tab).
 */

import { groomingProducts } from "@/data/grooming";
import type { GroomingProduct } from "@/types/grooming";

interface AddOnSupply {
  /** Product id in `groomingProducts` this add-on draws down. */
  productId: string;
  /** Mock quantity (in the product's measurement unit) one appointment uses. */
  perUse: number;
  /** Short label for the reminder copy ("check {label} supply"). */
  supplyLabel: string;
}

/** Add-on canonical name (as stored on `appointment.addOns`) → the consumable
 *  it draws down. Names must match `groomingAddOnsList`. */
export const ADD_ON_SUPPLY_MAP: Record<string, AddOnSupply> = {
  "Teeth Brushing": {
    productId: "prod-026",
    perUse: 3,
    supplyLabel: "toothpaste",
  },
  "De-Shedding Treatment": {
    productId: "prod-027",
    perUse: 60,
    supplyLabel: "de-shedding shampoo",
  },
  "Flea & Tick Treatment": {
    productId: "prod-003",
    perUse: 45,
    supplyLabel: "flea & tick shampoo",
  },
  "Nail Grinding": {
    productId: "prod-013",
    perUse: 1,
    supplyLabel: "styptic powder",
  },
  "Blueberry Facial": {
    productId: "prod-008",
    perUse: 15,
    supplyLabel: "blueberry facial scrub",
  },
  "Anal Gland Expression": {
    productId: "prod-028",
    perUse: 2,
    supplyLabel: "gland wipes",
  },
};

export interface SupplyAlert {
  addOnName: string;
  count: number;
  productName: string;
  supplyLabel: string;
  /** True when the product is already at/below its reorder threshold. */
  alreadyLow: boolean;
  message: string;
}

/**
 * Given a count of each add-on booked today, return the soft supply reminders.
 * An add-on fires an alert when its product is already low, or when today's
 * projected usage would pull it to/below the low-stock threshold.
 */
export function computeSupplyAlerts(
  addOnCounts: Record<string, number>,
  products: GroomingProduct[] = groomingProducts,
): SupplyAlert[] {
  const alerts: SupplyAlert[] = [];
  for (const [addOnName, count] of Object.entries(addOnCounts)) {
    if (count <= 0) continue;
    const supply = ADD_ON_SUPPLY_MAP[addOnName];
    if (!supply) continue;
    const product = products.find((p) => p.id === supply.productId);
    if (!product || !product.isActive) continue;

    const projectedUsage = count * supply.perUse;
    const projectedRemaining = product.currentStock - projectedUsage;
    const alreadyLow = product.currentStock <= product.minStock;

    if (alreadyLow || projectedRemaining <= product.minStock) {
      alerts.push({
        addOnName,
        count,
        productName: product.name,
        supplyLabel: supply.supplyLabel,
        alreadyLow,
        message: `${count} ${addOnName} appointment${
          count > 1 ? "s" : ""
        } today — check ${supply.supplyLabel} supply.`,
      });
    }
  }
  // Most-booked first so the biggest draw-down leads.
  return alerts.sort((a, b) => b.count - a.count);
}
