import { bookings } from "@/data/bookings";
import { masterServices } from "@/data/service-catalog";
import { defaultServiceAddOns } from "@/data/service-addons";
import { groomingPrepaidPackages } from "@/data/grooming-prepaid-packages";
import { membershipPlans } from "@/data/services-pricing";
import { products } from "@/data/retail";
import { promoCodes } from "@/data/retail";
import { peakSurcharges } from "@/data/boarding";

// ============================================================================
// Table 2 — everything Yipyy can sell, grouped the way the mapping screen
// presents it (Phase 3.4).
//
// Sourced from the real catalogs rather than a list written for this screen, so
// a service the facility adds shows up here without anyone remembering to
// mirror it. Tips and taxes are the exceptions: they aren't catalog rows
// anywhere, they're behaviours of a sale, so each is a single declared line.
// ============================================================================

export type MappableGroupKey =
  | "locations"
  | "services"
  | "addons"
  | "packages"
  | "memberships"
  | "gift_cards"
  | "deposits"
  | "retail"
  | "discounts"
  | "fees"
  | "tips"
  | "taxes";

export interface MappableItem {
  /** Stable key the mapping is stored against. Prefixed by group so ids from
   *  different catalogs can never collide. */
  id: string;
  name: string;
  /** The kind of thing this is, shown under the name. */
  type: string;
  /** How many times it has actually been sold. Undefined where Yipyy has no
   *  data to count — see TRANSACTION_COUNT_NOTE. */
  transactionCount?: number;
  /** Posts to a liability rather than income (gift cards, deposits, tips), or
   *  reduces revenue (discounts). The account dropdown warns rather than
   *  silently offering income accounts. */
  postsToLiability?: boolean;
  isContraRevenue?: boolean;
  /** Configured somewhere other than this screen. Excluded from the mapping
   *  progress and from the unmapped/catch-all count — calling it "unmapped"
   *  would claim tax posts to a catch-all income account, which it does not. */
  mappedElsewhere?: string;
  /** Maps to a QuickBooks Class rather than an item + account (Phase 8). */
  mapsToClass?: boolean;
  /** No longer in the Yipyy catalog, but still mapped. Kept visible because
   *  historical transactions reference it — see `withRetainedMappings`. */
  deleted?: boolean;
  note?: string;
}

export interface MappableGroup {
  key: MappableGroupKey;
  title: string;
  description: string;
  items: MappableItem[];
}

/** Why some cards show a count and others don't. Rendered in the UI so an
 *  absent number reads as "not tracked yet" rather than "zero sales". */
export const TRANSACTION_COUNT_NOTE =
  "Counts come from your booking history. Items Yipyy doesn't yet record per-sale show no count.";

const CATEGORY_LABEL: Record<string, string> = {
  grooming: "Grooming",
  boarding: "Boarding",
  daycare: "Daycare",
  training: "Training",
  addon: "Add-on",
};

/** Bookings per service module, the one per-item count the data supports.
 *  Booking rows carry `service` (the module) and `serviceType`, not a catalog
 *  id, so counts land at module granularity. */
