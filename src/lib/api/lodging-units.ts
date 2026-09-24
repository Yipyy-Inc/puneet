// ============================================================================
// NAMING THE UNITS OF A LODGING TYPE, THE WAY MoéGo NAMES THEM.
//
// MoéGo's "Add lodging" offers two ways in, and this is the second — the bulk
// one:
//
//   "Input total unit quantity: number of unit you have under this lodging
//    type. Prefix: Refers to the initial part of the unit name, such as 'Room'
//    in 'Room001', and includes the starting number for auto-generated room
//    codes (e.g., Room 101, Room 102, etc.)."
//
// and its own worked examples:
//
//   no prefix          → "1, 2, 3"
//   prefix "VIP Suite" → "VIP Suite 1, VIP Suite 2, VIP Suite 3"
//
// ── WHAT THIS REPLACES, AND WHY IT IS NOT THE SAME ────────────────────────
//
// The Rooms page has always auto-generated units, but with the CATEGORY's name
// hardcoded as the prefix and a zero-padded counter always starting at one:
// "Deluxe Suite 01", "Deluxe Suite 02". A facility whose kennels are numbered
// 101-116, or lettered, or simply 1-3, could not say so — the screen decided
// for them and they renamed every unit afterwards.
//
// So the prefix is now theirs, the first number is theirs, and NEITHER is
// required: leaving both alone reproduces MoéGo's "1, 2, 3".
//
// ── PADDING IS DERIVED, NOT ASKED FOR ─────────────────────────────────────
//
// MoéGo writes "Room001" in its own prose and "Room 101" in its example, which
// are different paddings — because the padding is a consequence of the numbers,
// not a separate question. A run that reaches 3 needs no padding; one that
// reaches 116 needs three digits so the list sorts. So it is taken from the
// LAST number in the run, and every unit in one run is padded alike.
// ============================================================================

export interface UnitNaming {
  /** How many units to make. */
  count: number;
  /** MoéGo's Prefix. Empty or absent gives bare numbers, as MoéGo's does. */
  prefix?: string;
  /** The first number. Absent means 1. */
  start?: number;
}

export interface GeneratedUnit {
  /** The app-facing id, unique within the facility. */
  legacyId: string;
  /** What staff read on the board. */
  name: string;
  sortOrder: number;
}

/** `cat-deluxe-1` — slug-safe, so it can be an id. */
function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The units a lodging type starts life with.
 *
 * `categoryLegacyId` keys the ids so two types may both hold a "Room 101"
 * without colliding — `facility_rooms.legacy_id` is unique per FACILITY, not
 * per type, and two buildings numbering from 101 is the normal case rather
 * than the odd one.
 */
export function generateUnits(
  naming: UnitNaming,
  categoryLegacyId: string,
): GeneratedUnit[] {
  const count = Math.max(0, Math.floor(naming.count));
  if (count === 0) return [];

  const start = Number.isFinite(naming.start) ? Math.floor(naming.start!) : 1;
  const prefix = (naming.prefix ?? "").trim();

  // From the last number, so "1..3" stays "1, 2, 3" and "101..116" stays three
  // digits throughout rather than switching width partway down the list.
  const width = String(start + count - 1).length;

  return Array.from({ length: count }, (_, i) => {
    const n = String(start + i).padStart(width, "0");
    const name = prefix ? `${prefix} ${n}` : n;
    return {
      legacyId: `${categoryLegacyId}-${slugPart(name) || n}`,
      name,
      sortOrder: i + 1,
    };
  });
}
