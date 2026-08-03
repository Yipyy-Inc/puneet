"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { GroomingStation, GroomingStationStatus } from "@/types/rooms";

// ============================================================================
// Grooming stations, from Postgres.
//
// THE CONTEXT SHAPE IS UNCHANGED ON PURPOSE. Ten components consume this hook
// (the check-in board, the calendar dialogs, the booking flow, the day sheet,
// the stations screen…). Keeping `stations` plus the same eight callbacks means
// none of them had to be rewritten to move off localStorage — the same trick
// that let useStaffHrConfig and useOffboardingInstance swap sources without
// touching their call sites.
//
// WHAT CHANGED BEHIND IT:
//
//   * `stations` is a query, not `useState(defaultGroomingStations)`. The
//     old provider seeded from the mock array and hydrated from localStorage in
//     an effect — so a facility's estate lived in one browser, and clearing site
//     data was a factory reset nobody asked for.
//
//   * The CRUD callbacks are still void-returning and still safe to call
//     without awaiting. They now fire a request and invalidate; the list
//     re-renders from the server's answer rather than from an optimistic local
//     edit. That is the point: the server owns `status_changed_at` and derives
//     `in-use`, so a local guess would be wrong about both.
//
//   * `setStationStatus`'s THIRD ARGUMENT is now ignored. The status itself
//     still writes — all four values — but occupancy has no column to go to,
//     because who is on a table comes from the appointment (20260805180000,
//     Decision 2). Leaving the parameter in the signature keeps the seven call
//     sites compiling; the comment at the callback is why it does nothing.
//
//     WHAT THIS MEANS TODAY, stated rather than discovered later: check-in
//     marks a station `in-use` (the flow still does that), but the pet and
//     groomer NAMES on the card only appear once a real grooming_appointment
//     carries the station_id. The check-in flow still writes appointments to
//     the mock query cache, so until that migrates, an occupied-looking station
//     will show the status without the occupant.
//
//   * `resetGroomingStations` no longer restores the mock estate. It refetches.
//     "Reset" meant "throw away this browser's copy and go back to the fixture",
//     which is not a thing you can do to a real facility's equipment list.
// ============================================================================

interface GroomingStationsContextValue {
  stations: GroomingStation[];

  // CRUD
  addStation: (station: GroomingStation) => void;
  updateStation: (station: GroomingStation) => void;
  deleteStation: (id: string) => void;
  toggleStation: (id: string) => void;

  // Real-time status
  setStationStatus: (
    id: string,
    status: GroomingStationStatus,
    occupancy?: { petName?: string; stylistName?: string },
  ) => void;

  // Queries
  getStationsByType: (type: GroomingStation["type"]) => GroomingStation[];

  // Refetch
  resetGroomingStations: () => void;
}

const GroomingStationsContext =
  createContext<GroomingStationsContextValue | null>(null);

const BASE = "/api/grooming/stations";

export const groomingStationKeys = {
  all: ["grooming-stations"] as const,
};

async function json<T>(
  url: string,
  init?: { method: string; body?: unknown },
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (response.status === 204) return undefined as T;

  const parsed = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok) {
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return parsed as T;
}

/** The subset of GroomingStation the API accepts. Occupancy and the status
 *  clock are absent because the server owns both. */
function toPayload(station: Partial<GroomingStation>) {
  return {
    name: station.name,
    type: station.type,
    active: station.active,
    allowedPetSizes: station.allowedPetSizes,
    petTypes: station.petTypes,
    maxWeightLbs: station.maxWeightLbs ?? null,
    staffNotes: station.staffNotes,
    imageUrl: station.imageUrl ?? null,
  };
}

export function GroomingStationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();

  const { data: stations = [] } = useQuery({
    queryKey: groomingStationKeys.all,
    queryFn: () => json<GroomingStation[]>(BASE),
    // The board shows who is on which table RIGHT NOW, and that answer changes
    // as staff check pets in from other screens. Thirty seconds is the same
    // cadence the board's own clock already re-renders on.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: groomingStationKeys.all });
  }, [queryClient]);

  const { mutate: create } = useMutation({
    mutationFn: (station: GroomingStation) =>
      json<{ id: string }>(BASE, { method: "POST", body: toPayload(station) }),
    onSuccess: invalidate,
  });

  const { mutate: patch } = useMutation({
    mutationFn: (input: { id: string; body: Record<string, unknown> }) =>
      json<void>(`${BASE}/${encodeURIComponent(input.id)}`, {
        method: "PATCH",
        body: input.body,
      }),
    onSuccess: invalidate,
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) =>
      json<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const addStation = useCallback(
    (station: GroomingStation) => {
      // The old provider treated add-with-an-existing-id as an update. Kept,
      // because the stations screen relies on it when saving an edited row
      // through the same dialog.
      const exists = stations.some((s) => s.id === station.id);
      if (exists) {
        patch({ id: station.id, body: toPayload(station) });
      } else {
        create(station);
      }
    },
    [stations, create, patch],
  );

  const updateStation = useCallback(
    (station: GroomingStation) => {
      patch({ id: station.id, body: toPayload(station) });
    },
    [patch],
  );

  const deleteStation = useCallback((id: string) => remove(id), [remove]);

  const toggleStation = useCallback(
    (id: string) => {
      const current = stations.find((s) => s.id === id);
      if (!current) return;
      patch({ id, body: { active: !current.active } });
    },
    [stations, patch],
  );

  const setStationStatus = useCallback(
    (id: string, status: GroomingStationStatus) => {
      // All four statuses go through, including `in-use` — see the note in the
      // PATCH route. The OCCUPANCY argument is what has nowhere to go: there is
      // no currentPetName column, because who is on a table comes from the
      // appointment. GET fills those fields in from the join when a real
      // appointment exists, and reports nobody when it does not, which is the
      // honest answer while the check-in flow still writes to the mock cache.
      patch({ id, body: { status } });
    },
    [patch],
  );

  const getStationsByType = useCallback(
    (type: GroomingStation["type"]) => stations.filter((s) => s.type === type),
    [stations],
  );

  const resetGroomingStations = useCallback(() => invalidate(), [invalidate]);

  const value = useMemo<GroomingStationsContextValue>(
    () => ({
      stations,
      addStation,
      updateStation,
      deleteStation,
      toggleStation,
      setStationStatus,
      getStationsByType,
      resetGroomingStations,
    }),
    [
      stations,
      addStation,
      updateStation,
      deleteStation,
      toggleStation,
      setStationStatus,
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
