import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The tag catalogue, and who may read or change it.
//
// ── WHY THIS IS A GATE SPEC ───────────────────────────────────────────────
//
// /api/tags is the one endpoint in the product a CUSTOMER and a STAFF MEMBER
// both call, and it answers them differently. That is deliberate — RLS decides,
// so the route filters nothing (see its header) — but it means a mistake in the
// policy shows up as a pet owner reading "Bites handlers" off their own dog's
// card, and a mistake in the route shows up as anyone at all reading it.
//
// supabase/tests/client-visible-tags.sql asserts the POLICY in nine directions
// inside a rolled-back transaction. This file asserts the ROUTE, which SQL
// cannot see: that it demands a session, that a customer's writes are refused,
// and that what comes back has the shape nineteen screens read.
//
// ── IT WRITES NOTHING ─────────────────────────────────────────────────────
//
// Reads and REFUSED writes only. Worth stating, because staging and local dev
// share the PRODUCTION database: a spec that created a tag here would leave it
// in a real facility's settings, and retiring one only sets `is_active = false`
// — the row stays. So the two write assertions below use the CUSTOMER account,
// whose insert RLS refuses, and no row is created either way.
//
// The visibility assertion is written to be vacuously true today (no facility
// has defined a tag yet) and meaningful the moment one does. That is on
// purpose: the alternative is seeding a real facility's catalogue from a test.
// ============================================================================

const ROUTE = "/api/tags";

interface TagResponse {
  tags: {
    id: string;
    name: string;
    visibility: string;
    isActive: boolean;
    type: string;
  }[];
  assignments: { id: string; tagId: string; entityId: number }[];
}

test.describe("the tag catalogue", () => {
  test("signed out gets 401, not a facility's tags", async ({ request }) => {
    const response = await request.get(ROUTE, { failOnStatusCode: false });
    expect(
      response.status(),
      "an unauthenticated caller reached a facility's tag catalogue",
    ).toBe(401);
  });

  test("staff read the catalogue and its assignments", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const response = await page.request.get(ROUTE, {
      failOnStatusCode: false,
    });
    expect(response.status(), `owner read of ${ROUTE}`).toBe(200);

    const body = (await response.json()) as TagResponse;
    expect(Array.isArray(body.tags), "tags must be an array").toBe(true);
    expect(
      Array.isArray(body.assignments),
      "assignments must be an array",
    ).toBe(true);

    // Every assignment must carry a NUMBER, not a uuid. The route translates
    // `entity_id` to the target's ref because twenty call sites pass
    // `pet.id` — a uuid leaking through here shows as a pet with no tags,
    // silently, on every screen at once.
    for (const assignment of body.assignments) {
      expect(
        typeof assignment.entityId,
        `assignment ${assignment.id} carries a ${typeof assignment.entityId}, not a ref`,
      ).toBe("number");
    }
  });

  test("a customer reads only the tags marked visible to clients", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    const response = await page.request.get(ROUTE, {
      failOnStatusCode: false,
    });
    expect(response.status(), `customer read of ${ROUTE}`).toBe(200);

    const body = (await response.json()) as TagResponse;

    for (const tag of body.tags) {
      expect(
        tag.visibility,
        `"${tag.name}" reached a customer with visibility ${tag.visibility}`,
      ).toBe("client_visible");
      expect(tag.isActive, `retired tag "${tag.name}" reached a customer`).toBe(
        true,
      );
    }
  });

  test("a customer cannot create a tag", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);

    const response = await page.request.post(ROUTE, {
      failOnStatusCode: false,
      data: {
        type: "pet",
        name: `e2e should never exist ${Date.now()}`,
        color: "#0F58C6",
        icon: "Tag",
        priority: "informational",
        visibility: "client_visible",
        scope: "global",
        locationIds: [],
      },
    });

    // 403 from RLS, or 404 if the account has no facility context at all.
    // A 201 is the failure: it would mean a pet owner writing into the
    // facility's own settings.
    expect(
      [403, 404],
      `a customer creating a tag answered ${response.status()}`,
    ).toContain(response.status());
  });

  test("a customer cannot tag a record", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);

    const response = await page.request.post(`${ROUTE}/assignments`, {
      failOnStatusCode: false,
      data: {
        tagId: "00000000-0000-4000-8000-000000000000",
        entityType: "pet",
        entityRef: 1,
      },
    });

    // 404 because the pet does not resolve for them, or 403 because the insert
    // policy refuses. Both are refusals; 201 is not.
    expect(
      [403, 404],
      `a customer assigning a tag answered ${response.status()}`,
    ).toContain(response.status());
  });
});
