import { createHmac, timingSafeEqual } from "node:crypto";

// ============================================================================
// Proving a webhook really came from Twilio.
//
// ── WHY THIS IS NOT OPTIONAL HERE ─────────────────────────────────────────
//
// The inbound-SMS route is an unauthenticated POST endpoint that WRITES: it
// records that somebody withdrew consent, keyed by phone number. Without a
// signature check, anybody who finds the URL can suppress any number at any
// facility — silently, because a suppression is supposed to stop messages and
// there is nothing to see when it works.
//
// ── HOW TWILIO SIGNS ──────────────────────────────────────────────────────
//
// HMAC-SHA1, base64, keyed by the account's AUTH TOKEN, over:
//
//   the full URL Twilio requested, then for each POST parameter in
//   lexicographic order by name, the name immediately followed by its value,
//   with no separators at all.
//
// The URL is the one TWILIO used, which behind a reverse proxy is not
// `request.url` — that is the address the container listens on, and validating
// against it fails every request in production while passing every one in
// development. `x-forwarded-proto` and `host` are what to trust here, for the
// same reason `src/lib/request-origin.ts` exists.
//
// ── AND THE COMPARISON IS CONSTANT-TIME ───────────────────────────────────
//
// `===` on a signature leaks it a byte at a time to anybody willing to measure,
// and this one gates the ability to silence a facility's customers.
// ============================================================================

/**
 * Whether `signature` is Twilio's, for this URL and these form fields.
 *
 * Returns false rather than throwing on anything malformed: a caller that
 * cannot produce a valid signature gets one answer, and it is "no".
 */
export function isTwilioSignature(input: {
  authToken: string;
  url: string;
  params: Record<string, string>;
  signature: string | null;
}): boolean {
  if (!input.signature || !input.authToken) return false;

  const payload = Object.keys(input.params)
    .sort()
    .reduce((acc, key) => acc + key + input.params[key], input.url);

  const expected = createHmac("sha1", input.authToken)
    .update(Buffer.from(payload, "utf8"))
    .digest("base64");

  const given = Buffer.from(input.signature);
  const mine = Buffer.from(expected);
  return given.length === mine.length && timingSafeEqual(given, mine);
}

/**
 * The URL Twilio actually requested, rebuilt from the proxy headers.
 *
 * Twilio signs what it sent, so this has to reproduce it exactly — including
 * the query string, which Twilio includes and it is easy to drop.
 */
export function twilioRequestUrl(request: Request): string {
  const url = new URL(request.url);
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const host = request.headers.get("host");

  // `url.host = "example.com"` LEAVES THE EXISTING PORT — the WHATWG setter
  // only replaces the port when the new value carries one. Locally that turns
  // `pawcare.yipyy.com` into `pawcare.yipyy.com:3000`, the signature is
  // computed over a URL Twilio never requested, and EVERY inbound webhook is
  // refused with a 403. The endpoint would look alive and drop every STOP.
  //
  // Clearing the port first makes the assignment mean what it reads as; a host
  // header that does carry a port still sets one.
  if (host) {
    url.port = "";
    url.host = host;
  }
  if (forwardedProto) url.protocol = `${forwardedProto}:`;
  return url.toString();
}

/**
 * The words a carrier treats as opting out, and the ones that ask for help.
 *
 * These are the keywords US carriers handle at the network level for 10DLC
 * traffic, so Twilio may have already stopped the message before we see it.
 * Recording it OUR side anyway is the point: without a row in
 * `message_suppressions`, every screen in this product goes on believing that
 * number is reachable, and a facility that later switches provider would carry
 * the mistake with them.
 */
const STOP_WORDS = new Set([
  "stop",
  "stopall",
  "unsubscribe",
  "cancel",
  "end",
  "quit",
  "revoke",
  "optout",
  "opt-out",
]);

const START_WORDS = new Set(["start", "unstop", "yes", "optin", "opt-in"]);

export type InboundIntent = "stop" | "start" | "help" | "other";

/**
 * What an inbound message is asking for.
 *
 * Deliberately strict: only a message that is JUST the keyword counts. "Stop
 * sending these" is an opt-out and so is "STOP", but "don't stop grooming
 * Nala's nails so short" is not, and treating it as one would silence a
 * customer who was paying us a compliment.
 */
export function inboundIntent(body: string): InboundIntent {
  const word = body
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "");
  if (STOP_WORDS.has(word)) return "stop";
  if (START_WORDS.has(word)) return "start";
  if (word === "help" || word === "info") return "help";
  return "other";
}
