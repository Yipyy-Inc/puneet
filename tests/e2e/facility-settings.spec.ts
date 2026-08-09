import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A facility's opening hours and booking rules.
//
// These used to live in a React context seeded from `src/data/settings.ts` and
// persisted to localStorage, keyed per BROWSER. Which is worse than it sounds:
// an owner set their hours, saw them stick, and every other member of staff,
// every other device, and every CUSTOMER booking on their own phone carried on
// being offered 07:00-19:00. The bug was invisible precisely to the person who
// had just "fixed" it.
//
// So the assertion that matters is not "a save round-trips". It is that the
// value comes back to a DIFFERENT BROWSER — which is the thing localStorage
// could never do, and therefore the thing that proves this is real.
//
// This spec WRITES to the demo facility and leaves its values behind.
// ============================================================================

const SETTINGS = "/api/facility/settings";

type Settings = {
  business_hours: {
    value: { monday: { isOpen: boolean; openTime: string; closeTime: string } };
    configured: boolean;
  };
  booking_rules: {
    value: { depositPercentage: number; cancelPolicyHours: number };
    configured: boolean;
  };
};

test.describe("a facility's settings", () => {
  test("are refused to anyone not signed in", async ({ page }) => {
    expect((await page.request.get(SETTINGS)).status()).toBe(401);
  });

  test("an unset domain is reported as unconfigured, not as a fact", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const body = (await (await page.request.get(SETTINGS)).json()) as Settings;

    // Whatever the state, the SHAPE has to carry the distinction. A default
    // that arrives indistinguishable from a stored value is exactly how the
    // fixture passed for data for so long.
    expect(typeof body.business_hours.configured).toBe("boolean");
    expect(typeof body.booking_rules.configured).toBe("boolean");
    expect(body.business_hours.value.monday.openTime).toMatch(/^\d\d:\d\d$/);
  });

  test("an owner's hours survive into a different browser", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const saved = await page.request.patch(SETTINGS, {
      data: {
        domain: "business_hours",
        value: {
          monday: { isOpen: true, openTime: "06:15", closeTime: "21:45" },
          tuesday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
          wednesday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
          thursday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
          friday: { isOpen: true, openTime: "07:00", closeTime: "19:00" },
          saturday: { isOpen: false, openTime: "08:00", closeTime: "18:00" },
          sunday: { isOpen: false, openTime: "09:00", closeTime: "17:00" },
        },
      },
    });
    expect(saved.status()).toBe(200);

    // A SEPARATE browser context: its own localStorage, its own everything.
    // The old implementation could not have passed this line.
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, ACCOUNTS.manager);

    const body = (await (
      await otherPage.request.get(SETTINGS)
    ).json()) as Settings;
    expect(body.business_hours.value.monday.openTime).toBe("06:15");
    expect(body.business_hours.value.monday.closeTime).toBe("21:45");
    expect(body.business_hours.configured).toBe(true);

    await other.close();
  });

  test("a malformed domain is refused rather than stored", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Postgres cannot type a jsonb column, so this validation is the only thing
    // standing between a typo and a booking screen reading `undefined`.
    const missingDays = await page.request.patch(SETTINGS, {
      data: {
        domain: "business_hours",
        value: { monday: { isOpen: true, openTime: "06:00" } },
      },
    });
    expect(missingDays.status()).toBe(422);

    const unknownDomain = await page.request.patch(SETTINGS, {
      data: { domain: "not_a_domain", value: {} },
    });
    expect(unknownDomain.status()).toBe(422);
  });

  test("booking rules save independently of hours", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = (await (
      await page.request.get(SETTINGS)
    ).json()) as Settings;

    await page.request.patch(SETTINGS, {
      data: {
        domain: "booking_rules",
        value: {
          minimumAdvanceBooking: 12,
          maximumAdvanceBooking: 180,
          cancelPolicyHours: 24,
          cancelFeePercentage: 25,
          depositPercentage: 40,
          depositRequired: true,
          capacityLimit: 60,
          dailyCapacityLimit: 60,
          allowOverBooking: false,
          overBookingPercentage: 0,
        },
      },
    });

    const after = (await (await page.request.get(SETTINGS)).json()) as Settings;
    expect(after.booking_rules.value.depositPercentage).toBe(40);
    // One domain per row, so saving rules must not disturb hours.
    expect(after.business_hours.value.monday.openTime).toBe(
      before.business_hours.value.monday.openTime,
    );
  });

  test("tip tiers are the facility's own, and reach a second browser", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const base = (await (await page.request.get(SETTINGS)).json()) as {
      tip_config: { value: Record<string, unknown> };
    };

    // The whole domain, with one tier changed. Tips decide what a customer is
    // ASKED TO PAY, so a facility running one set of tiers while the payment
    // screen offers another is not a display bug.
    const saved = await page.request.patch(SETTINGS, {
      data: {
        domain: "tip_config",
        value: {
          ...base.tip_config.value,
          general: {
            options: [
              { type: "percentage", value: 12, label: "Thanks" },
              { type: "percentage", value: 16, label: "Great" },
              { type: "percentage", value: 22, label: "Amazing" },
            ],
            preferredIndex: 2,
          },
        },
      },
    });
    expect(saved.status()).toBe(200);

    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, ACCOUNTS.manager);

    const body = (await (await otherPage.request.get(SETTINGS)).json()) as {
      tip_config: {
        value: { general: { preferredIndex: number; options: unknown[] } };
        configured: boolean;
      };
    };
    expect(body.tip_config.configured).toBe(true);
    expect(body.tip_config.value.general.preferredIndex).toBe(2);
    expect(body.tip_config.value.general.options).toHaveLength(3);

    await other.close();
  });

  test("a caretaker reads them but cannot change them", async ({ page }) => {
    await signIn(page, ACCOUNTS.caretaker);

    // Positive control FIRST. `has_permission()` fails closed on a key that
    // does not exist, which looks identical to a correct refusal — so the 403
    // below means nothing unless somebody is admitted.
    expect((await page.request.get(SETTINGS)).status()).toBe(200);

    // A COMPLETE, valid body. An incomplete one would be rejected 422 on shape
    // before permission was ever consulted, and would pass whether or not the
    // policy worked — proving nothing about the thing the test is named after.
    const write = await page.request.patch(SETTINGS, {
      data: {
        domain: "booking_rules",
        value: {
          minimumAdvanceBooking: 0,
          maximumAdvanceBooking: 365,
          cancelPolicyHours: 0,
          cancelFeePercentage: 0,
          depositPercentage: 0,
          depositRequired: false,
          capacityLimit: 999,
          dailyCapacityLimit: 999,
          allowOverBooking: true,
          overBookingPercentage: 100,
        },
      },
    });
    expect(write.status()).toBe(403);
  });
});
