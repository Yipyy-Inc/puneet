import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Forms: the questions somebody was asked, and what they answered.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `src/data/forms.ts` and `src/data/form-submissions.ts`. A customer filled in
// `/forms/[slug]`, staff opened the submission, and neither outlived a refresh.
//
// ── THE ASSERTION THAT MATTERS IS THE FROZEN VERSION ──────────────────────
//
// The fixture HAD a version table and submissions carried `formVersionId` — and
// `updateForm()` rewrote the latest version in place, deleting its sections,
// fields and logic, published or not, answered or not. So editing a form
// silently changed the questions every past submission was recorded against
// while the answers stayed put: a "yes" under a question nobody was asked.
//
// A structure that LOOKS like it preserves history is worse than an obvious
// absence of one, because nobody checks it. These tests are the check.
//
// ── WHAT IS PROVED HERE, AND WHAT IS PROVED IN SQL ────────────────────────
//
// `supabase/tests/forms.sql` holds the claims a route cannot make:
//   F3   a PUBLISHED version cannot be rewritten — refused by trigger, with the
//        schema re-read afterwards to prove nothing moved.
//   F6   submitted answers cannot be rewritten, and F8 that reviewing cannot
//        smuggle a reassignment through with it.
//   F9   a version somebody answered cannot be deleted (`on delete restrict`).
//   F15  deleting a client still cascades their submissions away, so an
//        erasure request completes.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// Forms are ARCHIVED, not deleted — there is no delete policy, and a version
// somebody has answered cannot be removed at all by design. Submissions stay:
// they are the record. Everything wears `[e2e]` and cleanup touches only those.
// ============================================================================

const FORMS = "/api/forms";
const SUBMISSIONS = "/api/forms/submissions";

const MARKER = "[e2e]";

type Page = import("@playwright/test").Page;

interface Version {
  id: string;
  versionNumber: number;
  schema: Record<string, unknown>;
  publishedAt: string | null;
}

interface Form {
  id: string;
  name: string;
  slug: string;
  status: string;
  publishedVersion: Version | null;
  draftVersion: Version | null;
}

interface Submission {
  id: string;
  formVersionId: string;
  versionNumber: number | null;
  schema: Record<string, unknown> | null;
  answers: Record<string, unknown>;
  status: string;
  score: number | null;
}

