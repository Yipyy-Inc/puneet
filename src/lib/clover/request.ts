import "server-only";

// ============================================================================
// Reading from Clover, with the retry their rate limiter requires.
//
// ── WHY THIS IS SHARED ────────────────────────────────────────────────────
//
// Clover answers 429 far more readily than the documentation suggests, and the
// symptom is never an error — it is a null, a missing fact, a webhook event
// closed as failed. It has now bitten twice in two different files:
//
//   merchant.ts    three parallel lookups, one 429 each burst, a NULL currency
//                  stored against a live merchant. That facility could then not
//                  take a card payment at all.
//   reconcile.ts   a payment read during a concurrent charge answered 429, the
//                  delivery closed 'failed', and NOTHING retried it — the
//                  webhook route answers 200 even on failure, precisely so that
//                  Clover does not redeliver forever, which means a dropped
//                  read stays dropped until a person looks.
//
// Both were one missing retry. Writing it twice would mean fixing it twice, so
// it lives here and every read goes through it.
//
// ── WHAT IS RETRIED, AND WHAT IS NOT ──────────────────────────────────────
//
// 429 and 5xx say "later". 401, 403 and 404 say "no", and asking again gets the
// same answer more slowly. A network throw is retried too: the request may
// never have been made.
//
// GET ONLY, deliberately. Retrying a POST that moves money is how one refund
// becomes two — /v1/charges and /v1/refunds carry an idempotency key and are
// called directly, not through this.
// ============================================================================

const TIMEOUT_MS = 15_000;
const BACKOFF_MS = [400, 1_200, 3_000];

export interface CloverRead<T> {
  /** Parsed body, or null when the read did not succeed. */
  data: T | null;
  /** The last HTTP status seen. 0 when the request never completed. */
  status: number;
  /** True when Clover refused outright — a dead token, not a busy one. */
  refused: boolean;
}

/** A GET against Clover that survives their rate limiter. */
export async function cloverGet<T>(
  origin: string,
  path: string,
  accessToken: string,
  merchantId: string,
): Promise<CloverRead<T>> {
  let status = 0;

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(new URL(path, origin), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          // Required by the ecommerce host, harmless on the platform API.
          "X-Clover-Merchant-Id": merchantId,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      status = response.status;

      if ((status === 429 || status >= 500) && attempt < BACKOFF_MS.length) {
        await wait(response.headers.get("retry-after"), attempt);
        continue;
      }

      if (!response.ok) {
        return {
          data: null,
          status,
          refused: status === 401 || status === 403,
        };
      }
      return {
        data: (await response.json().catch(() => null)) as T | null,
        status,
        refused: false,
      };
    } catch {
      if (attempt < BACKOFF_MS.length) {
        await wait(null, attempt);
        continue;
      }
      return { data: null, status, refused: false };
    }
  }
}

function wait(retryAfter: string | null, attempt: number): Promise<void> {
  const seconds = Number(retryAfter);
  const ms =
    Number.isFinite(seconds) && seconds > 0
      ? Math.min(seconds * 1000, 5_000)
      : BACKOFF_MS[attempt]!;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
