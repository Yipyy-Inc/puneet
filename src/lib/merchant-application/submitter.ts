import "server-only";

import type { ApplicationStatus } from "./application";

// ============================================================================
// Where a finished application goes.
//
// ── WHY THIS IS AN INTERFACE WITH ONE IMPLEMENTATION ──────────────────────
//
// The commercial arrangement that decides this is not settled. Boarding a
// merchant programmatically needs an ISO or ISV agreement with the acquirer and
// an Agent ID issued under it — it is not something an app-market OAuth
// integration can do, and no amount of code here changes that.
//
// What IS settled is the shape, and it is the same either way: create an
// application, complete and sign it, submit it for underwriting, poll until it
// is decided, capture the merchant id on approval. So everything upstream of
// this file — the wizard, the tables, the status machine, the purge — is built
// against that shape, and only the last hop is unknown.
//
// One interface, one implementation today, and a second one the day credentials
// exist. Nothing above it changes.
//
// ── AND THE MANUAL ONE IS NOT A STUB ──────────────────────────────────────
//
// `ManualQueueSubmitter` is a real destination, not a placeholder that throws.
// It freezes the application, stamps it `submitted`, and puts it in front of
// the Yipyy team with everything needed to act on it. If the arrangement turns
// out to be permanently manual — the acquirer's team boards every merchant from
// documents somebody sends them — this is the finished product and not a
// compromise.
//
// What it must never do is claim more than it did. It does not say "sent to
// underwriting", because nothing was sent anywhere; it says the application is
// with the Yipyy team, which is true.
// ============================================================================

export interface BoardingDecision {
  status: ApplicationStatus;
  /** What the acquirer calls it. Null while there is nothing to call it. */
  reference: string | null;
  /** Prose for the facility. Why it was refused, or what is still needed. */
  detail: string | null;
}

export interface MerchantBoardingSubmitter {
  /**
   * A name for the destination, shown to a platform admin and written into the
   * audit note. "Where did this go" should never require reading the code.
   */
  readonly name: string;

  /**
   * Hand over a completed application.
   *
   * Called once, inside the route that has already validated the whole thing
   * and marked it submitted. Throwing rolls the submission back — an
   * application that says `submitted` and reached nowhere is the state this
   * whole file exists to avoid.
   */
  submit(applicationId: string): Promise<BoardingDecision>;

  /**
   * Where it has got to.
   *
   * Returns null when the destination has nothing new to say, which is
   * different from "still under review" — the caller leaves the stored status
   * alone rather than overwriting it with a guess.
   */
  status(reference: string | null): Promise<BoardingDecision | null>;
}

/**
 * Today's destination: a queue a human works.
 *
 * The application is frozen and surfaced in the platform portal. A Yipyy
 * administrator reads it, does whatever the acquirer's process actually
 * requires, and records the outcome — which moves the status through the same
 * machine an API would have moved it through.
 */
export const manualQueueSubmitter: MerchantBoardingSubmitter = {
  name: "Yipyy review queue",

  async submit(applicationId: string): Promise<BoardingDecision> {
    // Nothing to call. The status change and the freeze are the route's job and
    // have already happened by the time this runs; this returns the truthful
    // description of where the application now is.
    //
    // The reference is ours rather than an acquirer's, and prefixed so nobody
    // later mistakes it for one that came back from underwriting.
    return {
      status: "submitted",
      reference: `yipyy-queue:${applicationId}`,
      detail:
        "Your application is with the Yipyy team. We will let you know as soon as your account is open.",
    };
  },

  async status(): Promise<BoardingDecision | null> {
    // A human moves this, through the platform portal. Returning null rather
    // than inventing "under_review" is the difference between "we have not
    // heard" and "we have heard nothing has changed" — and a poller that
    // overwrites a real status with a guess is how `more_info_needed` would
    // silently revert while a facility waited for a request that had already
    // arrived.
    return null;
  },
};

/**
 * The one in use.
 *
 * A function rather than a constant so the day a real integration exists it can
 * choose on configuration — the same shape `cloverConfig()` uses to pick an
 * estate — without every caller learning about the choice.
 */
export function merchantBoardingSubmitter(): MerchantBoardingSubmitter {
  return manualQueueSubmitter;
}
