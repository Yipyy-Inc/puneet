// ============================================================================
// Which deployment this container is, and what that is allowed to do.
//
// ADR 0007. There are two, they run the SAME IMAGE, and they read the SAME
// Postgres:
//
//   yipyy.com          production. Customers. Real cards, real messages
//   staging.yipyy.com  where the redesign is reviewed first
//
// ── WHY AN ENVIRONMENT VARIABLE AND NOT THE HOSTNAME ──────────────────────
//
// The hostname would work in a request and fail everywhere that matters.
// `dispatchEvent` runs inside `after()`, behind a response that has already
// gone; the messaging tick runs from a cron route whose Host is production's by
// construction. A guard that reads `headers()` is a guard with holes in exactly
// the paths that send things unattended.
//
// The container is the honest unit anyway: staging is a separate container with
// its own `environment:` block, which is how CLOVER_ENVIRONMENT already works.
// One variable, readable from anywhere, no request context needed.
//
// ── UNSET MEANS PRODUCTION, AND THAT IS THE SAFE DEFAULT ──────────────────
//
// A container has to opt IN to being staging. Every other arrangement has the
// same failure: a variable that goes missing turns production into staging and
// silently stops it doing its job — no message sent, no receipt delivered, and
// nothing anywhere saying why. This way a missing variable means production
// behaves exactly as it always has.
//
// It is deliberately NOT a `NEXT_PUBLIC_*` value. Those are inlined by
// `next build`, and the whole point is one image serving both deployments.
// ============================================================================

// ── AND WHY THERE IS NO `server-only` MARKER ──────────────────────────────
//
// Every sender that consults this is server-only already, and the marker was
// here first. It came out because `src/lib/calling/provider/twilio.ts` imports
// it, and that adapter is covered by `tests/unit/calling-provider.test.ts` —
// which exists precisely BECAUSE its `sendSms` texts a real handset and no e2e
// test can safely reach it. `server-only` throws outside a React Server
// Component, so the marker made the one sender with real unit coverage
// impossible to test.
//
// Nothing leaks by dropping it. None of the three variables read here is
// `NEXT_PUBLIC_`, so Next replaces them with `undefined` in a client bundle
// rather than inlining a value — which lands on `deployment() === "production"`
// and `outboundSendsSuppressed() === false`, the same safe default an unset
// variable gives on the server. There is no secret in this file to disclose and
// no behaviour to get wrong; there was only an assertion about where it belongs,
// and it cost more than it stated.

export type Deployment = "production" | "staging";

/** Which deployment this container is. Anything but `staging` is production. */
export function deployment(): Deployment {
  return process.env.YIPYY_DEPLOYMENT?.trim().toLowerCase() === "staging"
    ? "staging"
    : "production";
}

/** True only in the staging container. */
export function isStaging(): boolean {
  return deployment() === "staging";
}

/**
 * Whether outbound email, SMS and voice must be recorded rather than sent.
 *
 * ── THE HAZARD THIS EXISTS FOR ──────────────────────────────────────────
 *
 * Staging shares the production database, and `deploy/messaging-tick.sh` is a
 * systemd timer on the box that polls `message_sends` every five minutes and
 * dispatches whatever is due. It reads the shared table and has no idea which
 * hostname queued the row. So a message queued from staging is a message
 * production sends, for real, to a real customer — and staging installing no
 * timer of its own changes nothing at all.
 *
 * Suppression therefore has to happen at the point of sending AND at the point
 * of queueing. `dispatchEvent` consults this before it claims an event, so
 * nothing enters the shared outbox from staging in the first place.
 *
 * ── OPT-OUT, NOT OPT-IN ─────────────────────────────────────────────────
 *
 * On unless STAGING_SUPPRESS_SENDS is explicitly "false", so a typo or a
 * missing variable suppresses rather than sends. It is a switch and not a rule
 * because the alternative — making staging read-only — was rejected in ADR
 * 0007: a client reviewing a redesign has to be able to walk a journey, and
 * occasionally that journey has to end in a message actually arriving. Turn it
 * off deliberately for that review, and turn it back on.
 *
 * ── ITS COVERAGE IS NOT AUTOMATIC ───────────────────────────────────────
 *
 * Nothing enforces that a sender consults this. It is applied at every Resend
 * call site, both Twilio paths and `dispatchEvent`; a new sender that does not
 * call it will send from staging, and no test will say so. `bun run
 * check:staging-sends` is what stops that drifting.
 */
export function outboundSendsSuppressed(): boolean {
  if (!isStaging()) return false;
  return process.env.STAGING_SUPPRESS_SENDS?.trim().toLowerCase() !== "false";
}

/**
 * What to record on the row instead of a provider id.
 *
 * Deliberately specific: `message_sends.skip_reason` is shown to staff, and
 * "not sent" without a reason is the one thing they cannot act on. On staging
 * the reason a message did not arrive is never a bug worth chasing.
 */
export const SUPPRESSED_DETAIL =
  "not sent — staging suppresses outbound messages (STAGING_SUPPRESS_SENDS)";
