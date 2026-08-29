import { test, expect } from "@playwright/test";
import { signIn } from "./_auth";

// ============================================================================
// The rebook wording survives a reload.
//
// ── THE ONE ASSERTION A FIXTURE CANNOT PASS ───────────────────────────────
//
// This editor wrote to a `useState` map. Everything about it looked right: the
// modal opened, the text changed, a toast said "template saved", and the
// preview updated. Reload the page and it was gone. Every assertion anybody
// could have written about the modal passed the entire time it was broken.
//
// So this spec edits, RELOADS, and reopens. That is the whole point of it, and
// no amount of local state can fake it.
//
// ── AND THE SHIPPED TEMPLATE IS LEFT ALONE ────────────────────────────────
//
// The first edit for a service copies `rebook_reminder` into one of the
// facility's own templates rather than editing the shared one in place —
// otherwise rewording the grooming reminder silently changes what boarding and
// daycare say. Asserted directly against the API, because it is invisible from
// the screen: both paths look identical to somebody editing grooming.
// ============================================================================

const AUTOMATIONS = "/facility/dashboard/automations";
const MARKER = "ZZ wording probe";

interface Template {
  id: string;
  key: string | null;
  name: string;
  body: string;
}

async function templates(
  page: import("@playwright/test").Page,
): Promise<Template[]> {
  const response = await page.request.get("/api/message-templates");
  expect(response.status()).toBe(200);
  return ((await response.json()) as { templates: Template[] }).templates;
}

