import type {
  FacilityRoom,
  RoomCategory,
  RoomCategoryColor,
  RoomRule,
  FacilityRoomService,
} from "@/types/rooms";

// ============================================================================
// Rooms, their categories, and who is in them.
//
// The payload is `RoomCategory` and `FacilityRoom` — the types the app already
// had — rather than a shape invented here. That is the whole point of moving
// onto this model: the facility's Rooms page and the booking path now describe
// a room the same way.
//
// `legacy_id ?? id` for the app-facing id, the same bridge grooming_services
// uses. These are "room-ds-01" / "cat-deluxe".
// ============================================================================

export const ROOM_CATEGORY_SELECT =
  "id, legacy_id, service, name, description, color, sort_order, default_capacity, default_base_price, visible_to_clients, image_url, rules";

export const FACILITY_ROOM_SELECT =
  "id, legacy_id, category_id, name, active, capacity, staff_notes, image_url, sort_order";

export interface RoomCategoryRow {
  id: string;
  legacy_id: string | null;
  service: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  default_capacity: number;
  default_base_price: number | null;
  visible_to_clients: boolean;
  image_url: string | null;
  rules: RoomRule[] | null;
}

export interface FacilityRoomRow {
  id: string;
  legacy_id: string | null;
  category_id: string;
  name: string;
  active: boolean;
  capacity: number | null;
  staff_notes: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface BoardingStayRow {
  booking_id: string;
  room_id: string;
  occupies: string;
  override_reason: string | null;
  bookings: {
    ref: number;
    status: string;
    clients: { name: string } | null;
    booking_pets: { pets: { name: string; species: string } | null }[] | null;
  } | null;
}

/** The joins `rowToOccupancy` needs. Kept beside it so the two agree. */
export const BOARDING_STAY_SELECT = `
  booking_id, room_id, occupies, override_reason,
  bookings ( ref, status, clients ( name ), booking_pets ( pets ( name, species ) ) )
` as const;

/**
 * `facilityId` is the app's numeric ref, which these rows do not carry — the
 * caller supplies it. Kept on the type because `RoomCategory` declares it and
 * the Rooms screen reads it; not worth reshaping the app's type to drop a
 * field the database expresses as a uuid join instead.
 */
export function rowToRoomCategory(
  row: RoomCategoryRow,
  facilityId: number,
): RoomCategory {
  return {
    id: row.legacy_id ?? row.id,
    facilityId,
    service: row.service as FacilityRoomService,
    name: row.name,
    description: row.description ?? undefined,
    color: row.color as RoomCategoryColor,
    sortOrder: row.sort_order,
    rules: row.rules ?? [],
    defaultCapacity: row.default_capacity,
    defaultBasePrice:
      row.default_base_price === null
        ? undefined
        : Number(row.default_base_price),
    visibleToClients: row.visible_to_clients,
    imageUrl: row.image_url ?? undefined,
  };
}

export function rowToFacilityRoom(
  row: FacilityRoomRow,
  facilityId: number,
  categoryIdByUuid: Map<string, string>,
): FacilityRoom {
  return {
    id: row.legacy_id ?? row.id,
    categoryId: categoryIdByUuid.get(row.category_id) ?? row.category_id,
    facilityId,
    name: row.name,
    active: row.active,
    // undefined, not the category's number: NULL means "whatever the category
    // says", and copying it here would stop tracking the category the moment
    // somebody edited it.
    capacity: row.capacity === null ? undefined : row.capacity,
    staffNotes: row.staff_notes ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}

/** Who is in a room for the window that was asked about. */
export interface RoomOccupancy {
  roomId: string;
  bookingRef: number;
  from: string;
  to: string;
  isOverride: boolean;
  /**
   * Who is actually in the kennel.
   *
   * The occupancy read knew WHICH BOOKING held a room and not whose dog it
   * was, which is enough to grey out a square and not enough to draw a board
   * an operator can use — "kennel 3 is taken by #1042" is not a sentence
   * anybody doing the rounds can act on.
   */
  petNames: string[];
  clientName: string;
  /** Drives the board's pet-type rules when a guest is dragged elsewhere. */
  petType: string;
  status: string;
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
  const pets = (row.bookings?.booking_pets ?? [])
    .map((bp) => bp.pets)
    .filter((p): p is { name: string; species: string } => p !== null);
  return {
    roomId,
    bookingRef: row.bookings?.ref ?? 0,
    from,
    to,
    isOverride: row.override_reason !== null,
    petNames: pets.map((p) => p.name),
    clientName: row.bookings?.clients?.name ?? "",
    // The first pet's species decides which categories will admit this guest.
    // A booking with two pets of different species is not something the room
    // rules can express, and pretending otherwise would let the board offer a
    // move the constraint would then have to refuse.
    petType: pets[0]?.species ?? "dog",
    status: row.bookings?.status ?? "",
  };
}

/** A room's effective capacity: its own, or its category's default. */
export function effectiveCapacity(
  room: FacilityRoom,
  categories: RoomCategory[],
): number {
  if (room.capacity !== undefined) return room.capacity;
  return categories.find((c) => c.id === room.categoryId)?.defaultCapacity ?? 1;
}
