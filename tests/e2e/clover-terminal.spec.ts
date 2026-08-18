import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./_auth";
import { deployedFixture, deployedFixtureRef } from "./_fixtures";

// ============================================================================
// The terminal route: who may use it, and whether it can reach the hardware.
//
// `checkOnly` asks the device whether it is awake and charges nothing, so this
// spec is safe to run repeatedly and needs nobody standing at the counter.
// Taking an actual payment cannot be automated — it ends with a human tapping a
// card — and is verified by hand.
//
// Skips without its fixtures: a Clover-connected facility with a real device,
// which is a Dev Kit somebody physically associated.
// ============================================================================

const BOOKING_REF = deployedFixtureRef("CLOVER_E2E_TERMINAL_BOOKING_REF");
const SERIAL = deployedFixture("CLOVER_E2E_TERMINAL_SERIAL");
const STAFF = deployedFixture("CLOVER_E2E_STAFF_EMAIL");
const CUSTOMER = deployedFixture("CLOVER_E2E_CUSTOMER_EMAIL");

const check = (page: Page, body: unknown) =>
  page.request.post("/api/payments/clover/terminal", { data: body });

test.describe("charging on a terminal", () => {
  test.skip(
    !Number.isInteger(BOOKING_REF) || !SERIAL || !STAFF || !CUSTOMER,
    "Set CLOVER_E2E_TERMINAL_BOOKING_REF, CLOVER_E2E_TERMINAL_SERIAL, " +
      "CLOVER_E2E_STAFF_EMAIL and CLOVER_E2E_CUSTOMER_EMAIL. See .env.example.",
  );

  test("staff can see whether the terminal is awake", async ({ page }) => {
    await signIn(page, STAFF);
    const response = await check(page, {
      bookingRef: BOOKING_REF,
      deviceSerial: SERIAL,
      checkOnly: true,
    });
    const body = (await response.json()) as {
      ready?: boolean;
      state?: string;
      detail?: string;
    };
    expect(response.status()).toBe(200);
    // Ready or asleep are both correct answers about real hardware; what must
    // not happen is a failure to ask.
    expect(["ready", "asleep", "busy"]).toContain(body.state);
  });

  test("a customer cannot charge a terminal", async ({ page }) => {
    await signIn(page, CUSTOMER);
    const response = await check(page, {
      bookingRef: BOOKING_REF,
      deviceSerial: SERIAL,
      checkOnly: true,
    });
    // The permission is asked BEFORE the device is woken, so this must refuse
    // without ever reaching the hardware.
    expect(response.status()).toBe(403);
    expect((await response.json()).error).toMatch(/not allowed/i);
  });

  test("the terminals list is scoped to the caller's facility", async ({
    page,
  }) => {
    await signIn(page, STAFF);
    const response = await page.request.get("/api/payments/clover/terminals");
    const body = (await response.json()) as {
      terminals?: { serial: string; label: string | null }[];
    };
    expect(response.status()).toBe(200);
    expect(body.terminals?.some((t) => t.serial === SERIAL)).toBe(true);
  });
});
