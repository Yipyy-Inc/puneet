import type {
  GroomingPrepaidPackage,
  GroomingPrepaidPackageStatus,
} from "@/data/grooming-prepaid-packages";

// ============================================================================
// prepaid_packages (+ lines, + the pricing view) → GroomingPrepaidPackage.
//
// ── THE FOUR DERIVED FIGURES COME FROM THE VIEW, NOT FROM HERE ────────────
//
// `regularPrice`, `savings`, `savingsPercentage` and `purchaseCount` are all
// consequences of the lines plus `package_price` (20260806320000, Decision 1).
// They are computed once, in `prepaid_package_pricing`, and read here.
//
// Recomputing them in TypeScript would be a second implementation of the same
// arithmetic — and the fixture this replaces is the cautionary tale: `gpp-001`
// carries savings of 50 AND 15.4%, both stored independently of the prices they
// come from, with nothing keeping them honest.
//
// `services[]` maps 1:1 onto the line rows. `pricePerSession` is the SNAPSHOT
// taken when the bundle was built, so the à-la-carte comparison does not move
// when the facility reprices a service.
// ============================================================================

export interface PackageLineRow {
  service_id: string;
  service_name: string;
  quantity: number;
  price_per_session: number;
  /** Which counter can spend this pool (20260806420000). Read by the grooming
   *  route to keep the portal's daycare and boarding packages off a screen
   *  that can only price grooming. */
  module: string;
}

export interface PrepaidPackageRow {
  id: string;
  legacy_id: string | null;
  name: string;
  description: string;
  package_price: number;
  validity_days: number;
  status: string;
  is_popular: boolean;
  allow_refund_unused: boolean;
  refund_per_unused_pass: number | null;
  allow_store_credit_on_cancel: boolean;
  allow_transfer: boolean;
  allow_extension: boolean;
  max_extension_days: number;
  extension_fee: number;
  policy_notes: string | null;
  created_at: string;
  prepaid_package_lines: PackageLineRow[] | null;
}

/** The derived half, keyed by package id. */
export interface PackagePricing {
  regular_price: number;
  savings: number;
  savings_percentage: number;
  purchase_count: number;
}

/** The app id is legacy_id when present, else the uuid — a package created
 *  through this API has no legacy id and would otherwise be unaddressable. */
export function packageAppId(row: {
  legacy_id: string | null;
  id: string;
}): string {
  return row.legacy_id ?? row.id;
}

export function rowToPrepaidPackage(
  row: PrepaidPackageRow,
  pricing: PackagePricing | undefined,
): GroomingPrepaidPackage {
  return {
    id: packageAppId(row),
    name: row.name,
    description: row.description,
    services: (row.prepaid_package_lines ?? []).map((l) => ({
      serviceId: l.service_id,
      serviceName: l.service_name,
      quantity: l.quantity,
      pricePerSession: Number(l.price_per_session),
    })),
    packagePrice: Number(row.package_price),
    // Derived — see the header. Zeroes only when the package has no lines yet,
    // which the editor refuses to save.
    regularPrice: Number(pricing?.regular_price ?? 0),
    savings: Number(pricing?.savings ?? 0),
    savingsPercentage: Number(pricing?.savings_percentage ?? 0),
    purchaseCount: Number(pricing?.purchase_count ?? 0),
    validityDays: row.validity_days,
    status: row.status as GroomingPrepaidPackageStatus,
    isPopular: row.is_popular,
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
export const PREPAID_PACKAGE_SELECT = `
  id, legacy_id, name, description, package_price, validity_days,
  status, is_popular,
  allow_refund_unused, refund_per_unused_pass, allow_store_credit_on_cancel,
  allow_transfer, allow_extension, max_extension_days, extension_fee,
  policy_notes, created_at,
  prepaid_package_lines (
    service_id, service_name, quantity, price_per_session, module
  )
` as const;
