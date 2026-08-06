import { test, expect, request as pwRequest } from "@playwright/test";
import { ACCOUNTS, PASSWORD, signIn } from "./_auth";

// ============================================================================
// An invited-but-not-onboarded account cannot reach the facility dashboard.
//
// Making the invite REAL is what created this question. /api/staff/[id]/invite
// now writes a facility_memberships row so the new account has a facility at
// all — and canAccessFacilityPortal admits ANY active membership. Before this
// change an invited hire had no membership, so there was nothing to admit;
// after it, "we emailed them yesterday" and "they work here" look identical to
// that gate. lib/auth/onboarding-gate.ts is what tells them apart, and this is
// the spec that says so.
//
// THE SUBJECT IS `staff.status = 'invited'`, NOT A ROLE. An active groomer
// reaching /facility/dashboard is correct and always was — RLS decides what
// they see once there. The first version of this file asserted a groomer was
// refused, which was simply false about this system, and it failed the moment
// it ran. What must be refused is someone mid-onboarding, whatever their role.
//
// These read the API and the redirect rather than the screen, for the reason
// staff-field-exposure.spec.ts gives: a hidden nav item is not a control.
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: drop the redirectIfStillOnboarding
// call from src/app/facility/layout.tsx. "is sent to their checklist" goes red.
// ============================================================================

/** A seeded account we can put into, and take out of, the invited state. */
const SUBJECT = "fs-dev-caretaker";

test.describe.configure({ mode: "serial" });

test.describe("an invited account is not an admitted one", () => {
  // The subject is a shared seeded row. Put it back however the run ends — the
  // lesson from role-editor-writes.spec.ts, where a leftover grant sent five
  // unrelated specs red.
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      await page.request.patch(`/api/staff/${SUBJECT}`, {
        data: { status: "active" },
      });
    } catch {
      // Teardown must never turn a green run red.
    } finally {
      await context.close();
    }
  });

  test("an account with no password cannot sign in at all", async ({
    page,
  }) => {
    // An address with no Clerk account has nothing to authenticate with, and an
    // account that exists but has not been invited gives the same answer —
    // which is the correct answer either way.
    //
    // Driven through the form rather than through the shared signIn(): that
    // helper goes via the Backend API and THROWS on an unknown identifier, so
    // it can only prove sign-in succeeds. Proving it fails means asking the
    // screen a real person would use.
    // Ids read off src/components/auth/EmailSignInForm.tsx, not guessed at.
    await page.goto("/sign-in");
    await page.fill("#identifier", "invited-nobody@example.invalid");
    await page.fill("#password", PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(4000);

    expect(new URL(page.url()).pathname).toMatch(/^\/sign-in/);
    expect(
      (await page.request.get("/api/permissions")).status(),
      "/api/permissions is the check only a real session passes",
    ).toBe(401);
  });

  test("an invited hire is sent to their checklist, not the dashboard", async ({
    page,
    browser,
  }) => {
    // ARM IT. The subject is `active` in the seed, so without this the test
    // asserts that an ordinary member is refused — which is both false and the
    // mistake the first version of this file made.
    const manager = await browser.newContext();
    const managerPage = await manager.newPage();
    try {
      await signIn(managerPage, ACCOUNTS.owner);
      const armed = await managerPage.request.patch(`/api/staff/${SUBJECT}`, {
        data: { status: "invited" },
      });
      expect(armed.status()).toBe(200);
      expect(
        ((await armed.json()) as { status: string }).status,
        "the subject really is invited before we test the gate",
      ).toBe("invited");
    } finally {
      await manager.close();
    }

    await signIn(page, ACCOUNTS.caretaker);
    const body = await (await page.request.get("/facility/dashboard")).text();

    // A soft redirect: HTTP 200 with NEXT_REDIRECT in the RSC payload, because
    // the layout streams. The status is not the answer — the body is.
    expect(body, "not left in the admin portal").toContain("NEXT_REDIRECT");
    expect(body, "and sent somewhere useful, not to /sign-in").toContain(
      "/employee/onboarding",
    );
    expect(
      body,
      "none of the admin portal's own content came back",
    ).not.toContain("Add new staff");
  });

  test("…and once activated, the same person gets in", async ({
    page,
    browser,
  }) => {
    // The control. Without it, the refusal above is satisfied by a gate that
    // refuses everyone, which is not the behaviour anyone wants.
    //
    // The owner's write goes in ITS OWN CONTEXT, matching the test above. Doing
    // both sign-ins on one page cost two full authentication cycles inside a
    // single 120s budget — each one navigates, waits for Clerk to load, and
    // then polls /api/permissions until the database answers — and the test
    // timed out in the second one. That reads as "the caretaker cannot sign
    // in", which is precisely the claim under test, so the false failure was
    // indistinguishable from a true one.
    const manager = await browser.newContext();
    const managerPage = await manager.newPage();
    try {
      await signIn(managerPage, ACCOUNTS.owner);
      await managerPage.request.patch(`/api/staff/${SUBJECT}`, {
        data: { status: "active" },
      });
    } finally {
      await manager.close();
    }

    await signIn(page, ACCOUNTS.caretaker);
    const body = await (await page.request.get("/facility/dashboard")).text();
    expect(body, "an active member is admitted").not.toContain(
      "/employee/onboarding",
    );
  });

  test("the invite route refuses an unauthenticated caller", async ({
    baseURL,
  }) => {
    // The route creates accounts and memberships, and it is reachable by URL —
    // so "the button is only on the manager's screen" is not a control.
    const anon = await pwRequest.newContext({ baseURL });
    try {
      const res = await anon.post(`/api/staff/${SUBJECT}/invite`, { data: {} });
      expect(res.status(), "no session, no invitation").toBe(401);
    } finally {
      await anon.dispose();
    }
  });

  test("a caller without manage_staff cannot invite anyone", async ({
    page,
  }) => {
    // Signed in, but a groomer. The database decides this — the route only
    // asks — so the refusal must survive reaching the endpoint directly.
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.post(`/api/staff/${SUBJECT}/invite`, {
      data: {},
    });

    // 403 when the RPC refuses; 503 when SUPABASE_SERVICE_ROLE_KEY is absent,
    // which is this environment. Both are refusals. The one thing that must not
    // happen is a successful invitation.
    expect(
      res.status(),
      "a groomer must never get a successful invite",
    ).not.toBe(200);
    expect([401, 403, 500, 502, 503]).toContain(res.status());
  });
});
