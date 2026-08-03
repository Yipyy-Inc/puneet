import type { CustomerPackageRecord } from "@/data/customer-packages";
import type {
  CustomerPackagePurchase,
  PassUsage,
  ServiceCategory,
} from "@/data/services-pricing";

// ============================================================================
// CustomerPackageRecord → CustomerPackagePurchase, for the customer portal.
//
// The portal's owned-pack card wants a per-pass array with a status on each
// pass. The database stores no such thing — it stores a signed ledger — so
// this SYNTHESISES the array from the ledger and the pool totals. Every field
// below is a consequence of rows that exist; none is remembered.
//
// ── ONE CARD PER PURCHASE, NOT PER POOL ───────────────────────────────────
//
// `CustomerPackagePurchase` has a single `category` and `serviceLabel`, so it
// cannot fully describe the Weekend Getaway (2 nights boarding + 1 bath). Two
// ways to handle that, and the choice matters:
//
//   Split into one card per pool — each card then carries `pricePaid` for the
//   whole purchase, so a customer sees the price twice and appears to have
//   been charged double.
//
//   One card per purchase — the price is right and the pass count is right;
//   `serviceLabel` names every service in the bundle, and each pass row says
//   which service it was spent on. What is lost is per-pool remaining counts
//   on the card face.
//
// The second is chosen: a card that misstates the price is worse than one that
// under-describes a bundle. Recorded in the debt map.
//
// ── WHAT THE MOCK DID, AND WHY IT WAS WRONG ───────────────────────────────
//
// `purchasePackage` collapsed a bundle to `pkg.services[0]` for the card's
// category and label while summing ALL quantities into `totalPasses`. A
// Weekend Getaway therefore displayed as "3 × Standard Boarding" — one of
// those three was a bath, and the customer had no way to know.
//
// ── STATUSES THAT EXIST, AND ONE THAT DOES NOT ────────────────────────────
//
//   used       one per `redeemed` ledger entry, carrying its booking and pet
//   expired    the unspent remainder once the package's derived status is
//              `expired` — the passes are still there, they just cannot be
//              spent, which is exactly what the card draws
//   available  the unspent remainder otherwise
//   refunded   NEVER produced. Nothing in the app records a refund, so a
//              refunded pass would be a status with no source. `PassStatus`
//              keeps it because a refund path is coming; this does not invent
//              one.
//
// `adjustments` is likewise always empty. The fixture carried decorative
// extension/refund history that no code path ever created, and inventing rows
// to match it would be dressing a feature that does not exist.
// ============================================================================

/** Modules the portal has a theme and a booking flow for. Anything else falls
 *  back to daycare, which is what `getServiceTheme` already does. */
const PORTAL_CATEGORIES = new Set<string>([
  "boarding",
  "daycare",
  "grooming",
  "training",
  "retail",
]);

function toCategory(moduleId: string): ServiceCategory {
  return (
    PORTAL_CATEGORIES.has(moduleId) ? moduleId : "daycare"
  ) as ServiceCategory;
}

export function recordToPurchase(
  record: CustomerPackageRecord,
): CustomerPackagePurchase {
  const pools = record.passes;
  const spendable = pools.find((p) => p.totalPasses - p.usedPasses > 0);
  // The pool a "Book with Pass" would draw on, so the card does not have to
  // guess and the redeem call can name it.
  const primary = spendable ?? pools[0];

  const used: PassUsage[] = record.redemptions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((redemption, index) => ({
      passNumber: index + 1,
      status: "used" as const,
      usedAt: redemption.date,
      ...(redemption.bookingId ? { bookingId: redemption.bookingId } : {}),
      notes: redemption.petName
        ? `${redemption.serviceLabel} — ${redemption.petName}`
        : redemption.serviceLabel,
    }));

  const remainingStatus = record.status === "expired" ? "expired" : "available";
  const remaining: PassUsage[] = Array.from(
    { length: Math.max(0, record.passesTotal - used.length) },
    (_, i) => ({
      passNumber: used.length + i + 1,
      status: remainingStatus as PassUsage["status"],
    }),
  );

  return {
    id: record.id,
    customerId: String(record.customerId),
    packageId: record.packageId,
    packageName: record.packageName,
    category: toCategory(primary?.moduleId ?? "daycare"),
    serviceId: primary?.packageId ?? "",
    // Names every service in the bundle, so a two-pool pack does not present
    // itself as three of whichever one happened to be first.
    serviceLabel: pools.map((p) => p.serviceName).join(" + "),
    totalPasses: record.passesTotal,
    purchaseDate: record.purchasedAt,
    expiresAt: record.expiresAt ?? "",
    // Not carried on the record and not rendered by the card. Left at 0 rather
    // than guessed; if the card starts showing it, read it from the row.
    pricePaid: 0,
    passes: [...used, ...remaining],
    adjustments: [],
  };
}
