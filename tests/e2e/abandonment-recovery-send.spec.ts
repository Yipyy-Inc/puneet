import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE JOIN BETWEEN THE TICK AND THE SEND.
//
// The abandoned-cart recovery the client asked for has had two tested halves
// and an untested middle. `recoveryDueAt` and `recoveryPlan` are unit-tested;
// the messaging tick's REFUSALS are covered by messaging-tick.spec.ts (no
// secret → 503, wrong bearer → 401) — and nothing had ever run the tick with
// the right token and watched it pick up a real abandoned booking. So the one
// thing the feature exists to do was the one thing no test did.
//
// ── WHERE IT RUNS, AND WHY THE GAP LASTED ─────────────────────────────────
//
// It needs CRON_SECRET, and that is the whole reason nothing had ever tested
// this. The secret is RUNTIME-ONLY: ci.yml says so in as many words — it lives
// in a root-owned .env on the VPS, not in the workflow and not in .env.local.
// So the tick answers 503 in CI and the spec skips there. It runs on a machine
// that has set one, which is how it was proved on 2026-09-21.
//
// That is worth fixing by putting CRON_SECRET in the e2e job's env, which is a
// secrets change rather than a code one. Until then, read a skip here as "not
// measured", never as "passed".
//
// ── WHY IT CAN RUN AT ALL ─────────────────────────────────────────────────
//
// `recovery_not_before` is set by a trigger to the moment the customer left,
// and the tick waits out the facility's delay. `delayHours` accepts 0, so the
// facility is configured with a zero delay for the step this spec leaves at,
// and the row is due the instant it exists. No clock is moved.
//
// ── WHAT IT ASSERTS, AND WHAT IT DELIBERATELY DOES NOT ────────────────────
//
// That the tick QUEUES — `recovered` counts up, and the draft comes back
// resolved so it can never be queued twice. It does NOT assert that an email
// left the building: the send pass applies suppression, quiet hours, the daily
// cap and the channel check, every one of which is a legitimate reason for a
// queued message not to go out, and a spec that demanded delivery would fail
// for the product working correctly.
//
// ── IT PUTS THE FACILITY'S SETTINGS BACK ──────────────────────────────────
//
// `abandonment_recovery` ships OFF. Leaving it on would make every other
// customer-side spec's abandoned drafts start messaging Alice Johnson, on a
// database shared with production. afterAll restores the exact value read
// before the run, not the shipped default.
// ============================================================================

const TICK = "/api/cron/messaging-tick";
const SETTINGS = "/api/facility/settings";
const DOMAIN = "abandonment_recovery";

const ALICE = 15;
const ALICE_PET = 1;
const SERVICE = "boarding";
/** The step this spec abandons at, and the one given a zero delay. */
const STEP = "date_and_details";

const SECRET = process.env.CRON_SECRET?.trim() ?? "";

interface TickResult {
  recovered: number;
  recoveryDeferred: number;
}

interface Draft {
  id: string;
  service: string;
  step: string;
}

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function readSetting(page: Page): Promise<Record<string, unknown>> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const all = (await res.json()) as Record<string, { value: unknown }>;
  return (all[DOMAIN]?.value ?? {}) as Record<string, unknown>;
}

async function writeSetting(page: Page, value: unknown) {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: DOMAIN, value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function myDrafts(page: Page): Promise<Draft[]> {
  const res = await page.request.get("/api/customer/unfinished-bookings");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Draft[];
}

let shipped: Record<string, unknown> | null = null;

test.describe.configure({ mode: "serial" });

test.describe("an abandoned booking is actually followed up", () => {
  test.skip(
    SECRET === "",
    "CRON_SECRET is not set here; the tick answers 503 rather than run " +
      "unguarded. See the header — a skip is NOT a pass.",
  );

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      if (shipped) {
        // The value as it was, not the shipped default — the facility may have
        // configured its own and this spec must not decide otherwise.
        await writeSetting(page, shipped);
      }
      await page.close();

      const customer = await browser.newPage();
      await signIn(customer, ACCOUNTS.customer);
      let cleared = 0;
      for (const draft of await myDrafts(customer)) {
        const res = await customer.request.patch(
          `/api/customer/unfinished-bookings/${draft.id}`,
        );
        if (res.ok()) cleared += 1;
      }
      console.log(
        `cleanup: recovery settings restored, ${cleared} draft(s) resolved`,
      );
      await customer.close();
    } catch {
      // A cleanup that throws hides the real failure above it.
    }
  });

  test("the tick queues the message an abandoned booking is owed", async ({
    page,
  }) => {
    // ── 1. The facility turns it on, with no delay ────────────────────────
    const staff = await page.context().browser()!.newPage();
    try {
      await signIn(staff, ACCOUNTS.owner);
      shipped = await readSetting(staff);

      // Only what this spec needs: on, email, and no wait for THIS step.
      // Every template and every other step keeps whatever the facility had.
      const rules = (shipped.stepRules ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      await writeSetting(staff, {
        ...shipped,
        enabled: true,
        defaultChannel: "email",
        defaultDelayHours: 0,
        stepRules: {
          ...rules,
          [STEP]: {
            ...(rules[STEP] ?? {}),
            enabled: true,
            channel: "email",
            delayHours: 0,
          },
        },
      });
    } finally {
      await staff.close();
    }

    // ── 2. A customer leaves the wizard partway ──────────────────────────
    await signIn(page, ACCOUNTS.customer);
    // Any draft already sitting there would be picked up by the tick too and
    // make the delta below ambiguous.
    for (const draft of await myDrafts(page)) {
      await page.request.patch(`/api/customer/unfinished-bookings/${draft.id}`);
    }

    const left = await page.request.post("/api/customer/unfinished-bookings", {
      data: {
        clientRef: ALICE,
        service: SERVICE,
        step: STEP,
        requestedStart: day(28),
        requestedEnd: day(30),
        estimatedValue: 240,
        draft: {
          preSelectedPetId: ALICE_PET,
          preSelectedPetIds: [ALICE_PET],
          preSelectedSpecialRequests: "[e2e abandonment-recovery] left partway",
        },
      },
    });
    expect(left.ok(), await left.text()).toBe(true);

    const before = await myDrafts(page);
    expect(
      before.some((d) => d.service === SERVICE),
      "the draft was not kept",
    ).toBe(true);

    // ── 3. The tick runs, as cron runs it ────────────────────────────────
    const ticked = await page.request.get(TICK, {
      headers: { Authorization: `Bearer ${SECRET}` },
      failOnStatusCode: false,
    });
    expect(ticked.status(), await ticked.text()).toBe(200);
    const result = (await ticked.json()) as TickResult;

    // The number this whole spec exists for. `recovered` is what
    // queueDueRecoveryMessages() wrote to message_sends; a zero here means the
    // feature does nothing, which is exactly what nothing else could see.
    expect(
      result.recovered,
      "the tick found nothing to recover, with a zero-delay draft waiting",
    ).toBeGreaterThanOrEqual(1);

    // ── 4. And it can never be queued twice ──────────────────────────────
    //
    // The claim is `recovery_resolved_at is null -> now()`. A second tick must
    // find nothing, or a customer who left the form four times hears four
    // times — the thing the claim was written to prevent.
    const again = await page.request.get(TICK, {
      headers: { Authorization: `Bearer ${SECRET}` },
      failOnStatusCode: false,
    });
    expect(again.status()).toBe(200);
    const second = (await again.json()) as TickResult;
    expect(
      second.recovered,
      "the same abandoned booking was queued a second time",
    ).toBe(0);
  });
});
