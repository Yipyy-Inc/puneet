"use client";

import { useQuery } from "@tanstack/react-query";

import type { BoardingRoom } from "@/types/boarding";
import type { RoomOccupancy } from "@/lib/api/mappers/boarding";

// ============================================================================
// The kennels, from Postgres.
//
// A SEPARATE FILE from src/lib/api/boarding.ts, which is still fixtures --
// rates, guests, care sheets, surcharges. Mixing the fetchers in there would
// make it impossible to tell at a glance which `boardingQueries.*` entries hit
// the network and which return a module array, which is exactly the confusion
// `groomingQueries.packages` caused before it was deleted.
//
// NO MOCK FALLBACK. An empty room list means this facility has not built one,
// and that is worth seeing.
// ============================================================================

export interface BoardingRoomsPayload {
  rooms: BoardingRoom[];
  occupied: RoomOccupancy[];
}

async function fetchRooms(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const response = await fetch(
    `/api/boarding/rooms${query ? `?${query}` : ""}`,
  );
  if (!response.ok) {
    const parsed = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(parsed?.error ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as BoardingRoomsPayload;
}

export const boardingRoomKeys = {
  all: ["boarding-rooms"] as const,
  window: (from?: string, to?: string) =>
    [...boardingRoomKeys.all, from ?? "now", to ?? "now"] as const,
};

export const boardingRoomQueries = {
  /** Rooms and who is in them right now. */
  current: () => ({
    queryKey: boardingRoomKeys.window(),
    queryFn: () => fetchRooms(),
  }),
  /** Rooms and who is in them across a specific stay's dates. */
  forWindow: (from: string, to: string) => ({
    queryKey: boardingRoomKeys.window(from, to),
    queryFn: () => fetchRooms(from, to),
  }),
};

export function useBoardingRooms() {
  return useQuery(boardingRoomQueries.current());
}

/**
 * Rooms for a proposed stay, with the ones already taken for those nights.
 *
 * Lets the assignment board grey out a kennel BEFORE the write, rather than
 * letting the exclusion constraint refuse it afterwards. The constraint is
 * still what guarantees it -- this is the courtesy, not the rule.
 */
export function useBoardingRoomsForStay(from?: string, to?: string) {
  return useQuery({
    ...boardingRoomQueries.forWindow(from ?? "", to ?? ""),
    enabled: Boolean(from && to),
  });
}

/**
 * Occupancy totals, derived.
 *
 * Nothing stores these. The fixture kept a `boardingCapacity.total` of 30
 * beside a six-room list and a per-type breakdown keyed to words that were not
 * room types -- three numbers for one idea, none of which could be checked
 * against another. Counting the rooms is the only version that cannot drift.
 */
export function summariseOccupancy(payload: BoardingRoomsPayload | undefined) {
  const rooms = payload?.rooms ?? [];
  const occupiedIds = new Set((payload?.occupied ?? []).map((o) => o.roomId));

  const byType: Record<string, { total: number; occupied: number }> = {};
  for (const room of rooms) {
    const entry = (byType[room.typeId] ??= { total: 0, occupied: 0 });
    entry.total += 1;
    if (occupiedIds.has(room.id)) entry.occupied += 1;
  }

  const total = rooms.length;
  const occupied = rooms.filter((r) => occupiedIds.has(r.id)).length;

  return {
    total,
    occupied,
    percentage: total > 0 ? Math.round((occupied / total) * 100) : 0,
    byType,
  };
}
