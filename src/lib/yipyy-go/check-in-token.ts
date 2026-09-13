import { createHash, randomBytes } from "node:crypto";

// ============================================================================
// The check-in code an owner shows at the desk.
//
// ── THE PLAINTEXT IS NEVER STORED ─────────────────────────────────────────
//
// `yipyy_go_check_in_passes.token_hash` holds sha256 of the token and nothing
// else (20260913140335). The token exists in the response to the owner who
// asked for it and in the QR code on their screen; a leaked backup does not
// let anybody walk into a facility as somebody else's dog.
//
// A deliberate copy of src/lib/reputation/token.ts rather than a shared
// helper, for the reason that file gives: token families with different
// lifetimes must be free to change how they hash without invalidating each
// other's live links. `private.hash_check_in_token` must agree with
// `hashCheckInToken` — supabase/tests/yipyy-go-check-in.sql issues through
// the SQL digest and resolves through the function.
//
// ── NOT THE OLD Map ───────────────────────────────────────────────────────
//
// src/lib/qr-checkin.ts kept tokens in a module Map in the browser that made
// them, so a code made on a phone never validated on the facility's tablet.
// ============================================================================

/** How many characters resolve_yipyy_go_check_in_pass() requires. */
export { MIN_CHECK_IN_CODE_LENGTH } from "@/lib/yipyy-go/parse-check-in-code";

export interface MintedCheckInToken {
  /** Goes in the QR code. Never write this to the database. */
  token: string;
  /** Goes in `yipyy_go_check_in_passes.token_hash`. */
  hash: Buffer;
}

export function mintCheckInToken(): MintedCheckInToken {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashCheckInToken(token) };
}

export function hashCheckInToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

/** A bytea sent over PostgREST must be a hex-escape literal — a Buffer
 *  serialised as JSON is stored as the text of that object. */
export function toByteaLiteral(hash: Buffer): string {
  return String.raw`\x` + hash.toString("hex");
}

/** The kiosk link the QR code encodes: the facility's STAFF origin, where the
 *  desk is signed in. The token rides in the query, where the kiosk reads it
 *  and removes it from the address bar. */
export function kioskLinkFor(staffOrigin: string, token: string): string {
  return `${staffOrigin.replace(/\/+$/, "")}/employee/check-in?code=${encodeURIComponent(token)}`;
}
