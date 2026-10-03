import {
  test,
  expect,
  type Browser,
  type Locator,
  type Page,
} from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { bookingsMarked } from "./_sweep";

// ============================================================================
// An evaluation, end to end, through the screens people use (the client's
// evaluations mock, re-sent 2026-10-03: "make it work end to end").
//
//   1. A new dog cannot book daycare: the service waits for an evaluation.
//   2. Staff book the evaluation in the New Booking wizard.
//   3. It shows on Operations › Evaluations, scheduled.
//   4. The evaluator answers it from the dog's profile and finishes it.
//   5. A reviewer approves the card and sends it to the owner.
//   6. The owner reads it — the note, and nothing staff kept to themselves.
//   7. The owner can now book daycare for the dog.
//   8. Staff reach the same module in their own portal.
//
// `evaluation-card-exposure` (the gate) proves who may read and send a card
// through the API; this proves the screens join up.
//
// ── ITS OWN DOG ───────────────────────────────────────────────────────────
//
// Alice Johnson's Daisy is the dog without an evaluation that
// `booking-wizard` relies on, so this never touches her: it registers a dog
// of its own and deletes it afterwards. `booking_pets.pet_id` and
// `evaluations.pet_id` cascade, so the card and the booking's link go with
// it. The booking is cancelled first, found by its marker in the database
// rather than through the facility's list (tests/e2e/_sweep.ts says why).
// ============================================================================

const MARKER = "[e2e evaluation-end-to-end]";
const CUSTOMER_REF = 15; // Alice Johnson — the client record customer@yipyy.dev owns.
const DOG = `E2E Evaluee ${Date.now() % 100000}`;
/** "E2E:" is what public.purge_e2e_evaluations() matches, should one survive. */
const NOTE = "E2E: a lovely first visit, settled in fast.";
const INTERNAL = "E2E internal: watched the gate the whole time";

let petRef: number | null = null;
let evaluationId: string | null = null;
let sent = false;
/** Whether daycare waited for an evaluation here at all. */
let gatedBefore = false;

test.describe.configure({ mode: "serial", timeout: 5 * 60 * 1000 });
test.use({ actionTimeout: 30_000 });

const exact = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

const nextStep = (dialog: Locator) =>
  dialog
    .getByRole("button", { name: /^(next|continue|suivant|continuer)$/i })
    .click();

/** Only this dog chosen, in either portal's first step. */
async function chooseOnly(dialog: Locator, name: string) {
  const mine = dialog.getByRole("checkbox", { name: new RegExp(name) });
  await mine.first().waitFor({ timeout: 90_000 });
  const checked = dialog.getByRole("checkbox", { checked: true });
  for (let i = (await checked.count()) - 1; i >= 0; i -= 1) {
    const box = checked.nth(i);
    const label = (await box.getAttribute("aria-label")) ?? "";
    if (!label.includes(name)) await box.click();
  }
  if ((await mine.first().getAttribute("aria-checked")) !== "true") {
    await mine.first().click();
  }
}

/** The customer wizard at its Service step, for this dog. */
async function customerServiceStep(page: Page): Promise<Locator> {
  await page.goto("/customer/bookings/new");
  const dialog = page.getByRole("dialog");
  await chooseOnly(dialog, DOG);
  await nextStep(dialog);
  await dialog
    .getByText(/^evaluation$/i)
    .first()
    .waitFor({ timeout: 90_000 });
  return dialog;
}

/**
 * The daycare card on the Service step — its kind reads "Daycare". Not the
 * evaluation's card, which may name daycare among what it unlocks.
 */
const daycareCard = (dialog: Locator) =>
  dialog
    .getByRole("radio")
    .filter({ has: dialog.page().getByText(/^daycare$/i) })
    .filter({ hasNot: dialog.page().getByText(/^evaluation$/i) });

