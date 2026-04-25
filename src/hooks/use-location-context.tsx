"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Location, HQSettings } from "@/types/location";
import { getLocationsByFacility, getPrimaryLocation, hqSettings } from "@/data/locations";

const STORAGE_KEY = "yipyy-location-ctx";
const HQ_SENTINEL = "__hq__";

interface LocationContextValue {
  currentLocationId: string | null;
  currentLocation: Location | null;
  isHQView: boolean;
  locations: Location[];
  settings: HQSettings;
  isMultiLocation: boolean;
  setLocation: (locationId: string | null) => void;
  setHQView: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationContextProvider({ children }: { children: ReactNode }) {
  const facilityId = 11;
  const locs = getLocationsByFacility(facilityId);
  const isMultiLocation = locs.length > 1;
  const primary = getPrimaryLocation(facilityId);

  const [locationId, setLocationId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === HQ_SENTINEL) {
      setLocationId(HQ_SENTINEL);
    } else if (saved && locs.some((l) => l.id === saved)) {
      setLocationId(saved);
    } else {
      setLocationId(primary?.id ?? locs[0]?.id ?? null);
    }
  }, []);

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
  const currentLocation = mounted && !isHQView
    ? locs.find((l) => l.id === locationId) ?? null
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
  setLocation: () => {},
  setHQView: () => {},
};

export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  return ctx ?? FALLBACK;
}

export function useLocationContextStrict(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationContext must be used inside LocationContextProvider");
  return ctx;
}
