"use client";

import { useSyncExternalStore } from "react";

// Facility-level "receptionists can see invoice/financial amounts" toggle
// (spec Table 21). Defaults to true; when off, staff with the reception role are
// masked from financial amounts even though the role otherwise grants it. Other
// roles are unaffected. TODO: expose in facility settings and persist server-side.

const STORAGE_KEY = "facility-financial-visibility-v1";

function load(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw == null ? true : JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

let receptionistCanSeeAmounts = load();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(receptionistCanSeeAmounts),
      );
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getReceptionistCanSeeAmounts(): boolean {
  return receptionistCanSeeAmounts;
}

export function setReceptionistCanSeeAmounts(value: boolean): void {
  receptionistCanSeeAmounts = value;
  emit();
}

export function useReceptionistCanSeeAmounts(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => receptionistCanSeeAmounts,
    () => true,
  );
}
