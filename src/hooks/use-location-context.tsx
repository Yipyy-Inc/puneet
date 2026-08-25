"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { FacilityLocation, HQSettings } from "@/types/location";
import { hqSettings } from "@/data/locations";
import { useFacilityLocations } from "@/lib/api/locations";

// ============================================================================
// The branches this business actually has, shared app-wide.
//
// `locations`/`currentLocation` come from `useFacilityLocations()` (real
// `public.locations` rows) -- the same data `/facility/hq/locations` reads and
// writes. `settings` (HQSettings) stays on the fixture deliberately: none of
// its scope/shared/cross-location toggles has a real table behind it yet
// (`facility_settings` has no location dimension to hang a "per_location"
// value on), so there is nothing real to swap it for. See
// `LocationDetailView.tsx` for the same kind of deliberate boundary.
// ============================================================================

const STORAGE_KEY = "yipyy-location-ctx";
const HQ_SENTINEL = "__hq__";

interface LocationContextValue {
  currentLocationId: string | null;
  currentLocation: FacilityLocation | null;
  isHQView: boolean;
  locations: FacilityLocation[];
  settings: HQSettings;
  isMultiLocation: boolean;
  /** True until the facility's locations have loaded at least once. */
  isPending: boolean;
  setLocation: (locationId: string | null) => void;
  setHQView: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationContextProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = useFacilityLocations();
  const locs = useMemo(() => data ?? [], [data]);
  const isMultiLocation = locs.length > 1;
  const primary = locs.find((l) => l.isPrimary) ?? locs[0] ?? null;

  const [locationId, setLocationId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // Real locations arrive asynchronously, so there is no synchronous default
  // to seed a useState initializer from any more (that trick only worked
  // because the fixture was a plain array available at import time). Once the
  // fetch resolves, restore a saved choice if it still names a real location,
  // else fall back to HQ (multi-location) or the primary location -- the same
  // default the old initializer computed, just one tick later. Runs once:
  // later refetches (e.g. after adding a branch) must not silently override
  // what the person is currently looking at.
  useEffect(() => {
    if (isPending || restored) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === HQ_SENTINEL && isMultiLocation) {
      setLocationId(HQ_SENTINEL);
    } else if (saved && locs.some((l) => l.id === saved)) {
      setLocationId(saved);
    } else {
      setLocationId(isMultiLocation ? HQ_SENTINEL : (primary?.id ?? null));
    }
    setRestored(true);
  }, [isPending, restored, isMultiLocation, primary, locs]);

  const setLocation = useCallback(
    (id: string | null) => {
      const val = id ?? primary?.id ?? null;
      setLocationId(val);
      if (val) localStorage.setItem(STORAGE_KEY, val);
    },
    [primary],
  );

  const setHQView = useCallback(() => {
    setLocationId(HQ_SENTINEL);
    localStorage.setItem(STORAGE_KEY, HQ_SENTINEL);
  }, []);

  const isHQView = locationId === HQ_SENTINEL;
  const currentLocation =
    restored && !isHQView
      ? (locs.find((l) => l.id === locationId) ?? null)
      : null;

  return (
    <LocationContext.Provider
      value={{
        currentLocationId: isHQView ? null : (locationId ?? null),
        currentLocation,
        isHQView,
        locations: locs,
        settings: hqSettings,
        isMultiLocation,
        isPending,
        setLocation,
        setHQView,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

const FALLBACK: LocationContextValue = {
  currentLocationId: null,
  currentLocation: null,
  isHQView: false,
  locations: [],
  settings: {} as HQSettings,
  isMultiLocation: false,
  isPending: false,
  setLocation: () => {},
  setHQView: () => {},
};

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  return ctx ?? FALLBACK;
}

export function useLocationContextStrict(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error(
      "useLocationContext must be used inside LocationContextProvider",
    );
  return ctx;
}
