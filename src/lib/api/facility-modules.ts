import "server-only";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// What one facility has been sold, for the superadmin's Modules tab.
//
// The tab said "nothing stores this yet" until today, and it was true. Three
// mock files each held a different module list (8, 12 and 17 entries, on two
// incompatible id schemes) and a client-side store held the toggles, so an
// edit survived until the next navigation.
//
// The database now holds one catalogue (20260807540000) and, per facility,
// only the DEPARTURES from what its plan includes (20260807560000). The RPC
// puts the two together; this file is the shape the screen wants.
//
// ── USAGE IS MEASURED WHERE THERE IS SOMETHING TO MEASURE ─────────────────
//
// The old tab showed "Usage / Actions / Last used" for every module out of a
// mock map. Four of the seventeen have a table behind them and can be counted
// honestly. The other thirteen get `null`, and the screen says nothing is
// recorded rather than printing a zero — a zero is a measurement, and we have
// not taken one.
// ============================================================================

/** How a module's on/off state was arrived at. Mirrors the RPC's `source`. */
export type EntitlementSource =
  | "plan"
  | "add-on"
  | "withdrawn"
  | "not included";

export interface FacilityModuleEntitlement {
  moduleId: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
  source: EntitlementSource;
  /** What it adds to the monthly bill, in cents. Zero when the plan covers it. */
  priceCents: number;
  /** The catalogue price, before the plan and any negotiated rate. */
  listPriceCents: number;
  /**
   * The price agreed for this facility, or null if none was. Zero is an
   * agreed price of nothing, which is not the same as no agreement.
   */
  priceOverrideCents: number | null;
  includedInPlan: boolean;
  /** The plan is high enough to be sold this at all. */
  availableOnPlan: boolean;
  isStandalone: boolean;
  expiresAt: string | null;
  note: string;
  /** Modules this one needs that are currently off. Reported, not enforced. */
  missingDependencies: string[];
  /** Rows in the table behind this module, or null if nothing records it. */
  usage: number | null;
  /** What those rows are ("bookings"), so a bare number is never shown. */
  usageLabel: string | null;
}

export interface FacilityModulesView {
  planId: string | null;
  planName: string | null;
  entitlements: FacilityModuleEntitlement[];
  /** Sum of what the enabled modules add to the bill each month, in cents. */
  monthlyAddOnCents: number;
  /** How many modules depart from the plan — what "reset" would drop. */
  exceptionCount: number;
}

interface EntitlementRow {
  module_id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
  source: string;
  price_cents: number;
  list_price_cents: number;
  price_override_cents: number | null;
  included_in_plan: boolean;
  available_on_plan: boolean;
  is_standalone: boolean;
  min_tier_rank: number;
  expires_at: string | null;
  note: string;
  missing_dependencies: string[];
}

const SOURCES: EntitlementSource[] = [
  "plan",
  "add-on",
  "withdrawn",
  "not included",
];

function toSource(value: string): EntitlementSource {
  // The CASE in the RPC can only produce these four. Narrowing rather than
  // casting so a fifth one added later shows up as a wrong badge, not a
  // TypeScript lie.
  return SOURCES.find((candidate) => candidate === value) ?? "not included";
}

/**
 * Modules with a table behind them. Anything absent from this map is not
 * measured, which is different from measuring zero.
 */
const COUNTABLE = {
  "module-booking": { table: "bookings", label: "bookings" },
  "module-customer-management": { table: "clients", label: "clients" },
  "module-grooming-management": {
    table: "grooming_appointments",
    label: "grooming appointments",
  },
  "module-financial-reporting": { table: "payments", label: "payments" },
} as const;

export async function readFacilityModules(
  facilityId: string,
): Promise<FacilityModulesView> {
  const supabase = await createServerClient();

  const [entitlements, subscription, ...counts] = await Promise.all([
    supabase.rpc("facility_module_entitlements", {
      p_facility_id: facilityId,
    }),
    supabase
      .from("facility_subscriptions")
      .select("tier_id, tier_name")
      .eq("facility_id", facilityId)
      .maybeSingle(),
    ...Object.values(COUNTABLE).map((source) =>
      supabase
        .from(source.table)
        .select("*", { count: "exact", head: true })
        .eq("facility_id", facilityId),
    ),
  ]);

  if (entitlements.error) throw new Error(entitlements.error.message);

  const usage = new Map<string, number | null>();
  Object.keys(COUNTABLE).forEach((moduleId, index) => {
    // A failed count is not a zero either — leave it unmeasured.
    const result = counts[index];
    usage.set(moduleId, result?.error ? null : (result?.count ?? null));
  });

  const rows = (entitlements.data ?? []) as EntitlementRow[];

  const mapped: FacilityModuleEntitlement[] = rows.map((row) => ({
    moduleId: row.module_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    icon: row.icon,
    enabled: row.enabled,
    source: toSource(row.source),
    priceCents: row.price_cents,
    listPriceCents: row.list_price_cents,
    priceOverrideCents: row.price_override_cents,
    includedInPlan: row.included_in_plan,
    availableOnPlan: row.available_on_plan,
    isStandalone: row.is_standalone,
    expiresAt: row.expires_at,
    note: row.note,
    missingDependencies: row.missing_dependencies ?? [],
    usage: usage.get(row.module_id) ?? null,
    usageLabel:
      COUNTABLE[row.module_id as keyof typeof COUNTABLE]?.label ?? null,
  }));

  return {
    planId: subscription.data?.tier_id ?? null,
    planName: subscription.data?.tier_name ?? null,
    entitlements: mapped,
    monthlyAddOnCents: mapped
      .filter((module) => module.enabled)
      .reduce((total, module) => total + module.priceCents, 0),
    exceptionCount: mapped.filter(
      (module) => module.source === "add-on" || module.source === "withdrawn",
    ).length,
  };
}
