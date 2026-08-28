import { expect, test } from "@playwright/test";

// ============================================================================
// The endpoint that emails a facility's customers.
//
// ── WHY THIS IS WORTH A SPEC OF ITS OWN ───────────────────────────────────
//
// `/api/cron/messaging-tick` sends every message that has come due, in the
// facility's name, to their customers. An unguarded version of it is not a
// degraded mode — it is a spam cannon with somebody else's business on the
// envelope, and the damage is not recallable.
//
// So the assertion is the refusal, and it is asserted for a caller with NO
// credential and for one with the wrong credential. Those fail through
// different branches: no CRON_SECRET configured answers 503, a bad bearer
// answers 401, and a 200 from either would mean the guard had been removed.
//
// ── IT IS NOT SIGNED IN, AND THAT IS THE POINT ────────────────────────────
//
// Cron carries a bearer token, not a session. Every other refusal spec in this
// suite drives a browser; this one deliberately does not, because a caller with
// a valid session and no bearer must be refused exactly like a stranger.
// ============================================================================

const TICK = "/api/cron/messaging-tick";

test.describe("the messaging tick", () => {
  test("refuses a caller with no credential at all", async ({ request }) => {
    const response = await request.get(TICK, { failOnStatusCode: false });

    // 401 when the secret is configured, 503 when it is not. Both are refusals
    // and both are correct; 200 is the thing that must never happen.
    expect([401, 503]).toContain(response.status());
  });

  test("refuses a wrong bearer token", async ({ request }) => {
    const response = await request.get(TICK, {
      headers: { Authorization: "Bearer not-the-secret" },
      failOnStatusCode: false,
    });
    expect([401, 503]).toContain(response.status());

    // And says nothing about what the right one looks like.
    const body = (await response.text()).toLowerCase();
    expect(body).not.toContain("expected");
  });

  test("a signed-in session is not a substitute for the secret", async ({
    page,
  }) => {
    // A browser session is exactly the credential this endpoint must NOT
    // accept: it is machine-to-machine, and a logged-in member of staff
    // triggering everyone's queued mail is not a permission anybody granted.
    const response = await page.request.get(TICK, { failOnStatusCode: false });
    expect([401, 503]).toContain(response.status());
  });

  test("POST is not a way around the guard", async ({ request }) => {
    const response = await request.post(TICK, { failOnStatusCode: false });

    // 405 from the framework (no POST handler) or a refusal. Never a send.
    expect([401, 403, 405, 503]).toContain(response.status());
  });
});
