import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The employee portal knows who you are, rather than who you picked.
//
// It resolved its acting staff member from `employee_staff_id` — a cookie
// written by /employee/select, which is a picker, not a proof. That was
// survivable while permissions were computed client-side from the same cookie:
// identity and authority were wrong together, so at least they agreed.
//
// They stopped agreeing when permissions moved to the session. Picking a
// colleague gave you THEIR name and YOUR permissions. No privilege gained —
// but every action attributed to someone who did not take it, which is worse
// than a visible error because the record looks fine.
//
// Demonstrated before the fix, signed in as the owner while acting as a
// groomer with the till permission revoked:
//
//     session says:   manage_roles=anytime  view_petcams=anytime
//     register gate:  shown   <- the owner's permission, not the groomer's
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: revert the shell layout to reading
// the cookie alone. "the cookie cannot change who you are" goes red.
// ============================================================================

test.describe.configure({ mode: "serial" });

test.describe("employee portal identity", () => {
  test("a staff member is themselves, not whoever they picked", async ({
    page,
    context,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    // The exact attack the old shell allowed: name yourself somebody else.
    await context.addCookies([
      {
        name: "employee_staff_id",
        value: "fs-dev-owner",
        url: new URL(page.url()).origin,
      },
    ]);

    await page.goto("/employee");
    await page.waitForTimeout(8000);

    // THE ACCOUNT MENU, not the page text.
    //
    // The first version asserted on document.body — "contains Jessica, not
    // Dana" — and passed with the fix reverted, because "Jessica Alvarez"
    // appears in seeded bookings and rotas regardless of who is acting. It was
    // matching incidental content, which is the same as matching nothing.
    //
    // The header's account button renders the ACTING staff member's first name
    // and nothing else, so it is the one place on the page that answers this
    // question.
    const header = page.locator("header").first();
    await expect(header).toBeVisible({ timeout: 30_000 });
    const shown = (await header.innerText()).replace(/\s+/g, " ").trim();

    // Scoped to the header so the assertion reads as "who is acting", and
    // reported with the actual text so a failure says which of the two ways it
    // went: the wrong person, or nobody at all (a cookie id with no matching
    // row renders a blank account menu).
    expect(shown, `header showed: "${shown}"`).toMatch(/Jessica/);
    expect(shown, `header showed: "${shown}"`).not.toMatch(/Dana/);
  });

  test("the sidebar says the acting staff member's real role", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/employee");

    const sidebar = page.locator('[data-slot="sidebar-inner"]').first();
    await expect(sidebar.getByRole("link").first()).toBeVisible({
      timeout: 60_000,
    });

    // The sidebar header looked the acting id up in the mock roster and fell
    // back to "reception" on a miss — so a session-derived id, which matches
    // nothing there, labelled EVERY signed-in employee Reception. Jessica is a
    // groomer; "Reception" is the specific wrong answer this replaced, so both
    // halves are asserted.
    await expect
      .poll(
        async () => (await sidebar.innerText()).replace(/\s+/g, " ").trim(),
        {
          timeout: 30_000,
        },
      )
      .toMatch(/Groomer Jessica Alvarez/);
    expect(
      (await sidebar.innerText()).replace(/\s+/g, " "),
      "sidebar still labels the groomer Reception",
    ).not.toMatch(/^\s*Reception/);
  });

  test("My Documents shows nobody else's HR file", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/employee/documents");
    await expect(
      page.getByRole("heading", { name: "My Documents" }),
    ).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(4000);

    // This screen resolved its staff member with `.find(...) ?? facilityStaff[0]`
    // over the mock array. A session-derived id missed, the fallback fired, and
    // "Documents on file" listed the OWNER'S file — Émilie Laurent's employment
    // agreement and federal tax form — under the heading "My Documents".
    //
    // SCOPED TO THAT SECTION, and matched on "Federal Tax Form" specifically.
    // The first version of this test searched the whole page for "Employment
    // Agreement" and failed on correct code, because that is also the name of a
    // blank template offered to everyone under "Needs your signature". Page-wide
    // text matching keeps catching content that has nothing to do with the
    // question — the section below is the only part of this page that is
    // per-person, and "Federal Tax Form" is a filename that is not also a
    // template name.
    const onFile = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Documents on file" }),
    });
    const listed = (await onFile.innerText()).replace(/\s+/g, " ");
    expect(listed, `"Documents on file" showed: "${listed}"`).not.toMatch(
      /Federal Tax Form|Émilie Laurent/,
    );
  });

  test("the picker is not offered to someone the session already names", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/employee/select");
    await page.waitForTimeout(6000);

    // Sent straight in rather than asked to choose.
    expect(new URL(page.url()).pathname).not.toBe("/employee/select");
  });

  test("a platform admin keeps the picker", async ({ page }) => {
    // The other half: reviewing a facility as one of its staff is what the
    // tool is for, and removing it for everyone would have been the lazy fix.
    await signIn(page, ACCOUNTS.admin);
    await page.goto("/employee/select");
    await page.waitForTimeout(6000);

    expect(new URL(page.url()).pathname).toBe("/employee/select");
  });

  test("signed out cannot reach the portal at all", async ({ page }) => {
    await page.goto("/employee");
    await page.waitForTimeout(6000);
    expect(new URL(page.url()).pathname).toMatch(/^\/sign-in/);
  });
});
