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
  clientId: string | null;
  clientRef: number | null;
  clientName: string | null;
}

function freshName(label: string): string {
  return `${MARKER} ${label} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

/**
 * A version schema in the shape the APPLICATION writes.
 *
 * `schemaFromFlatForm` produces `{ questions, sections, logicRules,
 * fieldMapping }` with questions flat and carrying a `sectionId` — the version
 * column is plain jsonb and will accept anything, which is exactly why this
 * helper has to match what a screen will read. It used to nest fields under
 * sections, a shape nothing in the app produces, so a schema written here
 * rendered as a form with no questions.
 */
function questions(label: string) {
  return {
    questions: [
      {
        id: "f1",
        type: "yes_no",
        label,
        required: true,
        sectionId: "s1",
      },
    ],
    sections: [{ id: "s1", title: "Health", order: 1 }],
    logicRules: [],
    fieldMapping: [],
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

async function clientRefs(page: Page, count = 1): Promise<number[]> {
  const res = await page.request.get("/api/clients");
  expect(res.ok(), await res.text()).toBe(true);
  const refs = ((await res.json()) as { id?: number }[])
    .map((c) => c.id)
    .filter((v): v is number => typeof v === "number")
    .slice(0, count);
  expect(refs.length, `the facility has at least ${count} client(s)`).toBe(
    count,
  );
  return refs;
}

/** A published form and one submission against it, with nobody's name on it. */
async function unfiledSubmission(
  page: Page,
  label: string,
): Promise<Submission> {
  const form = await createForm(page, freshName(label));
  await patchForm(page, form.id, {
    schema: questions(`${label}: is your dog vaccinated?`),
    publish: true,
    status: "published",
  });
  const filed = await page.request.post(`${FORMS}/${form.id}/submit`, {
    data: { answers: { f1: "yes" } },
  });
  expect(filed.ok(), await filed.text()).toBe(true);
  const submission = ((await filed.json()) as { submission: Submission })
    .submission;
  // Staff capture one at the counter before the person has a record. If this
  // ever comes back attached, the rest of the block proves nothing.
  expect(submission.clientId, "arrives with no customer").toBeNull();
  return submission;
}

test.describe("forms", () => {
  let clientRef = 0;
  let otherClientRef = 0;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    [clientRef, otherClientRef] = await clientRefs(page, 2);
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

  test("a submission with no customer can be filed under one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const submission = await unfiledSubmission(page, "file");

    const res = await page.request.patch(`${SUBMISSIONS}/${submission.id}`, {
      data: { clientRef },
    });
    expect(res.ok(), await res.text()).toBe(true);

    // Read back through the detail route. An RLS-refused UPDATE affects zero
    // rows and returns success, so the response of the write proves nothing.
    const after = await page.request.get(`${SUBMISSIONS}/${submission.id}`);
    expect(after.ok(), await after.text()).toBe(true);
    const reread = ((await after.json()) as { submission: Submission })
      .submission;
    expect(reread.clientRef).toBe(clientRef);
    expect(reread.answers.f1).toBe("yes");
  });

  test("filed answers cannot be moved onto a different customer", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const submission = await unfiledSubmission(page, "move");

    const first = await page.request.patch(`${SUBMISSIONS}/${submission.id}`, {
      data: { clientRef },
    });
    expect(first.ok(), await first.text()).toBe(true);

    // THE POINT. Otherwise "mark as reviewed" is a way to quietly move what
    // somebody said onto somebody else's file.
    const second = await page.request.patch(`${SUBMISSIONS}/${submission.id}`, {
      data: { clientRef: otherClientRef },
    });
    expect(second.status()).toBe(403);

    const after = await page.request.get(`${SUBMISSIONS}/${submission.id}`);
    const reread = ((await after.json()) as { submission: Submission })
      .submission;
    expect(reread.clientRef).toBe(clientRef);
  });

  test("a groomer can review a submission but not file it", async ({
    page,
  }) => {
    const owner = await page.context().browser()!.newContext();
    const ownerPage = await owner.newPage();
    await signIn(ownerPage, ACCOUNTS.owner);
    const submission = await unfiledSubmission(ownerPage, "groomer-file");
    await owner.close();

    await signIn(page, ACCOUNTS.groomer);

    // Marking a form read is `view_client_documents`, which a groomer holds.
    const reviewed = await page.request.patch(
      `${SUBMISSIONS}/${submission.id}`,
      { data: { status: "reviewed" } },
    );
    expect(reviewed.ok(), await reviewed.text()).toBe(true);

    // Deciding whose file the answers belong in is a change to a client
    // record, and a groomer has no `edit_clients`. A VIEW permission must not
    // authorise a WRITE.
    const filedByGroomer = await page.request.patch(
      `${SUBMISSIONS}/${submission.id}`,
      { data: { clientRef } },
    );
    expect(filedByGroomer.status()).toBe(403);
  });

  test("the inbox lists what the database holds, and opens one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const name = freshName("inbox");
    const form = await createForm(page, name);
    await patchForm(page, form.id, {
      schema: questions("INBOX: is your dog vaccinated?"),
      publish: true,
      status: "published",
    });
    await page.request.post(`${FORMS}/${form.id}/submit`, {
      data: { clientRef, answers: { f1: "yes" } },
    });

    await page.goto("/facility/dashboard/forms/submissions");
    await expect(
      page.getByRole("heading", { name: "Submissions Inbox" }),
    ).toBeVisible();

    // The row the API created. What this replaced read a module-level array,
    // so this assertion could not have passed against it.
    const row = page.getByRole("row").filter({ hasText: name });
    await expect(row.first()).toBeVisible({ timeout: 15_000 });

    await row.first().click();

    // And the detail shows the QUESTION, not just the answer — rendered from
    // the version the submission carries.
    await expect(page.getByText("INBOX: is your dog vaccinated?")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Answers", { exact: true })).toBeVisible();
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
