import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE SECOND RECORD FOR ONE PERSON, ASKED ABOUT BEFORE IT IS MADE.
//
// A facility cannot hold two clients with the same email — there is a unique
// index. So every duplicate that DOES get made carries a different address,
// which is the one case nothing could see.
//
// It happened on 2026-09-21 at doggieville-mtl: refs 855 and 92037410, both
// "Parminder Singh", each with a dog called Bubu, created while working around
// a login problem. **The phones did not match** — 855 has one, 92037410 is
// null — so the NAME was the only signal, and this spec matches that shape
// exactly rather than a convenient one.
//
// A QUESTION, not a block. Two people really can share a name, so the second
// test is as important as the first: confirming goes through.
//
// Both records are removed in afterAll. They carry no bookings, so the delete
// guard added the same day lets them go without ceremony — which this file
// quietly depends on and `client-delete-guard.spec.ts` asserts.
// ============================================================================

const MARKER = "[e2e duplicate-guard]";
const NAME = `${MARKER} Parminder Singh`;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const made: number[] = [];
const stamp = Date.now();
const FIRST_EMAIL = `e2e-dup-first-${stamp}@example.invalid`;
const SECOND_EMAIL = `e2e-dup-second-${stamp}@example.invalid`;

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const db = admin();
  for (const ref of made) {
    const { error } = await db.from("clients").delete().eq("ref", ref);
    console.log(
      `cleanup: client ${ref} ${error ? `NOT removed — ${error.message}` : "removed"}`,
    );
  }
});

test("a second record for the same name is asked about, not made", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);

  // The record that already exists — with a phone, as 855 had.
  const first = await page.request.post("/api/clients", {
    data: { name: NAME, email: FIRST_EMAIL, phone: "5146908911" },
  });
  expect(first.status(), await first.text()).toBe(201);
  made.push(((await first.json()) as { id: number }).id);

  // The same person under another address and NO phone — 92037410's shape.
  const second = await page.request.post("/api/clients", {
    data: { name: NAME, email: SECOND_EMAIL },
    failOnStatusCode: false,
  });

  expect(second.status(), await second.text()).toBe(422);
  const body = (await second.json()) as {
    error: string;
    reason: string;
    candidates: { ref: number; name: string }[];
  };

  // It names the record it found, because "possible duplicate" is not
  // actionable and "#855 Parminder Singh is already a client here" is.
  expect(body.candidates.map((c) => c.ref)).toEqual([made[0]]);
  expect(body.error).toContain("already a client here");
  expect(body.reason).toContain("confirm=duplicate");

  // And nothing was written.
  const db = admin();
  const { count } = await db
    .from("clients")
    .select("ref", { count: "exact", head: true })
    .eq("email", SECOND_EMAIL);
  expect(count, "the duplicate was created anyway").toBe(0);
});

test("confirming makes it, because two people can share a name", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);

  const res = await page.request.post("/api/clients?confirm=duplicate", {
    data: { name: NAME, email: SECOND_EMAIL },
    failOnStatusCode: false,
  });
  expect(res.status(), await res.text()).toBe(201);
  made.push(((await res.json()) as { id: number }).id);
  expect(made.length, "the confirmed create did not happen").toBe(2);
});

test("a different person is not asked about at all", async ({ page }) => {
  // The failure mode that would make this useless: warning about everybody.
  // A blank-phone fold is the trap — "" === "" would match every client with
  // no phone on file.
  await signIn(page, ACCOUNTS.owner);

  const res = await page.request.post("/api/clients", {
    data: {
      name: `${MARKER} Someone Entirely Else ${stamp}`,
      email: `e2e-dup-other-${stamp}@example.invalid`,
    },
    failOnStatusCode: false,
  });
  expect(
    res.status(),
    `${await res.text()} — an unrelated client was flagged as a duplicate`,
  ).toBe(201);
  made.push(((await res.json()) as { id: number }).id);
});
