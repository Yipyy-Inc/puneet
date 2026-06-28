import type { Integration } from "./system-administration";

// Deterministic synthesis of an integration's recent error log (the "last 50
// errors" table). No real integration-error dataset exists, so we generate a
// stable list keyed by integration id (mulberry32 PRNG) anchored to the
// integration's lastRequest — identical on server + client, no Date.now().
// The request count / success rate shown elsewhere stay REAL (usageStats);
// only this per-error breakdown is derived.

export interface IntegrationLogError {
  id: string;
  timestamp: string;
  statusCode: number;
  endpoint: string;
  message: string;
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  let s = a >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ERROR_CODES: { code: number; msg: string }[] = [
  { code: 401, msg: "Unauthorized — credential rejected by provider" },
  { code: 403, msg: "Forbidden — required scope/permission missing" },
  { code: 429, msg: "Rate limit exceeded — too many requests" },
  { code: 500, msg: "Internal server error at provider" },
  { code: 502, msg: "Bad gateway — upstream provider error" },
  { code: 503, msg: "Service unavailable — provider maintenance window" },
  { code: 504, msg: "Gateway timeout — provider did not respond in time" },
  { code: 408, msg: "Request timeout" },
];

const PATHS = [
  "/messages",
  "/send",
  "/charges",
  "/events",
  "/sync",
  "/auth/token",
];

/** Build the deterministic recent-error list for an integration (≤ 50). */
export function buildIntegrationErrors(
  integration: Integration,
): IntegrationLogError[] {
  const rng = mulberry32(hashSeed(integration.id));
  const isError = integration.status === "Error";
  // Lower success rate → more errors; Error integrations always show a full page.
  const derived = Math.round((100 - integration.usageStats.successRate) * 5);
  const count = Math.min(50, Math.max(isError ? 14 : 3, derived));

  const host = integration.apiEndpoint.replace(/^https?:\/\//, "");
  let t = new Date(
    integration.lastSuccessfulCall ?? integration.usageStats.lastRequest,
  ).getTime();

  const errors: IntegrationLogError[] = [];
  for (let i = 0; i < count; i++) {
    let code: number;
    let msg: string;
    if (i === 0 && isError && integration.errorMessage) {
      // Most-recent error mirrors the live error message shown on the card.
      code = 401;
      msg = integration.errorMessage;
    } else {
      const e = ERROR_CODES[Math.floor(rng() * ERROR_CODES.length)];
      code = e.code;
      msg = e.msg;
    }
    const path = PATHS[Math.floor(rng() * PATHS.length)];
    errors.push({
      id: `${integration.id}-err-${i}`,
      timestamp: new Date(t).toISOString(),
      statusCode: code,
      endpoint: `${host}${path}`,
      message: msg,
    });
    // Step back 10 min – 6 h between errors.
    t -= Math.floor(rng() * 6 * 3_600_000) + 600_000;
  }
  return errors;
}
