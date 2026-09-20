import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// AN ABANDONED BOOKING COMES BACK WHERE IT WAS LEFT.
//
// A customer who starts a booking and walks away has it kept for them: the
// facility can follow it up, and the customer can carry on from where they
// stopped. The whole feature had NO browser coverage until 2026-09-20 — a
// table, four routes, a recovery tick and two screens, and nothing that ran
// the round trip.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// T1  One row per client and service, not one per keystroke: leaving again
//     MOVES the step rather than adding a second draft.
// T2  The draft carries what was entered, including the sub-step and what the
//     booking would have been worth.
// T3  THE ONE THAT MATTERS. Resuming opens the wizard ON THE STEP THEY LEFT.
//     `step` was written and never read back until 2026-09-20: resume restored
//     every field and then let the wizard guess a step from what happened to
//     be preselected, so somebody who left on Confirm came back to Details and
//     clicked forward again.
// T4  A draft for a client the caller does not own is refused — the POST is
//     scoped by `profile_id`, not by the id in the body.
// T5  The facility sees it on its own list.
// T6  Recovered takes it off the customer's list, and is what cleans up here.
//
// Alice Johnson (client 15) is the customer account's own record, as in
// customer-booking-actions.spec.ts. Bob (16) is the one to be refused.
// ============================================================================

const ALICE = 15;
const BOB = 16;
const ALICE_PET = 1;
const SERVICE = "boarding";

interface Draft {
  id: string;
  service?: string;
  abandonmentStep: string;
  subStep?: number;
  estimatedValue?: number;
  specialRequests?: string;
  petIds?: number[];
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** What the customer's wizard sends when it is left partway. */
async function leaveAt(
  page: Page,
  step: string,
  extra: { estimatedValue?: number; draft?: Record<string, unknown> } = {},
) {
  const { draft: draftExtra, ...rest } = extra;
  return page.request.post("/api/customer/unfinished-bookings", {
    data: {
      clientRef: ALICE,
      service: SERVICE,
      step,
      requestedStart: day(21),
      requestedEnd: day(23),
      ...rest,
      draft: {
        preSelectedPetId: ALICE_PET,
        preSelectedPetIds: [ALICE_PET],
        preSelectedCheckInTime: "14:00",
        preSelectedCheckOutTime: "11:00",
        preSelectedSpecialRequests: "[e2e] left partway",
        ...draftExtra,
      },
    },
  });
}

async function mine(page: Page): Promise<Draft[]> {
  const res = await page.request.get("/api/customer/unfinished-bookings");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Draft[];
}

test.describe("an unfinished booking is kept, and resumed where it was left", () => {
  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.customer);
      const drafts = await mine(page);
      let cleared = 0;
      for (const d of drafts) {
        const res = await page.request.patch(
          `/api/customer/unfinished-bookings/${d.id}`,
        );
        if (res.ok()) cleared += 1;
      }
      console.log(`cleanup: ${cleared} draft(s) marked recovered`);
    } finally {
      await page.close();
    }
  });

  test("leaving twice moves the step and does not make a second draft", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const first = await leaveAt(page, "service_selection");
    expect(first.ok(), await first.text()).toBe(true);

    const afterFirst = await mine(page);
    const forService = afterFirst.filter((d) => d.service === SERVICE);
    expect(forService.length, "one draft for this service").toBe(1);
    expect(forService[0]!.abandonmentStep).toBe("service_selection");

    // They came back, got further, and left again.
    const second = await leaveAt(page, "date_and_details");
    expect(second.ok(), await second.text()).toBe(true);

    const afterSecond = (await mine(page)).filter((d) => d.service === SERVICE);
    expect(
      afterSecond.length,
      "still one draft — the row is updated, not added to",
    ).toBe(1);
    expect(afterSecond[0]!.abandonmentStep).toBe("date_and_details");
    expect(afterSecond[0]!.id, "the same row").toBe(forService[0]!.id);
  });

  test("the draft carries what was entered, the sub-step and the value", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const res = await leaveAt(page, "date_and_details", {
      estimatedValue: 184,
      draft: { preSelectedSubStep: 3 },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const draft = (await mine(page)).find((d) => d.service === SERVICE);
    expect(draft, "the draft is there").toBeTruthy();
    expect(draft!.petIds).toEqual([ALICE_PET]);
    expect(draft!.specialRequests).toBe("[e2e] left partway");
    // The sub-step is what returns them to the right QUESTION, not just the
    // right screen. It was never saved until 2026-09-20.
    expect(draft!.subStep).toBe(3);
    // An indication for the facility, recorded when they left. Nothing prices
    // a booking from it — the wizard re-prices on resume.
    expect(draft!.estimatedValue).toBe(184);
  });

  test("resuming opens the wizard on the step they left, not at the start", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    // Left on the last step, with everything chosen.
    await leaveAt(page, "review");
    const draft = (await mine(page)).find((d) => d.service === SERVICE);
    expect(draft, "the draft is there").toBeTruthy();

    await page.goto(`/customer/bookings/new?resumeBooking=${draft!.id}`);

    // The wizard's own step heading. Landing on "Details" here is the bug this
    // test exists for: every field is restored, so the wizard used to infer a
    // step from them and put the customer one short of where they were.
    await expect(
      page.getByRole("heading", { name: "Confirm", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("resuming mid-Details lands on the sub-step, not the top of it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    // Boarding's Details has five sub-steps; 3 is Feeding.
    await leaveAt(page, "date_and_details", {
      draft: { preSelectedSubStep: 3 },
    });
    const draft = (await mine(page)).find((d) => d.service === SERVICE);
    expect(draft, "the draft is there").toBeTruthy();

    await page.goto(`/customer/bookings/new?resumeBooking=${draft!.id}`);

    await expect(
      page.getByRole("heading", { name: "Details", exact: true }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText("Feeding", { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("a draft for somebody else's client is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);

    // The route scopes by `profile_id`, so the id in the body decides nothing.
    const res = await page.request.post("/api/customer/unfinished-bookings", {
      data: {
        clientRef: BOB,
        service: "daycare",
        step: "service_selection",
        draft: {},
      },
    });
    expect(res.status(), await res.text()).toBe(404);
  });

  test("the facility sees the draft its customer left", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    await leaveAt(page, "date_and_details");
    const draft = (await mine(page)).find((d) => d.service === SERVICE);
    expect(draft, "the draft is there").toBeTruthy();

    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      const res = await staff.request.get("/api/unfinished-bookings");
      expect(res.ok(), await res.text()).toBe(true);
      const rows = (await res.json()) as Draft[];
      expect(
        rows.some((r) => r.id === draft!.id),
        "the facility's own list holds it",
      ).toBe(true);
    } finally {
      await staff.close();
    }
  });

  test("recovering it takes it off the customer's list", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    await leaveAt(page, "date_and_details");
    const draft = (await mine(page)).find((d) => d.service === SERVICE);
    expect(draft, "the draft is there").toBeTruthy();

    const res = await page.request.patch(
      `/api/customer/unfinished-bookings/${draft!.id}`,
    );
    expect(res.ok(), await res.text()).toBe(true);

    const after = (await mine(page)).filter((d) => d.id === draft!.id);
    expect(after.length, "a recovered draft is not offered again").toBe(0);
  });
});
