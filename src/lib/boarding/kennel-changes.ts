import { roomsForAssignments } from "@/lib/capacity-engine";
import type { Booking } from "@/types/booking";
import type { FacilityRoom, RoomCategory } from "@/types/rooms";

// ============================================================================
// A stay booked in more than one kennel, planned before it exists.
//
// Staff choose a lodging TYPE for the first nights and, for each change, the
// first night in the new kennel and its type. A booking is held by ROOMS, so
// at save every stretch of nights becomes a free room of its type for exactly
// those nights — which also books the stay nobody could before: Suite 4 free
// Monday to Wednesday and Suite 5 Wednesday to Saturday, and no suite free
// for the whole week.
//
// Every stretch is one room for all the pets. A stay whose dogs need two
// rooms is two bookings (`boardingParts`), and each moves on its own page.
// ============================================================================

/** A kennel change: from `from` (the first night there) the guest is in `roomId`. */
export interface KennelChange {
  /** YYYY-MM-DD, the first night in the new kennel. */
  from: string;
  /** A lodging type's id, or a room's. */
  roomId: string;
}

export interface KennelStretch {
  from: string;
  /** The morning the stretch ends — the next stretch's first night, or check-out. */
  to: string;
  roomId: string;
}

/**
 * The stretches of a stay: the first kennel's nights, then each change's.
 * A change outside the stay's nights, or on its first night, says nothing and
 * is left out; two changes on one night keep the later one.
 */
export function kennelStretches(input: {
  startDate: string;
  endDate: string;
  first: string;
  changes: readonly KennelChange[];
}): KennelStretch[] {
  const { startDate, endDate, first } = input;
  const byNight = new Map<string, string>();
  for (const change of input.changes) {
    if (change.from > startDate && change.from < endDate && change.roomId) {
      byNight.set(change.from, change.roomId);
    }
  }
  const nights = [...byNight.keys()].sort();
  const starts = [startDate, ...nights];
  return starts.map((from, index) => ({
    from,
    to: starts[index + 1] ?? endDate,
    roomId: index === 0 ? first : byNight.get(from)!,
  }));
}

export type KennelPlan =
  | {
      ok: true;
      /** The room the booking is made in. */
      unitAssignment: string;
      /** Each later room, from its first night — none when one room holds it all. */
      kennelMoves: KennelChange[];
    }
  | {
      ok: false;
      /** The stretch no single free room of its type could hold. */
      stretch: KennelStretch;
    };

/**
 * A free room for every stretch, all the pets in it.
 *
 * `bookings` are the stays already on the calendar across the whole stay, as
 * `roomsForAssignments` reads them. Consecutive stretches that land in the
 * same room are one stretch: there is nothing to move.
 */
export function planKennels(input: {
  petIds: readonly number[];
  startDate: string;
  endDate: string;
  first: string;
  changes: readonly KennelChange[];
  categories: RoomCategory[];
  units: FacilityRoom[];
  bookings: Booking[];
}): KennelPlan {
  const rooms: string[] = [];
  const stretches = kennelStretches(input);
  for (const stretch of stretches) {
    const placed = roomsForAssignments({
      assignments: input.petIds.map((petId) => ({
        petId,
        roomId: stretch.roomId,
      })),
      startDate: stretch.from,
      endDate: stretch.to,
      categories: input.categories,
      units: input.units,
      bookings: input.bookings,
    });
    const room = placed[0]?.roomId;
    if (
      !room ||
      placed.length !== input.petIds.length ||
      placed.some((p) => p.roomId !== room)
    ) {
      return { ok: false, stretch };
    }
    rooms.push(room);
  }

  const kennelMoves: KennelChange[] = [];
  stretches.forEach((stretch, index) => {
    if (index > 0 && rooms[index] !== rooms[index - 1]) {
      kennelMoves.push({ from: stretch.from, roomId: rooms[index]! });
    }
  });
  return { ok: true, unitAssignment: rooms[0]!, kennelMoves };
}
