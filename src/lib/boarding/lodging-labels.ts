import type { FacilityRoom, RoomCategory } from "@/types/rooms";

/** A boarding room type a rate can book into, keyed the way the rate names it. */
export interface LodgingLabel {
  /** The category's `rowId` — `lodging_type_ids` holds uuids, never `id`. */
  id: string;
  /** "Suites · 11 kennels". */
  label: string;
}

/**
 * Every boarding room type, named with how many kennels it has.
 *
 * The count is not decoration, and it counts ACTIVE kennels only. A facility
 * can hold two room types with the same name — Doggieville had two "Suites"
 * on 2026-09-26, both made on 2026-08-07 with 11 kennels each, one set
 * switched off on 2026-09-22 — and a rate tied to the retired one books
 * nowhere. By name alone the two read the same in the editor and on the card;
 * by name and live kennels ("Suites · 11 kennels", "Suites · 0 kennels") they
 * cannot.
 *
 * A category with no `rowId` is a draft and cannot be named in
 * `lodging_type_ids`, so it is left out, as the editor always has.
 */
export function lodgingLabels(
  categories: readonly RoomCategory[],
  rooms: readonly FacilityRoom[],
  kennels: (count: number) => string,
): LodgingLabel[] {
  const counts = new Map<string, number>();
  for (const room of rooms) {
    if (!room.active) continue;
    counts.set(room.categoryId, (counts.get(room.categoryId) ?? 0) + 1);
  }
  return categories
    .filter((c) => c.service === "boarding" && c.rowId)
    .map((c) => ({
      id: c.rowId as string,
      label: `${c.name} · ${kennels(counts.get(c.id) ?? 0)}`,
    }));
}
