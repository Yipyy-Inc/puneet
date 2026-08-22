import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./_auth";
import { deployedFixture } from "./_fixtures";

// ============================================================================
// Paying a booking by card, through Clover's real sandbox.
//
// ── WHY THIS ONE SKIPS ITSELF ─────────────────────────────────────────────
//
// Every other spec runs against fixtures a script can create. This one cannot:
// it needs a facility that has completed Clover's OAuth flow against a sandbox
// merchant, which is a person clicking through Clover's dashboard, once. There
// is no way to provision that, so the spec reads the fixture out of the
// environment and skips when it is absent.
//
// Skipping beats failing here. A spec that is permanently red because the
// machine lacks a merchant account teaches everyone to read red as noise, and
// that is how a real regression gets waved through.
//
// ── IT PUTS A REAL CARD THROUGH, AND TAKES NO MONEY ───────────────────────
//
// 4264 2815 1111 7771 is Clover's documented decline card. The charge is
// genuinely attempted — SDK, iframes, tokenisation, /v1/charges — and Clover
// refuses it, so nothing is captured and no ledger row is written. That is what
// makes this safe to run repeatedly, and it is also the case worth asserting:
// the approval path is proven by the ledger, but a decline is only ever visible
// as a sentence on a screen.
//
// It caught two real defects on its first run. The card fields never mounted at
// all, because mount() takes a CSS selector and was being handed the node; and
// a declined card came back as a 500, because the decline was classified on an
// `error.type` that Clover does not send.
//
// ── IT MAKES ITS OWN BOOKING NOW, AND THAT IS THE WHOLE POINT ─────────────
//
// It used to read `CLOVER_E2E_BOOKING_REF` — a booking somebody created by hand
// and everybody hoped stayed unpaid. On 2026-08-22, the first time anything ran
// this file since the WorkOS migration, that booking answered:
//
//     Paid in full — Booking #896 has nothing outstanding.
//
// 62.50 owed, 111.50 paid, across sixteen charge/refund payments. And it was
// not just that one: NO booking at the facility had an outstanding balance, so
// no amount of repointing the variable would have helped.
//
// Nothing was broken. The spec needed a precondition it could not create, so
// every run that captured anything moved it further out of reach, and the file
// went on reading as coverage the whole time. A fixture that is consumed by use
// and restored by nobody does not fail — it rots, silently, and then blames the
// integration.
//
// So the booking is created here, priced, and CANCELLED in `afterAll`, the way
// booking-write-integrity.spec.ts already does it. That is unusually safe in
// this file: the only card it ever uses is the DECLINE card, so nothing is ever
// captured and the balance it sets up is the balance it tears down.
//
// The client and pet are LOOKED UP from the customer's email rather than
// hardcoded. Hardcoded refs are exactly what rotted here.
// ============================================================================

const CUSTOMER = deployedFixture("CLOVER_E2E_CUSTOMER_EMAIL");
const STAFF = deployedFixture("CLOVER_E2E_STAFF_EMAIL");

/**
 * What this file's bookings are marked with, so `afterAll` can find them.
 *
 * Cancelled rather than deleted: `bookings` has no DELETE policy, deliberately.
 */
const MARKER = "[e2e clover-pay]";

/** Enough to be a real balance, small enough to be obviously a test. */
const PRICE = 62.5;

/** Set in `beforeAll`. The tests read this, never an environment variable. */
let bookingRef = 0;

/** Clover's documented decline Visa. Approved cards are NOT used here. */
const DECLINE_CARD = "4264281511117771";

const FIELDS = [
  "clover-card-number",
  "clover-card-date",
  "clover-card-cvv",
  "clover-card-postal",
] as const;

/**
 * Clover's hosted fields listen to KEYSTROKES, not to value assignment.
 * `fill()` sets the value without them and createToken() then reports "Card
 * number is required" — which looks like a broken payment form and is actually
 * a broken test.
 */
async function typeInto(page: Page, id: string, value: string) {
  const input = page.frameLocator(`#${id} iframe`).locator("input");
  await input.waitFor({ state: "visible", timeout: 30_000 });
  await input.click();
  await input.pressSequentially(value, { delay: 30 });
}

test.describe.configure({ mode: "serial" });

