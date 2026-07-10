"use client";

import { useSyncExternalStore } from "react";

// In-memory overlay of per-location edits made in the HQ Location Detail view.
// The mock `locations` array is static, so edits (manager, price overrides,
// settings) are persisted here for the session and merged on top of the base
// Location when rendering. Swap for a real mutation API when the backend lands.

export interface LocationPatch {
  /** Chosen manager staffId (overrides the primary-manager assignment). */
  managerStaffId?: string;
  /** Whether this location uses per-service price overrides. */
  pricingOverride?: boolean;
  /** serviceId → overridden price. */
  servicePrices?: Record<string, number>;
  address?: string;
  phone?: string;
  capacity?: {
    daycare?: number;
    boarding?: number;
    grooming?: number;
    training?: number;
  };
  bookingApprovalMode?: "auto" | "manual";
  /** When true, these location settings override the facility defaults. */
  overrideFacilityDefaults?: boolean;
  /** service (category) → available at this location. */
  serviceAvailability?: Record<string, boolean>;
}

const EMPTY: LocationPatch = {};

let state: Record<string, LocationPatch> = {};
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const locationDetailStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): Record<string, LocationPatch> {
    return state;
  },
  getPatch(id: string): LocationPatch {
    return state[id] ?? EMPTY;
  },
  /** Shallow-merge top-level fields (Settings save passes a full object). */
  setPatch(id: string, partial: LocationPatch) {
    state = { ...state, [id]: { ...state[id], ...partial } };
    emit();
  },
  setManager(id: string, managerStaffId: string) {
    this.setPatch(id, { managerStaffId });
  },
  setPricingOverride(id: string, pricingOverride: boolean) {
    this.setPatch(id, { pricingOverride });
  },
  setServicePrice(id: string, serviceId: string, price: number | null) {
    const current = { ...(state[id]?.servicePrices ?? {}) };
    if (price === null) delete current[serviceId];
    else current[serviceId] = price;
    state = {
      ...state,
      [id]: { ...state[id], pricingOverride: true, servicePrices: current },
    };
    emit();
  },
};

export function useLocationPatch(id: string): LocationPatch {
  const snap = useSyncExternalStore(
    locationDetailStore.subscribe,
    locationDetailStore.getSnapshot,
    locationDetailStore.getSnapshot,
  );
  return snap[id] ?? EMPTY;
}
