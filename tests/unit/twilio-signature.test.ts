/**
 * ============================================================================
 * The Twilio webhook signature, and what counts as an opt-out.
 *
 *   bun run test:unit
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 *
 * `/api/twilio/sms` is an unauthenticated POST that WRITES a consent
 * withdrawal, keyed by phone number. The signature is the only thing between
 * that endpoint and anybody who finds the URL silencing any customer at any
 * facility — silently, because a suppression is meant to stop messages and
 * there is nothing to see when it works.
 *
 * The repo's other four Twilio routes validate no signature at all. This one
 * does, and the check is worth proving rather than trusting, because a
 * signature function that returns true for everything looks exactly like one
 * that works.
 *
 * ── AND WHY THE KEYWORD MATCHING IS STRICT ────────────────────────────────
 *
 * "STOP" is an opt-out. "don't stop grooming Nala's nails so short" is a
 * compliment, and treating it as an opt-out would silence a happy customer
 * with no way for anybody to notice. The asymmetry is deliberate and the tests
 * below are mostly about the second kind.
 * ============================================================================
 */

import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import {
  inboundIntent,
  isTwilioSignature,
  twilioRequestUrl,
} from "@/lib/twilio/signature";

const TOKEN = "12345678901234567890123456789012";
const URL_UNDER_TEST = "https://pawcare.yipyy.com/api/twilio/sms";

/** Sign the way Twilio documents it, so the test is not the implementation. */
function sign(
  url: string,
  params: Record<string, string>,
  token = TOKEN,
): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", token)
    .update(Buffer.from(payload, "utf8"))
    .digest("base64");
}

describe("the signature", () => {
  const params = {
    From: "+15145550123",
    To: "+15145559999",
    Body: "STOP",
    MessageSid: "SM00000000000000000000000000000001",
  };

  test("a genuine signature is accepted", () => {
    expect(
      isTwilioSignature({
        authToken: TOKEN,
        url: URL_UNDER_TEST,
        params,
        signature: sign(URL_UNDER_TEST, params),
      }),
    ).toBe(true);
  });

  // Each of these is a real attack or a real misconfiguration, and each must
  // fail on its own — a check that only rejects an absent signature is not a
  // check.
  test("no signature is refused", () => {
    expect(
      isTwilioSignature({
        authToken: TOKEN,
        url: URL_UNDER_TEST,
        params,
        signature: null,
      }),
    ).toBe(false);
  });

  test("a signature from a different auth token is refused", () => {
    expect(
      isTwilioSignature({
        authToken: TOKEN,
        url: URL_UNDER_TEST,
        params,
        signature: sign(URL_UNDER_TEST, params, "9".repeat(32)),
      }),
    ).toBe(false);
  });

  test("a signature for a different URL is refused", () => {
    expect(
      isTwilioSignature({
        authToken: TOKEN,
        url: URL_UNDER_TEST,
        params,
        signature: sign("https://evil.invalid/api/twilio/sms", params),
      }),
    ).toBe(false);
  });

  // The one that matters most: a replayed signature with the phone number
  // swapped would let somebody suppress an arbitrary customer.
  test("changing one parameter invalidates it", () => {
    const signature = sign(URL_UNDER_TEST, params);
    expect(
      isTwilioSignature({
        authToken: TOKEN,
        url: URL_UNDER_TEST,
        params: { ...params, From: "+15145550999" },
        signature,
      }),
    ).toBe(false);
  });

  test("adding a parameter invalidates it", () => {
    const signature = sign(URL_UNDER_TEST, params);
    expect(
      isTwilioSignature({
        authToken: TOKEN,
        url: URL_UNDER_TEST,
        params: { ...params, Extra: "1" },
        signature,
      }),
    ).toBe(false);
  });

  test("no auth token means nothing validates", () => {
    expect(
      isTwilioSignature({
        authToken: "",
        url: URL_UNDER_TEST,
        params,
        signature: sign(URL_UNDER_TEST, params),
      }),
    ).toBe(false);
  });

  // Parameter ORDER is not part of the signature — Twilio sorts by name — so a
  // form arriving in a different order must still validate. An implementation
  // that concatenated in arrival order would pass every other test here.
  test("parameter order does not matter", () => {
    const reordered = {
      MessageSid: params.MessageSid,
      Body: params.Body,
      To: params.To,
      From: params.From,
    };
    expect(
      isTwilioSignature({
        authToken: TOKEN,
        url: URL_UNDER_TEST,
        params: reordered,
        signature: sign(URL_UNDER_TEST, params),
      }),
    ).toBe(true);
  });
});

describe("the URL is the one Twilio requested", () => {
  test("the proxy headers win over the listen address", () => {
    const request = new Request("http://0.0.0.0:3000/api/twilio/sms", {
      headers: {
        host: "pawcare.yipyy.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(twilioRequestUrl(request)).toBe(URL_UNDER_TEST);
  });

  // Twilio includes the query string in what it signs, and dropping it is the
  // easy mistake — it would validate in development, where there is none.
  test("the query string is kept", () => {
    const request = new Request("http://0.0.0.0:3000/api/twilio/sms?x=1", {
      headers: { host: "pawcare.yipyy.com", "x-forwarded-proto": "https" },
    });
    expect(twilioRequestUrl(request)).toContain("?x=1");
  });

  test("a comma-joined forwarded proto takes the first hop", () => {
    const request = new Request("http://0.0.0.0:3000/api/twilio/sms", {
      headers: {
        host: "pawcare.yipyy.com",
        "x-forwarded-proto": "https, http",
      },
    });
    expect(twilioRequestUrl(request).startsWith("https://")).toBe(true);
  });
});

describe("what counts as an opt-out", () => {
  test("the carrier keywords, in any case", () => {
    for (const word of [
      "STOP",
      "stop",
      "Stop",
      "UNSUBSCRIBE",
      "cancel",
      "QUIT",
    ]) {
      expect(inboundIntent(word)).toBe("stop");
    }
  });

  test("with surrounding whitespace or a full stop", () => {
    expect(inboundIntent("  STOP  ")).toBe("stop");
    expect(inboundIntent("stop.")).toBe("stop");
    expect(inboundIntent("STOP!")).toBe("stop");
  });

  // The whole reason the matching is strict. Every one of these is a customer
  // saying something else, and suppressing them would be invisible.
  test("a sentence containing the word is NOT an opt-out", () => {
    for (const message of [
      "don't stop grooming Nala's nails so short",
      "please stop by when you can",
      "Stop being so good at this!",
      "can you cancel my booking on Tuesday?",
      "we had to end the session early",
    ]) {
      expect(inboundIntent(message)).toBe("other");
    }
  });

  test("start and help are recognised but separate", () => {
    expect(inboundIntent("START")).toBe("start");
    expect(inboundIntent("HELP")).toBe("help");
    expect(inboundIntent("info")).toBe("help");
  });

  test("an ordinary reply is nothing in particular", () => {
    expect(inboundIntent("5")).toBe("other");
    expect(inboundIntent("Thanks so much!")).toBe("other");
    expect(inboundIntent("")).toBe("other");
  });
});