test.describe("paying a booking by card", () => {
  test.skip(
    !CUSTOMER || !STAFF,
    "Set CLOVER_E2E_CUSTOMER_EMAIL and CLOVER_E2E_STAFF_EMAIL to the customer " +
      "and a staff member at a Clover-connected facility. See .env.example.",
  );

  // ── THE BOOKING THIS FILE PAYS ──────────────────────────────────────────
  //
  // Created as STAFF, because a customer cannot make a payable booking: every
  // customer INSERT is forced to `request_submitted` with a zero price, which
  // is the product being right and not an obstacle to work around.
  //
  // Priced explicitly. `create_booking` reads GROOMING prices from the
  // catalogue — "a price in a request body is a suggestion" — so this books
  // daycare, where the price on the row is the price that was asked for.
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, STAFF);

      // Looked up, not hardcoded: the point of this rewrite.
      const clients = (await (
        await page.request.get("/api/clients")
      ).json()) as { id: number; email?: string | null }[] | null;
      const client = (clients ?? []).find(
        (c) => c.email?.trim().toLowerCase() === CUSTOMER.toLowerCase(),
      );
      if (!client) {
        throw new Error(
          `No client at this facility has the email ${CUSTOMER}. ` +
            "CLOVER_E2E_CUSTOMER_EMAIL and CLOVER_E2E_STAFF_EMAIL must belong " +
            "to the SAME facility — the staff member's session is what decides " +
            "which facility the booking is created at.",
        );
      }

      const pets = (await (
        await page.request.get(`/api/pets?clientRef=${client.id}`)
      ).json()) as { id: number }[] | null;
      const pet = (pets ?? [])[0];
      if (!pet) throw new Error(`Client ${client.id} has no pet to book for.`);

      // Far enough out that it never collides with a real day's board.
      const day = new Date(Date.now() + 9 * 86_400_000)
        .toISOString()
        .slice(0, 10);

      const res = await page.request.post("/api/bookings", {
        data: {
          clientId: client.id,
          petId: pet.id,
          service: "daycare",
          serviceType: "full_day",
          startDate: day,
          endDate: day,
          checkInTime: "09:00",
          checkOutTime: "17:00",
          status: "confirmed",
          basePrice: PRICE,
          discount: 0,
          totalCost: PRICE,
          paymentStatus: "pending",
          specialRequests: MARKER,
        },
      });
      if (!res.ok()) {
        throw new Error(
          `Could not create the booking to pay (${res.status()}): ${await res.text()}`,
        );
      }

      // `id` is the numeric ref — rowToBooking maps it that way for the app's
      // Booking shape, and /pay/<ref> is what the customer opens.
      const created = (await res.json()) as { id: number; totalCost: number };
      bookingRef = Number(created.id);

      // A booking with no balance cannot exercise a payment form, and that
      // failing HERE names the cause instead of leaving a 30s iframe timeout
      // to be misread as a broken Clover integration — which is precisely how
      // this file was read for five days.
      if (!(Number(created.totalCost) > 0)) {
        throw new Error(
          `The booking was created with totalCost ${created.totalCost}. ` +
            "Staff prices are supposed to stick; a zero here means the write " +
            "path put it back and there is nothing to pay.",
        );
      }
    } finally {
      await context.close();
    }
  });

  // Cancelled, not deleted — `bookings` has no DELETE policy on purpose. Runs
  // even when a test failed, which is when residue is likeliest.
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, STAFF);
      const all = (await (await page.request.get("/api/bookings")).json()) as
        | { id: number; specialRequests?: string | null; status: string }[]
        | null;
      const mine = (all ?? []).filter(
        (b) => b.specialRequests?.includes(MARKER) && b.status !== "cancelled",
      );
      for (const b of mine) {
        await page.request
          .patch(`/api/bookings/${b.id}`, { data: { status: "cancelled" } })
          .catch(() => {});
      }
    } finally {
      await context.close();
    }
  });

  test("the customer sees the balance and Clover's card fields", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    await page.goto(`/pay/${bookingRef}`);

    // The customer is NOT a member of this facility. That the booking resolves
    // at all is `bookings_read` admitting them through own_client_ids().
    await expect(
      page.getByText(`Balance on booking #${bookingRef}`),
    ).toBeVisible();

    // The card fields are Clover's, on Clover's origin, inside divs we own.
    for (const id of FIELDS) {
      await expect(page.locator(`#${id} iframe`)).toHaveCount(1, {
        timeout: 30_000,
      });
    }

    // A tip moves the button and nothing else — the amount itself is the
    // server's and is never sent from here.
    const pay = page.getByRole("button", { name: /^Pay \$/ });
    const before = await pay.textContent();
    await page.getByRole("button", { name: /^20%/ }).click();
    await expect(pay).not.toHaveText(before ?? "");
    await page.getByRole("button", { name: "None" }).click();
    await expect(pay).toHaveText(before ?? "");
  });

  test("a declined card is reported as a decline, not as a breakage", async ({
    page,
  }) => {
    await signIn(page, CUSTOMER);
    await page.goto(`/pay/${bookingRef}`);

    await typeInto(page, "clover-card-number", DECLINE_CARD);
    await typeInto(page, "clover-card-date", "1227");
    await typeInto(page, "clover-card-cvv", "123");
    await typeInto(page, "clover-card-postal", "H2X1Y4");

    await page.getByRole("button", { name: /^Pay \$/ }).click();

    // Our sentence, not Clover's. Theirs comes back in the MERCHANT's locale
    // ("REFUSÉE : aucune raison fournie.") and says nothing anyone can act on;
    // it is kept on the payment intent for whoever reconciles.
    await expect(page.locator('p[role="alert"]')).toContainText(/declined/i, {
      timeout: 60_000,
    });

    // And the balance is still owed — a decline must not settle anything.
    await expect(
      page.getByText(`Balance on booking #${bookingRef}`),
    ).toBeVisible();
  });
});
