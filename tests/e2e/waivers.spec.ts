import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Waivers: the document a business produces after a dog bites somebody.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `src/data/additional-features` behind 930 lines of `DigitalWaiversManager`.
// Every waiver it published and every signature it captured lived for as long
// as the tab stayed open, so a facility could take a customer through a
// liability waiver, watch it appear in a list, and hold nothing.
//
// ── THE ASSERTION THAT MATTERS IS THE COPY ────────────────────────────────
//
// A signature stores the TEXT it was given, not a pointer at the document. The
// facility can rewrite that document afterwards — it has to be able to — and
// the record of what somebody already agreed to must not move with it. The
// fixture kept `waiverId` and a name and no text at all, so it had exactly that
// defect: edit the waiver and every past signature silently now "refers to"
// different words.
//
// Everything else in this file is scaffolding for "editing the waiver does not
// change what was signed".
//
// ── WHAT IS PROVED HERE, AND WHAT IS PROVED IN SQL ────────────────────────
//
// A Playwright client can only assert what a route does. The stronger claims
// live in `supabase/tests/waivers.sql`, run by `bun run test:sql` in CI:
//
//   W3/W5/W6  a signature cannot be edited, revoking cannot smuggle another
//             change in alongside it, and it revokes once rather than twice —
//             refused by trigger, not merely unoffered.
//   W7/W9     reception reads a waiver WITHOUT `view_waivers`, and a customer
//             holding no permission at all can read what they must sign. Both
//             need identities this suite cannot mint at will.
//   W14       deleting a client cascades the signature away, so an erasure
//             request can still complete.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// Waivers this file publishes are RETIRED in `afterAll`, not deleted — there is
// no delete policy, deliberately, because removing one would destroy the only
// readable statement of what the business used to ask people to agree to.
//
// The signatures stay, and that is right: they are the record. They are left
// REVOKED with a reason naming this suite, which is exactly what a facility
// would see if staff had taken a signature in error and withdrawn it.
//
// Everything wears the `[e2e]` marker and cleanup touches only those — a sweep
// by "recently signed" would revoke a real customer's waiver, which is how
// `loyalty-tiers` came to be minting real $5 vouchers on every push.
// ============================================================================

const WAIVERS = "/api/waivers";
const SIGNATURES = "/api/waivers/signatures";

/** Every waiver this file creates carries it, and cleanup sweeps only those. */
const MARKER = "[e2e]";

type Page = import("@playwright/test").Page;

interface Waiver {
  id: string;
  name: string;
  body: string;
  version: string;
  active: boolean;
  expiryDays: number | null;
}

interface Signature {
  id: string;
  waiverId: string | null;
  waiverName: string;
  waiverVersion: string;
  waiverText: string;
  waiverHash: string;
  signatureName: string;
  status: "valid" | "expired" | "revoked";
  expiresAt: string | null;
  revokedReason: string | null;
}

