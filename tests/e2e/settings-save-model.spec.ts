import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE SAVE STILL SAVES.
//
// `SaveBar` was adopted across settings on 2026-09-08 (e34f8fa1): the save
// controls left seven `SettingsBlock` card headers for a bar at the card's
// foot, and two bespoke cards that had each reimplemented the same pattern by
// hand were converted to it. That change was verified by driving ONE
// interaction on ONE card. Nothing proved that pressing Save still reached
// Postgres.
//
// ── THE UI DRIVES THE SAVE; THE STORE SAYS WHETHER IT WORKED ────────────
//
// Three earlier versions of this spec asserted against the SCREEN, and all
// three reported a working save when nothing had been written:
//
//   1. `waitForTimeout(1500)` then navigate. `goto` ABORTS an in-flight PATCH,
//      so the spec raced the write it was measuring and won about half of the
//      time.
//   2. Wait for Save to become disabled. `SaveBar` renders
//      `<Button loading={saving} disabled={!dirty}>`, and Button computes
//      `disabled={isLoading || disabled}` — so it is disabled WHILE WRITING.
//      The assertion passed instantly, mid-flight, and looked principled.
//   3. Re-read the input after a reload. Still only asks the component what it
//      is holding.
//
// Postgres exposed 1 and 2: after runs that reported success, the
// `vaccination_rules` row still carried an `updated_at` from an hour earlier.
// Nothing had been written at all. **A quiet UI is not evidence of a write.**
//
// So the division is deliberate — the BUTTON is pressed through the UI, since
// the click path is what is under test, and the ASSERTION reads the API,
// because only the store can say a write landed.
//
// ── THE RESTORE IS UNCONDITIONAL ────────────────────────────────────────
//
// Local dev and staging share the PRODUCTION database. An earlier version put
// the restore at the END of the test body, so a failed assertion skipped it —
// and Playwright's retry then read the POLLUTED value as its "original" and
// wrote that back as the final state. A real facility was left holding a test
// value while the run went green, and it took a SQL query to notice.
//
// `afterAll` restores from values captured before anything was touched,
// whatever happened in between.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const PROFILE = "/api/facility/profile";
const DOMAIN = "vaccination_rules";

interface SettingsPayload {
  [domain: string]: { value: unknown; configured: boolean } | undefined;
}

async function readDomain(page: Page, domain: string): Promise<unknown> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as SettingsPayload;
  return body[domain]?.value;
}

async function readWebsite(page: Page): Promise<string> {
  const res = await page.request.get(PROFILE);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as { website?: string };
  return body.website ?? "";
}

/** Open a section and wait for its body, not the shell around it. */
async function openSection(page: Page, segment: string) {
  await page.goto(`/facility/dashboard/settings/${segment}`, {
    waitUntil: "domcontentloaded",
  });
  const body = page.locator("[data-slot='settings-section']");
  await expect(body).toBeVisible({ timeout: 60_000 });
  return body;
}

// Captured before anything is touched; put back in afterAll.
let originalRules: unknown = null;
let originalWebsite: string | null = null;

test.describe.configure({ mode: "serial" });

test.describe("the settings save model", () => {
  test.afterAll(async ({ browser }) => {
    if (originalRules === null && originalWebsite === null) return;
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      if (originalRules !== null) {
        const res = await page.request.patch(SETTINGS, {
          data: { domain: DOMAIN, value: originalRules },
        });
        expect(res.status(), await res.text()).toBe(200);
        expect(
          await readDomain(page, DOMAIN),
          "vaccination rules were left holding a test value",
        ).toEqual(originalRules);
      }
      if (originalWebsite !== null) {
        const res = await page.request.patch(PROFILE, {
          data: { website: originalWebsite },
        });
        expect(res.ok(), await res.text()).toBe(true);
        expect(
          await readWebsite(page),
          "the facility profile was left holding a test value",
        ).toBe(originalWebsite);
      }
    } finally {
      await page.close();
    }
  });

  test("SettingsBlock's SaveBar writes, and the write reaches the store", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    originalWebsite = await readWebsite(page);

    const body = await openSection(page, "business");
    await body
      .getByRole("button", { name: /^edit$/i })
      .first()
      .click();

    const website = body.locator("#website");
    await expect(website).toBeVisible({ timeout: 60_000 });
    const marker = `https://e2e-${Date.now()}.example.test`;

    // Save is disabled until the draft differs — the derived `dirty` doing its
    // job, and worth pinning: a bar that is always enabled would let a no-op
    // write land on top of somebody else's concurrent edit.
    const save = body.getByRole("button", { name: /save changes/i }).first();
    await expect(save).toBeDisabled();

    await website.fill(marker);
    await expect(save).toBeEnabled();
    await save.click();

    // `handleSave` AWAITS onSave before setIsEditing(false), so the Edit button
    // returning is a genuine post-success signal — unlike the button's own
    // disabled state, which is also true while loading.
    await expect(
      body.getByRole("button", { name: /^edit$/i }).first(),
      "the editor never closed — the save did not resolve",
    ).toBeVisible({ timeout: 20_000 });

    // The profile is not a settings domain: it writes to the `facilities` row
    // through its own route, which is where the store is asked.
    expect(
      await readWebsite(page),
      "the website never reached the facilities row",
    ).toBe(marker);
  });

  test("the bespoke card's SaveBar writes, and the write reaches the store", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);

    originalRules = await readDomain(page, DOMAIN);
    expect(Array.isArray(originalRules), "vaccination rules are stored").toBe(
      true,
    );
    const before = originalRules as { expiryWarningDays: number }[];
    const target = (before[0]?.expiryWarningDays ?? 30) + 7;

    // Always editable — no Edit gate. Its save BUTTON was deleted and replaced
    // by the bar, which is why this card is driven rather than assumed fine.
    const body = await openSection(page, "vaccination-requirements");
    // The card shows a skeleton until the rules load, so this is a cold-route
    // wait, not an assertion about behaviour.
    const expiry = body.locator('input[type="number"]').first();
    await expect(expiry).toBeVisible({ timeout: 60_000 });

    const save = body.getByRole("button", { name: /save changes/i }).first();
    await expect(save).toBeDisabled();

    await expiry.fill(String(target));
    await expect(save).toBeEnabled();
    // The write itself, awaited. Waiting for `data-loading` to be ABSENT was
    // not enough: checked in the instant after the click, before React has
    // rendered the pending state, it is already absent — and a loading button
    // is disabled too, so the next assertion passed with the PATCH still in
    // flight and the read below saw the old value (2026-09-11, every fresh
    // run of this file; a trace slowed it down enough to hide it).
    const written = page.waitForResponse(
      (r) =>
        r.url().includes("/api/facility/settings") &&
        r.request().method() === "PATCH",
    );
    await save.click();
    expect((await written).ok(), "the save was refused").toBe(true);

    // SETTLED, not merely disabled: `data-loading` is the attribute Button sets
    // while writing, so its absence is what says the mutation finished.
    await expect(save).not.toHaveAttribute("data-loading", "", {
      timeout: 20_000,
    });
    await expect(save).toBeDisabled({ timeout: 20_000 });

    const stored = (await readDomain(page, DOMAIN)) as {
      expiryWarningDays: number;
    }[];
    expect(
      stored[0]?.expiryWarningDays,
      "the expiry warning never reached Postgres — the card reported a save it did not make",
    ).toBe(target);
  });
});
