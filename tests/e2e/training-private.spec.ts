import { test, expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";
import { withoutTestItems } from "./_settings-snapshot";
import { toConfirm } from "./_wizard";

// ============================================================================
// STAFF BOOK A PRIVATE LESSON IN A PACK (the client's flow, 2026-10-02).
//
// Training in the booking wizard is Program → Trainer & time → Goals. A
// private lesson sold as a 3-pack is booked as ONE session now, at the pack's
// price, and the other two are written as passes on the client's packages —
// "You'll book the first session now — the rest can be scheduled from the
// booking page." A lesson is a series of its own (kind private, the program,
// the trainer, one session) and the dog is enrolled in it.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// P1  The session is a training booking for Buddy, at the pack's price.
// P2  Its series names the program, is private, and has one session.
// P3  The pack's other sessions are two passes, on a $0 package — the money
//     was taken once, on the session.
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// Nothing. The program is this file's, in `training_programs`, put back as it
// was (less anything an earlier run left — `withoutTestItems`). The series
// is cancelled through the route staff use, which withdraws the enrolment and
// so cancels its booking; a series left behind would hold the trainer's hour
// for every later run. The package is deleted. All three are swept BEFORE as
// well, for a run that died part-way.
// ============================================================================

const MARKER = "[e2e training-private]";
const PROGRAM_ID = "e2e-training-private-lesson";
const PROGRAM_NAME = `${MARKER} Lesson`;
const ALICE = 15;
const SETTINGS = "/api/facility/settings";

test.use({ actionTimeout: 20_000 });
test.describe.configure({ mode: "serial" });

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let programsBefore: unknown = null;

async function programsSetting(page: Page): Promise<{ programs: unknown[] }> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as Record<string, { value?: unknown }>;
  const value = all.training_programs?.value as
    | { programs?: unknown[] }
    | undefined;
  return { programs: Array.isArray(value?.programs) ? value!.programs : [] };
}

/** This file's series, package and bookings — none of it survives. Never throws. */
async function sweep(browser: Browser, when: "before" | "after") {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const db = admin();
    const { data: series } = await db
      .from("training_series")
      .select("id")
      .eq("program_id", PROGRAM_ID)
      .neq("status", "cancelled");
    let cancelled = 0;
    for (const row of Array.isArray(series) ? series : []) {
      const res = await page.request.delete(
        `/api/training/series/${(row as { id: string }).id}`,
      );
      if (res.ok()) cancelled += 1;
    }
    const { data: packs } = await db
      .from("customer_packages")
      .delete()
      .like("package_name", `%${MARKER}%`)
      .select("id");
    console.log(
      `sweep(${when}): ${cancelled} series cancelled, ${Array.isArray(packs) ? packs.length : 0} pack(s) deleted`,
    );
  } catch (error) {
    console.log(
      `sweep(${when}) failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await page.close();
  }
}

test.beforeAll(async ({ browser }) => {
  await sweep(browser, "before");
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const current = withoutTestItems(await programsSetting(page));
    programsBefore = current;
    const res = await page.request.patch(SETTINGS, {
      data: {
        domain: "training_programs",
        value: {
          ...current,
          programs: [
            ...current.programs,
            {
              id: PROGRAM_ID,
              name: PROGRAM_NAME,
              description: "One dog, one trainer",
              classType: "private",
              skillLevel: "beginner",
              sessions: 1,
              price: 95,
              validityDays: 90,
              isActive: true,
              includes: [],
              format: "lesson",
              sessionMinutes: 60,
              packs: [{ sessions: 3, price: 270 }],
            },
          ],
        },
      },
    });
    expect(res.ok(), await res.text()).toBe(true);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    if (programsBefore) {
      await page.request.patch(SETTINGS, {
        data: { domain: "training_programs", value: programsBefore },
      });
    }
  } finally {
    await page.close();
    await sweep(browser, "after");
  }
});

test("P1–P3 a 3-pack books its first session and keeps two passes", async ({
  page,
}) => {
  test.setTimeout(4 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await page.goto(`/facility/dashboard/clients/${ALICE}`);
  await page
    .getByRole("button", { name: /^book$/i })
    .first()
    .click({ timeout: 90_000 });
  const dialog = page.getByRole("dialog");
  const next = dialog.getByRole("button", { name: /^next$/i });

  await dialog.getByText("Buddy", { exact: true }).first().click();
  await next.click();
  await dialog
    .getByText(/training/i)
    .first()
    .click();
  await next.click();

  // Program: this file's lesson, as a 3-pack.
  await dialog
    .locator("button[aria-pressed]")
    .filter({ hasText: PROGRAM_NAME })
    .click();
  await dialog.getByRole("radio", { name: /^3-session pack/ }).click();
  await next.click();

  // Trainer & time: the earliest opening of any trainer.
  await dialog.getByRole("button", { name: /^take this slot$/i }).click();
  await next.click();

  // Goals, then Confirm.
  await toConfirm(dialog);
  await dialog.getByRole("button", { name: /^create booking$/i }).click();
  const done = dialog.getByRole("heading", { name: /^booking #\d+ created$/i });
  await expect(done).toBeVisible({ timeout: 90_000 });
  const ref = Number(/#(\d+)/.exec(await done.innerText())?.[1]);
  expect(ref).toBeGreaterThan(0);

  // P1 — the session, at the pack's price.
  const res = await page.request.get(`/api/bookings?ref=${ref}`);
  expect(res.ok(), await res.text()).toBe(true);
  const [saved] = (await res.json()) as Array<{
    id: number;
    service: string;
    clientId: number;
    totalCost: number;
    status: string;
  }>;
  expect(saved?.service).toBe("training");
  expect(saved?.clientId).toBe(ALICE);
  expect(Number(saved?.totalCost)).toBe(270);

  // P2 — its series.
  const db = admin();
  const { data: series, error } = await db
    .from("training_series")
    .select("id, kind, number_of_sessions, total_price")
    .eq("program_id", PROGRAM_ID)
    .neq("status", "cancelled");
  expect(error?.message ?? null).toBeNull();
  expect(series).toEqual([
    expect.objectContaining({ kind: "private", number_of_sessions: 1 }),
  ]);
  expect(Number(series![0]!.total_price)).toBe(270);

  // P3 — the other two sessions, as passes on a $0 package.
  const { data: packs } = await db
    .from("customer_packages")
    .select(
      "price_paid, customer_package_lines(service_id, passes_total, module)",
    )
    .like("package_name", `%${MARKER}%`);
  expect(packs).toHaveLength(1);
  expect(Number(packs![0]!.price_paid)).toBe(0);
  expect(packs![0]!.customer_package_lines).toEqual([
    { service_id: PROGRAM_ID, passes_total: 2, module: "training" },
  ]);
});
