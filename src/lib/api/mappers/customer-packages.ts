import type { CustomerPackageRecord } from "@/data/customer-packages";

// ============================================================================
// customer_packages (+ pools, + the ledger, + two status views)
//   → CustomerPackageRecord
//
// ── NOTHING HERE COUNTS ANYTHING ───────────────────────────────────────────
//
// The record the app consumes carries the used-count in three places:
// `passesUsed`, `passes[].usedPasses`, and the length of `redemptions[]`. The
// fixture kept all three in step by hand inside `redeemPackagePass`, and any
// path that forgot one left a customer with passes they never bought.
//
// All three are filled here from the SAME derived source — `passes_total` plus
// the sum of the signed ledger, computed by `customer_package_status` and
// `customer_package_pool_status`. They cannot disagree, because there is only
// one number.
//
// ── passNumber IS AN ORDINAL, NOT AN IDENTITY ─────────────────────────────
//
// The UI renders "Pass 3 of 5". Nothing stores a 3: it is the position of that
// redemption among the package's redemptions, oldest first. A reversal is a
// separate ledger row and does not appear in `redemptions[]`, so a redeemed-
// then-reversed pass leaves the following redemptions renumbered. That is the
// honest rendering — the reversed visit no longer consumed a pass, so the one
// after it really is the Nth.
//
// ── moduleId IS "grooming" BECAUSE THE CATALOGUE IS ───────────────────────
//
// `passes[].moduleId` is what BookingModal and the check-in board filter on.
// It is not a column: `customer_packages` hangs off `prepaid_packages`, which
// is the grooming catalogue. When another module sells packages this becomes a
// real column rather than a constant — flagged rather than guessed at now.
// ============================================================================

export interface CustomerPackageLineRow {
  service_id: string;
  service_name: string;
  passes_total: number;
}

export interface PassEntryRow {
  id: string;
  service_id: string;
  passes: number;
  reason: string;
  booking_id: string | null;
  pet_id: string | null;
  pet_name: string | null;
  service_label: string;
  created_at: string;
}

export interface CustomerPackageRow {
  id: string;
  legacy_id: string | null;
  package_name: string;
  price_paid: number;
  purchased_at: string;
  expires_at: string | null;
  clients: { ref: number } | null;
  prepaid_packages: { id: string; legacy_id: string | null } | null;
  customer_package_lines: CustomerPackageLineRow[] | null;
  package_pass_entries: PassEntryRow[] | null;
}

/** One row of `customer_package_status`. */
export interface PackageStatusRow {
  id: string;
  passes_total: number;
  passes_remaining: number;
  passes_used: number;
  status: string;
}

/** One row of `customer_package_pool_status`. */
export interface PoolStatusRow {
  customer_package_id: string;
  service_id: string;
  passes_total: number;
  passes_remaining: number;
}

/** Numeric app ids for the uuids the ledger stores, resolved by the route. */
export interface RefMaps {
  pets: Map<string, number>;
  bookings: Map<string, number>;
}

const EMPTY_REFS: RefMaps = { pets: new Map(), bookings: new Map() };

export function rowToCustomerPackage(
  row: CustomerPackageRow,
  status: PackageStatusRow | undefined,
  pools: PoolStatusRow[],
  refs: RefMaps = EMPTY_REFS,
): CustomerPackageRecord {
  const remainingByService = new Map(
    pools.map((p) => [p.service_id, p.passes_remaining]),
  );

  const redemptions = (row.package_pass_entries ?? [])
    .filter((e) => e.reason === "redeemed")
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((entry, index) => ({
      id: entry.id,
      date: entry.created_at,
      passNumber: index + 1,
      serviceLabel: entry.service_label,
      ...(entry.pet_name ? { petName: entry.pet_name } : {}),
      ...(entry.pet_id && refs.pets.has(entry.pet_id)
        ? { petId: refs.pets.get(entry.pet_id)! }
        : {}),
      ...(entry.booking_id && refs.bookings.has(entry.booking_id)
        ? { bookingId: refs.bookings.get(entry.booking_id)! }
        : {}),
    }));

  return {
    id: row.legacy_id ?? row.id,
    customerId: row.clients?.ref ?? 0,
    packageId:
      row.prepaid_packages?.legacy_id ?? row.prepaid_packages?.id ?? "",
    packageName: row.package_name,
    purchasedAt: row.purchased_at,
    ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
    passesTotal: status?.passes_total ?? 0,
    passesUsed: status?.passes_used ?? 0,
    status: (status?.status ?? "active") as CustomerPackageRecord["status"],
    passes: (row.customer_package_lines ?? []).map((line) => ({
      moduleId: "grooming",
      packageId: line.service_id,
      serviceName: line.service_name,
      totalPasses: line.passes_total,
      usedPasses:
        line.passes_total - (remainingByService.get(line.service_id) ?? 0),
    })),
    redemptions,
  };
}

/** The select the route issues. Beside the row type so the two cannot drift. */
export const CUSTOMER_PACKAGE_SELECT = `
  id, legacy_id, package_name, price_paid, purchased_at, expires_at,
  clients!inner ( ref ),
  prepaid_packages ( id, legacy_id ),
  customer_package_lines ( service_id, service_name, passes_total ),
  package_pass_entries (
    id, service_id, passes, reason, booking_id, pet_id, pet_name,
    service_label, created_at
  )
` as const;