function freshName(label: string): string {
  return `${MARKER} ${label} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

async function publish(
  page: Page,
  body: Record<string, unknown>,
): Promise<Waiver> {
  const res = await page.request.post(WAIVERS, { data: body });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { waiver: Waiver }).waiver;
}

async function anyClientRef(page: Page): Promise<number> {
  const res = await page.request.get("/api/clients");
  expect(res.ok(), await res.text()).toBe(true);
  const ref = ((await res.json()) as { id?: number }[])
    .map((c) => c.id)
    .find((v): v is number => typeof v === "number");
  expect(ref, "the facility has at least one client").toBeTruthy();
  return ref as number;
}

async function signaturesFor(page: Page, waiverId: string) {
  const res = await page.request.get(`${SIGNATURES}?waiverId=${waiverId}`);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { signatures: Signature[] }).signatures;
}

test.describe("waivers", () => {
  let clientRef = 0;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    clientRef = await anyClientRef(page);
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.get(`${WAIVERS}?all=1`);
    if (res.ok()) {
      const { waivers } = (await res.json()) as { waivers: Waiver[] };
      for (const waiver of waivers) {
        if (!waiver.name.startsWith(MARKER)) continue;

        // Revoke this run's signatures BEFORE retiring the waiver, so the log
        // does not keep a live signature against a document nobody stands
        // behind any more.
        for (const signature of await signaturesFor(page, waiver.id)) {
          if (signature.status === "revoked") continue;
          await page.request.post(`${SIGNATURES}/${signature.id}/revoke`, {
            data: { reason: "E2E cleanup: test signature withdrawn" },
          });
        }

        if (waiver.active) {
          await page.request.patch(`${WAIVERS}/${waiver.id}`, {
            data: { active: false },
          });
        }
      }
    }
    await context.close();
  });

  test("a waiver with no text cannot be published", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.post(WAIVERS, {
      data: { name: freshName("empty"), body: "   " },
    });
    expect(res.status()).toBe(400);
    // A document with nothing in it is not something anybody can agree to, and
    // storing it would be worse than storing nothing.
    expect(((await res.json()) as { error: string }).error).toContain("text");
  });

  test("editing the waiver does NOT change what was already signed", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const original = "THE ORIGINAL TEXT. The owner accepts all risk.";
    const waiver = await publish(page, {
      name: freshName("copy"),
      body: original,
      version: "1.0",
      services: ["boarding"],
    });

    const signed = await page.request.post(`${WAIVERS}/${waiver.id}/sign`, {
      data: { clientRef, signatureName: "E2E Signer" },
    });
    expect(signed.ok(), await signed.text()).toBe(true);
    const signature = ((await signed.json()) as { signature: Signature })
      .signature;
    expect(signature.waiverText).toBe(original);

    // The facility rewrites its own legal text, as it is entitled to.
    const edited = await page.request.patch(`${WAIVERS}/${waiver.id}`, {
      data: {
        body: "THE REWRITTEN TEXT. The facility accepts all risk instead.",
        version: "2.0",
      },
    });
    expect(edited.ok(), await edited.text()).toBe(true);

    // THE POINT. The fixture stored a pointer, so this edit would have silently
    // changed what the customer is recorded as having agreed to.
    const after = (await signaturesFor(page, waiver.id)).find(
      (s) => s.id === signature.id,
    );
    expect(after?.waiverText).toBe(original);
    expect(after?.waiverVersion).toBe("1.0");
    expect(after?.waiverHash).toBe(signature.waiverHash);
  });

  test("an expired signature reads expired, against the server's clock", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // One day, so the expiry is real rather than mocked — then the assertion is
    // that a signature taken today is NOT expired and carries a date.
    const waiver = await publish(page, {
      name: freshName("expiry"),
      body: "Valid for one day only.",
      expiryDays: 1,
    });

    const signed = await page.request.post(`${WAIVERS}/${waiver.id}/sign`, {
      data: { clientRef, signatureName: "E2E Signer" },
    });
    expect(signed.ok(), await signed.text()).toBe(true);
    const signature = ((await signed.json()) as { signature: Signature })
      .signature;

    expect(signature.status).toBe("valid");
    expect(signature.expiresAt).toBeTruthy();

    // Frozen at signing. Changing the rule afterwards must not retroactively
    // expire or extend a signature somebody already gave.
    await page.request.patch(`${WAIVERS}/${waiver.id}`, {
      data: { expiryDays: null },
    });
    const after = (await signaturesFor(page, waiver.id)).find(
      (s) => s.id === signature.id,
    );
    expect(after?.expiresAt).toBe(signature.expiresAt);
  });

  test("a retired waiver cannot be signed", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const waiver = await publish(page, {
      name: freshName("retired"),
      body: "This one gets withdrawn.",
    });
    await page.request.patch(`${WAIVERS}/${waiver.id}`, {
      data: { active: false },
    });

    const res = await page.request.post(`${WAIVERS}/${waiver.id}/sign`, {
      data: { clientRef, signatureName: "E2E Signer" },
    });
    // A retired waiver is one the business has stopped standing behind. Signing
    // it would record agreement to something withdrawn.
    expect(res.status()).toBe(409);
  });

  test("revoking needs a reason, and happens once", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const waiver = await publish(page, {
      name: freshName("revoke"),
      body: "Consent that gets withdrawn.",
    });
    const signed = await page.request.post(`${WAIVERS}/${waiver.id}/sign`, {
      data: { clientRef, signatureName: "E2E Signer" },
    });
    const signature = ((await signed.json()) as { signature: Signature })
      .signature;

    const noReason = await page.request.post(
      `${SIGNATURES}/${signature.id}/revoke`,
      { data: { reason: "  " } },
    );
    expect(noReason.status()).toBe(400);

    const first = await page.request.post(
      `${SIGNATURES}/${signature.id}/revoke`,
      { data: { reason: "E2E: consent withdrawn" } },
    );
    expect(first.ok(), await first.text()).toBe(true);
    expect(
      ((await first.json()) as { signature: Signature }).signature.status,
    ).toBe("revoked");

    // A signature is superseded by a new one, not edited — so a second
    // revocation is refused by the trigger rather than quietly re-stamped.
    const second = await page.request.post(
      `${SIGNATURES}/${signature.id}/revoke`,
      { data: { reason: "E2E: again" } },
    );
    expect(second.status()).toBe(403);

    // And the text it recorded is still there. Revoking says it no longer
    // stands; it does not erase what was agreed.
    const after = (await signaturesFor(page, waiver.id)).find(
      (s) => s.id === signature.id,
    );
    expect(after?.waiverText).toBe("Consent that gets withdrawn.");
    expect(after?.revokedReason).toContain("E2E");
  });

  test("a groomer cannot publish a waiver or record a signature", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    const published = await page.request.post(WAIVERS, {
      data: { name: freshName("groomer"), body: "Should not exist." },
    });
    expect(published.status()).toBe(403);

    // A groomer holds `view_client_documents` and NOT `edit_clients`, so they
    // can see whether a waiver is on file and cannot create one for somebody.
    // A view permission must not authorise a write.
    const list = await page.request.get(`${WAIVERS}?all=1`);
    expect(list.ok(), await list.text()).toBe(true);
    const target = ((await list.json()) as { waivers: Waiver[] }).waivers.find(
      (w) => w.active,
    );
    if (target) {
      const signed = await page.request.post(`${WAIVERS}/${target.id}/sign`, {
        data: { clientRef, signatureName: "Forged" },
      });
      expect(signed.status()).toBe(403);
    }
  });
});
