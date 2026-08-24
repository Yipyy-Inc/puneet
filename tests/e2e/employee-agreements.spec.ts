import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The agreements an employee is asked to sign.
//
// ── WHAT THIS PROVES, AND WHAT SQL PROVES ─────────────────────────────────
//
// `supabase/tests/employee-agreement-freeze.sql` holds the claims a route
// cannot make, and they are the reason the feature exists:
//   T2  the signature stores the WORDS, not a reference to them
//   T4  EDITING the agreement afterwards leaves the signature untouched
//   T5  DELETING it leaves the signature standing — there is no FK, on purpose
//   T7  even the signer cannot rewrite their own signature
//
// This file proves the HTTP surface in front of that: who may ask, what shape
// comes back, and that the screen renders it.
//
// ── THIS SPEC CREATES NOTHING, AND THAT IS DELIBERATE ─────────────────────
//
// Reaching a signable agreement needs an `onboarding_instances` row, and there
// is NO route that removes one — PATCH offers review / resend / request-change
// / resolve-change and nothing else. Creating one for a dev account would leave
// that account mid-onboarding permanently, and the employee layout redirects
// anyone in that state to their checklist. A run that died between setup and
// cleanup would therefore break every later spec that signs in as them, and it
// would look like an app bug rather than a leak.
//
// So the mutating half lives in SQL, inside a transaction that rolls back. The
// alternative — an e2e that leaks an unremovable row into the one shared
// Postgres — is the exact failure this suite spent 2026-08-24 fixing.
// ============================================================================

const AGREEMENTS = "/api/staff-onboarding/my-agreements";
const SIGNATURES = "/api/staff-signatures";

interface MyAgreement {
  taskKey: string;
  name: string;
  agreementText: string;
  signedAt: string | null;
  signatureName: string | null;
}

interface AgreementsPayload {
  staffId: string | null;
  agreements: MyAgreement[];
}

test.describe("employee agreements", () => {
  test("refuses anyone who is not signed in", async ({ page }) => {
    const res = await page.request.get(AGREEMENTS);
    expect(res.status()).toBe(401);
  });

  test("answers an employee with their own staff id", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.get(AGREEMENTS);
    expect(res.ok(), await res.text()).toBe(true);

    const payload = (await res.json()) as AgreementsPayload;
    // A groomer has a staff row, so the id resolves. The list may be empty —
    // nothing is seeded and an employee with no template has nothing to sign,
    // which is a real answer rather than a failure.
    expect(payload.staffId).toBeTruthy();
    expect(Array.isArray(payload.agreements)).toBe(true);
  });

  test("never lists an agreement with no text", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.get(AGREEMENTS);
    const payload = (await res.json()) as AgreementsPayload;

    // The invariant, whatever the data happens to be. `/api/staff-signatures`
    // refuses a task with no words, so listing one would offer a Sign button
    // whose only possible outcome is a 422 — a control that cannot work.
    for (const agreement of payload.agreements) {
      expect(
        agreement.agreementText.trim().length,
        `"${agreement.name}" was offered with no text`,
      ).toBeGreaterThan(0);
    }
  });

  test("a customer with no staff row gets an empty answer, not an error", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const res = await page.request.get(AGREEMENTS);
    expect(res.ok(), await res.text()).toBe(true);

    const payload = (await res.json()) as AgreementsPayload;
    expect(payload.staffId).toBeNull();
    expect(payload.agreements).toEqual([]);
  });

  test("signing against an agreement that does not exist is refused", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.post(SIGNATURES, {
      data: {
        staffId: "fs-001",
        taskKey: "00000000-0000-0000-0000-000000000000",
        signatureName: "E2E Signer",
      },
    });
    // Refused rather than recorded. A signature against an agreement with no
    // text is a row that looks like proof and is not one.
    expect(res.ok()).toBe(false);
  });

  test("signing with no name is refused before anything is written", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.post(SIGNATURES, {
      data: { staffId: "fs-001", taskKey: "whatever", signatureName: "   " },
    });
    expect(res.status()).toBe(422);
  });

  test("the screen renders for an employee", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/employee/documents");

    await expect(
      page.getByRole("heading", { name: "My Documents" }),
    ).toBeVisible();

    // The signing section is data-dependent, so this asserts the page mounted
    // and read its data rather than that a particular agreement is present.
    // The heading, not the text — "Documents on file" also matches the empty
    // state's "No documents on file yet." and a bare text match is ambiguous.
    await expect(
      page.getByRole("heading", { name: "Documents on file" }),
    ).toBeVisible({ timeout: 15_000 });
  });
});
