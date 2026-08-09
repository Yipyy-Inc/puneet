import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The deployment's Twilio configuration.
//
// This replaced src/hooks/use-twilio-config.ts, which held an Account SID and
// an Auth Token in module state in the browser, shipped `connected: true` with
// placeholder credentials, and offered a "Test Connection" that returned true
// when both fields were non-empty.
//
// So the assertions are about the two properties that store did not have:
//
//   the token never travels, and
//   only a platform administrator can ask.
// ============================================================================

const ENDPOINT = "/api/platform/communication";

test.describe("platform telephony configuration", () => {
  test("is refused to anyone not signed in", async ({ page }) => {
    expect((await page.request.get(ENDPOINT)).status()).toBe(401);
    // POST authenticates against Twilio with the platform token. Left open it
    // would be an unauthenticated oracle for whether those credentials work.
    expect((await page.request.post(ENDPOINT)).status()).toBe(401);
  });

  test("is refused to a facility staff member", async ({ page }) => {
    await signIn(page, ACCOUNTS.manager);
    expect((await page.request.get(ENDPOINT)).status()).toBe(403);
    expect((await page.request.post(ENDPOINT)).status()).toBe(403);
  });

  test("a platform admin reads it, and no token comes back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    const response = await page.request.get(ENDPOINT);

    // The positive control. Without it the two refusals above would pass just
    // as well against an endpoint that answers 403 to everybody, or against a
    // route that does not exist.
    expect(response.status()).toBe(200);

    const raw = await response.text();
    const body = JSON.parse(raw) as {
      configured: boolean;
      accountSid: string | null;
      webhooks: Record<string, string>;
      facilityLines: Record<string, number>;
    };

    // It answered with something real, not an empty object.
    expect(body.webhooks.inboundVoice).toContain("/api/twilio/voice");
    expect(typeof body.configured).toBe("boolean");
    expect(typeof body.facilityLines.connected).toBe("number");

    // ── The assertion this file exists for ────────────────────────────────
    //
    // Asserted against the RAW TEXT, not a parsed field, because a leak would
    // arrive under a key nobody predicted — `authToken`, `credentials.token`,
    // an echoed request body, a serialised error. Naming the keys to check
    // would only catch the leak already imagined.
    for (const forbidden of [
      "authToken",
      "auth_token",
      "AUTH_TOKEN",
      "authtoken",
    ]) {
      expect(raw).not.toContain(forbidden);
    }

    // And the real token itself, when the runner has one. This is the strongest
    // form available: it catches a leak under ANY key.
    const secret = process.env.TWILIO_AUTH_TOKEN?.trim();
    if (secret) expect(raw).not.toContain(secret);

    // The SID is deliberately present when configured — an identifier, in the
    // path of every Twilio request. Absent means unset, never masked.
    if (body.configured) {
      expect(body.accountSid).toMatch(/^AC[0-9a-f]{32}$/i);
    } else {
      expect(body.accountSid).toBeNull();
    }
  });

  test("the connection test reports a real answer, never an invented one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.admin);
    const status = (await (await page.request.get(ENDPOINT)).json()) as {
      configured: boolean;
    };

    const response = await page.request.post(ENDPOINT);
    expect(response.status()).toBe(200);
    const result = (await response.json()) as { ok: boolean; error?: string };

    if (!status.configured) {
      // The old test passed whenever two form fields were non-empty. On a
      // deployment with no credentials at all, the only honest answer is no.
      expect(result.ok).toBe(false);
      expect(result.error).toContain("TWILIO_ACCOUNT_SID");
    } else {
      // With credentials set, the answer comes from Twilio rather than from us
      // — so either outcome is legitimate here, and a failure must carry
      // Twilio's reason rather than a bare false.
      if (!result.ok) expect(result.error?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
