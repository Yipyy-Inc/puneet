import type {
  BoardingRoom,
  BoardingRoomTypeId,
  PetType,
} from "@/types/boarding";

// ============================================================================
// Rooms and who is in them.
//
// `legacy_id ?? id` for the app-facing id, the same bridge grooming_services
// uses: the assignment board and the booking modal key on "R-STD-01".
// ============================================================================

export const BOARDING_ROOM_SELECT =
  "id, legacy_id, name, room_type, capacity, allows_shared, allowed_pet_types, restrictions, is_active, display_order";

export interface BoardingRoomRow {
  id: string;
  legacy_id: string | null;
  name: string;
  room_type: string;
  capacity: number;
  allows_shared: boolean;
  allowed_pet_types: string[] | null;
  restrictions: string[] | null;
  is_active: boolean;
  display_order: number;
}

export interface BoardingStayRow {
  booking_id: string;
  room_id: string;
  occupies: string;
  override_reason: string | null;
  bookings: { ref: number; status: string } | null;
}

/** A room the app can render, with the shape `BoardingRoom` already declares. */
export function rowToBoardingRoom(row: BoardingRoomRow): BoardingRoom {
  return {
    id: row.legacy_id ?? row.id,
    name: row.name,
    // The column is text so a facility can name its own types later; the app's
    // enum is the four the fixture shipped with. Anything else falls back to
    // `standard` rather than rendering a room the board cannot place.
    typeId: (["standard", "deluxe", "vip", "cat-suite"] as const).includes(
      row.room_type as BoardingRoomTypeId,
    )
      ? (row.room_type as BoardingRoomTypeId)
      : "standard",
    capacity: row.capacity,
    allowsShared: row.allows_shared,
    allowedPetTypes: (row.allowed_pet_types ?? []) as PetType[],
    restrictions: row.restrictions ?? [],
  };
}

/** Who is in a room for the window that was asked about. */
export interface RoomOccupancy {
  roomId: string;
  bookingRef: number;
  from: string;
  to: string;
  isOverride: boolean;
}

/**
 * `occupies` comes back as Postgres range text — `["2026-09-01 00:00+00",
 * "2026-09-05 00:00+00")`. Parsed here rather than in a component, and the
 * bounds are kept as-is: the range is half-open, so `to` is the morning the
 * room frees up, not the last night of the stay.
 */
export function parseOccupies(range: string): { from: string; to: string } {
  const inner = range.slice(1, -1);
  const [from = "", to = ""] = inner
    .split(",")
    .map((part) => part.trim().replace(/^"|"$/g, ""));
  return { from, to };
}

export function rowToOccupancy(
  row: BoardingStayRow,
  roomIdByUuid: Map<string, string>,
): RoomOccupancy | null {
  const roomId = roomIdByUuid.get(row.room_id);
  if (!roomId) return null;
  const { from, to } = parseOccupies(row.occupies);
  return {
    roomId,
    bookingRef: row.bookings?.ref ?? 0,
    from,
    to,
    isOverride: row.override_reason !== null,
  };
}