async function openEditor(
  page: import("@playwright/test").Page,
  channel: "Email" | "Text" = "Email",
) {
  await page.goto(AUTOMATIONS);
  await page.getByRole("tab", { name: "Rebook Reminders" }).click();
  await page.getByRole("tab", { name: "Defaults & Templates" }).click();
  // One button per channel the service sends on. Named, not positional: a
  // service set to `both` shows two, and picking `.first()` would silently
  // always test the email one.
  await page
    .getByRole("tabpanel")
    .getByRole("button", { name: channel, exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("the rebook template editor", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, "owner@yipyy.dev");
      // Put readable wording back. The template row itself is left in place on
      // purpose: it is a real facility template now, `rebook_config` points at
      // it, and deleting it would leave that pointer dangling. Later runs
      // update this same row rather than creating another, so nothing
      // accumulates.
      for (const t of await templates(page)) {
        if (t.body.includes(MARKER)) {
          await page.request.patch(`/api/message-templates/${t.id}`, {
            data: {
              body: "Hi {{customer_first_name|there}},\n\nIt has been a while since we last saw {{pet_name|your pet}}. Book their next visit here: {{portal_link}}\n\n{{facility_name}}",
            },
          });
        }
      }

      // Put grooming's channel back. The `both` test changes it, and leaving it
      // would mean every later rebook send from this facility tried SMS as
      // well — a state change one spec makes and every other spec inherits.
      //
      // `failOnStatusCode` is ON deliberately: a cleanup that fails silently is
      // worse than no cleanup, because it looks like it worked. This one did
      // exactly that on its first attempt.
      const settings = await page.request.get("/api/facility/settings");
      const config = (await settings.json()) as {
        rebook_config: { value: { services: Record<string, unknown> } };
      };
      const services = config.rebook_config.value.services;
      const grooming = services.grooming as Record<string, unknown> | undefined;
      if (grooming?.channel === "both") {
        await page.request.patch("/api/facility/settings", {
          data: {
            domain: "rebook_config",
            value: {
              services: {
                ...services,
                grooming: { ...grooming, channel: "email" },
              },
            },
          },
          failOnStatusCode: true,
        });
      }
    } finally {
      await context.close();
    }
  });

  test("an edit survives a reload, and does not touch the shipped template", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");

    const shippedBefore = (await templates(page)).find(
      (t) => t.key === "rebook_reminder",
    );
    expect(
      shippedBefore,
      "the shipped rebook template should exist",
    ).toBeTruthy();

    await openEditor(page);

    const text = `${MARKER} ${Date.now()}`;
    const bodyField = page.getByRole("dialog").getByRole("textbox").last();
    await bodyField.fill(
      `Hi {{customer_first_name|there}},\n\n${text}\n\n{{facility_name}}`,
    );
    await page.getByRole("button", { name: "Save template" }).click();

    // The dialog closes only once the write lands — it used to close
    // immediately, before anything had been written.
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });

    // ── THE RELOAD ───────────────────────────────────────────────────────
    await openEditor(page);
    await expect(page.getByRole("dialog").getByText(text)).toBeVisible();

    // ── AND WHAT THE DATABASE ACTUALLY HAS ───────────────────────────────
    const after = await templates(page);
    const edited = after.find((t) => t.body.includes(text));
    expect(edited, "the wording never reached the database").toBeTruthy();

    // A facility template, not the shipped one. `key` is null because neither
    // route lets a caller set it — which is what stops the next seeder run
    // from restoring this facility's words out from under them.
    expect(edited!.key).toBeNull();

    const shippedAfter = after.find((t) => t.key === "rebook_reminder");
    expect(
      shippedAfter!.body,
      "editing grooming must not reword every other service",
    ).toBe(shippedBefore!.body);
  });

  test("the shipped template can be reworded too", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    // Until 2026-08-29 the templates route had GET and POST only, so none of
    // the fourteen templates Yipyy ships could be changed by anybody. This is
    // the assertion that the missing half exists.
    const shipped = (await templates(page)).find(
      (t) => t.key === "rebook_reminder",
    )!;

    const response = await page.request.patch(
      `/api/message-templates/${shipped.id}`,
      { data: { body: shipped.body }, failOnStatusCode: false },
    );
    expect(response.status()).toBe(200);

    // `key` is not settable, on either route. A facility able to claim a
    // shipped key would have its own work restored over by the next seed.
    const attempt = await page.request.patch(
      `/api/message-templates/${shipped.id}`,
      { data: { key: "hijacked" }, failOnStatusCode: false },
    );
    expect(attempt.status()).toBe(200);
    const stillShipped = (await templates(page)).find(
      (t) => t.id === shipped.id,
    )!;
    expect(stillShipped.key).toBe("rebook_reminder");
  });

  test("a service that sends both gets a button for each", async ({ page }) => {
    await signIn(page, "owner@yipyy.dev");

    // ── THE GAP THIS CLOSES ──────────────────────────────────────────────
    //
    // A service set to `both` sends two different messages. The editor derived
    // its channel from the rule and resolved `both` to email, so the TEXT
    // wording could not be reached from this screen at all — it silently fell
    // back to the shipped one, for every facility that chose both.
    const settings = await page.request.get("/api/facility/settings");
    const current = (await settings.json()) as {
      rebook_config: { value: { services: Record<string, unknown> } };
    };
    const services = current.rebook_config.value.services;
    const grooming = services.grooming as Record<string, unknown>;

    await page.request.patch("/api/facility/settings", {
      data: {
        domain: "rebook_config",
        value: {
          services: { ...services, grooming: { ...grooming, channel: "both" } },
        },
      },
    });

    await page.goto(AUTOMATIONS);
    await page.getByRole("tab", { name: "Rebook Reminders" }).click();
    await page.getByRole("tab", { name: "Defaults & Templates" }).click();

    const panel = page.getByRole("tabpanel");
    await expect(
      panel.getByRole("button", { name: "Email", exact: true }).first(),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: "Text", exact: true }).first(),
    ).toBeVisible();

    // And the Text button opens the TEXT wording, not the email's. An SMS
    // template has no subject, so the subject field being absent is the
    // cheapest proof the editor is on the right one.
    await panel
      .getByRole("button", { name: "Text", exact: true })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Subject (email only)")).toBeHidden();
    await expect(
      dialog.getByText("SMS", { exact: false }).first(),
    ).toBeVisible();
  });

  test("an email template cannot have its subject cleared", async ({
    page,
  }) => {
    await signIn(page, "owner@yipyy.dev");
    const shipped = (await templates(page)).find(
      (t) => t.key === "rebook_reminder",
    )!;

    // Refused here rather than at send time: an email template with no subject
    // queues a message that can never leave the outbox, and the failure would
    // surface days later as a message that silently did not go.
    const response = await page.request.patch(
      `/api/message-templates/${shipped.id}`,
      { data: { subject: "" }, failOnStatusCode: false },
    );
    expect(response.status()).toBe(400);
  });
});
