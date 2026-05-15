// Lightweight client-side tracker for no-show counts per client. localStorage
// is used so the "No-Show Risk" tag survives reloads. Real implementation
// stores this on the customer record via the backend.

const STORAGE_KEY = "yipyy_grooming_no_show_counts";
export const NO_SHOW_RISK_THRESHOLD = 2;

type Counts = Record<string, number>;

function read(): Counts {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Counts) : {};
  } catch {
    return {};
  }
}

function write(next: Counts) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getNoShowCount(ownerId: number | string): number {
  return read()[String(ownerId)] ?? 0;
}

export function incrementNoShow(ownerId: number | string): number {
  const counts = read();
  const next = (counts[String(ownerId)] ?? 0) + 1;
  counts[String(ownerId)] = next;
  write(counts);
  return next;
}

export function isNoShowRisk(ownerId: number | string): boolean {
  return getNoShowCount(ownerId) >= NO_SHOW_RISK_THRESHOLD;
}

/** Test/dev helper — clears all tracked counts. */
export function resetNoShowCounts(): void {
  write({});
}
