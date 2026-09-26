import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH SETTINGS > SERVICES > ADD-ONS (2026-09-26, 20260926230000).
//
// The one add-ons list as the reference article sets it up: the list grouped
// under sorted categories, "Edit categories", every section of the add-on
// form (basic info, price & duration, staff, applicable services, pet
// details), the row menu and the delete confirmation — at 1440 and 599, in
// both languages.
//
// It WRITES: two categories and four add-ons, HARD-deleted by the service role
// in afterAll (the API's delete archives, which would leave rows behind).
//
//   bunx playwright test --config=playwright.shots.config.ts add-ons-settings --project light
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const PAGE = "/facility/dashboard/settings/addons";

const made = { addOns: [] as string[], categories: [] as string[] };

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function french(page: Page) {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

test.afterAll(async () => {
  const db = admin();
  if (made.addOns.length) {
    await db.from("service_add_ons").delete().in("id", made.addOns);
  }
  if (made.categories.length) {
    await db
      .from("service_add_on_categories")
      .delete()
      .in("id", made.categories);
  }
});

async function seed(page: Page) {
  const category = async (name: string) => {
    const res = await page.request.post("/api/add-ons/categories", {
      data: { name },
    });
    expect(res.status(), await res.text()).toBe(201);
    const id = ((await res.json()) as { id: string }).id;
    made.categories.push(id);
    return id;
  };
  const addOn = async (data: Record<string, unknown>) => {
    const res = await page.request.post("/api/add-ons", { data });
    expect(res.status(), await res.text()).toBe(201);
    made.addOns.push(
      ((await res.json()) as { addOn: { id: string } }).addOn.id,
    );
  };

  const treats = await category("Treats");
  const walks = await category("Walks");
  await addOn({
    name: "Nail trim",
    categoryId: treats,
    price: 15,
    durationMin: 10,
    requiresStaff: true,
    colorCode: "#1668E3",
  });
  await addOn({ name: "Pup cake", categoryId: treats, price: 6 });
  await addOn({
    name: "Extra walk",
    categoryId: walks,
    price: 10,
    durationMin: 20,
    requiresStaff: true,
  });
  await addOn({ name: "Late checkout", price: 25, isActive: false });
}

test("the add-ons list, its categories and its form", async ({ page }) => {
  test.slow();
  test.setTimeout(8 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await signIn(page, ACCOUNTS.owner);
  await seed(page);

  for (const lang of ["en", "fr"] as const) {
    if (lang === "fr") await french(page);

    for (const width of [1440, 599]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(PAGE);
      const add = page.getByRole("button", {
        name: lang === "fr" ? /Ajouter un supplément/ : /Add new add-on/,
      });
      await expect(add.first()).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${OUT}/add-ons-list-${lang}-${width}.png`,
        fullPage: true,
      });

      if (width === 599) continue;

      // Edit categories.
      await page
        .getByRole("button", {
          name: lang === "fr" ? /Modifier les catégories/ : /Edit categories/,
        })
        .click();
      const categories = page.getByRole("dialog");
      await expect(categories).toBeVisible();
      await page.waitForTimeout(400);
      await categories.screenshot({
        path: `${OUT}/add-ons-categories-${lang}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(categories).toBeHidden();

      // The form, section by section.
      await add.first().click();
      const form = page.getByRole("dialog");
      await expect(form).toBeVisible();
      await page.waitForTimeout(500);
      await form.screenshot({ path: `${OUT}/add-ons-form-1-${lang}.png` });

      const scroll = form.locator("[data-radix-scroll-area-viewport]");
      const choose = async (name: RegExp) => {
        await form.getByRole("radio", { name }).click();
      };
      await choose(
        lang === "fr"
          ? /Choisir des services précis/
          : /Select specific services/,
      );
      await form.getByRole("radiogroup").nth(1).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await form.screenshot({ path: `${OUT}/add-ons-form-2-${lang}.png` });

      for (const name of lang === "fr"
        ? [/^Personnaliser/, /^Personnaliser/, /^Pelages choisis/]
        : [/^Customize/, /^Customize/, /^Selected coat types/]) {
        const option = form
          .getByRole("radio", { name })
          .and(form.locator('[aria-checked="false"]'));
        if (await option.count()) await option.first().click();
      }
      await scroll.evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await page.waitForTimeout(300);
      await form.screenshot({ path: `${OUT}/add-ons-form-3-${lang}.png` });
      await page.keyboard.press("Escape");
      await expect(form).toBeHidden();

      // The row menu and the delete confirmation.
      await page
        .getByRole("button", {
          name:
            lang === "fr" ? "Actions pour Nail trim" : "Actions for Nail trim",
        })
        .click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/add-ons-menu-${lang}.png` });
      await page
        .getByRole("menuitem", { name: lang === "fr" ? "Supprimer" : "Delete" })
        .click();
      const confirm = page.getByRole("alertdialog");
      await expect(confirm).toBeVisible();
      await page.waitForTimeout(300);
      await confirm.screenshot({ path: `${OUT}/add-ons-delete-${lang}.png` });
      await page.keyboard.press("Escape");
    }
  }
});
