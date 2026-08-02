// ============================================================================
// Fetching real data with a signed-out fallback.
//
// The rows are real, but RLS scopes them to the signed-in caller. This existed
// because most of the app was still browsed signed-out during the auth cutover,
// and switching hard would have turned every list blank — indistinguishable
// from a bug.
//
// So: ask the API, and fall back to the mocks on 401 ONLY. Any other failure
// propagates, because a 500 or a broken shape must not be silently papered
// over with fixtures that look plausible. That distinction is the whole point
// of this helper existing rather than a try/catch per call site.
//
// THE 401 CASE IS NOW UNREACHABLE FROM THE UI. Every portal requires a session,
// so nothing signed-out gets far enough to call this. The fallback is kept for
// one reason only: the screens behind it still read mock data for tables that
// have no Postgres equivalent yet, and removing the seam before those tables
// land would just move the mock import back up into the components. It goes
// when they do — it is dead weight, not a policy.
// ============================================================================

const warned = new Set<string>();

export async function liveFetch<T>(
  path: string,
  fallback: () => T,
  label = path,
): Promise<T> {
  const response = await fetch(path);

  if (response.status === 401) {
    if (!warned.has(label)) {
      warned.add(label);
      console.info(
        `[${label}] not signed in — serving mock data. Sign in to read the real rows.`,
      );
    }
    return fallback();
  }

  if (!response.ok) {
    throw new Error(`Failed to load ${label} (${response.status})`);
  }

  return (await response.json()) as T;
}

/**
 * A write that is genuinely optional because there is nowhere to send it:
 * signed out, there is no session and no rows to own. Returns `null` on 401
 * and behaves exactly like `liveWrite` otherwise — a real failure still
 * throws.
 *
 * Only for state that also has a local home (the role editor's localStorage
 * fallback). Never for a write whose whole purpose is to persist.
 */
export async function liveWriteOptional<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT",
  body: unknown,
): Promise<T | null> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(detail ?? `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

/** Write helper — no fallback, because a write must never silently no-op. */
export async function liveWrite<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT",
  body: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => null);
    throw new Error(detail ?? `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}
