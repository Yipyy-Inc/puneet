/**
 * Per-line unit math for invoice import (spec Table 3). A line is bought in some
 * packaging unit (Each / Box / Case / Bag / Pack / Bundle) containing N sellable
 * items; these derive the per-sellable cost and the total sellable count that
 * feed inventory. "Each" always means one sellable item per unit.
 */

import { round2 } from "@/lib/retail-pricing";
import type { PackageUnitType } from "@/types/retail";

export type UnitType = "Each" | "Box" | "Case" | "Bag" | "Pack" | "Bundle";

/** Product "Packaged as" unit (lowercase) → invoice UnitType (title-case). */
export function unitTypeFromPackageUnit(pu: PackageUnitType): UnitType {
  return (pu.charAt(0).toUpperCase() + pu.slice(1)) as UnitType;
}

/** Invoice UnitType (title-case) → product "Packaged as" unit (lowercase). */
export function packageUnitFromUnitType(ut: UnitType): PackageUnitType {
  return ut.toLowerCase() as PackageUnitType;
}

export const UNIT_TYPES: UnitType[] = [
  "Each",
  "Box",
  "Case",
  "Bag",
  "Pack",
  "Bundle",
];

/** Sellable items contained in one purchased unit ("Each" ⇒ 1). */
function itemsPer(unitType: UnitType, itemsPerUnit: number): number {
  return unitType === "Each" ? 1 : itemsPerUnit;
}

/** Cost of a single sellable item = unit cost ÷ items per unit (2dp). */
export function costPerSellableUnit(
  unitCost: number,
  itemsPerUnit: number,
  unitType: UnitType,
): number {
  const per = itemsPer(unitType, itemsPerUnit);
  if (!per || per <= 0) return 0;
  return round2(unitCost / per);
}

/** Total sellable items received = invoice qty × items per unit. */
export function totalSellableUnits(
  qty: number,
  itemsPerUnit: number,
  unitType: UnitType,
): number {
  const per = itemsPer(unitType, itemsPerUnit);
  return per > 0 ? qty * per : 0;
}
