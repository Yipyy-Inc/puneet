"use client";

import { useSyncExternalStore } from "react";
import type { Location } from "@/types/location";

// Locations created via the "+ Add Location" wizard. The mock `locations` array
// is static and read server-side, so newly-created branches are appended here
// and merged into the hub on the client. Swap for a real create API when the
// backend lands (at which point the hub would re-fetch instead).

let added: Location[] = [];
const listeners = new Set<() => void>();

export const addedLocationsStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): Location[] {
    return added;
  },
  add(loc: Location) {
    added = [...added, loc];
    for (const l of listeners) l();
  },
};

export function useAddedLocations(): Location[] {
  return useSyncExternalStore(
    addedLocationsStore.subscribe,
    addedLocationsStore.getSnapshot,
    addedLocationsStore.getSnapshot,
  );
}
