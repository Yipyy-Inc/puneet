import "server-only";

import { timingSafeEqual } from "node:crypto";

// ============================================================================
// Reading what Clover sent, and deciding whether to believe it came from them.
//
// ── THERE IS NO SIGNATURE ─────────────────────────────────────────────────
//
// Clover does not sign webhook deliveries. `X-Clover-Auth` is a STATIC UUID
// shown in the developer dashboard and repeated on every message, so possession
// is the whole proof: there is no per-message integrity, no timestamp, and no
// replay protection in the protocol itself.
//
// That is worth stating plainly rather than dressing up, because it decides how
// much the handler may act on. A delivery is treated as a HINT that something
// changed — never as a statement of what changed. Whatever it names is re-read
// from Clover's API, with the merchant's own token, before anything moves.
//
// Replay is handled where it can be: the delivery is recorded under a unique
// (merchant, object, change, ts), so the same message twice is one event.
// ============================================================================

/** The shared secret, or null when this deployment has not been given one. */
export function webhookSecret(): string | null {
  return process.env.CLOVER_WEBHOOK_SIGNING_SECRET?.trim() || null;
}

/**
 * Whether this delivery carries the shared secret.
 *
 * Compared in constant time. The length check in front of it is not an
 * optimisation — `timingSafeEqual` THROWS on differing lengths — and leaking
 * the length of a UUID costs nothing anyone can use.
 */
export function authenticDelivery(header: string | null): boolean {
  const secret = webhookSecret();
  if (!secret || !header) return false;

  const given = Buffer.from(header);
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export interface CloverDelivery {
  merchantId: string;
  /** "P" payments, "A" apps, "O" orders, "M" merchants… */
  objectKind: string;
  objectId: string;
  /** CREATE / UPDATE / DELETE. */
  change: string | null;
  occurredAt: string | null;
}

interface RawEvent {
  objectId?: unknown;
  type?: unknown;
  ts?: unknown;
}

/**
 * The verification handshake, which is a DIFFERENT message entirely:
 *
 *     {"verificationCode":"5220ecf5-7dea-4396-b0ba-a1659c182887"}
 *
 * It has no merchant, no object and — per Clover's own documentation — no auth
 * header, because the header only starts appearing once the URL is verified.
 * So it cannot be authenticated, and the route treats it accordingly.
 */
export function verificationCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const code = (payload as { verificationCode?: unknown }).verificationCode;
  return typeof code === "string" && code.length > 0 && code.length <= 100
    ? code
    : null;
}

/**
 * Flatten Clover's shape into one row per thing that happened.
 *
 *     { appId, merchants: { "<MID>": [ { objectId: "P:XYZ", type, ts } ] } }
 *
 * One delivery can name several merchants and several objects each, so the
 * handler works on a list rather than on the envelope. Anything malformed is
 * dropped here rather than carried forward as a half-parsed event — the raw
 * payload is stored either way, so nothing is lost by being strict.
 */
export function parseDeliveries(payload: unknown): {
  appId: string | null;
  deliveries: CloverDelivery[];
} {
  if (!payload || typeof payload !== "object") {
    return { appId: null, deliveries: [] };
  }

  const envelope = payload as { appId?: unknown; merchants?: unknown };
  const appId = typeof envelope.appId === "string" ? envelope.appId : null;

  if (!envelope.merchants || typeof envelope.merchants !== "object") {
    return { appId, deliveries: [] };
  }

  const deliveries: CloverDelivery[] = [];
  for (const [merchantId, events] of Object.entries(
    envelope.merchants as Record<string, unknown>,
  )) {
    if (!Array.isArray(events)) continue;

    for (const event of events as RawEvent[]) {
      if (typeof event?.objectId !== "string") continue;

      // "P:R80S1AJ1E0SZP" — kind, then the id. Split on the FIRST colon only:
      // an id containing one would otherwise lose its tail.
      const colon = event.objectId.indexOf(":");
      if (colon <= 0) continue;

      const occurredAt =
        typeof event.ts === "number" && Number.isFinite(event.ts)
          ? new Date(event.ts).toISOString()
          : null;

      deliveries.push({
        merchantId,
        objectKind: event.objectId.slice(0, colon),
        objectId: event.objectId.slice(colon + 1),
        change: typeof event.type === "string" ? event.type : null,
        occurredAt,
      });
    }
  }

  return { appId, deliveries };
}
