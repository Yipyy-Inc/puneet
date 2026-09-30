import { addOnLinesFrom } from "@/lib/pricing/add-on-lines";
import type {
  CustomFeeFacts,
  FeeCustomerFacts,
} from "@/lib/pricing/service-charge-lines";

// ============================================================================
// A REQUEST'S FEE FACTS, FROM ITS ROWS.
//
// The booking form tells its pricing engine what it knows about a request:
// how many pets, which are new, whether the client is, the client's segment,
// the add-ons chosen, the service's price. The server decides the same fees
// for the bill (lib/payments/booking-service-charges.ts) and has to be told
// the same things, from the database. This is where the rows become those
// facts — pure, so the translation is unit-tested rather than trusted.
// ============================================================================

/** A booking of the request, as far as its fees are concerned. */
export interface RequestPart {
  service: string;
  base_price: number | string | null;
  total_cost: number | string | null;
  add_ons_total: number | string | null;
  location_id: string | null;
}

/** What the server reads to decide a request's fees. */
export interface RequestFeeRows {
  /** Every booking of the request, first (lowest ref) first. */
  parts: readonly RequestPart[];
  /** The request's pets, each once. */
  petIds: readonly string[];
  /** Of those, the ones an earlier booking of this client carried. */
  earlierPetIds: ReadonlySet<string>;
  /** Whether this client had any booking before the request. */
  hadEarlierBooking: boolean;
  client: { status: string | null; details: unknown } | null;
  /** The request's add-on lines, as its bookings carry them. Untrusted shape. */
  extraServices: unknown;
  addOnPrice: (serviceId: string) => number | undefined;
}

function money(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * A client's segment, from the record the booking form reads it from:
 * `status`, and the membership, store credit and packages in `details`.
 */
export function customerFacts(client: {
  status: string | null;
  details: unknown;
}): FeeCustomerFacts {
  const details =
    client.details && typeof client.details === "object"
      ? (client.details as Record<string, unknown>)
      : {};
  const membership =
    details.membership && typeof details.membership === "object"
      ? (details.membership as { plan?: unknown; status?: unknown })
      : undefined;
  const storeCredit =
    details.storeCredit && typeof details.storeCredit === "object"
      ? (details.storeCredit as { balance?: unknown })
      : undefined;
  const packages = Array.isArray(details.packages) ? details.packages : [];
  return {
    status: client.status ?? undefined,
    membershipPlan:
      typeof membership?.plan === "string" ? membership.plan : undefined,
    membershipStatus:
      typeof membership?.status === "string" ? membership.status : undefined,
    storeCreditBalance:
      typeof storeCredit?.balance === "number"
        ? storeCredit.balance
        : undefined,
    hasPackageCredits: packages.some(
      (pkg) =>
        pkg !== null &&
        typeof pkg === "object" &&
        Number((pkg as { remainingCredits?: unknown }).remainingCredits) > 0,
    ),
  };
}

/** What the form's engine is told about a request, rebuilt from its rows. */
export function requestFeeFacts(rows: RequestFeeRows): CustomFeeFacts {
  const first = rows.parts[0];
  return {
    serviceId: first.service,
    locationId: first.location_id,
    petCount: rows.petIds.length,
    // The service before the pricing rules, and its add-ons, over the whole
    // request — the engine's `basePrice + addOnsTotal`. A booking with no
    // base price (made before the column was filled) counts its price.
    serviceTotal: rows.parts.reduce((sum, part) => {
      const base = money(part.base_price);
      return (
        sum +
        (base > 0 ? base : money(part.total_cost)) +
        money(part.add_ons_total)
      );
    }, 0),
    isNewCustomer: !rows.hadEarlierBooking,
    newPetCount: rows.petIds.filter((id) => !rows.earlierPetIds.has(id)).length,
    customer: rows.client ? customerFacts(rows.client) : undefined,
    extraServices: addOnLinesFrom(rows.extraServices),
    addOnPrice: rows.addOnPrice,
  };
}
