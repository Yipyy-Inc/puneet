import { expect, test, type APIResponse, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A card a customer let this facility keep.
//
// ── WHY THIS SPEC STORES NOTHING ──────────────────────────────────────────
//
// `POST /api/payments/cards` vaults a real card at a real merchant. Every case
// below is REFUSED before Clover is contacted — signed out, no consent, a
// customer who is not theirs, a malformed body — so the suite runs on every
// push without creating a stored credential or needing a card.
//
// What it cannot assert is a completed vault: that needs a real card and a
// merchant configured to accept vaulted cards, which is an account setting
// Clover controls and this repo cannot switch on.
//
// ── SO WHAT IS IT FOR ─────────────────────────────────────────────────────
//
// The rows in `saved_cards` are the most sensitive this database holds that
// are not tokens: they let a facility charge somebody's card again. The thing
// most likely to go wrong is not the vault call. It is WHO may store one, WHOSE
// cards come back from a list, and whether a card with no recorded consent can
// be charged. That is all this asserts.
//
// The RLS underneath is proved separately and directly in
// `supabase/tests/saved-cards.sql`, which counts rows per role — RLS filters
// rather than raising, so a policy admitting the wrong person looks exactly
// like one that works until somebody counts.
//
// ── WHY THE ASSERTIONS ARE GROUPED, NOT ONE PER TEST ──────────────────────
//
// `signIn` runs the whole sign-in flow; there is no cached storage state in
// this suite. Written as seven tests this file signed in seven times, took
// ten minutes, and failed intermittently with `/api/permissions -> 401` —
// the session flow rejecting a rapid re-sign-in, which is a fact about the
// harness and not about these routes. Every assertion below survived; they
// are grouped by IDENTITY, which is the only thing a sign-in buys, and named
// with `test.step` so a failure still says which one broke.
//
// A flaky spec in the push gate is worse than a slow one: it blocks a push
// for a reason nobody can reproduce, and teaches people to re-run until green.
// ============================================================================

const listCards = (page: Page, clientId: string): Promise<APIResponse> =>
  page.request.get(
    `/api/payments/cards?clientId=${encodeURIComponent(clientId)}`,
    { failOnStatusCode: false },
  );

const saveCard = (page: Page, body: unknown): Promise<APIResponse> =>
  page.request.post("/api/payments/cards", {
    data: body,
    failOnStatusCode: false,
  });

const removeCard = (page: Page, id: string): Promise<APIResponse> =>
  page.request.delete(`/api/payments/cards/${id}`, {
    failOnStatusCode: false,
  });

/** A syntactically perfect request naming a customer that does not exist. */
const wellFormed = {
  source: "clv_0000000000000000000000000",
  clientId: "00000000-0000-4000-8000-000000000000",
  consent: true,
};

test.describe("storing a card", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    await page.context().clearCookies();
    expect((await saveCard(page, wellFormed)).status()).toBe(401);
    expect((await listCards(page, wellFormed.clientId)).status()).toBe(401);
    expect(
      (await removeCard(page, "00000000-0000-4000-8000-000000000000")).status(),
    ).toBe(401);
  });

  test("what somebody trusted with money may and may not do", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    await test.step("consent is required, and must be exactly true", async () => {
      // THE ASSERTION THAT MATTERS MOST HERE. Clover requires explicit
      // cardholder consent before a credential may be stored and reused.
      // `consent` is a literal `true` in the schema, so absent, false, or a
      // string that happens to be truthy are all refused — at 400, before the
      // card is sent anywhere.
      for (const consent of [undefined, false, "yes", 1, null]) {
        expect(
          (await saveCard(page, { ...wellFormed, consent })).status(),
          `consent=${JSON.stringify(consent)} must be refused`,
        ).toBe(400);
      }
    });

    await test.step("a body naming no card or no customer is refused", async () => {
      for (const body of [
        {},
        { consent: true },
        { source: "clv_x", consent: true },
        { clientId: wellFormed.clientId, consent: true },
        { ...wellFormed, clientId: "not-a-uuid" },
      ]) {
        expect(
          (await saveCard(page, body)).status(),
          JSON.stringify(body),
        ).toBe(400);
      }
    });

    await test.step("a customer who is not this facility's is refused", async () => {
      // 404 rather than 403: whether that id names somebody at another
      // facility is not the caller's to learn. And Clover is never asked — a
      // 502 here would mean the route tried to vault against a customer it
      // could not find.
      const response = await saveCard(page, wellFormed);
      expect(response.status()).toBe(404);
      expect(response.status()).not.toBe(502);
    });

    await test.step("listing returns an empty list, never an error", async () => {
      // `saved_cards_read` filters rather than refusing, so a caller who may
      // see nothing gets an empty list — the same answer as a customer with no
      // cards. Deliberate: the list must not reveal that somebody else's cards
      // exist by answering differently.
      const response = await listCards(page, wellFormed.clientId);
      expect(response.status()).toBe(200);
      expect((await response.json()).cards).toEqual([]);
    });

    await test.step("removing a card that is not theirs is not reported as done", async () => {
      // RLS filters the row away, so the UPDATE touches nothing. The route
      // counts rows and answers 404 — it must never return success for a
      // revocation that revoked nothing, which is the exact shape that shipped
      // once on `unattached_payments` (20260824190000).
      expect(
        (
          await removeCard(page, "00000000-0000-4000-8000-000000000000")
        ).status(),
      ).toBe(404);
    });
  });

  test("a groomer cannot store a card", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    // `saved_cards_insert` wants `financial_take_payment`, which a groomer does
    // not hold. They get no further than the customer lookup, which their own
    // RLS already narrows — so 404, and no card is stored either way.
    expect([403, 404]).toContain((await saveCard(page, wellFormed)).status());
  });
});
