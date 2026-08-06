import { test } from "@playwright/test";

test("capture clerk 400", async ({ page }) => {
  page.on("response", async (r) => {
    if (r.status() >= 400 && r.url().includes("clerk")) {
      console.log("FAILED:", r.request().method(), r.url().split("?")[0]);
      try {
        console.log("BODY:", (await r.text()).slice(0, 900));
      } catch {}
    }
  });
  await page.goto("/sign-in");
  await page.getByLabel("Username or email").fill("e2elogout");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Yipyy-E2E-Logout-9x!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(6000);
});