/** The first start the shown day offers, from its Morning or Afternoon times. */
async function pickFirstStart(dialog: Locator) {
  const time = dialog
    .getByRole("radiogroup", {
      name: /morning|afternoon|evening|matin|après-midi|soir/i,
    })
    .locator('button[role="radio"]:not([disabled])')
    .first();
  await time.waitFor({ timeout: 60_000 });
  await time.click();
}

/**
 * Click a tab until what it opens is on screen. A click that lands before the
 * page has hydrated does nothing, and the next assertion then reads the tab
 * that was already open.
 */
async function openTab(tab: Locator, opened: Locator) {
  await expect(async () => {
    await tab.click();
    await expect(opened).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 90_000 });
}

/** Every question on the shown step that has no answer gets its first. */
async function answerShownQuestions(dialog: Locator) {
  const groups = dialog.getByRole("radiogroup");
  const count = await groups.count();
  for (let i = 0; i < count; i += 1) {
    const group = groups.nth(i);
    // The AI note's tone is a choice of style, not a question.
    if ((await group.getAttribute("aria-labelledby")) === "ev-ai-tone") {
      continue;
    }
    if ((await group.getByRole("radio", { checked: true }).count()) > 0) {
      continue;
    }
    await group.getByRole("radio").first().click();
  }
}

/** The caretaker's staff id, as the Roles studio names it. */
const CARETAKER_STAFF_ID = "fs-dev-caretaker";

/**
 * Grant (or, with `null`, clear) one permission for one member of staff, as
 * the Roles studio does — the owner's own request, in its own context.
 */
async function setStaffOverride(
  browser: Browser,
  key: string,
  setting: { granted: boolean; scope: string } | null,
): Promise<number> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.put("/api/roles/overrides", {
      data: { kind: "staff", staffId: CARETAKER_STAFF_ID, key, setting },
      failOnStatusCode: false,
    });
    return res.status();
  } finally {
    await context.close();
  }
}

/** Undo a run that crashed: its bookings, and any dog it left behind. */
async function sweep(page: Page) {
  for (const booking of await bookingsMarked(MARKER)) {
    if (booking.status === "cancelled") continue;
    const res = await page.request.patch(`/api/bookings/${booking.ref}`, {
      data: { status: "cancelled" },
      failOnStatusCode: false,
    });
    if (!res.ok()) {
      console.log(
        `[evaluation-end-to-end] booking ${booking.ref}: ${res.status()}`,
      );
    }
  }
}

