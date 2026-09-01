import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

// ============================================================================
// The five provider webhooks refuse a caller who cannot sign.
//
// ── WHAT THIS IS GUARDING ─────────────────────────────────────────────────
//
// `src/proxy.ts` excluded ALL of `api/twilio` from authentication, on the
// stated grounds that "Twilio signs its own webhooks". That was true of ONE
// route out of five. `voice`, `dial`, `status` and `recording` verified
// nothing, and `api/twilio/call` — an outbound-call endpoint taking both legs
// of a call from the request body — sat inside the same exclusion.
//
// So these paths are the authorisation boundary now, and this spec is in
// `test:e2e:gate` for the same reason `automation-send-boundary` is.
//
// ── WHAT PROVES THE 403s MEAN ANYTHING ────────────────────────────────────
//
// A refusal on its own is weak evidence: a deleted route, a typo in the path
// and a working guard can all look like "not 200". Two controls close that.
//
// A missing route answers 404, not 403, and the first test asserts a
// nonexistent sibling path does exactly that — so `toBe(403)` on the five real
// ones is a statement about a route that exists and refused.
//
// And a correctly signed request has to be ACCEPTED. That one needs the
// deployment's auth token, so it skips where there is none — which is CI. What
// CI therefore proves is that these paths refuse; that the signature MATH is
// right is proved by tests/unit/twilio-signature.test.ts, and the two together
// were run locally against a built server with a token set, where all four
// pass. Stating the division is the point: a spec that quietly skips its only
// positive control is the `clover-connect` mistake, where an absence-only
// assertion passed against a page that never rendered.
//
// ── AND WHY IT NEEDS NO CLEANUP ───────────────────────────────────────────
//
// Every request here is refused, or is a GET-shaped read that returns TwiML.
// Nothing writes. `sms` is the one route that could write — a STOP creates a
// suppression — so it is signed with a Body the parser classifies as an
// ordinary reply rather than a withdrawal.
// ============================================================================

const SIGNED_PATHS = [
  "/api/twilio/sms",
  "/api/twilio/voice",
  "/api/twilio/dial",
  "/api/twilio/status",
  "/api/twilio/recording",
] as const;

/** Twilio's scheme: HMAC-SHA1 over the URL then each sorted key immediately
 *  followed by its value, base64, keyed by the account auth token. */
function sign(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken)
    .update(Buffer.from(payload, "utf8"))
    .digest("base64");
}

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN?.trim();

test.describe("provider webhooks", () => {
  test("every webhook refuses a request with no signature", async ({
    request,
    baseURL,
  }) => {
    // The control that makes the 403s below mean something: a path that does
    // not exist answers 404. So "not 200" is not what is being asserted.
    const missing = await request.post(`${baseURL}/api/twilio/does-not-exist`, {
      form: { From: "+15145550100" },
    });
    expect(
      missing.status(),
      "a nonexistent route should 404 — if it 403s, the assertions below prove nothing",
    ).toBe(404);

    for (const path of SIGNED_PATHS) {
      const response = await request.post(`${baseURL}${path}`, {
        form: { From: "+15145550100", To: "+15145550199", Body: "hello" },
      });
      expect(response.status(), `${path} accepted an unsigned request`).toBe(
        403,
      );
    }
  });

  test("and one carrying a signature that is not ours", async ({
    request,
    baseURL,
  }) => {
    for (const path of SIGNED_PATHS) {
      const response = await request.post(`${baseURL}${path}`, {
        headers: {
          "x-twilio-signature": sign(
            "not-the-auth-token",
            `${baseURL}${path}`,
            {},
          ),
        },
        form: { From: "+15145550100", To: "+15145550199", Body: "hello" },
      });
      expect(response.status(), `${path} accepted a forged signature`).toBe(
        403,
      );
    }
  });

  test("the outbound-call endpoint is no longer reachable unauthenticated", async ({
    request,
    baseURL,
  }) => {
    // It lived at /api/twilio/call, inside the auth exclusion. It has moved to
    // /api/platform/calling/outbound, which the proxy now covers.
    const old = await request.post(`${baseURL}/api/twilio/call`, {
      data: { to: "+15145550100", from: "+15145550199" },
    });
    expect(old.status(), "the old open endpoint still answers").toBe(404);

    const moved = await request.post(
      `${baseURL}/api/platform/calling/outbound`,
      { data: { to: "+15145550100", from: "+15145550199" } },
    );
    // 401 signed out, or a redirect to sign-in. Never 200, and never a
    // fabricated call.
    expect(
      [401, 403, 302, 307].includes(moved.status()),
      `unauthenticated outbound returned ${moved.status()}`,
    ).toBe(true);
    expect(await moved.text()).not.toContain("callSid");
  });

  test("a correctly signed webhook is accepted", async ({
    request,
    baseURL,
  }) => {
    // The positive control. Without it, four 403s from a nonexistent route
    // would pass this file.
    test.skip(
      !AUTH_TOKEN,
      "TWILIO_AUTH_TOKEN not set — nothing can produce a valid signature",
    );

    const url = `${baseURL}/api/twilio/voice`;
    const params = { From: "+15145550100", To: "+15145550199" };
    const response = await request.post(url, {
      headers: {
        "x-twilio-signature": sign(AUTH_TOKEN as string, url, params),
      },
      form: params,
    });

    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("<Response>");
  });
});
