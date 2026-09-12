import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A trainer's Report Cards tab is the dog's real report cards (2026-09-12).
//
// The tab on a student's training profile read `getReportCardsForPet`, cards
// the training fixture invented from fixture enrolments, and its Save
// assessment, Cancel schedule and Send changed the query cache and nothing
// else. It reads /api/report-cards for the pet now and keeps the training
// cards. This pins, through the screen:
//
//   1. A training card written for Buddy is on his tab.
//   2. The tab lists exactly the training cards the API holds for him — no
//      invented card beside them — and not his daycare card.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Every card is a DRAFT carrying MARKER, which the owner never sees (the
// portal asks for sent cards), and every one is discarded in afterAll.
// ============================================================================

const MARKER = "[e2e training-report-cards]";
const API = "/api/report-cards";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer.

interface Card {
  id: string;
  serviceType: string;
  generated: Record<string, string>;
}

/** Ids this file created, discarded in afterAll with any MARKER leftovers. */
const created: string[] = [];

async function draftCard(page: Page, serviceType: string, vibe: string) {
  const res = await page.request.post(API, {
    data: {
      petRef: BUDDY,
      serviceType,
      visitDate: new Date().toISOString().slice(0, 10),
      theme: "everyday",
      input: {},
      generated: {
        todaysVibe: vibe,
        friendsAndFun: "",
        careMetrics: "",
        closingNote: "",
      },
      deliveryStatus: "pending",
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const card = (await res.json()) as Card;
  created.push(card.id);
  return card;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.get(`${API}?petRef=${BUDDY}`);
    const leftovers = res.ok()
      ? ((await res.json()) as Card[])
          .filter((c) => (c.generated.todaysVibe ?? "").includes(MARKER))
          .map((c) => c.id)
      : [];
    for (const id of new Set([...created, ...leftovers])) {
      await page.request.delete(`${API}/${id}`);
    }
  } finally {
    await page.close();
  }
});

test.describe("a trainer's report cards tab", () => {
  test("lists the dog's real training cards, and only those", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const stamp = Date.now();
    const training = await draftCard(
      page,
      "training",
      `${MARKER} sat on cue ${stamp}`,
    );
    const daycare = await draftCard(
      page,
      "daycare",
      `${MARKER} daycare day ${stamp}`,
    );

    const res = await page.request.get(`${API}?petRef=${BUDDY}`);
    expect(res.ok(), await res.text()).toBe(true);
    const trainingCards = ((await res.json()) as Card[]).filter(
      (c) => c.serviceType === "training",
    );

    await page.goto(
      `/facility/dashboard/services/training/students/${BUDDY}?tab=report-cards`,
    );
    const list = page.getByRole("list", { name: "Training report cards" });
    const item = list
      .locator(":scope > li")
      .filter({ hasText: training.generated.todaysVibe });
    await expect(item).toBeVisible({ timeout: 30_000 });
    await expect(item.getByText("Draft", { exact: true })).toBeVisible();

    // Exactly the API's training cards: a fixture card beside them, or the
    // daycare card, would change this count.
    await expect(list.locator(":scope > li")).toHaveCount(trainingCards.length);
    await expect(page.getByText(daycare.generated.todaysVibe)).toHaveCount(0);
  });
});
