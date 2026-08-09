import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A facility's own name, contact details and address.
//
// Until 20260809120000 there was nowhere to store any of this, so the settings
// screen read `src/data/settings.ts` and EVERY facility rendered "PawCare
// Facility / contact@pawcare.com / +1 (555) 123-4567 / 123 Pet Street, San
// Francisco" — not as a placeholder, but as the only thing the code could
// produce.
//
// So the assertion that matters is not "a profile loads". It is that what
// comes back belongs to THIS facility and that the fixture is gone.
//
// This spec WRITES. It saves a marker into the demo facility's profile and
// leaves it there, which is safe — the demo facility is a fixture, and its
// profile starts empty.
// ============================================================================

const PROFILE = "/api/facility/profile";

// Unique per run, so a passing assertion cannot be a leftover from last time.
const marker = `e2e-${process.env.E2E_RUN_ID ?? "local"}`;

test.describe("a facility's business profile", () => {
  test("is refused to anyone not signed in", async ({ page }) => {
    const response = await page.request.get(PROFILE);
    expect(response.status()).toBe(401);
  });

  test("carries no trace of the PawCare fixture", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.get(PROFILE);
    expect(response.status()).toBe(200);

    const body = await response.text();
    // The exact strings that used to be served to every facility. If any of
    // them come back, the screen is reading the fixture again.
    expect(body).not.toContain("PawCare");
    expect(body).not.toContain("contact@pawcare.com");
    expect(body).not.toContain("555) 123-4567");
    expect(body).not.toContain("123 Pet Street");
  });

  test("an owner saves it, and it is still there on the next read", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const saved = await page.request.patch(PROFILE, {
      data: {
        email: `${marker}@example.test`,
        phone: "+1 514 555 0000",
        address: {
          street: "1 Test Way",
          city: "Montreal",
          state: "QC",
          zipCode: "H2X 1Y4",
          country: "Canada",
        },
      },
    });
    expect(saved.status()).toBe(200);

    // The response is the STORED row, so this already proves the write landed
    // rather than that the request was accepted.
    const body = (await saved.json()) as {
      email: string;
      address: { city: string };
    };
    expect(body.email).toBe(`${marker}@example.test`);
    expect(body.address.city).toBe("Montreal");

    // And again from a fresh read, because an echo is not persistence.
    const reread = await page.request.get(PROFILE);
    expect(((await reread.json()) as { email: string }).email).toBe(
      `${marker}@example.test`,
    );
  });

  test("a patch touches only what it names", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = (await (await page.request.get(PROFILE)).json()) as {
      email: string;
      businessName: string;
    };

    await page.request.patch(PROFILE, { data: { phone: "+1 514 555 9999" } });

    const after = (await (await page.request.get(PROFILE)).json()) as {
      email: string;
      businessName: string;
      phone: string;
    };
    expect(after.phone).toBe("+1 514 555 9999");
    // A form that posts one section must not blank the others.
    expect(after.email).toBe(before.email);
    expect(after.businessName).toBe(before.businessName);
  });

  test("the identity columns cannot be moved from here", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // `slug` is not part of the schema this route accepts, so it is rejected
    // before it reaches the database. The DATABASE trigger is the real
    // boundary — proven separately in SQL — and this asserts the route does not
    // quietly forward unknown fields.
    const response = await page.request.patch(PROFILE, {
      data: { slug: "stolen", email: "x@example.test" },
    });
    expect(response.status()).toBe(422);
  });

  test("an empty business name is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const response = await page.request.patch(PROFILE, {
      data: { businessName: "   " },
    });
    expect(response.status()).toBe(422);
  });

  test("a caretaker cannot edit it, but can still read it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.caretaker);

    // The positive control FIRST. A permission key that does not exist makes
    // has_permission() fail closed, which looks exactly like a correct refusal
    // — so proving the refusal means nothing unless somebody is admitted.
    const read = await page.request.get(PROFILE);
    expect(read.status()).toBe(200);

    const write = await page.request.patch(PROFILE, {
      data: { email: "caretaker@example.test" },
    });
    expect(write.status()).toBe(403);
  });
});
