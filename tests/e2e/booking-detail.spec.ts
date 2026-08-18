import { expect, test } from "@playwright/test";

import { signIn } from "./_auth";
import { deployedFixture, deployedFixtureRef } from "./_fixtures";

// ============================================================================
// The facility booking detail page renders a client that lives in Postgres.
//
// It used to read the client from `@/data/clients` while reading the booking
// from the database, so any client created after the migration got "Booking not
// found." on a booking that plainly existed. That is invisible to typecheck —
// both halves are valid TypeScript — and invisible to the fixtures, which
// happen to contain ids 1..53.
//
// So the assertion is deliberately about a client the FIXTURES DO NOT HAVE.
// Pointed at a fixture id it would pass against the bug.
//
// Skips without its fixtures: a real client with a real booking, plus staff who
// may see it.
// ============================================================================

const CLIENT_REF = deployedFixtureRef("E2E_POSTGRES_CLIENT_REF");
const BOOKING_REF = deployedFixtureRef("E2E_POSTGRES_BOOKING_REF");
const CLIENT_NAME = deployedFixture("E2E_POSTGRES_CLIENT_NAME");
const STAFF = deployedFixture("CLOVER_E2E_STAFF_EMAIL");

test.describe("a booking belonging to a Postgres client", () => {
  test.skip(
    !Number.isInteger(CLIENT_REF) ||
      !Number.isInteger(BOOKING_REF) ||
      !CLIENT_NAME ||
      !STAFF,
    "Set E2E_POSTGRES_CLIENT_REF, E2E_POSTGRES_BOOKING_REF, " +
      "E2E_POSTGRES_CLIENT_NAME and CLOVER_E2E_STAFF_EMAIL. See .env.example.",
  );

  test("opens, and shows the client it belongs to", async ({ page }) => {
    await signIn(page, STAFF);
    await page.goto(
      `/facility/dashboard/clients/${CLIENT_REF}/bookings/${BOOKING_REF}`,
    );

    // The client's name proves the page resolved the RIGHT record, not merely
    // that it rendered something. A blank page also fails to say "not found".
    await expect(page.getByText(CLIENT_NAME).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Booking not found.")).toHaveCount(0);
  });

  test("does not flash 'not found' before the data arrives", async ({
    page,
  }) => {
    await signIn(page, STAFF);

    // Hold the clients response open. Whatever renders in the meantime is what
    // staff see on a slow connection, and it must not be a false statement
    // about the booking's existence.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/clients", async (route) => {
      await held;
      await route.continue();
    });

    await page.goto(
      `/facility/dashboard/clients/${CLIENT_REF}/bookings/${BOOKING_REF}`,
    );
    await expect(page.getByText("Booking not found.")).toHaveCount(0);
    release();
    await expect(page.getByText(CLIENT_NAME).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("a booking that really is absent still says so", async ({ page }) => {
    await signIn(page, STAFF);
    // Positive control for the assertion above: if the page never said "not
    // found" any more, the first test would pass for the wrong reason.
    await page.goto(
      `/facility/dashboard/clients/${CLIENT_REF}/bookings/999999`,
    );
    await expect(page.getByText("Booking not found.")).toBeVisible({
      timeout: 20_000,
    });
  });
});
