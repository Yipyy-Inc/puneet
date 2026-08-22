import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A report card is a row the owner can read.
//
// ── WHAT THIS EXISTS TO CATCH ─────────────────────────────────────────────
//
// Before 20260822300000 a report card was `useState` in a 1,967-line
// component. The facility filled in the form, paid Anthropic for the closing
// comment, and the card lived until the tab was refreshed. "Sending" pushed
// onto an in-memory array and the screen said "Delivered via email, SMS".
//
// So the assertions here are deliberately about PERSISTENCE and VISIBILITY —
// the two things that were being claimed and not done. A build proves the code
// compiles; only this proves a card survives the request that made it and
// reaches the person it was written for.
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// Nothing. Every card it creates is deleted in `afterEach`, which is possible
// because 20260822340000 allows a DRAFT to be discarded. The one card that
// gets SENT cannot be deleted — by design, since an owner received it — so
// this file never sends a card it created for its own sake: the send test
// asserts against the response and then leaves a single sent card per run.
//
// That is stated rather than hidden. One sent card per CI run, on the demo
// facility, addressed to a demo client, is the cost of testing the send path
// at all; the alternative is not testing the thing that was most broken.
// ============================================================================

const API = "/api/report-cards";

type Page = import("@playwright/test").Page;

interface Card {
  id: string;
  petRef?: number;
  petName?: string;
  ownerName?: string;
  serviceType: string;
  visitDate: string;
  deliveryStatus: string;
  sentAt: string | null;
  viewedAt: string | null;
  favourite: boolean;
  ratingStars: number | null;
  generated: Record<string, string>;
  photos: { id: string; url: string | null }[];
}

/** Cards created by the running test, torn down in afterEach. */
const created: string[] = [];

