import { describe, expect, test } from "bun:test";

import { readInviteOutcome } from "@/lib/staff/invite-outcome";

// ============================================================================
// The one rule these exist for: nothing except `sent: true` is a send.
//
// The hire dialog used to claim "Onboarding email sent to …" without asking
// the server anything at all. Now it asks — so what "the answer" means has to
// be settled somewhere a test can reach, because the failure mode is a screen
// that reports a success nobody had.
// ============================================================================

describe("readInviteOutcome", () => {
  test("the provider accepted it", () => {
    const outcome = readInviteOutcome({
      sent: true,
      onboardingUrl: "https://paws.yipyy.com/onboard/abc",
      alreadyRegistered: true,
    });
    expect(outcome).toEqual({
      kind: "sent",
      onboardingUrl: "https://paws.yipyy.com/onboard/abc",
      alreadyRegistered: true,
    });
  });

  test("`alreadyRegistered` is a boolean even when the route omits it", () => {
    const outcome = readInviteOutcome({ sent: true });
    expect(outcome).toEqual({
      kind: "sent",
      onboardingUrl: undefined,
      alreadyRegistered: false,
    });
  });

  test("no provider configured is NOT a send, and keeps its link", () => {
    // The grant is real and the link opens — only the delivery did not happen.
    // A screen that reads this as success sends the manager home believing the
    // hire has mail.
    expect(
      readInviteOutcome({
        sent: false,
        reason: "not_configured",
        message: "Email service not configured (set RESEND_API_KEY).",
        onboardingUrl: "https://paws.yipyy.com/onboard/abc",
      }),
    ).toEqual({
      kind: "not_configured",
      onboardingUrl: "https://paws.yipyy.com/onboard/abc",
    });
  });

  test("a refusal carries the route's own sentence", () => {
    expect(
      readInviteOutcome({
        sent: false,
        reason: "denied",
        message: "You may not invite staff at this facility.",
      }),
    ).toEqual({
      kind: "failed",
      message: "You may not invite staff at this facility.",
    });
  });

  test("a send the provider rejected is a failure", () => {
    expect(
      readInviteOutcome({
        sent: false,
        reason: "send_failed",
        message: "The email service rejected the request.",
      }),
    ).toEqual({
      kind: "failed",
      message: "The email service rejected the request.",
    });
  });

  test("a body that did not parse is a failure, never a send", () => {
    expect(readInviteOutcome(null)).toEqual({
      kind: "failed",
      message: undefined,
    });
  });

  test("an empty body is a failure too", () => {
    // `{}` is what a 500 with an HTML error page collapses to once the caller
    // has swallowed the parse error. It must not fall through to "sent".
    expect(readInviteOutcome({})).toEqual({
      kind: "failed",
      message: undefined,
    });
  });

  test("`sent: false` beside an onboarding link is still not a send", () => {
    // The route returns a usable link in the not_configured case, so "there is
    // a link" is not evidence that anything went out.
    expect(
      readInviteOutcome({
        sent: false,
        onboardingUrl: "https://paws.yipyy.com/onboard/abc",
      }),
    ).toEqual({ kind: "failed", message: undefined });
  });
});
