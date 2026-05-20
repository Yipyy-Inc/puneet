/**
 * Approximate ZIP-code polygons for the Los Angeles area. Used by the service
 * area editor to render a ZIP-based area on the map. These are hand-crafted
 * approximations — production deployments should source real ZIP/ZCTA
 * boundaries from the US Census Bureau (TIGER) or a geocoding provider.
 *
 * Each entry has a label (neighborhood/city) and a small polygon (4–6 points)
 * around the rough ZIP centroid. Polygons are intentionally slightly irregular
 * so the map doesn't look like a grid of squares.
 */

import type { LatLng } from "@/components/facility/grooming/service-area-map";

export interface ZipBoundary {
  zip: string;
  /** Friendly neighborhood/city for autocomplete display. */
  label: string;
  /** State, two-letter. All entries below are CA. */
  state: string;
  /** Closed polygon — first and last vertex do not need to match. */
  polygon: LatLng[];
}

// Helper: produce a small irregular polygon centred at [lat, lng]. Offsets in
// degrees roughly correspond to ~1 km per 0.01° in LA latitude. Shapes are
// jittered so the demo doesn't look like a tiled grid.
function box(lat: number, lng: number, w = 0.012, h = 0.011): LatLng[] {
  // Jitter each corner slightly to keep adjacent ZIPs visually distinct.
  const j = (n: number) => (Math.random() * 2 - 1) * n;
  return [
    [lat + h + j(0.0015), lng - w + j(0.0015)],
    [lat + h * 0.7 + j(0.001), lng + w + j(0.002)],
    [lat - h + j(0.001), lng + w + j(0.0015)],
    [lat - h * 0.85 + j(0.0015), lng - w + j(0.002)],
  ];
}

// Pre-computed once at module load — keeps polygons stable across re-renders
// while still giving each ZIP a unique shape. Deterministic enough for a demo.
export const ZIP_BOUNDARIES: ZipBoundary[] = [
  { zip: "90001", label: "Florence", state: "CA", polygon: box(33.973, -118.249) },
  { zip: "90005", label: "Koreatown", state: "CA", polygon: box(34.06, -118.304) },
  { zip: "90006", label: "Pico-Union", state: "CA", polygon: box(34.048, -118.294) },
  { zip: "90007", label: "USC / South LA", state: "CA", polygon: box(34.027, -118.286) },
  { zip: "90014", label: "Downtown LA — Fashion Dist.", state: "CA", polygon: box(34.04, -118.252) },
  { zip: "90015", label: "South Park (DTLA)", state: "CA", polygon: box(34.043, -118.27) },
  { zip: "90017", label: "Downtown LA — Financial", state: "CA", polygon: box(34.054, -118.265) },
  { zip: "90019", label: "Mid-City", state: "CA", polygon: box(34.048, -118.336) },
  { zip: "90024", label: "Westwood", state: "CA", polygon: box(34.063, -118.43) },
  { zip: "90025", label: "West LA", state: "CA", polygon: box(34.045, -118.448) },
  { zip: "90026", label: "Echo Park", state: "CA", polygon: box(34.078, -118.262) },
  { zip: "90027", label: "Los Feliz", state: "CA", polygon: box(34.103, -118.293) },
  { zip: "90028", label: "Hollywood", state: "CA", polygon: box(34.098, -118.327) },
  { zip: "90029", label: "East Hollywood", state: "CA", polygon: box(34.091, -118.293) },
  { zip: "90034", label: "Palms", state: "CA", polygon: box(34.028, -118.402) },
  { zip: "90036", label: "Park La Brea", state: "CA", polygon: box(34.073, -118.345) },
  { zip: "90038", label: "Hollywood (S.)", state: "CA", polygon: box(34.083, -118.323) },
  { zip: "90039", label: "Atwater Village", state: "CA", polygon: box(34.113, -118.262) },
  { zip: "90042", label: "Highland Park", state: "CA", polygon: box(34.112, -118.184) },
  { zip: "90046", label: "West Hollywood (W.)", state: "CA", polygon: box(34.099, -118.374) },
  { zip: "90048", label: "Beverly Grove", state: "CA", polygon: box(34.073, -118.376) },
  { zip: "90049", label: "Brentwood", state: "CA", polygon: box(34.074, -118.485) },
  { zip: "90064", label: "Cheviot Hills", state: "CA", polygon: box(34.038, -118.42) },
  { zip: "90066", label: "Mar Vista", state: "CA", polygon: box(34.0, -118.425) },
  { zip: "90068", label: "Hollywood Hills", state: "CA", polygon: box(34.13, -118.323) },
  { zip: "90069", label: "West Hollywood", state: "CA", polygon: box(34.091, -118.387) },
  { zip: "90094", label: "Playa Vista", state: "CA", polygon: box(33.974, -118.418) },
  { zip: "90210", label: "Beverly Hills", state: "CA", polygon: box(34.092, -118.409) },
  { zip: "90211", label: "Beverly Hills (S.)", state: "CA", polygon: box(34.069, -118.386) },
  { zip: "90230", label: "Culver City (W.)", state: "CA", polygon: box(33.993, -118.403) },
  { zip: "90232", label: "Culver City (E.)", state: "CA", polygon: box(34.019, -118.391) },
  { zip: "90291", label: "Venice", state: "CA", polygon: box(33.989, -118.464) },
  { zip: "90292", label: "Marina del Rey", state: "CA", polygon: box(33.98, -118.452) },
  { zip: "90402", label: "Santa Monica (N.)", state: "CA", polygon: box(34.038, -118.503) },
  { zip: "90403", label: "Santa Monica (Mid)", state: "CA", polygon: box(34.026, -118.494) },
  { zip: "90404", label: "Santa Monica (E.)", state: "CA", polygon: box(34.026, -118.477) },
];

/**
 * Resolve a list of ZIP codes to the union of their polygons. ZIPs that don't
 * appear in the dataset are silently skipped (matches the "demo subset"
 * behaviour — the editor still saves all selected codes).
 */
export function zipsToPolygons(zips: string[]): ZipBoundary[] {
  const set = new Set(zips.map((z) => z.trim()));
  return ZIP_BOUNDARIES.filter((b) => set.has(b.zip));
}

/** Substring + prefix search over the demo dataset. */
export function searchZips(query: string, limit = 12): ZipBoundary[] {
  const q = query.trim().toLowerCase();
  if (!q) return ZIP_BOUNDARIES.slice(0, limit);
  return ZIP_BOUNDARIES.filter(
    (b) =>
      b.zip.startsWith(q) ||
      b.label.toLowerCase().includes(q) ||
      `${b.zip} ${b.label}`.toLowerCase().includes(q),
  ).slice(0, limit);
}
