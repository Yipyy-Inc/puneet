import { facilityDailyCareConfig } from "@/data/boarding";
import type { FacilityDailyCareConfig } from "@/types/boarding";

// ============================================================================
// Facility daily care config — mutable in-memory copy of the seed config.
// The settings page writes here; the Daily Care List subscribes and re-renders.
// Both screens stay in sync without prop-drilling or API round-trips.
// ============================================================================

type Listener = () => void;

let config: FacilityDailyCareConfig = structuredClone(facilityDailyCareConfig);
const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

export const dailyCareConfigStore = {
  getSnapshot(): FacilityDailyCareConfig {
    return config;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  set(next: FacilityDailyCareConfig): void {
    config = next;
    notify();
  },

  reset(): void {
    config = structuredClone(facilityDailyCareConfig);
    notify();
  },
};
