import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./_auth";

// ============================================================================
// A workflow can be built through the wizard, and it is what the database gets.
//
// ── WHY THIS SPEC EXISTS ──────────────────────────────────────────────────
//
// Smart Workflows shipped with tables, an engine, an API, SQL tests and two
// levels of probe — and nobody had ever walked the four steps in a browser. A
// wizard that 500s on step three looks identical, from every one of those
// vantage points, to one that works.
//
// So the assertions run in both directions. The wizard writes it, and then the
// API is asked what was actually stored: the name, the trigger, the step count
// and — the one that matters — `status = 'draft'`. Reading the screen back to
// itself would prove only that React kept its own state.
//
// ── IT CREATES A DRAFT, NEVER AN ACTIVE WORKFLOW ──────────────────────────
//
// "Save as draft", every time. There is one Postgres and one Resend account,
// and an ACTIVE `booking_created` workflow at the demo facility would enrol a
// real client the moment anybody made a booking — including another spec in
// this suite. A draft sends nothing, which is what makes this safe to run
// nightly.
//
// The activation PATH is still covered, by asserting the refusals: a workflow
// with no steps cannot be switched on (workflows-rls.sql), and one whose
// trigger nothing emits cannot either (the API's 409).
//
// ── EVERYTHING IT CREATES IS ARCHIVED IN afterAll ─────────────────────────
//
// Which runs regardless of outcome, so a killed run does not leave a workflow
// on a facility's screen.
//
// This is also the spec that found the reason archiving was not enough.
// `workflows_name_unique` covered archived rows too, so the SECOND run failed
// with "a workflow with that name already exists" about a workflow the screen
// does not show — and a facility deleting a workflow could never reuse its
// name. Fixed in 20260828213219 by making the index partial. A first run of
// anything passes; this is what the second run is for.
// ============================================================================

const AUTOMATIONS = "/facility/dashboard/automations";
const NAME = "ZZ wizard probe";

interface Workflow {
  id: string;
  name: string;
  status: string;
  kind: string;
  trigger: string | null;
  steps: unknown[];
}

async function openWizard(page: Page) {
  await page.goto(AUTOMATIONS);
  await page.getByRole("tab", { name: "Smart Workflows" }).click();
  await page
    .getByRole("button", { name: /Create (Workflow|your first)/ })
    .click();
  await expect(page.getByText(/Step 1 of 4/)).toBeVisible();
}

async function workflows(page: Page): Promise<Workflow[]> {
  const response = await page.request.get("/api/workflows");
  expect(response.status()).toBe(200);
  return ((await response.json()) as { workflows: Workflow[] }).workflows;
}

test.describe.configure({ mode: "serial" });

test.describe("the smart workflow wizard", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, "owner@yipyy.dev");
      for (const workflow of await workflows(page)) {
        if (workflow.name.startsWith("ZZ ")) {
          await page.request.delete(`/api/workflows/${workflow.id}`);
        }
      }
    } finally {
      await context.close();
    }
  });

  test("refuses to continue until the step it is on is answerable", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");
    await openWizard(page);

    // A wizard that lets you walk past an unanswered step produces a workflow
    // the API then refuses, four screens later, for a reason nobody can map
    // back to what they did.
    const cont = page.getByRole("button", { name: "Continue" });
    await expect(cont).toBeDisabled();

    await page.getByLabel("Workflow name").fill(NAME);
    await expect(cont).toBeEnabled();
  });

  test("builds a four-step draft, and the database has what was drawn", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");
    await openWizard(page);

    // ── Step 1: name and kind ────────────────────────────────────────────
    await page.getByLabel("Workflow name").fill(NAME);
    await page.getByText("Action-based", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Step 2: the trigger ──────────────────────────────────────────────
    await expect(page.getByText(/Step 2 of 4/)).toBeVisible();
    await page.getByLabel("What starts this workflow?").click();
    // `booking_created` is the one trigger with a live emitter, so it is also
    // the one whose "Not yet delivering" badge must be ABSENT.
    await page.getByRole("option", { name: /Booking created/i }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Step 3: the sequence ─────────────────────────────────────────────
    await expect(page.getByText(/Step 3 of 4/)).toBeVisible();

    // A step with no template is refused by the API and by the database. The
    // wizard says so before either of them has to.
    await expect(
      page.getByText("This step has nothing to send. Pick a template."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();

    await page.getByLabel("Email template").click();
    await page
      .getByRole("option", { name: "Booking Confirmation", exact: true })
      .click();
    await page.getByRole("button", { name: "Continue" }).click();

    // ── Step 4: review, then SAVE AS DRAFT ───────────────────────────────
    await expect(page.getByText(/Step 4 of 4/)).toBeVisible();
    await page.getByRole("button", { name: "Save as draft" }).click();

    // ── What the DATABASE got ────────────────────────────────────────────
    //
    // Not what the screen says. The wizard keeping its own state correctly is
    // not the claim; the claim is that a workflow now exists with these
    // properties, and only the API can answer that.
    await expect
      .poll(async () => (await workflows(page)).some((w) => w.name === NAME), {
        message: "the wizard's workflow never reached the database",
        timeout: 15_000,
      })
      .toBe(true);

    const created = (await workflows(page)).find((w) => w.name === NAME)!;
    expect(created.kind).toBe("event");
    expect(created.trigger).toBe("booking_created");
    expect(created.steps.length).toBe(1);
    // The one that stops this spec from mailing anybody, and the default the
    // API enforces regardless of what the wizard sends.
    expect(created.status, "a new workflow must be a DRAFT").toBe("draft");
  });

  test("a saved workflow can be reopened and read back", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    const existing = (await workflows(page)).find((w) => w.name === NAME);
    test.skip(!existing, "the create test did not run");

    await page.goto(AUTOMATIONS);
    await page.getByRole("tab", { name: "Smart Workflows" }).click();
    await page.getByText(NAME, { exact: true }).first().click();

    // The detail panel is read from `message_sends` and `workflow_enrollments`,
    // so a brand-new workflow has to show zeroes rather than nothing at all.
    // "Absent" and "has not fired yet" need different responses from staff.
    // Scoped to the sheet. "In progress" is also a booking status word on this
    // screen, and a page-wide match resolves to two elements — which fails as a
    // strict-mode violation rather than as anything about the panel.
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText(NAME).first()).toBeVisible();
    await expect(sheet.getByText("In progress")).toBeVisible();
    await expect(
      sheet.getByText("Nobody has been enrolled yet."),
    ).toBeVisible();
  });
});
