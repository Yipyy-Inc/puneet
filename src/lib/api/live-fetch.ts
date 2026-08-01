// ============================================================================
// Fetching real data with a signed-out fallback.
//
// The rows are real, but RLS scopes them to the signed-in caller. With
// AUTH_ENFORCED off, most of the app is still browsed signed-out, and
// switching hard would turn every list blank — indistinguishable from a bug.
//
// So: ask the API, and fall back to the mocks on 401 ONLY. Any other failure
// propagates, because a 500 or a broken shape must not be silently papered
// over with fixtures that look plausible. That distinction is the whole point
// of this helper existing rather than a try/catch per call site.
//
// This dies with AUTH_ENFORCED. When every portal requires a session, there is
// no signed-out case left to serve.
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

/** POST/PATCH helper — no fallback, because a write must never silently no-op. */
export async function liveWrite<T>(
  path: string,
  method: "POST" | "PATCH",
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
