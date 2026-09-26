// ============================================================================
// A booking's stays, in the order its pet sleeps in them.
//
// ── WHY A BOOKING HAS MORE THAN ONE ───────────────────────────────────────
//
// Split lodging: a booking can move kennels part-way — nights 1–3 in Suite 4,
// nights 4–6 in Condo 12 — so `boarding_stays` holds a booking's stays as a
// SEQUENCE, `segment_order` from 1, which the database keeps tiling the
// booking with no gap and no overlap. Until then there was one stay per
// booking, and PostgREST embedded it as one object; now it is a list.
//
// ── TWO FACTS, READ FROM DIFFERENT ROWS ───────────────────────────────────
//
// PRESENCE — arrival and departure — belongs to the booking, not to a
// kennel, and the database stamps it on the FIRST stay only. A later stay's
// `status` therefore reads `scheduled` forever, and reading presence from it
// would show every moved guest as expected.
//
// THE KENNEL for a night is the stay that has begun by then. On the day of a
// move that is the new kennel, because the pet sleeps there that night.
// ============================================================================

export interface StaySegmentLike {
  segment_order?: number | null;
  /** A `tstzrange`, as PostgREST sends it: `["2026-10-01 18:00:00+00",…)`. */
  occupies?: unknown;
}

/** One stay, a list of them, or none — in the order the pet sleeps in them. */
export function staysInOrder<T extends StaySegmentLike>(
  value: T | readonly T[] | null | undefined,
): T[] {
  const list: T[] = Array.isArray(value)
    ? [...(value as readonly T[])]
    : value
      ? [value as T]
      : [];
  return list.sort((a, b) => (a.segment_order ?? 1) - (b.segment_order ?? 1));
}

/** The stay that carries the booking's arrival and departure. */
export function firstStay<T extends StaySegmentLike>(
  value: T | readonly T[] | null | undefined,
): T | null {
  return staysInOrder(value)[0] ?? null;
}

/**
 * A timestamp as Postgres writes one — `2026-10-01 18:00:00+00` — in
 * milliseconds. `Date.parse` does not promise to read that spelling, so it is
 * rewritten as ISO first; an ISO string passes through unchanged.
 */
export function pgTimestamp(value: string): number | null {
  const raw = value.trim();
  if (!raw || raw === "-infinity" || raw === "infinity") return null;
  const iso = raw
    .replace(" ", "T")
    .replace(/([+-]\d{2})$/, "$1:00")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Where a range begins, in milliseconds — or null when it has no lower bound
 * or is not a range at all.
 */
export function rangeStart(occupies: unknown): number | null {
  if (typeof occupies !== "string") return null;
  const match = /^[[(]\s*"?([^",]*)"?\s*,/.exec(occupies);
  const raw = match?.[1];
  return raw ? pgTimestamp(raw) : null;
}

/**
 * The stay the pet sleeps in on the night of `day` (YYYY-MM-DD): the last one
 * that has begun by the end of that day. Before the booking starts that is
 * the first stay, and on the departure day the last.
 */
export function stayForNight<T extends StaySegmentLike>(
  value: T | readonly T[] | null | undefined,
  day: string,
): T | null {
  const stays = staysInOrder(value);
  const endOfDay = Date.parse(`${day}T23:59:59.999Z`);
  let chosen: T | null = stays[0] ?? null;
  for (const stay of stays) {
    const start = rangeStart(stay.occupies);
    if (start !== null && start <= endOfDay) chosen = stay;
  }
  return chosen;
}
