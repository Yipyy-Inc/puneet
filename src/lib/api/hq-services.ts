"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { groomingCatalogueKeys } from "@/lib/api/grooming-catalogue";
import { ROOMS_KEY } from "@/hooks/use-rooms";
import type { HqGroomingService } from "@/types/hq-services";

// ============================================================================
// HQ Services — grooming (every response's `locationPricing`) and boarding
// (kennel-class prices, this file's own mutation).
//
// Grooming reads the SAME `/api/grooming/services` endpoint every other
// grooming screen reads; writes reuse `useSaveGroomingService()` from
// grooming-catalogue.ts unchanged — passing `locationId` already scopes a
// price edit to one branch.
//
// Boarding reads through `useRooms()` (the same catalogue the Rooms admin and
// Rates pages already use — `RoomCategory.locationPricing` rides along on
// every response now). Only the WRITE needs its own hook here: `useRooms()`'s
// own `updateCategory` sends a full category object for the current
// single-branch view, which doesn't fit a lean per-branch price patch.
// ============================================================================

async function fetchHqGroomingServices(): Promise<HqGroomingService[]> {
  const response = await fetch("/api/grooming/services");
  const parsed = (await response.json().catch(() => null)) as
    | (HqGroomingService[] & { error?: string })
    | { error: string }
    | null;
  if (!response.ok) {
    const detail = Array.isArray(parsed) ? undefined : parsed?.error;
    throw new Error(detail ?? `Could not load services (${response.status})`);
  }
  return parsed as HqGroomingService[];
}

export function useHqGroomingServices() {
  return useQuery({
    // The facility-wide key -- same cache entry `useGroomingServices()`
    // (no locationId) already uses, so a price saved from either screen
    // invalidates and refetches the other correctly.
    queryKey: groomingCatalogueKeys.services(undefined),
    queryFn: fetchHqGroomingServices,
  });
}

interface SaveBoardingCategoryLocationPrice {
  /** The category's app-facing id (`legacy_id` or uuid). */
  categoryId: string;
  locationId: string;
  /** A price sets this branch's own rate; `null` clears it back to the
   *  facility-wide default. */
  price: number | null;
}

async function saveBoardingCategoryLocationPrice({
  categoryId,
  locationId,
  price,
}: SaveBoardingCategoryLocationPrice): Promise<void> {
  const response = await fetch(
    `/api/rooms/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, defaultBasePrice: price }),
    },
  );
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(detail ?? `Could not save that price (${response.status})`);
  }
}

export function useSaveBoardingCategoryLocationPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveBoardingCategoryLocationPrice,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ROOMS_KEY }),
  });
}

// ============================================================================
// Daycare has no catalog item either -- just one flat rate a branch can
// override. `/api/daycare/location-prices` is the whole resource; no `[id]`
// route, since (facility, location) already is the id.
// ============================================================================

export interface DaycareLocationPrice {
  locationId: string;
  basePrice: number;
}

const DAYCARE_LOCATION_PRICES_KEY = ["daycare", "location-prices"] as const;

async function fetchDaycareLocationPrices(): Promise<DaycareLocationPrice[]> {
  const response = await fetch("/api/daycare/location-prices");
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(
      detail ?? `Could not load daycare pricing (${response.status})`,
    );
  }
  return (await response.json()) as DaycareLocationPrice[];
}

export function useDaycareLocationPrices() {
  return useQuery({
    queryKey: DAYCARE_LOCATION_PRICES_KEY,
    queryFn: fetchDaycareLocationPrices,
  });
}

interface SaveDaycareLocationPrice {
  locationId: string;
  /** A price sets this branch's own rate; `null` clears it back to the
   *  facility-wide default. */
  basePrice: number | null;
}

async function saveDaycareLocationPrice({
  locationId,
  basePrice,
}: SaveDaycareLocationPrice): Promise<void> {
  const response = await fetch("/api/daycare/location-prices", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locationId, basePrice }),
  });
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(detail ?? `Could not save that price (${response.status})`);
  }
}

export function useSaveDaycareLocationPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveDaycareLocationPrice,
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: DAYCARE_LOCATION_PRICES_KEY,
      }),
  });
}
