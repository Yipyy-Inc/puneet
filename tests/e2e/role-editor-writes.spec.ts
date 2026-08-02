import { test, expect, type Page } from "@playwright/test";
import { PASSWORD } from "./_auth";

// ============================================================================
// The role editor edits what Postgres enforces.
//
// The regression this guards against is specific and was live until now: the
// editor wrote to localStorage, so an owner could revoke a permission, see the
// checkbox clear, and change nothing about what anyone was actually allowed to
// do. A test that only asserted "the save succeeded" would have passed the
// whole time.
//
// So each check below reads the OTHER person's resolved permission map after
// the edit — the thing that has to move — rather than the editor's own state.
//
// Runs against the live Supabase project using the dev accounts. It writes
// real override rows and removes them again; a failure mid-run can leave one
// behind, which the first step clears.
// ============================================================================

type PermissionMap = Record<string, string>;

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  // The landing path differs per role and some portals redirect again; wait for
  // the session cookie to be usable rather than for any particular URL.
  await expect
    .poll(async () => (await page.request.get("/api/permissions")).status(), {
      timeout: 30_000,
    })
    .toBe(200);
}

async function signOut(page: Page) {
  await page.context().clearCookies();
}

const permissions = async (page: Page): Promise<PermissionMap> => {
  const response = await page.request.get("/api/permissions");
  expect(response.status()).toBe(200);
  return (await response.json()) as PermissionMap;
};

const setOverride = (page: Page, body: unknown) =>
  page.request.put("/api/roles/overrides", { data: body });

test.describe.configure({ mode: "serial" });

