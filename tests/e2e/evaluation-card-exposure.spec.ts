import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// An evaluation report card reaches its owner — and nothing staff kept to
// themselves reaches them with it (the client's evaluation mocks, 2026-10-02).
//
// ── WHY THIS IS A GATE SPEC ───────────────────────────────────────────────
//
// The evaluator writes two kinds of thing on one row: what the owner reads
// (the note, the friendly tags, the result) and what only staff may (resource
// guarding, the internal note, the facility's staff-only questions). The
// owner's page reads the row through public.evaluation_card_for_owner(), a
// projection, and a projection that grows one column too many publishes a
// dog's guarding history to its owner's inbox. SQL proves the projection
// (supabase/tests/evaluations.sql V12); this proves the ROUTE in front of it
// adds nothing back, a card is invisible until it is sent, and only someone
// who may review can send it.
//
// ── CLEANUP ──────────────────────────────────────────────────────────────
//
// A sent card can be neither changed nor thrown away — its owner received it.
// The note starts "E2E:", which is all public.purge_e2e_evaluations() matches;
// `bun run e2e:purge` (CI runs it after every suite) removes the card, the
// result it recorded on the pet, and any credit it gave. If the spec fails
// before it sends, the afterAll throws the evaluation away.
// ============================================================================

const INTERNAL = "E2E internal: guards the water bowl";

let evaluationId: string | null = null;
let sent = false;

async function customerPetRef(page: Page): Promise<number | null> {
  const response = await page.request.get("/api/clients/me", {
    failOnStatusCode: false,
  });
  if (!response.ok()) return null;
  const client = (await response.json()) as {
    pets?: Array<{ id: number }>;
  };
  return Array.isArray(client.pets) && client.pets[0]
    ? Number(client.pets[0].id)
    : null;
}

test.describe.configure({ mode: "serial" });

test.describe("an evaluation report card and who sees what", () => {
  test.afterAll(async ({ browser }) => {
    if (!evaluationId || sent) return;
    const page = await browser.newPage();
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.delete(
      `/api/evaluations/${evaluationId}`,
      { failOnStatusCode: false },
    );
    const body = (await response.json().catch(() => null)) as unknown;
    // A refusal answers { error }; nothing here walks it, but say so if the
    // throw-away did not happen.
    if (!response.ok()) {
      console.warn("[evaluation-card-exposure] cleanup:", body);
    }
    await page.close();
  });

  test("a groomer cannot start one", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    const petRef = await customerPetRef(page);
    test.skip(petRef === null, "this environment's customer has no pet");

    await signIn(page, ACCOUNTS.groomer);
    const response = await page.request.post("/api/evaluations", {
      data: { petRef },
      failOnStatusCode: false,
    });
    expect([403, 404], `a groomer started one: ${response.status()}`).toContain(
      response.status(),
    );
  });

  test("the owner runs one, and it waits — unseen — until it is sent", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const petRef = await customerPetRef(page);
    test.skip(petRef === null, "this environment's customer has no pet");

    await signIn(page, ACCOUNTS.owner);
    const started = await page.request.post("/api/evaluations", {
      data: { petRef },
      failOnStatusCode: false,
    });
    expect(started.status(), await started.text()).toBe(201);
    evaluationId = ((await started.json()) as { id: string }).id;

    const saved = await page.request.patch(`/api/evaluations/${evaluationId}`, {
      data: {
        answers: {
          dog: "y",
          human: "y",
          energy: "h",
          anx: "l",
          react: "l",
          play: "rough",
          group: "large",
          leash: "loose",
          guard: "y",
          result: "approved",
        },
        strengths: ["toy"],
        watchFor: ["jumper", "guarder"],
        ownerNote: "E2E: a lovely first visit.",
        internalNote: INTERNAL,
        approvedServices: ["daycare"],
      },
      failOnStatusCode: false,
    });
    expect(saved.status(), await saved.text()).toBe(200);

    const finished = await page.request.post(
      `/api/evaluations/${evaluationId}/finish`,
      { failOnStatusCode: false },
    );
    expect(finished.status(), await finished.text()).toBe(200);
    const { outcome } = (await finished.json()) as { outcome: string };
    test.skip(
      outcome === "sent",
      "this facility sends cards automatically; the review half needs review",
    );
    expect(outcome).toBe("in_review");

    await signIn(page, ACCOUNTS.customer);
    const early = await page.request.get(
      `/api/customer/evaluations/${evaluationId}`,
      { failOnStatusCode: false },
    );
    expect(early.status(), "the owner read a card still in review").toBe(404);
  });

  test("someone who may not review cannot send it", async ({ page }) => {
    test.skip(!evaluationId, "nothing was started");
    await signIn(page, ACCOUNTS.caretaker);
    const response = await page.request.post(
      `/api/evaluations/${evaluationId}/send`,
      { data: { channels: [] }, failOnStatusCode: false },
    );
    expect(
      [403, 404],
      `a caretaker sent a report card: ${response.status()}`,
    ).toContain(response.status());
  });

  test("sent, the owner reads it — without guarding or the internal note", async ({
    page,
  }) => {
    test.skip(!evaluationId, "nothing was started");
    await signIn(page, ACCOUNTS.owner);
    const sending = await page.request.post(
      `/api/evaluations/${evaluationId}/send`,
      { data: { channels: [] }, failOnStatusCode: false },
    );
    expect(sending.status(), await sending.text()).toBe(200);
    sent = true;

    await signIn(page, ACCOUNTS.customer);
    const response = await page.request.get(
      `/api/customer/evaluations/${evaluationId}`,
      { failOnStatusCode: false },
    );
    expect(response.status(), await response.text()).toBe(200);
    const raw = await response.text();
    const card = JSON.parse(raw) as {
      hideInternal: boolean;
      ownerNote: string;
      answers: Record<string, string>;
      watchFor: string[];
      internalNote: string;
    };
    expect(card.ownerNote).toBe("E2E: a lovely first visit.");
    test.skip(
      card.hideInternal === false,
      "this facility shows internal notes on its cards (Setup)",
    );
    expect(raw, "the internal note reached the owner").not.toContain(INTERNAL);
    expect(card.internalNote).toBe("");
    expect(
      card.answers,
      "resource guarding reached the owner",
    ).not.toHaveProperty("guard");
    expect(card.watchFor).not.toContain("guarder");
    expect(card.watchFor).toContain("jumper");

    // And it is on their list, marked opened now that they have read it.
    const list = await page.request.get("/api/customer/evaluations");
    const rows = (await list.json()) as Array<{
      id: string;
      openedAt: string | null;
    }>;
    expect(Array.isArray(rows)).toBe(true);
    const mine = rows.find((row) => row.id === evaluationId);
    expect(mine, "the sent card is not on the owner's list").toBeTruthy();
    expect(mine?.openedAt).toBeTruthy();
  });

  test("a different household cannot read it", async ({ page }) => {
    test.skip(!sent, "nothing was sent");
    await signIn(page, ACCOUNTS.customerPawsCo);
    const response = await page.request.get(
      `/api/customer/evaluations/${evaluationId}`,
      { failOnStatusCode: false },
    );
    expect(response.status()).toBe(404);
  });
});
