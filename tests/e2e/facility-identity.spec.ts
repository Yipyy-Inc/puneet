import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_auth";

// ============================================================================
// The facility portal knows who you are.
//
// It did not. The groomer and staff portals resolve identity from the session;
// this one mounted the RBAC provider with a hardcoded "fs-owner-01" and let
// anyone change it from localStorage.
//
// Permissions stopped following that when they moved into Postgres, which made
// the remaining bug quieter and arguably worse: a signed-in groomer saw the
// OWNER's name, avatar and profile while holding a groomer's permissions.
// Nothing looked broken.
//
// The last check is the one that matters — writing an id into localStorage and
// confirming the portal ignores it.
// ============================================================================

const STORAGE_KEY = "facility-rbac-state-v1";

/**
 * The "Signed in as … · Role" line the staff section renders, once the roster
 * has arrived. The placeholder ("Signed in…") is deliberately excluded: reading
 * it too early is how the first version of this test caught a real bug, and
 * settling for it would hide the same bug next time.
 */
async function identityLine(page: Page): Promise<string> {
  await page.goto("/facility/dashboard/staff");
  const line = page.locator("text=/Signed in as|Viewing as/").first();
  await expect(line).toBeVisible({ timeout: 30_000 });
  await expect(line).not.toHaveText(/Signed in…/, { timeout: 30_000 });
  return (await line.innerText()).replace(/\s+/g, " ").trim();
}

test.describe.configure({ mode: "serial" });

test.describe("facility portal identity", () => {
  test("each account is itself, not the owner", async ({ page }) => {
    // Every one of these read "Émilie Laurent · Owner" before the bridge.
    await signIn(page, "owner@yipyy.dev");
    expect(await identityLine(page)).toContain("Dana Okafor");

    await page.context().clearCookies();
    await signIn(page, "manager@yipyy.dev");
    const manager = await identityLine(page);
    expect(manager).toContain("Priya Raman");
    expect(manager).toContain("Manager");
  });

  // THE GROOMER ARM IS GONE, AND ITS ABSENCE IS THE POINT (ADR 0005). This
  // portal is the facility ADMIN's now, so a groomer cannot reach
  // /facility/dashboard/staff at all — the identity line they used to be
  // checked against is a page they are redirected away from. That a staff
  // member is themselves is not untested: employee-identity.spec.ts asserts it
  // on the portal they actually work in, and facility-access-level.spec.ts
  // asserts the redirect itself.
  //
  // The manager took their place here because the guarantee is about the
  // BRIDGE, not the role: an admin-tier account that is not the owner is what
  // proves the page reads the signed-in staff member rather than defaulting to
  // whoever owns the facility.

  test("the switcher is gone for a real staff member", async ({ page }) => {
    await signIn(page, "manager@yipyy.dev");
    expect(await identityLine(page)).toContain("Signed in as");

    // Not merely hidden — there is no combobox to click.
    await expect(
      page.locator("button[role='combobox']").filter({ hasText: /Raman/ }),
    ).toHaveCount(0);
  });

  test("localStorage cannot change who you are", async ({ page }) => {
    await signIn(page, "manager@yipyy.dev");

    // The exact attack the old provider allowed: name yourself the owner.
    await page.evaluate(
      ({ key, id }) => {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            viewerId: id,
            presetOverrides: {},
            staffOverrides: {},
          }),
        );
      },
      { key: STORAGE_KEY, id: "fs-dev-owner" },
    );

    const after = await identityLine(page);
    expect(after).toContain("Priya Raman");
    expect(after).not.toContain("Dana Okafor");

    // And the permissions agree — manage_roles is owner/admin only.
    const map = (await (
      await page.request.get("/api/permissions")
    ).json()) as Record<string, string>;
    expect(map.manage_roles).toBe("none");
  });
});

// ============================================================================
// ARCHIVING A FACILITY MUST NOT LOCK ITS OWN MEMBERS OUT.
//
// `facilities.archived_at` (20260920213428) puts a facility out of sight,
// because a facility that has taken money cannot be deleted. Out of sight is a
// question about LISTS. Membership is a different question, and answering it
// with the filtered list told a real member "You are not a member of that
// facility" — of a facility they own.
//
// Three of the four facilities were archived on 2026-09-20 and the e2e owner's
// is one of them, so this test runs against exactly that case: it would have
// failed with 403 before the fix, and it stops being a real negative control
// the day that facility is restored. `activeId` is read back from the API
// rather than hardcoded, so it follows whichever facility the owner is in.
// ============================================================================

test.describe("a facility nobody deleted still admits its members", () => {
  test("the owner can choose their own facility, archived or not", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    const listed = (await (
      await page.request.get("/api/facility/switch")
    ).json()) as { activeId: string | null };
    expect(
      listed.activeId,
      "the owner resolved to no facility at all",
    ).toBeTruthy();

    const chosen = await page.request.post("/api/facility/switch", {
      data: { facilityId: listed.activeId },
      failOnStatusCode: false,
    });
    expect(chosen.status(), await chosen.text()).toBe(204);
  });

  test("and a facility they are not a member of is still refused", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");
    const refused = await page.request.post("/api/facility/switch", {
      // A well-formed id that is nobody's — the refusal must come from
      // membership, not from the id failing to parse.
      data: { facilityId: "00000000-0000-4000-8000-000000000000" },
      failOnStatusCode: false,
    });
    expect(refused.status()).toBe(403);
  });
});
