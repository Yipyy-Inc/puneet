// ============================================================================
// Who someone is, remembered for a few seconds.
//
// ── WHY ───────────────────────────────────────────────────────────────────
//
// Every server request answers "who is this and which facility are they in",
// and `cache()` makes that once per REQUEST — but a page load is about 37
// requests, all asking within a second or two, and each paid four database
// reads for the same answer. Measured 2026-09-26 from the edge logs: of
// 1,040,161 API requests in a day, `profiles`, `facility_memberships`,
// `facilities` and `locations` were 73%, and the organisation's log ingestion
// sat at 16.8 of 20 GB. So one answer serves a session for a few seconds.
//
// ── WHAT IT MAY NOT CHANGE ────────────────────────────────────────────────
//
// The KEY holds everything the answer depends on — the person and their
// session, and for a facility the hostname, the switcher's cookie and the
// branch header — so a cached answer is always one this caller would have
// been given. Nothing about DATA access is cached: row-level security judges
// every query as the caller, so a revoked membership loses its rows at once.
// What can lag, by at most the TTL, is routing — which portal a gate sends
// somebody to. The app's own writes to those tables forget everything at once
// (`forgetIdentities`), so a screen that changes a name or a role reads the
// change back on the next request.
//
// The IN-FLIGHT answer is what is kept, so the 37 requests of one page load
// share one read rather than each starting their own before the first lands.
// A failure is not kept: the next caller asks again.
// ============================================================================

/** Long enough to cover one page load's burst, short enough to be a delay. */
export const IDENTITY_TTL_MS = 10_000;

export interface IdentityCache<T> {
  /**
   * The answer for `key`, loading it once however many callers ask at once.
   * `keep` decides whether a settled answer may be served again — an answer
   * that is still arriving (a profile the sign-up webhook has not written
   * yet) is not.
   */
  get(
    key: string,
    load: () => Promise<T>,
    keep?: (value: T) => boolean,
  ): Promise<T>;
  clear(): void;
  readonly size: number;
}

export function identityCache<T>(
  ttlMs: number,
  max = 500,
  now: () => number = Date.now,
): IdentityCache<T> {
  const entries = new Map<string, { expires: number; value: Promise<T> }>();

  const forget = (key: string, value: Promise<T>) => {
    if (entries.get(key)?.value === value) entries.delete(key);
  };

  return {
    get(key, load, keep) {
      const at = now();
      const hit = entries.get(key);
      if (hit && hit.expires > at) return hit.value;
      if (hit) entries.delete(key);

      const value = load();
      entries.set(key, { expires: at + ttlMs, value });
      value.then(
        (settled) => {
          if (keep && !keep(settled)) forget(key, value);
        },
        () => forget(key, value),
      );

      // Oldest first: a Map iterates in insertion order.
      while (entries.size > max) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      return value;
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    },
  };
}

const registry = new Set<{ clear(): void }>();

/** Registers a cache so `forgetIdentities` can empty it. */
export function registerIdentityCache<C extends { clear(): void }>(
  cache: C,
): C {
  registry.add(cache);
  return cache;
}

/**
 * Forget every remembered identity, for everyone.
 *
 * Called after a write that can change who somebody is or where they belong —
 * a membership, a profile, a facility, a location. Everyone and not just the
 * writer, because the write is often about SOMEBODY ELSE (an owner changing a
 * groomer's access), and the next request of each person simply reads again.
 */
export function forgetIdentities(): void {
  for (const cache of registry) cache.clear();
}

/**
 * Run a route handler, and forget every identity once it has succeeded.
 *
 * For the handlers that write a membership, a profile, a facility or a
 * location: a handler has many ways to succeed and one wrapper covers them
 * all, where a call before each `return` would miss the next one added.
 */
export async function forgettingIdentities(
  run: () => Promise<Response>,
): Promise<Response> {
  const response = await run();
  if (response.ok) forgetIdentities();
  return response;
}
