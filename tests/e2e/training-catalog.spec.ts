import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Training's catalogue is the facility's settings (2026-09-12).
//
// Disciplines, exercises, homework templates, pathways, course types and the
// module's own settings were fixtures "saved" with setQueryData — every Add,
// Edit and Delete toasted and was gone on reload. They are settings domains
// now. This pins:
//
//   1. Each domain stores a list and reads it back.
//   2. A malformed value is refused, not stored.
//   3. Through the screen: a discipline added in Settings → Training is
//      still there after a reload.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Every domain this touches is put back exactly as it was in afterAll.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const MARKER = "[e2e training-catalog]";
const DOMAINS = [
  "training_disciplines",
  "training_exercises",
  "training_homework_templates",
  "training_pathways",
  "training_course_types",
  "training_module_settings",
] as const;
type Domain = (typeof DOMAINS)[number];

type Setting = { value: Record<string, unknown>; configured: boolean };
const original = new Map<Domain, Setting>();

async function read(page: Page): Promise<Record<string, Setting>> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Record<string, Setting>;
}

async function write(page: Page, domain: Domain, value: unknown) {
  return page.request.patch(SETTINGS, { data: { domain, value } });
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const all = await read(page);
    for (const d of DOMAINS) original.set(d, all[d]);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const now = await read(page);
    for (const d of DOMAINS) {
      const before = original.get(d);
      // Only what changed is written back: the value as it was — which, for
      // a domain never configured, is its shipped fallback.
      if (
        before &&
        JSON.stringify(now[d]?.value) !== JSON.stringify(before.value)
      ) {
        await write(page, d, before.value);
      }
    }
  } finally {
    await page.close();
  }
});

test.describe("the training catalogue is saved", () => {
  test("every catalogue domain stores a list and reads it back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const discipline = {
      id: "e2e-disc",
      name: `${MARKER} Scent`,
      isActive: true,
    };
    const writes: [Domain, unknown][] = [
      [
        "training_disciplines",
        {
          disciplines: [
            ...((original.get("training_disciplines")?.value
              .disciplines as unknown[]) ?? []),
            discipline,
          ],
        },
      ],
      [
        "training_pathways",
        {
          pathways: [
            {
              id: "e2e-path",
              name: `${MARKER} Track`,
              steps: [],
              isActive: true,
            },
          ],
        },
      ],
      [
        "training_module_settings",
        {
          ...original.get("training_module_settings")?.value,
          defaultClassSize: 7,
        },
      ],
    ];
    for (const [domain, value] of writes) {
      const res = await write(page, domain, value);
      expect(res.ok(), `${domain}: ${await res.text()}`).toBe(true);
    }
    const back = await read(page);
    expect(
      (back.training_disciplines.value.disciplines as { id: string }[]).some(
        (d) => d.id === "e2e-disc",
      ),
    ).toBe(true);
    expect(back.training_pathways.configured).toBe(true);
    expect(back.training_module_settings.value.defaultClassSize).toBe(7);
  });

  test("a malformed list is refused, not stored", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await write(page, "training_exercises", {
      exercises: [{ id: "x", name: "No level", disciplineId: "", order: 1 }],
    });
    expect(res.ok()).toBe(false);
    const course = await write(page, "training_course_types", {
      courseTypes: [{ id: "c", name: "No weeks" }],
    });
    expect(course.ok()).toBe(false);
  });

  test("a customer is shown the facility's pathways and rules, not the defaults", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const requireVideo = !(
      (original.get("training_module_settings")?.value
        .requireVideoForHomeworkSubmission as boolean | undefined) ?? false
    );
    for (const [domain, value] of [
      [
        "training_pathways",
        {
          pathways: [
            {
              id: "e2e-shown",
              name: `${MARKER} Shown`,
              steps: [],
              isActive: true,
            },
            {
              id: "e2e-hidden",
              name: `${MARKER} Hidden`,
              steps: [],
              isActive: false,
            },
          ],
        },
      ],
      [
        "training_module_settings",
        {
          ...original.get("training_module_settings")?.value,
          requireVideoForHomeworkSubmission: requireVideo,
        },
      ],
    ] as [Domain, unknown][]) {
      const res = await write(page, domain, value);
      expect(res.ok(), `${domain}: ${await res.text()}`).toBe(true);
    }

    // The customer reads through their client row (20260912163211) — not
    // /api/facility/settings, which only ever gave them the defaults.
    const context = await browser.newContext();
    const customer = await context.newPage();
    try {
      await signIn(customer, ACCOUNTS.customer);
      const res = await customer.request.get("/api/customer/training-settings");
      expect(res.ok(), await res.text()).toBe(true);
      const offered = (await res.json()) as {
        pathways: { id: string }[];
        moduleSettings: { requireVideoForHomeworkSubmission: boolean };
      };
      const ids = offered.pathways.map((p) => p.id);
      expect(ids).toContain("e2e-shown");
      expect(ids).not.toContain("e2e-hidden");
      expect(offered.moduleSettings.requireVideoForHomeworkSubmission).toBe(
        requireVideo,
      );
    } finally {
      await context.close();
    }
  });

  test("through Settings → Training: an added discipline survives a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const name = `${MARKER} Agility ${Date.now()}`;
    await page.goto("/facility/dashboard/settings/training");
    await page
      .getByRole("button", { name: /^add discipline$/i })
      .first()
      .click({ timeout: 30_000 });
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").first().fill(name);
    await dialog.getByRole("button", { name: /^add discipline$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(name).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
