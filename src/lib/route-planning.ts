// Lightweight route-planning utilities used by the Route Planner tab.
//
// We don't have a real geocoder wired up, so coordinates are derived
// deterministically from address strings via a small string hash. The result
// is stable visualisation that lets us draw routes + estimate drive times
// without a backend. When real geocoding lands, swap `pseudoCoord` for the
// real lookup and the rest of the math keeps working.

export type Coord = { x: number; y: number };

export function pseudoCoord(seed: string): Coord {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < seed.length; i++) {
    h1 = (h1 * 31 + seed.charCodeAt(i)) | 0;
    h2 = (h2 * 17 + seed.charCodeAt(i) * 13) | 0;
  }
  // Keep stops in a 10–90 box so pins don't sit on the edge of the map SVG.
  return {
    x: 10 + (Math.abs(h1) % 81),
    y: 10 + (Math.abs(h2) % 81),
  };
}

export function distance(a: Coord, b: Coord): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Rough drive-time estimate: 1 coordinate-unit ≈ 1 minute, with a 2-minute
 * minimum to account for parking/setup. Real geocoding + routing API would
 * replace this.
 */
export function driveMinutes(a: Coord, b: Coord): number {
  return Math.max(2, Math.round(distance(a, b)));
}

/**
 * Rough kilometre estimate paired with `driveMinutes`. ~25 km/h average urban
 * speed, so each coordinate unit ≈ 0.4 km. Replaced by the Google Maps
 * Directions response when real geocoding lands.
 */
export function driveKilometres(a: Coord, b: Coord): number {
  return Math.round(distance(a, b) * 0.4 * 10) / 10;
}

/**
 * Formats the precise appointment time as a client-facing arrival window.
 * Window straddles the precise time: half of the window before, half after,
 * clipped to the start of day. Returns `{ start, end }` as HH:MM strings.
 */
export function arrivalWindow(
  preciseStart: string,
  windowMinutes: number,
): { start: string; end: string } {
  const [h, m] = preciseStart.split(":").map(Number);
  const center = h * 60 + m;
  const half = Math.round(windowMinutes / 2);
  const startMin = Math.max(0, center - half);
  const endMin = Math.min(23 * 60 + 59, center + (windowMinutes - half));
  const fmt = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(
      2,
      "0",
    )}`;
  return { start: fmt(startMin), end: fmt(endMin) };
}

/**
 * Returns true when `client` sits within `radiusKm` of any route stop. Uses
 * pseudo-coord distances so it correlates with the map's pin spacing.
 */
export function isNearAnyStop(
  client: Coord,
  stops: Coord[],
  radiusKm: number,
): boolean {
  const radiusUnits = radiusKm / 0.4;
  return stops.some((s) => distance(client, s) <= radiusUnits);
}

export type RouteStop<T> = {
  payload: T;
  coord: Coord;
};

/**
 * Nearest-neighbour route from `home` through all `stops`. Greedy and not
 * optimal, but produces a noticeably better order than naive time-sorting
 * for a handful of stops, which is what we have to deal with.
 */
export function optimizeNearestNeighbor<T>(
  home: Coord,
  stops: RouteStop<T>[],
): RouteStop<T>[] {
  const remaining = [...stops];
  const out: RouteStop<T>[] = [];
  let current = home;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = distance(current, remaining[i].coord);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    out.push(next);
    current = next.coord;
  }
  return out;
}

// ── Time chain ───────────────────────────────────────────────────────────────

function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(mins: number): string {
  const total = Math.max(0, Math.min(23 * 60 + 59, mins));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export type ScheduledStop = {
  /** The original appointment's start time (HH:MM). */
  originalStart: string;
  /** The original appointment's end time (HH:MM). */
  originalEnd: string;
  coord: Coord;
};

export type ScheduledChain<T> = {
  payload: T;
  coord: Coord;
  /** Minutes spent driving to reach this stop from the previous one (or home). */
  driveMinutesIn: number;
  /** Recomputed start time after the route order is applied. */
  newStart: string;
  /** Recomputed end time after the route order is applied. */
  newEnd: string;
  /** True when newStart differs from the original by at least one minute. */
  changed: boolean;
};

/**
 * Walk an ordered route, chaining drive times forward so each stop's start
 * pushes back from the previous stop's end + the drive time to reach it.
 * Stop 1 anchors at its own original start time so the day doesn't shift
 * earlier; subsequent stops cascade from there.
 */
export function chainScheduledStops<T extends ScheduledStop>(
  home: Coord,
  ordered: T[],
): ScheduledChain<T>[] {
  if (ordered.length === 0) return [];
  const out: ScheduledChain<T>[] = [];
  let prevCoord = home;
  let prevEndMin = 0;

  for (let i = 0; i < ordered.length; i++) {
    const stop = ordered[i];
    const drive = driveMinutes(prevCoord, stop.coord);
    const duration =
      parseTime(stop.originalEnd) - parseTime(stop.originalStart);

    let startMin: number;
    if (i === 0) {
      // Anchor the day on the first stop's original start time.
      startMin = parseTime(stop.originalStart);
    } else {
      startMin = prevEndMin + drive;
    }
    const endMin = startMin + Math.max(0, duration);
    const newStart = formatTime(startMin);
    const newEnd = formatTime(endMin);
    const originalStartMin = parseTime(stop.originalStart);
    const changed = Math.abs(startMin - originalStartMin) >= 1;

    out.push({
      payload: stop as unknown as T,
      coord: stop.coord,
      driveMinutesIn: drive,
      newStart,
      newEnd,
      changed,
    });
    prevCoord = stop.coord;
    prevEndMin = endMin;
  }
  return out;
}
