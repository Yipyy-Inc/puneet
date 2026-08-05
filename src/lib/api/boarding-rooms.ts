"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FacilityRoom, RoomCategory } from "@/types/rooms";
import type { RoomOccupancy } from "@/lib/api/mappers/boarding";
import { effectiveCapacity } from "@/lib/api/mappers/boarding";

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
  categories: RoomCategory[];
  rooms: FacilityRoom[];
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

// Module-private: the two hooks below are the whole surface. They are exported
// the moment something outside this file needs them — an exported key nobody
// imports is the same dead-with-a-plausible-name shape as an unused factory.
const boardingRoomKeys = {
  all: ["boarding-rooms"] as const,
  window: (from?: string, to?: string) =>
    [...boardingRoomKeys.all, from ?? "now", to ?? "now"] as const,
};

const boardingRoomQueries = {
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
 * Move a booked guest between kennels, or take them out of one.
 *
 * This hook was deliberately absent for four changes, with a note where it now
 * sits saying why: `PUT /api/boarding/stays` was covered end to end and nothing
 * could call it, because the only assignment surface was
 * `BoardingRequestDialog` — a PRE-booking object with no booking ref. A hook
 * with no component is dead code with a plausible name. It is written now
 * because the Kennels board that needs it is.
 *
 * `roomId: null` CLEARS the assignment, which is not the same as cancelling the
 * booking: cancelling releases the stay and keeps the row (who had the kennel
 * matters), clearing deletes it (they were never placed there). That asymmetry
 * is the meaning — see 20260806640000.
 *
 * The board greys out taken kennels before the drag, but the exclusion
 * constraint is what decides. A 409 here is that constraint, not a bug: two
 * people moved guests at once and one of them lost.
 */
export function useAssignBoardingRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingRef: number;
      roomId: string | null;
      overrideReason?: string;
    }) => {
      const response = await fetch("/api/boarding/stays", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const parsed = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(
          parsed?.error ??
            (response.status === 409
              ? "That kennel was taken while you were moving them."
              : "Could not move that guest."),
        );
      }
      return input;
    },
    onSuccess: () => {
      // `boardingRoomKeys.all`, not a hand-written `["boarding","rooms"]` —
      // the key here is `["boarding-rooms", from, to]`, and a near-miss
      // invalidates nothing while looking exactly like it does.
      void queryClient.invalidateQueries({ queryKey: boardingRoomKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
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
  const categories = payload?.categories ?? [];
  // Inactive rooms are excluded: a kennel out for a deep clean is not capacity
  // the facility has tonight, and counting it would understate how full it is.
  const rooms = (payload?.rooms ?? []).filter((r) => r.active);
  const occupiedIds = new Set((payload?.occupied ?? []).map((o) => o.roomId));
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  const byType: Record<string, { total: number; occupied: number }> = {};
  for (const room of rooms) {
    // Grouped by the CATEGORY's name, which is what the facility calls it —
    // "Deluxe Suite", not a `typeId` from an enum no room row ever had.
    const label = nameById.get(room.categoryId) ?? room.categoryId;
    const entry = (byType[label] ??= { total: 0, occupied: 0 });
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

/** How many pets a room holds — its own number, or its category's default. */
export function roomCapacity(
  room: FacilityRoom,
  payload: BoardingRoomsPayload | undefined,
): number {
  return effectiveCapacity(room, payload?.categories ?? []);
}
