import type { ServicePackage, ServiceStatus } from "@/data/services-pricing";

// ============================================================================
// prepaid_packages (+ lines, + the pricing view) → ServicePackage.
//
// A SECOND projection of the same rows. `rowToPrepaidPackage` produces the
// facility screen's `GroomingPrepaidPackage`; this produces the portal shop's
// `ServicePackage`. Both are the catalogue; they disagree only on field names
// and on which derived figures they call what:
//
//   GroomingPrepaidPackage      ServicePackage
//   ─────────────────────────   ────────────────
//   regularPrice                totalValue
//   services[]                  services[] (ids and quantities only)
//   isPopular (boolean)         popularityRank (1 = "Most Popular")
//
// Two projections rather than one shared shape is deliberate: collapsing them
// would mean changing a 750-line portal screen and a 950-line facility screen
// to agree on names neither currently uses, to remove a mapping that is 30
// lines. The rows are shared; that was the point.
//
// `totalValue`, `savings` and `savingsPercentage` come from
// `prepaid_package_pricing` — the same view the facility screen reads, so the
// two screens cannot quote different savings for the same package.
// ============================================================================

export interface ServicePackageLineRow {
  service_id: string;
  quantity: number;
  module: string;
}

export interface ServicePackageRow {
  id: string;
  legacy_id: string | null;
  name: string;
  description: string;
  package_price: number;
  validity_days: number;
  status: string;
  popularity_rank: number | null;
  created_at: string;
  allow_refund_unused: boolean;
  refund_per_unused_pass: number | null;
  allow_store_credit_on_cancel: boolean;
  allow_transfer: boolean;
  allow_extension: boolean;
  max_extension_days: number;
  extension_fee: number;
  policy_notes: string | null;
  prepaid_package_lines: ServicePackageLineRow[] | null;
}

export interface ServicePackagePricing {
  regular_price: number;
  savings: number;
  savings_percentage: number;
  purchase_count: number;
}

export function rowToServicePackage(
  row: ServicePackageRow,
  pricing: ServicePackagePricing | undefined,
): ServicePackage {
  return {
    id: row.legacy_id ?? row.id,
    name: row.name,
    description: row.description,
    services: (row.prepaid_package_lines ?? []).map((l) => ({
      serviceId: l.service_id,
      quantity: l.quantity,
    })),
    packagePrice: Number(row.package_price),
    // Derived, all three. The shop draws a struck-through price and a savings
    // badge off these; the fixture stored them beside the inputs they come
    // from, with nothing keeping the two in step.
    totalValue: Number(pricing?.regular_price ?? 0),
    savings: Number(pricing?.savings ?? 0),
    savingsPercentage: Number(pricing?.savings_percentage ?? 0),
    purchaseCount: Number(pricing?.purchase_count ?? 0),
    validDays: row.validity_days,
    status: row.status as ServiceStatus,
    ...(row.popularity_rank != null
      ? { popularityRank: row.popularity_rank }
      : {}),
    createdAt: row.created_at,
    policy: {
      allowRefundUnused: row.allow_refund_unused,
      ...(row.refund_per_unused_pass != null
        ? { refundPerUnusedPass: Number(row.refund_per_unused_pass) }
        : {}),
      allowStoreCreditOnCancel: row.allow_store_credit_on_cancel,
      allowTransfer: row.allow_transfer,
      allowExtension: row.allow_extension,
      maxExtensionDays: row.max_extension_days,
      extensionFee: Number(row.extension_fee),
      ...(row.policy_notes ? { policyNotes: row.policy_notes } : {}),
    },
  };
}

/** The select the route issues. Beside the row type so the two cannot drift. */
export const SERVICE_PACKAGE_SELECT = `
  id, legacy_id, name, description, package_price, validity_days,
  status, popularity_rank, created_at,
  allow_refund_unused, refund_per_unused_pass, allow_store_credit_on_cancel,
  allow_transfer, allow_extension, max_extension_days, extension_fee,
  policy_notes,
  prepaid_package_lines ( service_id, quantity, module )
` as const;
