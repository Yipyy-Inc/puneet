import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A customer's training report cards are the ones sent to them (2026-09-12).
//
// The customer training page's Report cards tab read cards the training
// fixture invented, marked them viewed in the query cache, and toasted a
// graduation "system message" on load. It lists the SENT training cards from
// /api/report-cards now, each opening on the Report cards page. This pins,
// through the screen:
//
//   1. A training card the facility sent Alice is on her tab, and its link
//      opens that card on the Report cards page.
//   2. The tab lists exactly the sent training cards the API gives her — no
//      invented card beside them — and never a draft.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Every card carries MARKER. A SENT card cannot be discarded through the API,
// because the owner received it, so afterAll removes this file's cards with
// the service role.
// ============================================================================

const MARKER = "[e2e customer-training-report-cards]";
const API = "/api/report-cards";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer.

interface Card {
  id: string;
  serviceType: string;
  generated: Record<string, string>;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Ids this file created, removed in afterAll with any MARKER leftovers. */
const created: string[] = [];

async function writeCard(
  page: Page,
  vibe: string,
  deliveryStatus: "pending" | "sent",
) {
  const res = await page.request.post(API, {
    data: {
      petRef: BUDDY,
      serviceType: "training",
      visitDate: new Date().toISOString().slice(0, 10),
      theme: "everyday",
      input: {},
      generated: {
        todaysVibe: vibe,
        friendsAndFun: "",
        careMetrics: "",
        closingNote: "",
      },
      deliveryStatus,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const card = (await res.json()) as Card;
  created.push(card.id);
  return card;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const db = admin();
  const { data } = await db
    .from("report_cards")
    .select("id")
    .like("generated->>todaysVibe", `%${MARKER}%`);
  const ids = [
    ...new Set([...created, ...(data ?? []).map((row) => row.id as string)]),
  ];
  if (ids.length > 0) {
    await db.from("report_cards").delete().in("id", ids);
  }
});

test.describe("a customer's training report cards", () => {
  test("are the cards sent to them, each opening the real report", async ({
    browser,
  }) => {
    test.slow();
    const stamp = Date.now();

    const staff = await browser.newPage();
    let sent: Card;
    let draft: Card;
    try {
      await signIn(staff, ACCOUNTS.owner);
      sent = await writeCard(staff, `${MARKER} sent ${stamp}`, "sent");
      draft = await writeCard(staff, `${MARKER} draft ${stamp}`, "pending");
    } finally {
      await staff.close();
    }

    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.customer);
      const res = await page.request.get(`${API}?sentOnly=true`);
      expect(res.ok(), await res.text()).toBe(true);
      const training = ((await res.json()) as Card[]).filter(
        (c) => c.serviceType === "training",
      );

      await page.goto("/customer/training?tab=report-cards");
      const list = page.getByRole("list", {
        name: "Your training report cards",
      });
      const item = list
        .locator(":scope > li")
        .filter({ hasText: sent.generated.todaysVibe });
      await expect(item).toBeVisible({ timeout: 30_000 });
      await expect(
        item.getByRole("link", { name: "Read the report card" }),
      ).toHaveAttribute("href", new RegExp(`report=${sent.id}`));

      // Exactly the API's sent training cards: an invented card beside them,
      // or the draft, would change this count.
      await expect(list.locator(":scope > li")).toHaveCount(training.length);
      await expect(page.getByText(draft.generated.todaysVibe)).toHaveCount(0);
    } finally {
      await page.close();
    }
  });
});
