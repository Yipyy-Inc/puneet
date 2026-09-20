import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The address lookup behind the street field.
//
// ── WHAT IS ASSERTED HERE AND WHAT IS ASSERTED IN THE UNIT TIER ───────────
//
// The MAPPING — a provider's JSON becoming our four fields — is
// tests/unit/geocode-address.test.ts, because it is pure and asserting it
// through a browser would mean a live third-party call for every case. What
// is left for this tier is the part a unit test cannot see: that the route
// needs a session, and that it degrades instead of failing.
//
// ── IT MUST NOT GO RED WHEN KOMOOT IS BUSY ────────────────────────────────
//
// The provider is a free public instance that throttles heavy callers, so a
// spec demanding results would make the pipeline a report on somebody else's
// uptime. The shape is asserted either way: `available: false` with an empty
// list is a PASS, because that is exactly what the form is built to survive.
// A broken route still fails — it answers the wrong shape, or 500s, or lets a
// signed-out caller through.
// ============================================================================

const ROUTE = "/api/geocode/suggest";

interface Payload {
  suggestions: Array<{
    label: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
  }>;
  available: boolean;
}

test.describe("the address lookup", () => {
  test("a signed-out caller is refused, not served", async ({ request }) => {
    // Otherwise this is an open geocoding proxy for anyone who finds the URL,
    // running on our bill and our provider's goodwill.
    const response = await request.get(`${ROUTE}?q=1200+rue+sainte`, {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(401);
  });

  test("a query too short to mean anything asks the provider nothing", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const response = await page.request.get(`${ROUTE}?q=ru`, {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as Payload;
    expect(body.suggestions).toEqual([]);
    // `available` stays TRUE: nothing is wrong, there is simply nothing to
    // look up yet. The field must not show a "search unavailable" state at
    // two characters.
    expect(body.available).toBe(true);
  });

  test("a real address comes back in our shape, or not at all", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const response = await page.request.get(
      `${ROUTE}?q=${encodeURIComponent("1200 rue sainte-catherine")}`,
      { failOnStatusCode: false },
    );
    expect(response.status()).toBe(200);

    const body = (await response.json()) as Payload;
    expect(Array.isArray(body.suggestions)).toBe(true);

    if (!body.available || body.suggestions.length === 0) {
      // Throttled, down, or slow. The form carries on and so does this spec.
      test.info().annotations.push({
        type: "note",
        description: `geocoder returned nothing (available=${body.available})`,
      });
      return;
    }

    for (const suggestion of body.suggestions) {
      expect(
        suggestion.street,
        "a row with no street is unusable",
      ).toBeTruthy();
      expect(suggestion.label).toContain(suggestion.street);
      // The route names Canada; a row from anywhere else means the filter
      // stopped working, and the person would be offered an address in Texas.
      expect(suggestion.country).toBe("CA");
      // Two letters is what the province field holds. A full name here is the
      // French-name defect the unit tier caught, reaching a real form.
      if (suggestion.province) {
        expect(suggestion.province).toMatch(/^[A-Z]{2}$/);
      }
      expect(Number.isFinite(suggestion.latitude)).toBe(true);
      expect(Number.isFinite(suggestion.longitude)).toBe(true);
      // Canada, roughly. Catches [lon, lat] being read the wrong way round,
      // which leaves every other field looking perfect.
      expect(suggestion.latitude).toBeGreaterThan(40);
      expect(suggestion.latitude).toBeLessThan(85);
      expect(suggestion.longitude).toBeLessThan(-50);
    }
  });
});
