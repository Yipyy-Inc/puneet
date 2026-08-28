import { createHash, randomBytes } from "node:crypto";

// ============================================================================
// The survey link token.
//
// ── THE PLAINTEXT IS NEVER STORED ─────────────────────────────────────────
//
// `review_requests.token_hash` holds sha256 of the token and nothing else. The
// plaintext exists twice: for the moment it takes to render it into the message
// body, and afterwards only in the customer's own inbox. A leaked database
// backup therefore does not hand somebody the ability to answer surveys as
// other people's customers.
//
// This mirrors `src/lib/api/onboarding-token.ts`, which mirrors
// `platform_invitations`. It is a deliberate copy rather than a shared helper:
// they are three token families with three lifetimes, and either should be free
// to change how it hashes without silently invalidating every live link
// belonging to the others.
//
// ── AND IT IS NOT Math.random ─────────────────────────────────────────────
//
// The build this replaces used the request's own id as its "token", which was
// not a secret at all — the ids were sequential (`rr-001`, `rr-002`) and the
// survey page accepted any of them. `randomBytes(32)` is 256 bits from the OS
// CSPRNG; `Math.random().toString(36)` is a few bits of a predictable stream,
// and that distinction is the whole security of this route.
//
// ── WHY base64url ─────────────────────────────────────────────────────────
//
// The token travels in a PATH segment, in an SMS. base64url has no characters
// that need escaping in a URL, and none that a phone's link detector will
// truncate on. Base64 proper would give `+` and `/`, both of which do.
// ============================================================================

/** How many characters the RPCs require before they will look anything up. */
export const MIN_TOKEN_LENGTH = 16;

export interface MintedToken {
  /** Goes in the message body. Never write this to the database. */
  token: string;
  /** Goes in `review_requests.token_hash`. */
  hash: Buffer;
}

export function mintReviewToken(): MintedToken {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashReviewToken(token) };
}

/**
 * Must agree with `private.hash_review_token` — sha256 of the raw token.
 *
 * If these two ever disagree, every link minted afterwards is dead on arrival
 * and nothing raises: the lookup simply finds no row, which is the same answer
 * the RPC gives for an expired or invented token. That is the failure mode
 * `supabase/tests/reputation-requests.sql` exists to catch, by minting through
 * the SQL function and reading back through it.
 */
export function hashReviewToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

/**
 * Postgres wants a hex-escape literal for a `bytea` sent over PostgREST.
 *
 * A Buffer serialised as JSON becomes `{"type":"Buffer","data":[…]}`, which
 * PostgREST stores as the text of that object rather than raising — so the
 * column fills with plausible-looking garbage and every link stops working
 * quietly. Same trap as `toByteaLiteral` in the onboarding module.
 */
export function toByteaLiteral(hash: Buffer): string {
  return String.raw`\x` + hash.toString("hex");
}

/**
 * The link a customer taps.
 *
 * `origin` is the facility's own customer-facing origin, resolved by the caller
 * through `facilityCustomerOrigin(slug)` — never a hardcoded host, which is
 * what `bun run check:link-origin` exists to prevent.
 */
export function reviewLinkFor(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/review/${token}`;
}
