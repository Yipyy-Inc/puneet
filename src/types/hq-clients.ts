// ============================================================================
// A client's lifetime value across the network — see
// supabase/migrations/20260826120000. Derived from `bookings.location_id`,
// not a stored attribute: `locationsVisited` is where their bookings actually
// happened, which can be several branches.
// ============================================================================

export interface HqClientLocationVisit {
  locationId: string;
  visits: number;
  spend: number;
}

export interface HqClientNetworkValue {
  clientId: number;
  clientName: string;
  petNames: string[];
  totalSpend: number;
  totalVisits: number;
  firstVisitedAt: string;
  lastVisitedAt: string;
  /** Null when the client has no loyalty account, or the facility has tiers off. */
  loyaltyTierId: string | null;
  locationsVisited: HqClientLocationVisit[];
}

/** Just enough of the facility's own tier config to label a badge. */
export interface HqLoyaltyTierSummary {
  id: string;
  name: string;
  color: string;
  icon: string;
}
