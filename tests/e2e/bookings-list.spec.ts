import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The facility bookings list.
//
// It read real bookings from the database and then named the customer on each
// one out of `src/data/clients.ts` — twenty fixture rows, ids 15 to 34.
//
// ── WHY NOBODY SAW IT ─────────────────────────────────────────────────────
//
// The DEMO facility's clients were seeded FROM those fixtures, so they occupy
// the same ids and carry the same names. The lookup resolved, by coincidence,
// to the right person every time.
//
// The two clients outside that range both belong to pawradise: "Clover Test
// Customer" (ref 35, two bookings, the ones carrying real Clover money) and
// "test" (ref 163). Those rendered as "Unknown". So the assertion below skips
// on the demo account and only bites where the coincidence runs out — which is
// also why it is written to find its own subject rather than name one.
//
// And "today" was a literal:
//
//   const today = new Date("2024-03-10"); // Mock today's date
//
// Every booking in the database starts after that date, so the Upcoming KPI
// counted all of them — two years of finished bookings presented as scheduled
// ahead, on the tile a facility reads to see what is coming.
// ============================================================================

const LIST = "/facility/dashboard/bookings";

// The fixture's highest client id. A client above it could not be resolved at
// all by the old lookup, which is what makes one a discriminating case.
const HIGHEST_FIXTURE_CLIENT_ID = 34;

test.describe("the bookings list", () => {
  test("names a client the fixtures do not contain", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Named from the API first, so this asserts "the screen shows what the
    // database holds" rather than a string hardcoded here — which would pass
    // just as well against the fixture.
    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as {
      id: number;
      clientId: number;
    }[];
    const clients = (await (await page.request.get("/api/clients")).json()) as {
      id: number;
      name: string;
    }[];

    const beyondFixture = clients.filter(
      (c) =>
        c.id > HIGHEST_FIXTURE_CLIENT_ID &&
        bookings.some((b) => b.clientId === c.id),
    );
    test.skip(
      beyondFixture.length === 0,
      "This account sees no client above the fixture range, so nothing here " +
        "can tell the fixture lookup apart from the real one. Expected on the " +
        "demo facility, whose clients were seeded from the fixture; the cases " +
        "that differ are at pawradise, and that owner has no WorkOS identity " +
        "yet (see E2E_NON_FIXTURE_OWNER in .env.example).",
    );

    const target = beyondFixture[0]!;
    await page.goto(LIST, { waitUntil: "commit" });

    // The table pages at 15 rows and this client has few bookings, so search
    // rather than hope. searchKey is the booking id.
    const theirBooking = bookings.find((b) => b.clientId === target.id)!;
    await page
      .getByPlaceholder(/Search by booking ID/i)
      .fill(String(theirBooking.id));

    await expect(page.getByText(target.name).first()).toBeVisible({
      timeout: 90_000,
    });
    // "Unknown" was what this row said before. Asserting the right name AND the
    // absence of the wrong one, because a row could contain both.
    await expect(page.getByRole("cell", { name: "Unknown" })).toHaveCount(0);
  });

  test("the Upcoming tile counts bookings that have not happened yet", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as {
      startDate: string;
      status: string;
    }[];

    const now = Date.now();
    const future = bookings.filter(
      (b) => new Date(b.startDate).getTime() > now && b.status !== "cancelled",
    ).length;

    // The control: if every booking were in the future, the old literal date
    // and the real one would agree and this would prove nothing.
    expect(
      future,
      "some bookings are in the past, so the two definitions differ",
    ).toBeLessThan(bookings.length);

    await page.goto(LIST, { waitUntil: "commit" });

    const tile = page
      .locator("div")
      .filter({ hasText: /^Upcoming/ })
      .first();
    await expect(tile).toBeVisible({ timeout: 90_000 });
    await expect(tile).toContainText(String(future));
  });
});