function bookingCountsByCategory(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const b of bookings) {
    const key = String(b.service);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function serviceItems(): MappableItem[] {
  const counts = bookingCountsByCategory();
  return masterServices
    .filter((s) => s.isActive && s.category !== "addon")
    .map((s) => ({
      id: `service:${s.id}`,
      name: s.name,
      type: CATEGORY_LABEL[s.category] ?? s.category,
      transactionCount: counts.get(s.category),
    }));
}

function addOnItems(): MappableItem[] {
  const catalogAddOns = masterServices
    .filter((s) => s.isActive && s.category === "addon")
    .map((s) => ({
      id: `service:${s.id}`,
      name: s.name,
      type: "Add-on",
    }));
  const facilityAddOns = defaultServiceAddOns.map((a) => ({
    id: `addon:${a.id}`,
    name: a.name,
    // Add-on categories are optional in the facility catalog.
    type: a.category ?? "Add-on",
  }));
  return [...catalogAddOns, ...facilityAddOns];
}

function packageItems(): MappableItem[] {
  return groomingPrepaidPackages.map((p) => ({
    id: `package:${p.id}`,
    name: p.name,
    type: "Prepaid package",
    note: "Revenue is recognised when the package is sold, not per redemption.",
  }));
}

function membershipItems(): MappableItem[] {
  return membershipPlans
    .filter((p) => p.isActive)
    .map((p) => ({
      id: `membership:${p.id}`,
      name: p.name,
      type: `${p.tierLabel} membership`,
      transactionCount: p.subscriberCount,
    }));
}

function retailItems(): MappableItem[] {
  return products
    .filter((p) => p.status === "active")
    .map((p) => ({
      id: `product:${p.id}`,
      name: p.name,
      type: p.category,
    }));
}

function discountItems(): MappableItem[] {
  return [
    {
      id: "discount:manual",
      name: "Manual discount",
      type: "Applied at checkout",
      isContraRevenue: true,
    },
    ...promoCodes.map((p) => ({
      id: `discount:${p.id}`,
      name: p.code,
      type: p.description,
      isContraRevenue: true,
    })),
  ];
}

function feeItems(): MappableItem[] {
  return peakSurcharges
    .filter((s) => s.isActive)
    .map((s) => ({
      id: `surcharge:${s.id}`,
      name: s.name,
      type: "Peak surcharge",
    }));
}

/** Assemble every group. Empty groups are kept: a facility with no memberships
 *  should see that the row exists and is simply unused, not wonder whether
 *  Yipyy forgot about them. */
export interface MappableGroupOptions {
  /** Yipyy locations to offer as a Class mapping group (Phase 8). Passing them
   *  is what turns the feature on for this screen — the group is absent when
   *  location tracking is off, because mapping branches you aren't tracking is
   *  work with no effect. */
  locations?: { id: string; name: string; city?: string; shortCode?: string }[];
}

export function buildMappableGroups(
  options: MappableGroupOptions = {},
): MappableGroup[] {
  const locationGroup: MappableGroup[] = options.locations?.length
    ? [
        {
          key: "locations" as const,
          title: "Locations",
          // First on the screen on purpose: it decides how everything below is
          // reported, and a facility that maps fifty services and then finds
          // out none of them are attributed has done the work in the wrong
          // order.
          description:
            "Each location posts under its own QuickBooks Class, so you can run a P&L per branch.",
          items: options.locations.map((l) => ({
            id: `location:${l.id}`,
            name: l.name,
            type:
              [l.shortCode, l.city].filter(Boolean).join(" · ") || "Location",
            mapsToClass: true,
          })),
        },
      ]
    : [];

  return [
    ...locationGroup,
    {
      key: "services",
      title: "Services",
      description: "Grooming, boarding, daycare, training and custom services.",
      items: serviceItems(),
    },
    {
      key: "addons",
      title: "Add-ons",
      description: "Extras sold alongside a booking.",
      items: addOnItems(),
    },
    {
      key: "packages",
      title: "Packages",
      description: "Prepaid bundles sold up front and redeemed later.",
      items: packageItems(),
    },
    {
      key: "memberships",
      title: "Memberships",
      description: "Recurring plans billed each period.",
      items: membershipItems(),
    },
    {
      key: "gift_cards",
      title: "Gift cards",
      description:
        "A sale is money owed, not earned. It becomes income when redeemed.",
      items: [
        {
          id: "giftcard:sale",
          name: "Gift card sale",
          type: "Liability",
          postsToLiability: true,
          note: "Posts to Gift Card Liability — not income.",
        },
        {
          id: "giftcard:redemption",
          name: "Gift card redemption",
          type: "Liability released",
          note: "Moves the balance from liability into the service's income account.",
        },
      ],
    },
    {
      key: "deposits",
      title: "Deposits",
      description: "Taken before a stay, earned at checkout.",
      items: [
        {
          id: "deposit:booking",
          name: "Booking deposit",
          type: "Liability",
          postsToLiability: true,
          note: "Posts to Deposits Held until the booking is completed.",
        },
      ],
    },
    {
      key: "retail",
      title: "Retail products",
      description: "Anything sold from the shop floor.",
      items: retailItems(),
    },
    {
      key: "discounts",
      title: "Discounts",
      description:
        "Kept as their own line so gross revenue stays visible rather than quietly shrinking.",
      items: discountItems(),
    },
    {
      key: "fees",
      title: "Fees & surcharges",
      description: "Peak pricing and handling charges added to a booking.",
      items: feeItems(),
    },
    {
      key: "tips",
      title: "Tips",
      description:
        "Collected on staff's behalf — owed to them, never the facility's income.",
      items: [
        {
          id: "tip:staff",
          name: "Staff tips",
          type: "Liability",
          postsToLiability: true,
          note: "Posts to Tips Payable until paid out.",
        },
      ],
    },
    {
      key: "taxes",
      title: "Taxes",
      description:
        "Yipyy sends the tax it calculated; QuickBooks records it against the matching tax code.",
      items: [
        {
          id: "tax:sales",
          name: "Sales tax collected",
          type: "Tax",
          mappedElsewhere: "Set in sync settings as a QuickBooks tax code",
        },
      ],
    },
  ];
}

// ── Deleted services (4E) ───────────────────────────────────────────────────

/** Where a retained mapping goes back on the screen, read from its id prefix.
 *  Add-ons carry the `service:` prefix too, so an ambiguous id lands in
 *  Services — visible in the wrong group beats invisible. */
const PREFIX_GROUP: Record<string, MappableGroupKey> = {
  location: "locations",
  service: "services",
  addon: "addons",
  package: "packages",
  membership: "memberships",
  giftcard: "gift_cards",
  deposit: "deposits",
  product: "retail",
  discount: "discounts",
  surcharge: "fees",
  tip: "tips",
  tax: "taxes",
};

export const DELETED_SERVICE_NOTE =
  "Deleted service — historical transactions still reference this mapping.";

/**
 * Put mapped-but-vanished items back into their group.
 *
 * RULE: deleting a service does NOT delete its mapping. Last year's Sales
 * Receipts still point at that income account, and a facility re-running a
 * report needs to see where that money went. Dropping the row would make the
 * mapping unreachable while leaving it in force — the worst of both.
 */
export function withRetainedMappings(
  groups: MappableGroup[],
  mappedIds: string[],
  /** id → the name it had when it was mapped, if recorded. */
  names: Record<string, string> = {},
): MappableGroup[] {
  const live = new Set(groups.flatMap((g) => g.items).map((i) => i.id));
  const orphans = mappedIds.filter((id) => !live.has(id));
  if (orphans.length === 0) return groups;

  const byGroup = new Map<MappableGroupKey, MappableItem[]>();
  for (const id of orphans) {
    const key = PREFIX_GROUP[id.split(":")[0]] ?? "services";
    const item: MappableItem = {
      id,
      // The recorded name if we have one; otherwise the id, which is at least
      // traceable. Never a guess dressed up as a service name.
      name: names[id] ?? id,
      type: "Deleted",
      deleted: true,
      note: DELETED_SERVICE_NOTE,
    };
    byGroup.set(key, [...(byGroup.get(key) ?? []), item]);
  }

  return groups.map((group) => {
    const extra = byGroup.get(group.key);
    return extra ? { ...group, items: [...group.items, ...extra] } : group;
  });
}

/** How Yipyy decides which QuickBooks customer a sale belongs to. Shown on the
 *  mapping screen because it is the one mapping the facility does NOT choose,
 *  and being surprised by it later is worse than reading it now. */
export const CUSTOMER_MAPPING_NOTE = {
  matchBy: "Client email address",
  nameFormat: "[Last], [First]",
  fallback: "Walk-in Customer",
  detail:
    "Yipyy matches each sale to a QuickBooks customer by the client's email. If no customer has that email, one is created as “Last, First”. Sales with no client on file go to “Walk-in Customer”.",
} as const;