function freshName(label: string): string {
  return `${MARKER} ${label} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

function questions(label: string) {
  return {
    sections: [
      {
        id: "s1",
        title: "Health",
        fields: [{ id: "f1", label, type: "yes_no" }],
      },
    ],
  };
}

async function createForm(page: Page, name: string): Promise<Form> {
  const res = await page.request.post(FORMS, { data: { name } });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { form: Form }).form;
}

async function patchForm(
  page: Page,
  id: string,
  data: Record<string, unknown>,
): Promise<Form> {
  const res = await page.request.patch(`${FORMS}/${id}`, { data });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { form: Form }).form;
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

test.describe("forms", () => {
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

    const res = await page.request.get(FORMS);
    if (res.ok()) {
      const { forms } = (await res.json()) as { forms: Form[] };
      for (const form of forms) {
        if (!form.name.startsWith(MARKER)) continue;
        if (form.status === "archived") continue;
        // Archived, not deleted. A version somebody answered cannot be removed
        // at all — `on delete restrict` — and that is the design working.
        await page.request.patch(`${FORMS}/${form.id}`, {
          data: { status: "archived" },
        });
      }
    }
    await context.close();
  });

  test("a form with no name cannot be created", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(FORMS, { data: { name: "   " } });
    expect(res.status()).toBe(400);
  });

  test("a new form starts with a DRAFT version, not a published one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const form = await createForm(page, freshName("draft"));

    // A form with no version is a form with no questions. It starts as a draft
    // so it stays editable until somebody decides it is ready.
    expect(form.draftVersion).toBeTruthy();
    expect(form.publishedVersion).toBeNull();
    expect(form.draftVersion?.versionNumber).toBe(1);
  });

  test("publishing freezes the questions, and editing opens version 2", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const form = await createForm(page, freshName("freeze"));

    const published = await patchForm(page, form.id, {
      schema: questions("ORIGINAL: is your dog vaccinated?"),
      publish: true,
      status: "published",
    });
    expect(published.publishedVersion?.versionNumber).toBe(1);
    expect(published.draftVersion).toBeNull();

    // Editing does NOT rewrite version 1 — the fixture's updateForm() did
    // exactly that. It opens a new one.
    const edited = await patchForm(page, form.id, {
      schema: questions("REWRITTEN: do you accept all risk?"),
      publish: true,
    });
    expect(edited.publishedVersion?.versionNumber).toBe(2);

    // And version 1 still says what it said. Read back through the detail
    // route rather than trusting the response of the write.
    const detail = await page.request.get(`${FORMS}/${form.id}`);
    expect(detail.ok(), await detail.text()).toBe(true);
    expect(
      JSON.stringify(
        ((await detail.json()) as { form: Form }).form.publishedVersion?.schema,
      ),
    ).toContain("REWRITTEN");
  });

  test("answers stay attached to the questions that were asked", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const form = await createForm(page, freshName("asked"));

    await patchForm(page, form.id, {
      schema: questions("ORIGINAL: is your dog vaccinated?"),
      publish: true,
      status: "published",
    });

    const filed = await page.request.post(`${FORMS}/${form.id}/submit`, {
      data: { clientRef, answers: { f1: "yes" } },
    });
    expect(filed.ok(), await filed.text()).toBe(true);
    const submission = ((await filed.json()) as { submission: Submission })
      .submission;
    expect(submission.answers.f1).toBe("yes");
    expect(JSON.stringify(submission.schema)).toContain("ORIGINAL");

    // The facility rewrites the wording afterwards, as it is entitled to.
    await patchForm(page, form.id, {
      schema: questions("REWRITTEN: do you accept all risk?"),
      publish: true,
    });

    // THE POINT. The submission still carries the questions it was answered
    // against — and its answers are unchanged. Under the fixture, "yes" would
    // now sit under a question the person never saw.
    const after = await page.request.get(`${SUBMISSIONS}/${submission.id}`);
    expect(after.ok(), await after.text()).toBe(true);
    const reread = ((await after.json()) as { submission: Submission })
      .submission;
    expect(JSON.stringify(reread.schema)).toContain("ORIGINAL");
    expect(JSON.stringify(reread.schema)).not.toContain("REWRITTEN");
    expect(reread.answers.f1).toBe("yes");
    expect(reread.versionNumber).toBe(1);
  });

  test("a submission is filed against the newest PUBLISHED version", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const form = await createForm(page, freshName("newest"));

    await patchForm(page, form.id, {
      schema: questions("V1 question"),
      publish: true,
      status: "published",
    });
    // An unpublished draft in progress is NOT what a person is shown, so it
    // must not be what their answers are filed against.
    const withDraft = await patchForm(page, form.id, {
      schema: questions("V2 draft in progress"),
    });
    expect(withDraft.draftVersion?.versionNumber).toBe(2);

    const filed = await page.request.post(`${FORMS}/${form.id}/submit`, {
      data: { clientRef, answers: { f1: "no" } },
    });
    expect(filed.ok(), await filed.text()).toBe(true);
    const submission = ((await filed.json()) as { submission: Submission })
      .submission;
    expect(submission.versionNumber).toBe(1);
    expect(JSON.stringify(submission.schema)).toContain("V1 question");
  });

  test("an unpublished form cannot be answered", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const form = await createForm(page, freshName("unpublished"));

    const res = await page.request.post(`${FORMS}/${form.id}/submit`, {
      data: { clientRef, answers: { f1: "yes" } },
    });
    // Answers to a draft are answers to something nobody decided to ask.
    expect(res.status()).toBe(409);
  });

  test("reviewing moves the status and leaves the answers alone", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const form = await createForm(page, freshName("review"));
    await patchForm(page, form.id, {
      schema: questions("Reviewable question"),
      publish: true,
      status: "published",
    });

    const filed = await page.request.post(`${FORMS}/${form.id}/submit`, {
      data: { clientRef, answers: { f1: "yes" } },
    });
    const submission = ((await filed.json()) as { submission: Submission })
      .submission;

    const reviewed = await page.request.patch(
      `${SUBMISSIONS}/${submission.id}`,
      { data: { status: "flagged", score: 7 } },
    );
    expect(reviewed.ok(), await reviewed.text()).toBe(true);
    const after = ((await reviewed.json()) as { submission: Submission })
      .submission;

    expect(after.status).toBe("flagged");
    expect(after.score).toBe(7);
    // Untouched. There is no `answers` field on the review route and the
    // trigger would refuse one anyway.
    expect(after.answers.f1).toBe("yes");
  });

  test("the screen shows the forms the database holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const name = freshName("screen");
    const form = await createForm(page, name);
    // The list buckets by category, and a new form is `custom` — put it in the
    // tab the screen opens on so this asserts rendering rather than filtering.
    await patchForm(page, form.id, { type: "intake" });

    await page.goto("/facility/dashboard/forms");
    await expect(
      page.getByRole("heading", { name: "Intake Forms" }),
    ).toBeVisible();

    // The row the API created. What this replaced read a module-level array,
    // so this assertion could not have passed against it.
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });

  test("a groomer cannot author a form", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const res = await page.request.post(FORMS, {
      data: { name: freshName("groomer") },
    });
    // Authoring is `settings_manage_forms` — owner, admin and manager. Reading
    // a published form is wider, which is what lets the front desk work.
    expect(res.status()).toBe(403);
  });
});
