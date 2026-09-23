import type { ServiceCharge } from "@/lib/settings/grooming-service-charges";
import type { CustomFee } from "@/types/boarding";

// ============================================================================
// Moving the grooming Rates tab's service charges into the real ones.
//
// ── WHY THERE ARE TWO OF THESE AT ALL ─────────────────────────────────────
//
// `grooming_service_charges` and `pricing_rules.customFees` were authored
// separately and neither knew about the other. The grooming one has a nicer
// editor and reaches NO BILL — it has never charged anybody anything. The
// other one is now a line item with a name on the invoice.
//
// So this is a one-way move, and one way is the whole point: the source rows
// are left exactly where they are. Nothing reads them, so leaving them costs
// nothing and cannot double-charge; deleting them would be an irreversible
// write on somebody else's money in exchange for tidiness. The domain goes
// when every facility's list is empty or moved, not before.
//
// ── TWO OF THE FOUR TYPES DO NOT TRANSLATE, AND ARE REFUSED BY NAME ───────
//
// A custom fee is flat or a percentage. It has no concept of a unit, so
// `per-15min` and `per-km` have no honest destination here: flattening a
// $12/15min matting fee into "$12" invents a number the facility never typed
// and undercharges every long de-matting it is ever used on.
//
// Both already have a better home, which is the part worth saying out loud
// rather than just refusing:
//
//   per-15min → a grooming condition adjustment with
//               `billingMode: "per_unit"` (src/types/boarding.ts), which
//               bills by the quarter-hour because that is what it is for.
//   per-km    → the mobile-grooming travel zones
//               (src/lib/settings/mobile-grooming.ts), which price by
//               distance and already know the facility's radius.
//
// The live facility's Matting fee is `per-15min`, so this is the path the
// first real run takes — it is not a hypothetical branch.
// ============================================================================

/**
 * The id a grooming charge takes once it is a custom fee.
 *
 * Derived from the source id rather than freshly generated, so a second run
 * recognises its own work instead of adding everything twice. It is also what
 * `booking_line_items.fee_id` will carry, where `unique (booking_id, fee_id)`
 * makes "once per appointment" a database fact — so it has to be stable for
 * the life of the fee, not just for the life of the import.
 */
export function importedFeeId(chargeId: string): string {
  return `gsc-${chargeId}`;
}

/** A charge type that has no custom-fee equivalent, and its better home. */
export type RefusalReason = "per-15min" | "per-km";

/** Why a translatable charge was left alone anyway. */
export type SkipReason =
  /** A previous run already moved it. */
  | "already-imported"
  /** A different fee already carries this name. */
  | "name-taken";

export interface RefusedCharge {
  charge: ServiceCharge;
  reason: RefusalReason;
}

export interface SkippedCharge {
  charge: ServiceCharge;
  reason: SkipReason;
}

export interface GroomingChargeImport {
  /** Ready to append to `pricing_rules.customFees`, ids already assigned. */
  fees: CustomFee[];
  /** Left behind because the type does not translate. */
  refused: RefusedCharge[];
  /** Left behind although the type does translate. */
  skipped: SkippedCharge[];
}

function normalisedName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Turn one grooming charge into a custom fee, or say why it cannot be.
 *
 * `scope` is `per_booking` because a grooming appointment is one appointment
 * for one pet, and `autoApply` is `none` because the section these came from
 * describes them as "charges staff can manually add" — which is exactly the
 * picker on the booking page. Neither is a default chosen for convenience;
 * both are the translation of something the facility already said.
 */
function translate(charge: ServiceCharge): CustomFee | RefusalReason {
  if (charge.type === "per-15min" || charge.type === "per-km") {
    return charge.type;
  }
  return {
    id: importedFeeId(charge.id),
    name: charge.name,
    description: charge.description || undefined,
    amount: charge.amount,
    feeType: charge.type === "percent" ? "percentage" : "flat",
    scope: "per_booking",
    autoApply: "none",
    applicableServices: ["grooming"],
    // Carried, not reset. A charge the facility switched off is a charge the
    // facility switched off; arriving switched on would be this importer
    // deciding to charge somebody.
    isActive: charge.isActive,
  };
}

/**
 * What moving this facility's grooming charges would do, without doing it.
 *
 * Pure and idempotent: run it twice and the second answer is every charge in
 * `skipped` or `refused` and nothing in `fees`. The dialog shows all three
 * lists before anything is written, because a fee arriving silently is how a
 * customer gets charged for something nobody chose.
 */
export function planGroomingChargeImport(
  charges: ServiceCharge[] | undefined,
  existingFees: CustomFee[] | undefined,
): GroomingChargeImport {
  const existing = existingFees ?? [];
  const existingIds = new Set(existing.map((f) => f.id));
  // Names already spoken for, INCLUDING by fees this run is about to add —
  // two grooming charges called "No-show" must not both arrive.
  const takenNames = new Set(existing.map((f) => normalisedName(f.name)));

  const result: GroomingChargeImport = { fees: [], refused: [], skipped: [] };

  for (const charge of charges ?? []) {
    const translated = translate(charge);
    if (typeof translated === "string") {
      result.refused.push({ charge, reason: translated });
      continue;
    }
    if (existingIds.has(translated.id)) {
      result.skipped.push({ charge, reason: "already-imported" });
      continue;
    }
    // A name collision is not a duplicate to merge. The picker lists fees by
    // name, so two "No-show fee" rows at $30 and $25 are indistinguishable at
    // the moment somebody is charging a card. Leave it; the facility renames
    // one and runs again.
    if (takenNames.has(normalisedName(charge.name))) {
      result.skipped.push({ charge, reason: "name-taken" });
      continue;
    }
    takenNames.add(normalisedName(charge.name));
    result.fees.push(translated);
  }

  return result;
}

/** Whether this charge has already been moved, for the read-only list. */
export function isImported(
  charge: ServiceCharge,
  existingFees: CustomFee[] | undefined,
): boolean {
  const id = importedFeeId(charge.id);
  return (existingFees ?? []).some((f) => f.id === id);
}
