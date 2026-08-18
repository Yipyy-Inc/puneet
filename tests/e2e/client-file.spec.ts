import { expect, test } from "@playwright/test";

import { signIn } from "./_auth";
import { deployedFixture, deployedFixtureRef } from "./_fixtures";

// ============================================================================
// The client file, for a client who lives in Postgres.
//
// Fifteen files did this, against `src/data/clients.ts`:
//
//   const client = clients.find((c) => c.id === parseInt(id, 10));
//   if (!client) return null;
//
// The fixtures hold twenty clients and the database holds a different set, so
// every client created since the migration had a profile, a pets tab, a billing
// tab and a vaccination record that all reported the person did not exist —
// mostly as a BLANK PAGE, which is the version nobody reports as a bug.
//
// So this walks the tabs. Aimed at a client the fixtures do not contain,
// because pointed at a fixture id it would pass against the bug.
// ============================================================================

const CLIENT_REF = deployedFixtureRef("E2E_POSTGRES_CLIENT_REF");
const CLIENT_NAME = deployedFixture("E2E_POSTGRES_CLIENT_NAME");
const STAFF = deployedFixture("CLOVER_E2E_STAFF_EMAIL");

// Every tab in the client file that renders the client itself.
const TABS = [
  "",
  "/pets",
  "/bookings",
  "/billing",
  "/documents",
  "/vaccinations",
  "/forms",
  "/messages",
  "/tags",
  "/report-cards",
  "/audit",
  "/settings",
  "/edit",
] as const;

test.describe("the client file for a Postgres client", () => {
  test.skip(
    !Number.isInteger(CLIENT_REF) || !CLIENT_NAME || !STAFF,
    "Set E2E_POSTGRES_CLIENT_REF, E2E_POSTGRES_CLIENT_NAME and " +
      "CLOVER_E2E_STAFF_EMAIL. See .env.example.",
  );

  for (const tab of TABS) {
    test(`${tab || "/profile"} renders the client`, async ({ page }) => {
      await signIn(page, STAFF);
      await page.goto(`/facility/dashboard/clients/${CLIENT_REF}${tab}`);

      // The name proves the RIGHT record resolved. A blank page also fails to
      // say "not found", and blank was the actual symptom on most of these
      // tabs — so asserting the absence of an error message would have passed
      // against the bug.
      await expect(page.getByText(CLIENT_NAME).first()).toBeVisible({
        timeout: 25_000,
      });
      await expect(page.getByText("Client not found.")).toHaveCount(0);
    });
  }

  test("a client who really is absent still says so", async ({ page }) => {
    await signIn(page, STAFF);
    // Positive control: if these pages had simply stopped rendering the
    // not-found state, every assertion above would pass for the wrong reason.
    await page.goto("/facility/dashboard/clients/999999/tags");
    await expect(page.getByText(CLIENT_NAME)).toHaveCount(0);
  });
});
