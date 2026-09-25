import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Estimate follow-up reminders are saved for the facility.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// Settings → Estimates held its follow-up reminders in localStorage, and there
// was no sender. A facility could turn reminders on, write both messages and
// press Save, and the only thing that changed was one browser.
//
// ── WHAT IT ASSERTS, AND WHAT IT DELIBERATELY DOES NOT ────────────────────
//
// The `estimate_follow_ups` domain stores, reads back, and refuses an
// out-of-range rule; through the screen, an edited rule survives a reload.
//
// It does NOT call the messaging tick. The tick drains the whole outbox, and
// the database is shared with production — a spec that ran it would send every
// facility's queued messages. When a reminder is due, its key and its words
// are pure logic, pinned in tests/unit/estimate-follow-up.test.ts; the new
// source kind is asserted in supabase/tests/estimate-follow-ups.sql.
//
// ── IT CLEANS UP, WITH THE SAME EXCEPTION AS payroll-overtime ─────────────
//
// There is no DELETE on the settings route. A facility that had follow-ups
// gets them back; one that had none gets the disabled default stored, which
// sends exactly as nothing does.
//
// "What the facility had" is read at the start, so a run that died between
// its save and its restore left ITS OWN rule as what the facility had — and
// every later run restored that faithfully: follow-ups on, on the demo
// facility, for good. `settings-french` then failed on the merge tags the
// open editor lists (2026-09-25). What this spec writes carries MARKER now,
// and a snapshot that carries it is restored as the disabled default.
// ============================================================================

const SETTINGS = "/facility/dashboard/settings/estimate-settings";
const MARKER = "[e2e estimate-follow-ups]";
const MESSAGE = `${MARKER} Hi {{customer_name}}`;

type Page = import("@playwright/test").Page;

interface Rule {
  enabled: boolean;
  delayDays: number;
  channel: "email" | "sms" | "both";
  maxFollowUps: number;
  emailMessage: string;
  smsMessage: string;
}

interface FollowUps {
  enabled: boolean;
  notViewed: Rule;
  viewed: Rule;
}

const OFF: FollowUps = {
  enabled: false,
  notViewed: {
    enabled: true,
    delayDays: 3,
    channel: "email",
    maxFollowUps: 2,
    emailMessage: "",
    smsMessage: "",
  },
  viewed: {
    enabled: true,
    delayDays: 2,
    channel: "email",
    maxFollowUps: 1,
    emailMessage: "",
    smsMessage: "",
  },
};

async function stored(page: Page): Promise<{
  value: FollowUps;
  configured: boolean;
}> {
  const res = await page.request.get("/api/facility/settings");
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { estimate_follow_ups: never })
    .estimate_follow_ups;
}

async function save(page: Page, value: unknown) {
  return page.request.patch("/api/facility/settings", {
    data: { domain: "estimate_follow_ups", value },
  });
}

test("estimate follow-ups are stored, bounded, and survive a reload", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);
  const before = await stored(page);

  try {
    // ── The domain ─────────────────────────────────────────────────────
    const on: FollowUps = {
      ...OFF,
      enabled: true,
      notViewed: {
        ...OFF.notViewed,
        delayDays: 4,
        emailMessage: MESSAGE,
      },
    };
    const saved = await save(page, on);
    expect(saved.ok(), await saved.text()).toBe(true);
    expect(await stored(page)).toEqual({ value: on, configured: true });

    const refused = await save(page, {
      ...on,
      notViewed: { ...on.notViewed, delayDays: 30 },
    });
    expect(refused.status()).toBe(422);
    expect((await stored(page)).value.notViewed.delayDays).toBe(4);

    // ── The screen ─────────────────────────────────────────────────────
    await page.goto(SETTINGS);
    const delay = page.locator("#follow-up-not_viewed-delay");
    const max = page.locator("#follow-up-viewed-max");
    await expect(delay).toHaveValue("4");
    await expect(page.locator("#follow-up-not_viewed-email")).toHaveValue(
      MESSAGE,
    );

    await delay.fill("5");
    await max.fill("3");
    await page
      .getByRole("button", { name: "Save follow-up reminders" })
      .click();
    await expect(page.getByText("Follow-up settings saved")).toBeVisible();

    await page.reload();
    await expect(delay).toHaveValue("5");
    await expect(max).toHaveValue("3");
    const after = (await stored(page)).value;
    expect(after.notViewed.delayDays).toBe(5);
    expect(after.viewed.maxFollowUps).toBe(3);

    // An out-of-range value is explained and cannot be saved.
    await delay.fill("20");
    await expect(
      page.getByText("Enter a whole number of days from 1 to 14."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save follow-up reminders" }),
    ).toBeDisabled();
  } finally {
    // A snapshot carrying MARKER is a crashed run's leftover, not the
    // facility's own rule.
    const own = JSON.stringify(before.value ?? null).includes(MARKER);
    const restored = await save(
      page,
      before.configured && !own ? before.value : OFF,
    );
    expect(restored.ok(), await restored.text()).toBe(true);
  }
});
