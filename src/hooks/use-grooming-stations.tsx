"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { GroomingStation } from "@/types/rooms";
import { groomingStations as defaultGroomingStations } from "@/data/rooms";

interface GroomingStationsContextValue {
  stations: GroomingStation[];

  // CRUD
  addStation: (station: GroomingStation) => void;
  updateStation: (station: GroomingStation) => void;
  deleteStation: (id: string) => void;
  toggleStation: (id: string) => void;

  // Queries
  getStationsByType: (type: GroomingStation["type"]) => GroomingStation[];

  // Reset
  resetGroomingStations: () => void;
}

const GroomingStationsContext =
  createContext<GroomingStationsContextValue | null>(null);

const STATIONS_KEY = "grooming-stations";

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as T;
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export function GroomingStationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [stations, setStations] = useState<GroomingStation[]>(() =>
    loadStored(STATIONS_KEY, defaultGroomingStations),
  );

  const persistStations = useCallback(
    (updater: (prev: GroomingStation[]) => GroomingStation[]) => {
      setStations((prev) => {
        const updated = updater(prev);
        queueMicrotask(() =>
          localStorage.setItem(STATIONS_KEY, JSON.stringify(updated)),
        );
        return updated;
      });
    },
    [],
  );

  const addStation = useCallback(
    (station: GroomingStation) => {
      persistStations((prev) => {
        const exists = prev.find((s) => s.id === station.id);
        if (exists) return prev.map((s) => (s.id === station.id ? station : s));
        return [...prev, station];
      });
    },
    [persistStations],
  );

  const updateStation = useCallback(
    (station: GroomingStation) => {
      persistStations((prev) =>
        prev.map((s) => (s.id === station.id ? station : s)),
      );
    },
    [persistStations],
  );

  const deleteStation = useCallback(
    (id: string) => {
      persistStations((prev) => prev.filter((s) => s.id !== id));
    },
    [persistStations],
  );

  const toggleStation = useCallback(
    (id: string) => {
      persistStations((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
      );
    },
    [persistStations],
  );

  const getStationsByType = useCallback(
    (type: GroomingStation["type"]) => stations.filter((s) => s.type === type),
    [stations],
  );

  const resetGroomingStations = useCallback(() => {
    persistStations(() => defaultGroomingStations);
  }, [persistStations]);

  const value = useMemo<GroomingStationsContextValue>(
    () => ({
      stations,
      addStation,
      updateStation,
      deleteStation,
      toggleStation,
      getStationsByType,
      resetGroomingStations,
    }),
    [
      stations,
      addStation,
      updateStation,
      deleteStation,
      toggleStation,
      getStationsByType,
      resetGroomingStations,
    ],
  );

  return (
    <GroomingStationsContext.Provider value={value}>
      {children}
    </GroomingStationsContext.Provider>
  );
}

export function useGroomingStations(): GroomingStationsContextValue {
  const context = useContext(GroomingStationsContext);
  if (!context) {
    throw new Error(
      "useGroomingStations must be used within a GroomingStationsProvider",
    );
  }
  return context;
}
