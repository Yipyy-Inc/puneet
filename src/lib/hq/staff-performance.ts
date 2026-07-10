import type { Location } from "@/types/location";
import type { StaffCrossLocationPerformance } from "@/data/hq-analytics";

// Cross-location staff performance computations, shared by the Staff Pool
// inline expander (and previously the standalone HQ report).

/** Delta in stars between a member's best/worst location that flags coaching. */
export const RATING_THRESHOLD = 0.4;

export interface RatingDivergence {
  delta: number;
  bestLocation?: Location;
  worstLocation?: Location;
  bestRating: number;
  worstRating: number;
}

/**
 * Detects a meaningful rating gap for a staff member who works at multiple
 * locations. Returns null when they work at one location or ratings are close.
 */
export function getRatingDivergence(
  perf: StaffCrossLocationPerformance,
  locations: Location[],
): RatingDivergence | null {
  if (perf.locations.length < 2) return null;
  const ratings = perf.locations.map((l) => l.avgRating);
  const max = Math.max(...ratings);
  const min = Math.min(...ratings);
  if (max - min < RATING_THRESHOLD) return null;
  const best = perf.locations.find((l) => l.avgRating === max);
  const worst = perf.locations.find((l) => l.avgRating === min);
  return {
    delta: max - min,
    bestLocation: locations.find((l) => l.id === best?.locationId),
    worstLocation: locations.find((l) => l.id === worst?.locationId),
    bestRating: max,
    worstRating: min,
  };
}