test.describe("role editor writes", () => {
  test("owner's edit to a role changes what a groomer may do", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    // Clear anything a previous failed run left behind.
    await setOverride(page, {
      kind: "facility-role",
      role: "groomer",
      key: "manage_staff",
      scope: null,
    });

    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    const before = await permissions(page);
    expect(before.manage_staff).toBe("none");
    // Baseline worth pinning: a groomer's booking access is SCOPED, not a
    // boolean. If this ever reads "anytime" the cascade has been flattened.
    expect(before.view_bookings).toBe("assigned_shifts");

    await signOut(page);
    await signIn(page, "owner@yipyy.dev");
    const granted = await setOverride(page, {
      kind: "facility-role",
      role: "groomer",
      key: "manage_staff",
      scope: "anytime",
    });
    expect(granted.status()).toBe(200);

    // The assertion that matters: a DIFFERENT account's resolved map moved.
    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    expect((await permissions(page)).manage_staff).toBe("anytime");

    // And a revoke removes something the preset grants.
    await signOut(page);
    await signIn(page, "owner@yipyy.dev");
    await setOverride(page, {
      kind: "facility-role",
      role: "groomer",
      key: "view_bookings",
      scope: "revoked",
    });

    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    const after = await permissions(page);
    expect(after.view_bookings).toBe("none");
    // The reception preset is untouched — an override is per role, not global.
    await signOut(page);
    await signIn(page, "reception@yipyy.dev");
    expect((await permissions(page)).view_bookings).not.toBe("none");
  });

  test("clearing an override restores the preset", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");
    for (const key of ["manage_staff", "view_bookings"]) {
      const cleared = await setOverride(page, {
        kind: "facility-role",
        role: "groomer",
        key,
        scope: null,
      });
      expect(cleared.status()).toBe(200);
    }

    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    const restored = await permissions(page);
    // Back to the global preset, not to "denied" — clearing must inherit, and
    // writing 'none' where the UI meant "reset" is the easy way to get this
    // wrong.
    expect(restored.view_bookings).toBe("assigned_shifts");
    expect(restored.manage_staff).toBe("none");
  });

  test("a manager cannot edit roles", async ({ page }) => {
    // manager holds manage_staff but NOT manage_roles. Before this change the
    // policy gated on scheduling_view_all, which a manager (and a supervisor)
    // does hold — so this request would have succeeded.
    await signIn(page, "manager@yipyy.dev");
    const refused = await setOverride(page, {
      kind: "facility-role",
      role: "groomer",
      key: "manage_staff",
      scope: "anytime",
    });
    expect(refused.status()).toBe(403);

    // And the refusal is real, not just a status: the groomer is unchanged.
    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    expect((await permissions(page)).manage_staff).toBe("none");
  });

  test("the editor UI itself reaches Postgres", async ({ page }) => {
    // The three checks above prove the route. This one proves the control is
    // wired to it — which is the actual bug: every one of these dropdowns has
    // been changing a localStorage blob and nothing else.
    await signIn(page, "owner@yipyy.dev");
    await page.goto("/facility/dashboard/settings?section=roles-permissions");

    // Role cards read "Trainer / 2 staff / Preset".
    await page
      .getByRole("button", { name: /^Trainer\b/ })
      .first()
      .click();

    const label = page.getByText("Manage staff", { exact: true }).first();
    await label.scrollIntoViewIfNeeded();
    const control = label
      .locator(
        "xpath=ancestor::div[button[@role='combobox']][1]//button[@role='combobox']",
      )
      .first();
    await expect(control).toContainText("Not granted");

    await control.click();
    await page
      .getByRole("option", { name: /^Anytime/ })
      .first()
      .click();

    // Editing a preset role asks once before applying.
    await page.getByRole("button", { name: /change defaults/i }).click();

    // The assertion: a row now exists in facility_role_permissions. Read it
    // back through the API rather than trusting the control's own appearance —
    // looking right is exactly what it did before.
    await expect
      .poll(
        async () => {
          const body = (await (
            await page.request.get("/api/roles/overrides")
          ).json()) as {
            facilityRoles: Record<string, Record<string, string>>;
          };
          return body.facilityRoles.trainer?.manage_staff;
        },
        { timeout: 15_000 },
      )
      .toBe("anytime");

    // Clean up so the suite is re-runnable.
    await setOverride(page, {
      kind: "facility-role",
      role: "trainer",
      key: "manage_staff",
      scope: null,
    });
  });

  test("a per-staff override is stored against the person", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    const set = await setOverride(page, {
      kind: "staff",
      staffId: "fs-groom-01",
      key: "manage_roles",
      setting: { granted: true, scope: "anytime" },
    });
    // fs-groom-01 has no account yet — the point of keying layer 3 on the
    // staff record is that the override can still be written and stored now.
    expect(set.status()).toBe(200);

    const read = await page.request.get("/api/roles/overrides");
    const body = (await read.json()) as {
      staff: Record<string, Record<string, unknown>>;
    };
    expect(body.staff["fs-groom-01"]?.manage_roles).toEqual({
      granted: true,
      scope: "anytime",
    });

    const cleared = await setOverride(page, {
      kind: "staff",
      staffId: "fs-groom-01",
      key: "manage_roles",
      setting: null,
    });
    expect(cleared.status()).toBe(200);

    const readAgain = await page.request.get("/api/roles/overrides");
    const bodyAgain = (await readAgain.json()) as {
      staff: Record<string, unknown>;
    };
    expect(bodyAgain.staff["fs-groom-01"]).toBeUndefined();
  });

  test("a per-staff override moves the person it names", async ({ page }) => {
    // The check above proves storage. This one proves effect — the dev
    // accounts have staff records linked to their memberships, so layer 3 can
    // finally resolve for somebody. Without that link the override is written
    // and inert, which is indistinguishable from broken.
    await signIn(page, "owner@yipyy.dev");
    await setOverride(page, {
      kind: "staff",
      staffId: "fs-dev-groomer",
      key: "manage_roles",
      setting: { granted: true, scope: "anytime" },
    });

    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    // No role a groomer holds grants manage_roles; only the person override does.
    expect((await permissions(page)).manage_roles).toBe("anytime");

    await signOut(page);
    await signIn(page, "owner@yipyy.dev");
    await setOverride(page, {
      kind: "staff",
      staffId: "fs-dev-groomer",
      key: "manage_roles",
      setting: null,
    });

    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    expect((await permissions(page)).manage_roles).toBe("none");
  });

  test("a custom role grants through the cascade", async ({ page }) => {
    const roleId = "custom-e2e-senior-groomer";
    const custom = (body: unknown) =>
      page.request.put("/api/roles/custom", { data: body });

    await signIn(page, "owner@yipyy.dev");
    await custom({ kind: "delete", id: roleId }); // clear a failed prior run

    const created = await custom({
      kind: "upsert",
      role: {
        id: roleId,
        label: "Senior Groomer (e2e)",
        description: "",
        accent: "",
        ring: "",
        icon: "Sparkles",
        permissions: {},
        createdAt: new Date().toISOString(),
      },
    });
    expect(created.status()).toBe(200);

    await custom({
      kind: "permission",
      id: roleId,
      key: "manage_staff",
      scope: "operating_hours",
    });

    // Defining the role changes nothing until somebody holds it.
    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    expect((await permissions(page)).manage_staff).toBe("none");

    await signOut(page);
    await signIn(page, "owner@yipyy.dev");
    const assigned = await custom({
      kind: "assignments",
      staffId: "fs-dev-groomer",
      roleIds: [roleId],
    });
    expect(assigned.status()).toBe(200);

    // Now it does — via the fourth branch of the union, not a preset.
    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    expect((await permissions(page)).manage_staff).toBe("operating_hours");

    // Unassigning is what takes it away again, and the role itself survives.
    await signOut(page);
    await signIn(page, "owner@yipyy.dev");
    await custom({
      kind: "assignments",
      staffId: "fs-dev-groomer",
      roleIds: [],
    });

    await signOut(page);
    await signIn(page, "groomer@yipyy.dev");
    expect((await permissions(page)).manage_staff).toBe("none");

    await signOut(page);
    await signIn(page, "owner@yipyy.dev");
    const listed = (await (
      await page.request.get("/api/roles/custom")
    ).json()) as { roles: Record<string, { label: string }> };
    expect(listed.roles[roleId]?.label).toBe("Senior Groomer (e2e)");

    expect((await custom({ kind: "delete", id: roleId })).status()).toBe(200);
  });

  test("a manager cannot create or assign custom roles", async ({ page }) => {
    await signIn(page, "manager@yipyy.dev");
    const refused = await page.request.put("/api/roles/custom", {
      data: {
        kind: "upsert",
        role: {
          id: "custom-e2e-forbidden",
          label: "Should not exist",
          description: "",
          accent: "",
          ring: "",
          icon: "Sparkles",
          permissions: {},
          createdAt: new Date().toISOString(),
        },
      },
    });
    expect(refused.status()).toBe(403);

    // And nothing was created — a 403 that still wrote would be worse than a 200.
    const listed = (await (
      await page.request.get("/api/roles/custom")
    ).json()) as { roles: Record<string, unknown> };
    expect(listed.roles["custom-e2e-forbidden"]).toBeUndefined();
  });
});
