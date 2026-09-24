"use client";

import type { UnitNaming } from "@/lib/api/lodging-units";
import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// The facility's rooms, from Postgres.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// This provider used to hold `useState` seeded from `src/data/rooms.ts` and
// persist to localStorage (`facility-room-categories`, `facility-rooms`). So a
// manager who added a kennel on the Rooms page added it TO ONE BROWSER, and no
// booking could ever be placed in it — `create_booking` resolves
// `facility_rooms` in Postgres (20260806660000).
//
// Worse, `BookingModal` and `BoardingDetails` read this same context to offer
// rooms. They agreed with the database only because both were seeded from the
// same fixture; the first real edit would have had the booking flow offering a
// room the database did not have, and the booking answering 422.
//
// ── READS AND WRITES TOGETHER, DELIBERATELY ───────────────────────────────
//
// Moving the reads alone would have left Save buttons that appear to work and
// silently do nothing — worse than the old state, where the page was at least
// consistently local.
//
// ── NO `resetRooms` ───────────────────────────────────────────────────────
//
// It restored the fixture over the stored copy. Against a shared database that
// is "delete this facility's rooms and put mine back", which is not a button.
// It had no callers outside this file.
// ============================================================================

interface RoomsPayload {
  categories: RoomCategory[];
  rooms: FacilityRoom[];
}

/**
 * What a write did, resolved rather than thrown.
 *
 * Every writer here answers with one of these and NEVER rejects. A screen that
 * wants to say "Category created" can await the answer and say it only if it
 * happened; a caller that ignores the promise — several do — cannot leave an
 * unhandled rejection behind.
 */
export type RoomWrite = { ok: true } | { ok: false; error: string };

interface RoomsContextValue {
  categories: RoomCategory[];
  rooms: FacilityRoom[];
  /** True while the catalogue is loading — NOT the same as having none. */
  isLoading: boolean;
  /** True while a write is in flight, so a Save button can say so. */
  isSaving: boolean;
  /** The last write failure, for a screen that does not await its writes. */
  error: string | null;

  // Category CRUD
  addCategory: (
    category: RoomCategory,
    /** MoéGo's quantity, prefix and starting number for the first units. */
    naming?: UnitNaming,
  ) => Promise<RoomWrite>;
  updateCategory: (category: RoomCategory) => Promise<RoomWrite>;
  deleteCategory: (id: string) => Promise<RoomWrite>;

  // Room unit CRUD
  addRoom: (room: FacilityRoom) => Promise<RoomWrite>;
  updateRoom: (room: FacilityRoom) => Promise<RoomWrite>;
  deleteRoom: (id: string) => Promise<RoomWrite>;
  toggleRoom: (id: string) => Promise<RoomWrite>;

  // Queries
  getCategoriesByService: (service: RoomCategory["service"]) => RoomCategory[];
  getRoomsByCategory: (categoryId: string) => FacilityRoom[];
}

const RoomsContext = createContext<RoomsContextValue | null>(null);

export const ROOMS_KEY = ["rooms", "catalogue"] as const;

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

export function RoomsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ROOMS_KEY,
    queryFn: () => json<RoomsPayload>("/api/rooms"),
  });

  const categories = useMemo(() => data?.categories ?? [], [data]);
  const rooms = useMemo(() => data?.rooms ?? [], [data]);

  // Every write invalidates the whole catalogue rather than patching the cache
  // by hand. Adding a category can create fifteen rooms, deleting one is
  // refused while it still holds any, and a room's id is minted by the server —
  // an optimistic local edit would be guessing at all three.
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ROOMS_KEY });
  }, [queryClient]);

  const save = useMutation({
    mutationFn: (op: { url: string; method: string; body?: unknown }) =>
      json<unknown>(op.url, { method: op.method, body: op.body }),
    onSuccess: invalidate,
  });

  // `mutateAsync` so a screen can WAIT for the answer before claiming one.
  // The Rooms page used to call `mutate` and announce "Category created" in
  // the next statement, which is a claim about a request that had not been
  // sent yet — a refusal then arrived as a second, contradicting toast.
  const runAsync = save.mutateAsync;

  const run = useCallback(
    async (op: {
      url: string;
      method: string;
      body?: unknown;
    }): Promise<RoomWrite> => {
      try {
        await runAsync(op);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "That was not saved.",
        };
      }
    },
    [runAsync],
  );

  const addCategory = useCallback(
    (category: RoomCategory, naming: UnitNaming = { count: 0 }) =>
      run({
        url: "/api/rooms/categories",
        method: "POST",
        body: {
          ...category,
          unitCount: naming.count,
          unitPrefix: naming.prefix,
          unitStart: naming.start,
        },
      }),
    [run],
  );

  const updateCategory = useCallback(
    (category: RoomCategory) =>
      run({
        url: `/api/rooms/categories/${encodeURIComponent(category.id)}`,
        method: "PATCH",
        body: category,
      }),
    [run],
  );

  const deleteCategory = useCallback(
    (id: string) =>
      run({
        url: `/api/rooms/categories/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
    [run],
  );

  const addRoom = useCallback(
    (room: FacilityRoom) =>
      run({ url: "/api/rooms/units", method: "POST", body: room }),
    [run],
  );

  const updateRoom = useCallback(
    (room: FacilityRoom) =>
      run({
        url: `/api/rooms/units/${encodeURIComponent(room.id)}`,
        method: "PATCH",
        body: room,
      }),
    [run],
  );

  const deleteRoom = useCallback(
    (id: string) =>
      run({
        url: `/api/rooms/units/${encodeURIComponent(id)}`,
        method: "DELETE",
      }),
    [run],
  );

  const toggleRoom = useCallback(
    (id: string): Promise<RoomWrite> => {
      // Read the current state rather than sending `!active` blind: the server
      // owns the row, and a toggle computed from nothing would be a guess.
      const room = rooms.find((r) => r.id === id);
      if (!room) {
        return Promise.resolve({ ok: false, error: "That room is not here." });
      }
      return run({
        url: `/api/rooms/units/${encodeURIComponent(id)}`,
        method: "PATCH",
        body: { active: !room.active },
      });
    },
    [rooms, run],
  );

  const getCategoriesByService = useCallback(
    (service: RoomCategory["service"]) =>
      categories.filter((c) => c.service === service),
    [categories],
  );

  const getRoomsByCategory = useCallback(
    (categoryId: string) => rooms.filter((r) => r.categoryId === categoryId),
    [rooms],
  );

  const writeError = save.error ? save.error.message : null;

  const value = useMemo<RoomsContextValue>(
    () => ({
      categories,
      rooms,
      isLoading,
      isSaving: save.isPending,
      error: writeError,
      addCategory,
      updateCategory,
      deleteCategory,
      addRoom,
      updateRoom,
      deleteRoom,
      toggleRoom,
      getCategoriesByService,
      getRoomsByCategory,
    }),
    [
      categories,
      rooms,
      isLoading,
      save.isPending,
      writeError,
      addCategory,
      updateCategory,
      deleteCategory,
      addRoom,
      updateRoom,
      deleteRoom,
      toggleRoom,
      getCategoriesByService,
      getRoomsByCategory,
    ],
  );

  return (
    <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>
  );
}

export function useRooms(): RoomsContextValue {
  const context = useContext(RoomsContext);
  if (!context) {
    throw new Error("useRooms must be used within a RoomsProvider");
  }
  return context;
}
