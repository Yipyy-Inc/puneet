import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A trainer is a member of staff.
//
// ── THE DEFECT ────────────────────────────────────────────────────────────
//
// `trainers` in src/data/training.ts: four invented people with their own ids
// ("trainer-001") and their own @yipyy.com addresses — Marcus Chen, Sophie
// Martinez and two more. This facility employs two trainers, Marcus Bélanger
// and Noémie Fortin, and NEITHER was on that list.
//
// So the instructor picker on the series editor offered four people who do not
// work here and omitted the two who do. Somebody assigned to a class could not
// be paid for it, rostered against it, or messaged about it.
//
// ── THE LIST IS THE ROLE, THE PROFILE IS OPTIONAL ─────────────────────────
//
// Driven by `staff.primary_role` and `additional_roles`, not by the profile
// table — a trainer nobody has written a bio for is still a trainer. That is
// the opposite of `grooming_stylists`, where a groomer with no profile is
// deliberately absent, and the difference is what the profile carries: a
// stylist's skill level and daily capacity are scheduling inputs, a trainer's
// bio is not.
// ============================================================================

interface Trainer {
  id: string;
  staffId: string;
  name: string;
  email: string;
  status: string;
  specializations: string[];
  bio: string;
  hasProfile: boolean;
}

async function trainers(
  page: import("@playwright/test").Page,
): Promise<Trainer[]> {
  const res = await page.request.get("/api/training/trainers");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Trainer[];
}

test.describe("training trainers", () => {
  test.slow();

  test("the list is the facility's own staff", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const list = await trainers(page);
    expect(list.length, "this facility employs trainers").toBeGreaterThan(0);

    // Every one of them is a real staff row, which is the whole point: the
    // fixture's ids referred to nobody.
    for (const t of list) {
      expect(t.staffId, `${t.name} has a staff row`).toBeTruthy();
      expect(t.name.trim()).not.toBe("");
    }

    // And the invented ones are gone.
    const names = list.map((t) => t.name);
    expect(names).not.toContain("Marcus Chen");
    expect(names).not.toContain("Sophie Martinez");
  });

  test("a trainer with no profile is still a trainer", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const list = await trainers(page);
    const unprofiled = list.filter((t) => !t.hasProfile);
    expect(
      unprofiled.length,
      "nobody has filled in a training profile yet",
    ).toBeGreaterThan(0);

    // Present, and honest about what is missing: empty arrays and an empty
    // bio rather than an invented specialisation. The fixture carried
    // `rating: 4.9` and `totalClasses: 342` for people who did not exist.
    for (const t of unprofiled) {
      expect(t.specializations).toEqual([]);
      expect(t.bio).toBe("");
    }
  });

  test("the series editor offers them, and only the active ones", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const list = await trainers(page);
    const active = list.filter((t) => t.status === "active");
    const inactive = list.filter((t) => t.status !== "active");
    expect(active.length, "at least one assignable trainer").toBeGreaterThan(0);

    await page.goto("/facility/dashboard/services/training/series");

    // "Create Series" — read off series-list.tsx rather than guessed at. The
    // first version of this test spent eight minutes timing out on a button
    // label that never existed.
    //
    // RETRIED, because waiting for the button is not waiting for hydration:
    // Playwright's actionability checks pass as soon as an element is visible,
    // and a click dispatched before React attaches the handler is swallowed
    // silently. It passed alone and failed in sequence until this.
    const dialog = page.getByRole("dialog");
    const openButton = page
      .getByRole("button", { name: /create series/i })
      .first();
    await expect(openButton).toBeVisible({ timeout: 60_000 });
    await expect(async () => {
      await openButton.click();
      await expect(dialog).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 60_000 });
    await dialog
      .getByText(/select instructor/i)
      .first()
      .click();

    await expect(
      page.getByRole("option", { name: active[0].name }),
      "the real trainer is offered",
    ).toBeVisible({ timeout: 15_000 });

    // Somebody who has not accepted their invitation cannot be given a class.
    for (const t of inactive) {
      await expect(
        page.getByRole("option", { name: t.name }),
        `${t.name} is ${t.status} and not assignable`,
      ).toHaveCount(0);
    }
  });

  test("signed out gets 401, not an empty list", async ({ page }) => {
    // An unauthenticated caller getting `[]` is indistinguishable from a
    // facility with no trainers.
    const res = await page.request.get("/api/training/trainers");
    expect(res.status()).toBe(401);
  });
});