async function createCard(
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<Card> {
  const res = await page.request.post(API, {
    data: {
      petRef: 1,
      serviceType: "daycare",
      visitDate: new Date().toISOString().slice(0, 10),
      theme: "everyday",
      input: { mood: "happy", energy: "high", appetite: "ate-all" },
      generated: {
        todaysVibe: "E2E: Buddy had a great day.",
        friendsAndFun: "E2E: played with everyone.",
        careMetrics: "E2E: ate everything.",
        closingNote: "E2E: see you soon.",
      },
      deliveryStatus: "pending",
      ...overrides,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const card = (await res.json()) as Card;
  if (card.deliveryStatus !== "sent") created.push(card.id);
  return card;
}

test.describe("a report card", () => {
  test.afterEach(async ({ browser }) => {
    if (created.length === 0) return;
    const ids = created.splice(0, created.length);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      for (const id of ids) {
        await page.request.delete(`${API}/${id}`);
      }
    } catch {
      // Teardown must not turn a green run red. A leaked DRAFT is invisible to
      // every customer — the portal asks for sent cards — so the blast radius
      // of a failed cleanup here is a row nobody sees.
    } finally {
      await context.close();
    }
  });

  test("survives the request that created it", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const card = await createCard(page);
    expect(card.id).toBeTruthy();

    // The assertion the old implementation could never have passed: read it
    // back in a SEPARATE request. `setReportCards` would have lost it here.
    const list = await page.request.get(API);
    expect(list.ok(), await list.text()).toBe(true);
    const rows = (await list.json()) as Card[];

    const found = rows.find((r) => r.id === card.id);
    expect(found, "the card just created is not in the list").toBeTruthy();
    expect(found!.generated.todaysVibe).toBe("E2E: Buddy had a great day.");
    // Joined for display, and the reason a log of uuids is not usable.
    expect(found!.petName).toBeTruthy();
  });

  test("narrows to one pet, and does not relabel the rest", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Buddy (ref 1) and Whiskers (ref 2) share an owner, so a filter that
    // silently does nothing still returns both — which is what makes this pair
    // the right probe.
    const buddy = await createCard(page, { petRef: 1 });
    const whiskers = await createCard(page, { petRef: 2 });

    const res = await page.request.get(`${API}?petRef=2`);
    expect(res.ok(), await res.text()).toBe(true);
    const rows = (await res.json()) as Card[];

    expect(rows.some((r) => r.id === whiskers.id)).toBe(true);
    // The assertion that matters. Through a PLAIN embed this filter narrowed
    // nothing: PostgREST applied it to the embed and returned every parent row
    // anyway, with the other pets' `pets` empty — so the pet file showed the
    // whole facility's cards and, because the name had been stripped, showed
    // them as if they were all this pet's. Measured 341 rows vs 309 on
    // 2026-08-22; the fix is the inner join in `reportCardSelect`.
    expect(
      rows.some((r) => r.id === buddy.id),
      "another pet's card came back from a per-pet query",
    ).toBe(false);
    for (const row of rows) {
      expect(row.petRef).toBe(2);
      expect(row.petName, "the join was dropped, not narrowed").toBeTruthy();
    }
  });

  test("gives the client file every pet it owns, and no others", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Alice Johnson (client ref 15) owns both; Max belongs to Bob Smith.
    const buddy = await createCard(page, { petRef: 1 });
    const whiskers = await createCard(page, { petRef: 2 });
    const max = await createCard(page, { petRef: 3 });

    const res = await page.request.get(`${API}?clientRef=15`);
    expect(res.ok(), await res.text()).toBe(true);
    const rows = (await res.json()) as Card[];

    expect(rows.some((r) => r.id === buddy.id)).toBe(true);
    expect(rows.some((r) => r.id === whiskers.id)).toBe(true);
    expect(
      rows.some((r) => r.id === max.id),
      "another client's card came back from a per-client query",
    ).toBe(false);
    for (const row of rows) expect(row.ownerName).toBe("Alice Johnson");
  });

  test("is not visible to its owner until it is sent", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const draft = await createCard(page);

    // The customer's own list. RLS admits a client to their card the moment it
    // exists, because the card IS theirs — so "not yet sent" has to be a
    // filter, and this is what proves the filter is applied.
    const sentOnly = await page.request.get(`${API}?sentOnly=true`);
    expect(sentOnly.ok(), await sentOnly.text()).toBe(true);
    const rows = (await sentOnly.json()) as Card[];

    expect(rows.some((r) => r.id === draft.id)).toBe(false);
    for (const row of rows) expect(row.deliveryStatus).toBe("sent");
  });

  test("stamps its own sent time, and cannot be sent twice", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const draft = await createCard(page);

    const sendRes = await page.request.post(`${API}/${draft.id}/send`);
    expect(sendRes.ok(), await sendRes.text()).toBe(true);
    const sent = (await sendRes.json()) as Card;

    expect(sent.deliveryStatus).toBe("sent");
    // The ROUTE stamps this. A caller that can name its own delivery time can
    // claim one that never happened, which is the failure this table ends.
    expect(sent.sentAt).toBeTruthy();

    // Sent once. A second press must not rewrite the delivery time — the
    // update excludes rows already sent, so this is a refusal, not a no-op
    // dressed up as success.
    const again = await page.request.post(`${API}/${draft.id}/send`);
    expect(again.status()).toBe(403);

    // It is now the owner's, and cannot be erased.
    const del = await page.request.delete(`${API}/${draft.id}`);
    expect(del.status()).toBe(403);
  });

  test("refuses a pet the caller cannot see", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Resolved through RLS by ref, so an unknown pet is not a 500 and not a
    // silently mis-attributed card — it is a refusal naming what was wrong.
    const res = await page.request.post(API, {
      data: {
        petRef: 99999999,
        serviceType: "daycare",
        visitDate: new Date().toISOString().slice(0, 10),
        input: {},
        generated: {
          todaysVibe: "",
          friendsAndFun: "",
          careMetrics: "",
          closingNote: "",
        },
        deliveryStatus: "pending",
      },
    });
    expect(res.status()).toBe(422);
  });

  test("takes the send permission for its own service", async ({ page }) => {
    // A groomer holds grooming_upload_photos and NOT daycare_send_updates, so
    // the service-specific gate in `may_send_report_card` is what decides.
    // Flattening it to "can send updates" would let this through.
    await signIn(page, ACCOUNTS.groomer);

    const res = await page.request.post(API, {
      data: {
        petRef: 1,
        serviceType: "daycare",
        visitDate: new Date().toISOString().slice(0, 10),
        input: {},
        generated: {
          todaysVibe: "",
          friendsAndFun: "",
          careMetrics: "",
          closingNote: "",
        },
        deliveryStatus: "pending",
      },
    });

    // 403 from the policy, or 422 if this identity cannot see the pet either —
    // both are refusals. What must not happen is a 201.
    expect(res.status(), await res.text()).not.toBe(201);
    if (res.status() === 201) {
      const card = (await res.json()) as Card;
      created.push(card.id);
    }
  });

  test("is refused to a caller with no session", async ({ browser }) => {
    // A fresh context: no cookies, no session.
    const context = await browser.newContext();
    try {
      const res = await context.request.get(API);
      expect(res.status()).toBe(401);
    } finally {
      await context.close();
    }
  });
});
