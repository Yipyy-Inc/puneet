import { admittedSpecies } from "@/lib/capacity-engine";
import {
  weightLimitsOf,
  type WeightLimits,
} from "@/lib/rooms/lodging-eligibility";
import type { RoomRule } from "@/types/rooms";

// ============================================================================
// What a room card says about the room (the client's mock, 2026-10-01):
//
//   Condo
//   4 × 4 ft · pets up to 11.3 kg (25 lb)
//   [Raised bed] [Climate control] [2 potty breaks]
//
// The size words and the chips are the facility's own
// (`room_categories.dimensions_label`, `.features`, 20261002122808) — never
// translated, never measured. The limit half of the line is read from the
// rules the capacity engine already enforces, so the card cannot promise a
// pet a room the booking would then refuse.
//
// The database holds the same bounds (60 characters, eight chips); these are
// the screen's copy of them, so a manager is told before the save is refused.
// ============================================================================

export const MAX_DIMENSIONS_LENGTH = 60;
export const MAX_FEATURES = 8;
export const MAX_FEATURE_LENGTH = 40;

/** The size words as typed: trimmed, and blank is none. */
export function cleanDimensions(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, MAX_DIMENSIONS_LENGTH) : null;
}

/**
 * The chips as typed: trimmed, no blanks, no repeats (case folded, the first
 * spelling kept), each at most 40 characters, eight at most.
 */
export function cleanFeatures(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const text = raw.trim().replace(/\s+/g, " ").slice(0, MAX_FEATURE_LENGTH);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length === MAX_FEATURES) break;
  }
  return out;
}

/** What the rules let in, for the card's size line. */
export interface RoomLimits {
  weight: WeightLimits;
  /** The facility's own species names; null when any species is admitted. */
  species: string[] | null;
}

export function roomLimitsOf(rules: readonly RoomRule[]): RoomLimits {
  return {
    weight: weightLimitsOf([...rules]),
    species: admittedSpecies([...rules]),
  };
}

/** The limits of several lodging types a card books into: the loosest. */
export function loosestLimits(all: readonly RoomLimits[]): RoomLimits {
  if (all.length === 0) return { weight: {}, species: null };
  const mins = all.map((l) => l.weight.minLb);
  const maxes = all.map((l) => l.weight.maxLb);
  const anySpecies = all.some((l) => l.species === null);
  return {
    weight: {
      // A side without a limit on ANY type is no limit on the card.
      minLb: mins.some((m) => m === undefined)
        ? undefined
        : Math.min(...(mins as number[])),
      maxLb: maxes.some((m) => m === undefined)
        ? undefined
        : Math.max(...(maxes as number[])),
    },
    species: anySpecies
      ? null
      : [...new Set(all.flatMap((l) => l.species ?? []))],
  };
}
