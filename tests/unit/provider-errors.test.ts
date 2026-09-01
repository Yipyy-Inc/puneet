import { describe, expect, test } from "bun:test";

import {
  UNKNOWN_PROVIDER_ERROR,
  describeProviderError,
  isKnownProviderError,
  parseProviderErrorCode,
  providerError,
} from "../../src/lib/calling/provider-errors";

// ============================================================================
// A failed text used to report `SMS service said 400` — the same sentence
// whether the customer had replied STOP, the number was mistyped, or the
// business's campaign was never registered. One of those is unlawful to retry,
// one is a typo, and one blocks every message the facility will ever send.
// ============================================================================

describe("an unmapped code falls back, and does not leak the number", () => {
  test("a code nobody has mapped returns the fallback", () => {
    expect(providerError(30127)).toBe(UNKNOWN_PROVIDER_ERROR);
    expect(providerError(99999)).toBe(UNKNOWN_PROVIDER_ERROR);
  });

  test("the fallback never prints the code at a person", () => {
    // The whole point: "Error 30127" is the status-code problem again.
    const text = describeProviderError(30127);
    expect(text).not.toContain("30127");
    expect(text.length).toBeGreaterThan(20);
  });

  test("null, undefined and nonsense all fall back rather than throw", () => {
    expect(providerError(null)).toBe(UNKNOWN_PROVIDER_ERROR);
    expect(providerError(undefined)).toBe(UNKNOWN_PROVIDER_ERROR);
    expect(providerError(Number.NaN)).toBe(UNKNOWN_PROVIDER_ERROR);
  });

  test("isKnownProviderError tells the log from the screen", () => {
    expect(isKnownProviderError(21610)).toBe(true);
    expect(isKnownProviderError(30127)).toBe(false);
    expect(isKnownProviderError(null)).toBe(false);
  });
});

describe("the distinctions that matter operationally", () => {
  test("STOP is not retryable, and says so in words", () => {
    const stop = providerError(21610);
    expect(stop.retryable).toBe(false);
    expect(stop.summary.toUpperCase()).toContain("STOP");
    // A screen must not invite somebody to press Retry on this.
    expect(stop.nextStep.toLowerCase()).toContain("do not text them again");
  });

  test("an unregistered campaign is not retryable — nothing will send", () => {
    expect(providerError(30034).retryable).toBe(false);
    expect(providerError(30032).retryable).toBe(false);
  });

  test("a switched-off handset IS retryable", () => {
    expect(providerError(30003).retryable).toBe(true);
    expect(providerError(20429).retryable).toBe(true);
  });

  test("three codes that were all one message now differ", () => {
    const stop = describeProviderError(21610);
    const badNumber = describeProviderError(21211);
    const unregistered = describeProviderError(30034);
    expect(new Set([stop, badNumber, unregistered]).size).toBe(3);
  });
});

describe("every entry carries an action, and no vendor name", () => {
  // The codes worth asserting over as a set: they reach a facility screen.
  const CODES = [
    20003, 20404, 20429, 21211, 21212, 21214, 21217, 21219, 21266, 21408, 21606,
    21610, 21611, 21614, 21617, 21620, 30003, 30004, 30005, 30006, 30007, 30008,
    30032, 30034, 13223, 13224,
  ];

  test("the table covers at least the top 25", () => {
    expect(CODES.filter(isKnownProviderError)).toHaveLength(CODES.length);
    expect(CODES.length).toBeGreaterThanOrEqual(25);
  });

  test("no entry is a description with nothing to do about it", () => {
    for (const code of CODES) {
      const error = providerError(code);
      expect(error.summary.length).toBeGreaterThan(15);
      expect(error.nextStep.length).toBeGreaterThan(15);
    }
  });

  test("no entry names the carrier — these strings reach facility screens", () => {
    // check:vendor-strings scans the screens, not this module, so the rule has
    // to be held here instead.
    const banned = /twilio|sendgrid|resend|bandwidth|vonage|plivo/i;
    for (const code of [...CODES, 30127]) {
      const error = providerError(code);
      expect(error.summary).not.toMatch(banned);
      expect(error.nextStep).not.toMatch(banned);
    }
  });
});

describe("parseProviderErrorCode survives a body that is not JSON", () => {
  test("reads the code out of an error body", () => {
    expect(
      parseProviderErrorCode('{"code":21610,"message":"unsubscribed"}'),
    ).toBe(21610);
  });

  test("accepts a numeric string, because providers send both", () => {
    expect(parseProviderErrorCode('{"code":"30007"}')).toBe(30007);
  });

  test("returns null for HTML, empty bodies and missing codes", () => {
    // A gateway timeout is an HTML page. Throwing here would lose the status
    // the caller already has.
    expect(
      parseProviderErrorCode("<html>504 Gateway Timeout</html>"),
    ).toBeNull();
    expect(parseProviderErrorCode("")).toBeNull();
    expect(parseProviderErrorCode('{"message":"no code here"}')).toBeNull();
    expect(parseProviderErrorCode('{"code":"not-a-number"}')).toBeNull();
  });

  test("a body with no code still yields the fallback, not a crash", () => {
    const code = parseProviderErrorCode("<html>502</html>");
    expect(providerError(code)).toBe(UNKNOWN_PROVIDER_ERROR);
  });
});
