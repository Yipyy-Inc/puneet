// ============================================================================
// What `POST /api/staff/<id>/invite` actually said.
//
// The route answers three different things and they mean three different
// things, which is the entire reason it was written that way:
//
//   sent: true                    the provider accepted it; the hire has mail
//   reason: "not_configured"      RESEND_API_KEY is absent. The membership
//                                 grant is real and the onboarding link works
//                                 — nothing was DELIVERED. The manager can
//                                 hand the link over themselves
//   anything else                 denied (42501), the grant failed, or the
//                                 provider rejected the send, in which case
//                                 the route has already put `staff.status`
//                                 back so the database and the email agree
//
// Two screens ask this question — the roster's "Remind" button and the hire
// dialog's "Create & send onboarding" — and both got it wrong in their own
// way before: the roster treated a missing provider as a warning about a
// "reissued link", and the dialog never asked at all, minting a token in a
// browser-local object and saying an email had been sent. One reading, in one
// place, is what stops them drifting a third time.
//
// The WORDS stay at the call site. The two screens are in different moments —
// one is chasing somebody who already works here, the other is finishing a
// hire — and a shared sentence would have to be vague enough for both.
// ============================================================================

/** The body `/api/staff/[id]/invite` returns, as far as a screen needs it. */
export interface StaffInviteResponse {
  sent?: boolean;
  reason?: string;
  message?: string;
  /**
   * The `/onboard/<token>` URL the SERVER minted. Only the server can: the
   * database stores a hash of that token, so a link composed in the browser
   * opens nothing.
   */
  onboardingUrl?: string;
  setupUrl?: string;
  /** True when the address already has an account, so they skip sign-up. */
  alreadyRegistered?: boolean;
}

export type StaffInviteOutcome =
  | { kind: "sent"; onboardingUrl?: string; alreadyRegistered: boolean }
  | { kind: "not_configured"; onboardingUrl?: string }
  /** `message` is the route's own sentence when it gave one. */
  | { kind: "failed"; message?: string };

/**
 * Read the route's answer.
 *
 * `null` — a body that did not parse — is a FAILURE, deliberately. The one
 * thing a screen must never do here is treat "I could not tell" as "sent".
 */
export function readInviteOutcome(
  body: StaffInviteResponse | null,
): StaffInviteOutcome {
  if (body?.sent) {
    return {
      kind: "sent",
      onboardingUrl: body.onboardingUrl,
      alreadyRegistered: body.alreadyRegistered === true,
    };
  }
  if (body?.reason === "not_configured") {
    return { kind: "not_configured", onboardingUrl: body.onboardingUrl };
  }
  return { kind: "failed", message: body?.message };
}
