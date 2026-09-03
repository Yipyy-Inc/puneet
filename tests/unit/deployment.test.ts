import { afterEach, describe, expect, test } from "bun:test";

import {
  deployment,
  isStaging,
  outboundSendsSuppressed,
} from "../../src/lib/deployment";

// ============================================================================
// Which deployment a container is, and whether it may put a message on the wire.
//
// ADR 0007. Two properties, both of which fail SILENTLY when they are wrong,
// which is what puts them in this tier rather than in Playwright:
//
//   Get the default backwards and PRODUCTION stops sending — no message, no
//   receipt, no error, and nothing anywhere saying why. A facility discovers it
//   when a customer says they never heard from them.
//
//   Get the opt-out backwards and STAGING sends. That one reaches a real
//   customer's handset, from a design review, and cannot be recalled.
//
// Neither is reachable from an e2e test: the suite runs against production,
// where suppression is correctly off, so the entire staging branch of this
// logic is invisible to it. And it is pure `process.env` reading with no
// database and no browser — the exact shape AGENTS.md reserves this tier for.
// ============================================================================

const ORIGINAL = {
  deployment: process.env.YIPYY_DEPLOYMENT,
  suppress: process.env.STAGING_SUPPRESS_SENDS,
};

/** Restore, so one test's environment cannot decide the next one's answer. */
afterEach(() => {
  for (const [key, value] of [
    ["YIPYY_DEPLOYMENT", ORIGINAL.deployment],
    ["STAGING_SUPPRESS_SENDS", ORIGINAL.suppress],
  ] as const) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("deployment()", () => {
  test("an unset variable is production", () => {
    delete process.env.YIPYY_DEPLOYMENT;
    expect(deployment()).toBe("production");
    expect(isStaging()).toBe(false);
  });

  test("only the exact word staging is staging", () => {
    process.env.YIPYY_DEPLOYMENT = "staging";
    expect(isStaging()).toBe(true);

    // Whitespace and case are the two ways a value arrives mangled from a
    // compose file or a shell, and neither should change the answer.
    process.env.YIPYY_DEPLOYMENT = "  STAGING  ";
    expect(isStaging()).toBe(true);
  });

  test("anything else is production, including a near miss", () => {
    // A container that meant to be staging and is not gets PRODUCTION
    // behaviour, which is the safe direction: it sends, as it always did.
    // The banner not appearing is how somebody notices.
    for (const value of ["stage", "Staging-2", "prod", "", "true"]) {
      process.env.YIPYY_DEPLOYMENT = value;
      expect(deployment()).toBe("production");
    }
  });
});

describe("outboundSendsSuppressed()", () => {
  test("production never suppresses, whatever the other flag says", () => {
    delete process.env.YIPYY_DEPLOYMENT;

    // The dangerous case: STAGING_SUPPRESS_SENDS left set on a production
    // container. It must not silence production — the deployment decides, and
    // this flag only narrows it.
    process.env.STAGING_SUPPRESS_SENDS = "true";
    expect(outboundSendsSuppressed()).toBe(false);
  });

  test("staging suppresses by default", () => {
    process.env.YIPYY_DEPLOYMENT = "staging";
    delete process.env.STAGING_SUPPRESS_SENDS;
    expect(outboundSendsSuppressed()).toBe(true);
  });

  test("staging suppresses unless the flag is exactly false", () => {
    process.env.YIPYY_DEPLOYMENT = "staging";

    // Opt-OUT, so a typo suppresses rather than sends. "0", "no" and "off" all
    // read as "don't suppress" to somebody typing quickly, and none of them
    // may be — an SMS is not recallable.
    for (const value of ["0", "no", "off", "", "yes", "TRUE"]) {
      process.env.STAGING_SUPPRESS_SENDS = value;
      expect(outboundSendsSuppressed()).toBe(true);
    }

    process.env.STAGING_SUPPRESS_SENDS = "false";
    expect(outboundSendsSuppressed()).toBe(false);

    process.env.STAGING_SUPPRESS_SENDS = "  FALSE  ";
    expect(outboundSendsSuppressed()).toBe(false);
  });
});
