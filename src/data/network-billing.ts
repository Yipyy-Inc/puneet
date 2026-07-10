// Multi-location (HQ) subscription billing for the Yipyy network. Surfaced in
// HQ Settings so an owner can see how the network is billed at a glance.
// Mirrors the platform subscription; swap for the real subscription record when
// the billing backend lands.

export interface NetworkBilling {
  /** Whether the network is billed as one bundle or per individual location. */
  billingMode: "network_bundle" | "per_location";
  planName: string;
  billingCycle: "monthly" | "quarterly" | "yearly";
  /** Locations included in the plan before per-location surcharges apply. */
  includedLocations: number;
  /** Surcharge per active location beyond the included count. */
  costPerAdditionalLocation: number;
  /** Plan base cost per billing cycle. */
  baseCost: number;
  currency: string;
}

export const networkBilling: NetworkBilling = {
  billingMode: "network_bundle",
  planName: "Pack Leader (Pro)",
  billingCycle: "yearly",
  includedLocations: 3,
  costPerAdditionalLocation: 79,
  baseCost: 3490,
  currency: "USD",
};
