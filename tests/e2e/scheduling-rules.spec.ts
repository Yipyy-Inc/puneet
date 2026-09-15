import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Scheduling rules are saved, and saved for the facility.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// Scheduling → Settings held about seventy options in `useState`, and Save was
// a TODO. A manager could set minimum rest to 11 hours, press Save, and find 8
// after a reload — while the schedule's warnings read neither, but a constant.
//
// ── WHAT IT ASSERTS ───────────────────────────────────────────────────────
//
// The `scheduling_rules` domain stores and reads back; an out-of-range rule is
// refused rather than stored; and through the screen, an edited rule survives a
// reload. That the WARNINGS follow the stored rules is pure logic and pinned in
// tests/unit/scheduling-rules.test.ts.
//
// ── IT CLEANS UP, WITH THE SAME EXCEPTION AS payroll-overtime ─────────────
//
// There is no DELETE on the settings route. A facility that had rules gets them
// back; one that had none gets the defaults stored, which the schedule reads
// exactly as it reads no row. One row may be left where there was none.
// ============================================================================

const SETTINGS = "/facility/dashboard/services/scheduling/settings";

interface Rules {
  minRestHours: number;
  maxConsecutiveDays: number;
}

const DEFAULTS: Rules = { minRestHours: 8, maxConsecutiveDays: 6 };

type Page = import("@playwright/test").Page;

async function storedRules(
  page: Page,
): Promise<{ value: Rules; configured: boolean }> {
  const res = await page.request.get("/api/facility/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as {
    scheduling_rules: { value: Rules; configured: boolean };
  };
  return body.scheduling_rules;
}

async function saveRules(page: Page, value: unknown) {
  return page.request.patch("/api/facility/settings", {
    data: { domain: "scheduling_rules", value },
  });
}

test("scheduling rules are stored, bounded, and survive a reload", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const before = await storedRules(page);

  try {
    // ── The domain ─────────────────────────────────────────────────────
    const saved = await saveRules(page, {
      minRestHours: 10,
      maxConsecutiveDays: 5,
    });
    expect(saved.ok(), await saved.text()).toBe(true);
    expect(await storedRules(page)).toEqual({
      value: { minRestHours: 10, maxConsecutiveDays: 5 },
      configured: true,
    });

    const refused = await saveRules(page, {
      minRestHours: 30,
      maxConsecutiveDays: 5,
    });
    expect(refused.status()).toBe(422);
    expect((await storedRules(page)).value.minRestHours).toBe(10);

    // ── The screen ─────────────────────────────────────────────────────
    await page.goto(SETTINGS);
    const rest = page.getByLabel("Minimum rest between shifts (hours)");
    const days = page.getByLabel("Maximum days in a row");
    await expect(rest).toHaveValue("10");
    await expect(days).toHaveValue("5");

    await rest.fill("11");
    await days.fill("4");
    await page.getByRole("button", { name: "Save scheduling rules" }).click();
    await expect(page.getByText("Scheduling rules saved")).toBeVisible();

    await page.reload();
    await expect(rest).toHaveValue("11");
    await expect(days).toHaveValue("4");
    expect((await storedRules(page)).value).toEqual({
      minRestHours: 11,
      maxConsecutiveDays: 4,
    });

    // An out-of-range value is explained and cannot be saved.
    await rest.fill("30");
    await expect(
      page.getByText("Enter a number of hours from 0 to 24."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save scheduling rules" }),
    ).toBeDisabled();
  } finally {
    const restored = await saveRules(
      page,
      before.configured ? before.value : DEFAULTS,
    );
    expect(restored.ok(), await restored.text()).toBe(true);
  }
});
