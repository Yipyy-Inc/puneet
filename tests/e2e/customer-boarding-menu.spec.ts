import { test, expect, type Browser, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A CUSTOMER BOOKS BOARDING FROM THE FACILITY'S MENU.
//
// The boarding menu — a service with a price, naming the lodging types it may
// be booked into — was shown to STAFF on the room step, and customer mode
// hides that step because the facility assigns rooms. So no customer ever saw
// a service: their quote came from the class of whichever room the wizard
// picked for them, and the request carried no service and no stay, so the
// server could never price it and it could never auto-confirm.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// M1  The customer meets the menu on the dates step, with a service this spec
//     made on it.
// M2  With dates chosen and no service, Next stays disabled: when there is a
//     menu, the customer buys from it.
// M3  Choosing the service is what enables Next.
//
// ── IT WRITES ONE SERVICE, AND BOOKS NOTHING ──────────────────────────────
//
// A boarding service open to every lodging type, marked, and removed by the
// sweep before and after — a run that died leaves one, and this heals it.
// ============================================================================

const MARKER = "[e2e customer-boarding-menu]";
const SERVICE_NAME = `${MARKER} Weekend stay`;
const SERVICES = "/api/boarding/services";

interface Service {
  id: string;
  name: string;
}

/** The facility's menu, or nothing — never a throw, so a sweep cannot die. */
async function menu(page: Page): Promise<Service[]> {
  const res = await page.request.get(SERVICES);
  if (!res.ok()) return [];
  const body: unknown = await res.json().catch(() => null);
  return Array.isArray(body) ? (body as Service[]) : [];
}

async function sweep(browser: Browser, when: "before" | "after") {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    let removed = 0;
    for (const service of await menu(page)) {
      if (!service.name.includes(MARKER)) continue;
      const res = await page.request.delete(`${SERVICES}/${service.id}`);
      if (res.ok()) removed += 1;
    }
    console.log(`cleanup (${when}): ${removed} service(s)`);
  } finally {
    await page.close();
  }
}

/** The first Tuesday of next month, and the Wednesday after it. */
function nextMonthTuesday(): [number, number] {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 1, d);
    if (day.getDay() === 2) return [d, d + 1];
  }
  return [2, 3];
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  await sweep(browser, "before");
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(SERVICES, {
      data: {
        name: SERVICE_NAME,
        price: 61,
        unit: "night",
        // Empty is every lodging type, so whichever room the wizard finds
        // for Buddy, this service may be booked into it.
        lodgingTypeIds: [],
        isActive: true,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  await sweep(browser, "after");
});

test("a customer chooses boarding from the menu before the dates", async ({
  page,
}) => {
  test.slow();
  await signIn(page, ACCOUNTS.customer);

  // `?service=boarding` locks the service, so the wizard opens on Client &
  // Pet and goes straight to boarding's own steps after it.
  await page.goto("/customer/bookings/new?service=boarding");
  // Everything below is inside the wizard's dialog: the portal's sidebar sits
  // behind it with chevrons of its own, and a page-wide locator found those.
  const wizard = page.getByRole("dialog");
  await wizard.getByText("Buddy", { exact: false }).first().click();
  await wizard
    .getByRole("button", { name: /^next$/i })
    .first()
    .click();

  // M1 — the menu, on the step a customer actually sees.
  await expect(wizard.getByText("Which boarding service?")).toBeVisible({
    timeout: 30_000,
  });
  const card = wizard.getByRole("button", {
    name: new RegExp(MARKER.replace(/[[\]]/g, "\\$&")),
  });
  await expect(card).toBeVisible();

  // M2 — dates alone are not enough when there is a menu.
  await wizard.locator("button:has(svg.lucide-chevron-right)").first().click();
  const [tuesday, wednesday] = nextMonthTuesday();
  await wizard
    .getByRole("button", { name: String(tuesday), exact: true })
    .click();
  await wizard
    .getByRole("button", { name: String(wednesday), exact: true })
    .click();
  const next = wizard.getByRole("button", { name: /^next$/i }).first();
  await expect(next, "no service chosen yet").toBeDisabled();

  // M3 — choosing it is what lets them on.
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(next).toBeEnabled();
});
