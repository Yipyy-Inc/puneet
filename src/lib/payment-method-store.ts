"use client";

import { useSyncExternalStore } from "react";

import { getPaymentMethod } from "@/data/facility-billing";
import { facilities } from "@/data/facilities";
import type { PaymentMethodOnFile } from "@/types/facility-billing";
import type { TokenizedCard } from "@/lib/fiserv-payment-service";

// The Yipyy subscription card on file. Yipyy stores ONLY the Clover token plus
// last 4 + expiry (+ brand and cardholder name) — never the raw PAN. Overrides
// (add/replace/remove) layer over the seeded card and persist to localStorage.

export interface SubscriptionCard extends PaymentMethodOnFile {
  cardholderName: string;
  /** Clover-issued token — the sole card reference held by Yipyy. */
  token: string;
}

const STORAGE_KEY = "yipyy.subscription-card";
// facilityId -> card, or null when explicitly removed. Absent = use the seed.
let overrides: Record<number, SubscriptionCard | null> = {};
let hydrated = false;
const listeners = new Set<() => void>();

// Snapshot cache so useSyncExternalStore gets a stable reference between renders
// (recomputing the seed-derived object each call would loop).
const snapshotCache = new Map<number, SubscriptionCard | null>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      overrides = JSON.parse(raw) as Record<number, SubscriptionCard | null>;
    }
  } catch {
    // Ignore malformed storage.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Storage unavailable.
  }
}

function ownerName(facilityId: number): string {
  return (
    facilities.find((f) => f.id === facilityId)?.owner?.name ?? "Card holder"
  );
}

function changed() {
  snapshotCache.clear();
  listeners.forEach((l) => l());
}

/** The effective card: an override if set (or removed → null), else the seed. */
export function getSubscriptionCard(
  facilityId: number,
): SubscriptionCard | null {
  hydrate();
  if (snapshotCache.has(facilityId)) return snapshotCache.get(facilityId)!;

  let result: SubscriptionCard | null;
  if (Object.prototype.hasOwnProperty.call(overrides, facilityId)) {
    result = overrides[facilityId];
  } else {
    const seed = getPaymentMethod(facilityId);
    result = seed
      ? {
          ...seed,
          cardholderName: ownerName(facilityId),
          token: `clover_tok_onfile_${facilityId}`,
        }
      : null;
  }
  snapshotCache.set(facilityId, result);
  return result;
}

export function saveTokenizedCard(
  facilityId: number,
  card: TokenizedCard,
): void {
  hydrate();
  overrides = {
    ...overrides,
    [facilityId]: {
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      cardholderName: card.cardholderName,
      token: card.token,
    },
  };
  persist();
  changed();
}

export function removeSubscriptionCard(facilityId: number): void {
  hydrate();
  overrides = { ...overrides, [facilityId]: null };
  persist();
  changed();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSubscriptionCard(
  facilityId: number,
): SubscriptionCard | null {
  return useSyncExternalStore(
    subscribe,
    () => getSubscriptionCard(facilityId),
    () => null,
  );
}