test.describe("an evaluation, end to end", () => {
  test.beforeAll(async ({ browser }) => {
    const staff = await browser.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      await sweep(staff);
    } finally {
      await staff.close();
    }

    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.customer);
      // A dog an earlier run could not delete: try again before adding one.
      const me = await page.request.get("/api/clients/me", {
        failOnStatusCode: false,
      });
      const body = (await me.json().catch(() => null)) as {
        pets?: unknown;
      } | null;
      const leftovers = Array.isArray(body?.pets)
        ? (body.pets as Array<{ id: number; name: string }>).filter((pet) =>
            pet.name.startsWith("E2E Evaluee"),
          )
        : [];
      if (leftovers.length > 0) {
        const staffPage = await browser.newPage();
        try {
          await signIn(staffPage, ACCOUNTS.owner);
          for (const pet of leftovers) {
            await staffPage.request.delete(`/api/pets/${pet.id}`, {
              failOnStatusCode: false,
            });
          }
        } finally {
          await staffPage.close();
        }
      }

      const created = await page.request.post("/api/pets", {
        data: {
          clientId: CUSTOMER_REF,
          name: DOG,
          type: "dog",
          breed: "Beagle",
        },
        failOnStatusCode: false,
      });
      expect(created.status(), await created.text()).toBe(201);
      petRef = Number(((await created.json()) as { id: number }).id);
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      await sweep(page);
      if (evaluationId && !sent) {
        await page.request.delete(`/api/evaluations/${evaluationId}`, {
          failOnStatusCode: false,
        });
      }
      if (petRef !== null) {
        const removed = await page.request.delete(`/api/pets/${petRef}`, {
          failOnStatusCode: false,
        });
        if (removed.status() !== 204) {
          console.log(
            `[evaluation-end-to-end] cleanup: dog ${petRef} -> ${removed.status()}`,
          );
        }
      }
    } finally {
      await page.close();
    }
  });

  test("a new dog cannot book daycare before its evaluation", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const dialog = await customerServiceStep(page);
    const daycare = daycareCard(dialog);
    gatedBefore =
      (await daycare.count()) === 0 ||
      (await daycare.first().getAttribute("aria-disabled")) === "true";
    test.skip(!gatedBefore, "daycare needs no evaluation at this facility");
  });

  test("staff book its evaluation in the New Booking wizard", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard");
    await page
      .locator("#facility-create-new-trigger")
      .filter({ visible: true })
      .first()
      .click({ timeout: 90_000 });
    await page.getByRole("menuitem", { name: /new booking/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("searchbox").fill("Alice Johnson");
    await dialog
      .getByRole("button", { name: /^Alice Johnson/ })
      .first()
      .click();
    await chooseOnly(dialog, DOG);
    await nextStep(dialog);
    // The card whose kind reads "Evaluation" — not the "Evaluation required"
    // chip on a service it unlocks.
    await dialog
      .getByText(/^evaluation$/i)
      .first()
      .click();
    await nextStep(dialog);
    await pickFirstStart(dialog);
    await nextStep(dialog);
    await dialog.locator("#booking-special-requests").fill(MARKER);
    await dialog
      .getByRole("button", { name: /^(book evaluation|create as pending)/i })
      .click();
    // The evaluation's own done screen: "Evaluation #N booked", and "Book
    // another evaluation" where a booking says "Start another booking".
    await dialog
      .getByRole("button", { name: /^book another evaluation$/i })
      .waitFor({ timeout: 120_000 });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });

    const booked = await bookingsMarked(MARKER);
    expect(
      booked.filter((b) => b.service === "evaluation"),
      "the evaluation booking was not found by its marker",
    ).toHaveLength(1);
  });

  test("it shows on All evaluations, scheduled", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/evaluations");
    await openTab(
      page.getByRole("button", { name: /all evaluations/i }),
      page.getByRole("columnheader", { name: /approved for/i }),
    );
    // A clickable row is a button to assistive tech, not a "row" — find it
    // in the table body.
    const row = page.locator("tbody tr").filter({ hasText: DOG });
    // One row per pet, as the mock lists them.
    await expect(row).toHaveCount(1, { timeout: 30_000 });
    await expect(row).toContainText(/scheduled/i);
  });

  test("the evaluator answers it from the dog's profile", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(
      `/facility/dashboard/clients/${CUSTOMER_REF}/pets/${petRef}`,
    );
    await openTab(
      page.getByRole("tab", { name: /^evaluations/i }),
      page.getByRole("button", { name: exact(`Start ${DOG}'s evaluation`) }),
    );
    const started = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        new URL(r.url()).pathname === "/api/evaluations",
    );
    await page
      .getByRole("button", { name: exact(`Start ${DOG}'s evaluation`) })
      .click();
    const response = await started;
    expect(response.status(), await response.text()).toBe(201);
    evaluationId = ((await response.json()) as { id: string }).id;

    const dialog = page.getByRole("dialog");
    await dialog.getByText("Friendly with other dogs?").waitFor();
    for (const step of [
      "Temperament",
      "Play profile",
      "Behavior & notes",
      "Result",
    ]) {
      await dialog.getByRole("button", { name: step, exact: true }).click();
      await answerShownQuestions(dialog);
      if (step === "Behavior & notes") {
        await dialog.locator("#ev-owner-note").fill(NOTE);
        await dialog.locator("#ev-internal-note").fill(INTERNAL);
      }
    }
    // A pass approves daycare.
    await dialog
      .getByRole("group", { name: /approved for/i })
      .getByRole("checkbox", { name: /daycare/i })
      .first()
      .check();

    const finish = dialog.getByRole("button", { name: /^finish & send/i });
    await expect(finish).toBeEnabled({ timeout: 30_000 });
    sent = /report card/i.test((await finish.textContent()) ?? "");
    const finished = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().endsWith(`/api/evaluations/${evaluationId}/finish`),
    );
    await finish.click();
    expect((await finished).ok(), "finishing the evaluation").toBe(true);
    await dialog.waitFor({ state: "hidden" });
  });

  test("a reviewer approves the card and sends it to the owner", async ({
    page,
  }) => {
    test.skip(sent, "this facility sends a finished card without review");
    await signIn(page, ACCOUNTS.owner);
    await page.goto("/facility/dashboard/evaluations");
    await openTab(
      page.getByRole("button", { name: /report cards to review/i }),
      page.getByText(/^waiting for review$/i),
    );
    await page
      .getByRole("button", {
        name: exact(`Review ${DOG}'s report card and send it`),
      })
      .click();
    const dialog = page.getByRole("dialog");
    const approved = page.waitForResponse(
      (r) =>
        r.request().method() === "POST" &&
        r.url().endsWith(`/api/evaluations/${evaluationId}/send`),
    );
    await dialog
      .getByRole("button", { name: /^approve & send to owner$/i })
      .click();
    expect((await approved).ok(), "sending the card").toBe(true);
    sent = true;
    await dialog.waitFor({ state: "hidden" });
    await expect(
      page
        .locator("section")
        .filter({ hasText: /sent to owners/i })
        .getByText(DOG),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("the owner reads it — the note, and nothing staff kept", async ({
    page,
  }) => {
    test.skip(!sent, "the card never went out");
    await signIn(page, ACCOUNTS.customer);
    const list = await page.request.get("/api/customer/evaluations", {
      failOnStatusCode: false,
    });
    expect(list.status()).toBe(200);
    const cards = (await list.json()) as unknown;
    const card = Array.isArray(cards)
      ? (cards as Array<{ id: string; petName: string }>).find(
          (c) => c.petName === DOG,
        )
      : undefined;
    expect(card, "the owner has the dog's card").toBeTruthy();

    await page.goto(`/customer/evaluations/${card!.id}`);
    await expect(page.getByText(NOTE)).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(DOG).first()).toBeVisible();
    await expect(page.getByText(INTERNAL)).toHaveCount(0);
  });

  test("and the owner can now book daycare for the dog", async ({ page }) => {
    test.skip(!sent, "the card never went out");
    test.skip(!gatedBefore, "daycare needs no evaluation at this facility");
    await signIn(page, ACCOUNTS.customer);
    const dialog = await customerServiceStep(page);
    const daycare = daycareCard(dialog);
    await expect(daycare.first()).toBeVisible();
    await expect(daycare.first()).not.toHaveAttribute("aria-disabled", "true");
  });

  test("staff reach the module in their own portal", async ({
    page,
    browser,
  }) => {
    // A caretaker walks straight into the employee portal — no drawer to
    // count, unlike a manager — but does not see evaluations by default. Grant
    // it the way the Roles studio would, and take it back after.
    expect(
      await setStaffOverride(browser, "view_evaluations", {
        granted: true,
        scope: "anytime",
      }),
    ).toBe(200);
    try {
      await signIn(page, ACCOUNTS.caretaker);
      await page.goto("/employee/evaluations");
      await expect(
        page.getByRole("heading", { name: /^evaluations$/i }),
      ).toBeVisible({ timeout: 90_000 });
      for (const tab of [
        /^today/i,
        /report cards to review/i,
        /all evaluations/i,
      ]) {
        await expect(page.getByRole("button", { name: tab })).toBeVisible();
      }
    } finally {
      await setStaffOverride(browser, "view_evaluations", null);
    }
  });
});
