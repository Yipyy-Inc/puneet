import { test, expect } from "@playwright/test";
import { signIn } from "./_auth";

// ============================================================================
// Nobody messages a facility's customers who should not be able to.
//
// ── WHY THIS IS A GATE SPEC ───────────────────────────────────────────────
//
// Eight routes shipped between 2026-08-27 and 2026-08-28 that can put a message
// in front of somebody else's customer. Seven of them are gated by RLS, which
// the SQL tier already measures. ONE IS NOT.
//
// `/api/rebook/lapsed/remind` writes the outbox as `service_role`, because
// `message_sends` grants a session SELECT and nothing else on purpose — the
// outbox is the record of what was attempted, not a table anybody may forge.
// So its permission check lives in APPLICATION CODE (`my_permissions()` +
// `holds`), and the database will not catch its removal. Delete that check and
// every test in this repo still passes, every gate still runs green, and a
// receptionist can email a facility's entire lapsed list.
//
// That is the shape of thing this file exists for, and it is why it sits in the
// 23-spec gate rather than the nightly suite.
//
// ── IT MUST NOT ACTUALLY SEND ─────────────────────────────────────────────
//
// Every assertion here is a REFUSAL or a no-op. The one request that is allowed
// to succeed (an owner naming somebody who is not lapsed) is chosen precisely
// because the correct outcome is that nothing is queued — so a run of this file
// costs no email and no SMS even against a facility with live credentials.
//
// The dismissal test writes one row and removes it in `afterAll`, which runs
// regardless of outcome. Leaving one behind would HIDE a client from the lapsed
// list for every later run, and a spec that quietly shrinks the data other
// specs read is the failure mode role-editor-writes documents at length.
// ============================================================================

const LAPSED = "/api/rebook/lapsed";
const REMIND = "/api/rebook/lapsed/remind";
const DISMISS = "/api/rebook/lapsed/dismiss";

/** Holds `marketing_manage_automations = anytime`. */
const PERMITTED = "owner@yipyy.dev";

/**
 * In the facility portal, and does NOT hold the permission.
 *
 * Reception rather than a groomer on purpose: a groomer is redirected out of
 * the portal entirely, so a refusal proves the layout gate rather than this
 * check. Reception belongs here and is still not allowed to send.
 */
const UNPERMITTED = "reception@yipyy.dev";

/** Well-formed and belongs to nobody. */
const NO_SUCH_CLIENT = "00000000-0000-4000-8000-0000000000ff";

test.describe.configure({ mode: "serial" });

test.describe("the rebook send boundary", () => {
  let dismissed: { clientId: string; service: string } | null = null;

  test.afterAll(async ({ browser }) => {
    if (!dismissed) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, PERMITTED);
      await page.request.delete(
        `${DISMISS}?clientId=${dismissed.clientId}&service=${encodeURIComponent(dismissed.service)}`,
      );
    } finally {
      await context.close();
    }
  });

  test("a signed-out caller cannot even ask who has lapsed", async ({
    request,
  }) => {
    // `request` carries no session — a bare fixture, not the page's context.
    const response = await request.get(LAPSED, { failOnStatusCode: false });
    expect(response.status()).toBe(401);
  });

  test("a signed-out caller cannot send", async ({ request }) => {
    const response = await request.post(REMIND, {
      data: { targets: [{ clientId: NO_SUCH_CLIENT, service: "grooming" }] },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(401);
  });

  test("staff without the permission are refused the send", async ({
    page,
  }) => {
    await signIn(page, UNPERMITTED);

    const response = await page.request.post(REMIND, {
      data: { targets: [{ clientId: NO_SUCH_CLIENT, service: "grooming" }] },
      failOnStatusCode: false,
    });

    // 403 and NOT 200-with-zero-queued. The difference matters: a route that
    // answered 200 having quietly sent nothing would pass a laxer assertion
    // while the check itself had been removed.
    expect(response.status()).toBe(403);
    const body = (await response.json()) as { queued?: number; error?: string };
    expect(body.queued).toBeUndefined();
  });

  test("staff without the permission cannot dismiss either", async ({
    page,
  }) => {
    await signIn(page, UNPERMITTED);

    const response = await page.request.post(DISMISS, {
      data: { clientId: NO_SUCH_CLIENT, service: "grooming" },
      failOnStatusCode: false,
    });

    // 404 is the right answer here and it is not a weaker one: the client is
    // looked up through the RLS client BEFORE the write, and a caller who may
    // not see it must not be told whether it exists. What must never come back
    // is 200.
    expect([403, 404]).toContain(response.status());
  });

  test("a permitted owner cannot dismiss a client that is not theirs", async ({
    page,
  }) => {
    await signIn(page, PERMITTED);

    const response = await page.request.post(DISMISS, {
      data: { clientId: NO_SUCH_CLIENT, service: "grooming" },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);
  });

  test("the send re-derives who is lapsed instead of trusting the request", async ({
    page,
  }) => {
    await signIn(page, PERMITTED);

    // ── THE ASSERTION THIS FILE IS REALLY FOR ────────────────────────────
    //
    // The body names client+service pairings. If the route took them at their
    // word, "send a rebook reminder" would be "send a templated message to any
    // client id I can guess". It does not: every target is looked up against a
    // fresh `lapsed_clients()` read through the RLS client, so an id that is
    // not on that list produces a skip and no outbox row.
    const response = await page.request.post(REMIND, {
      data: {
        targets: [{ clientId: NO_SUCH_CLIENT, service: "grooming" }],
      },
      failOnStatusCode: false,
    });

    // 503 is legitimate on a deployment with no service-role key configured —
    // and it is still a refusal to send, which is what this asserts.
    if (response.status() === 503) {
      test.info().annotations.push({
        type: "note",
        description: "no service-role key here; the send refused outright",
      });
      return;
    }

    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      queued: number;
      duplicates: number;
      skipped: { reason: string }[];
    };
    expect(body.queued, "a stranger's id must queue nothing").toBe(0);
    expect(body.duplicates).toBe(0);
    expect(body.skipped.length).toBeGreaterThan(0);
    expect(body.skipped[0].reason).toContain("no longer lapsed");
  });

  test("a real lapsed client can be dismissed, and disappears from the list", async ({
    page,
  }) => {
    await signIn(page, PERMITTED);

    const before = await page.request.get(LAPSED);
    expect(before.status()).toBe(200);
    const list = (await before.json()) as {
      clients: { clientId: string; clientName: string; service: string }[];
    };

    test.skip(
      list.clients.length === 0,
      "nobody has lapsed at this facility right now",
    );

    const target = list.clients[0];
    const response = await page.request.post(DISMISS, {
      data: {
        clientId: target.clientId,
        service: target.service,
        reason: "e2e boundary probe",
      },
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(200);
    dismissed = { clientId: target.clientId, service: target.service };

    // The dismissal has to actually remove them. A row written that the list
    // still ignores is the same class of bug as a toggle that saves nowhere.
    const after = await page.request.get(LAPSED);
    const stillThere = (
      (await after.json()) as {
        clients: { clientId: string; service: string }[];
      }
    ).clients.some(
      (c) => c.clientId === target.clientId && c.service === target.service,
    );
    expect(
      stillThere,
      `${target.clientName} was dismissed and is still listed`,
    ).toBe(false);
  });
});
