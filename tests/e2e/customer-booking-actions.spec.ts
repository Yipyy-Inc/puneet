import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A CUSTOMER'S BOOKINGS DO WHAT THEY SAY.
//
// The customer's Cancel waited a second and said "cancelled" without writing
// anything, and today's booking sat under "Past" from midnight UTC on. Now:
//
//   · today's booking is under Upcoming;
//   · Cancel asks the database what cancelling means, cancels for real, and
//     the booking carries who cancelled and on what terms;
//   · a request is withdrawn, never "late";
//   · a stay that has started is refused, and someone else's booking is not
//     found — the same answer as a booking that does not exist;
//   · the list reads in French, and fits a 599px screen.
//
// Bookings are Alice Johnson's (client 15, Buddy), whose record the customer
// account owns; one is Bob Smith's (client 16), to be refused. afterAll
// cancels whatever is still open.
// ============================================================================

const MARKER = "[e2e customer-booking-actions]";
const ALICE = { client: 15, pet: 1 };
const BOB = { client: 16, pet: 3 };
const made: number[] = [];

function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function book(
  page: Page,
  who: { client: number; pet: number },
  input: {
    service: string;
    start: string;
    end: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
  },
): Promise<number> {
  const res = await page.request.post("/api/bookings", {
    data: {
      clientId: who.client,
      petId: who.pet,
      facilityId: 0,
      service: input.service,
      startDate: input.start,
      endDate: input.end,
      checkInTime: input.checkIn ?? "08:00",
      checkOutTime: input.checkOut ?? "17:00",
      status: input.status,
      basePrice: 40,
      discount: 0,
      totalCost: 40,
      specialRequests: MARKER,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const ref = ((await res.json()) as { id: number }).id;
  made.push(ref);
  return ref;
}

const refs = {
  today: 0,
  ahead: 0,
  request: 0,
  started: 0,
  bobs: 0,
};

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    refs.today = await book(page, ALICE, {
      service: "daycare",
      start: day(0),
      end: day(0),
      status: "confirmed",
      checkIn: "23:00",
      checkOut: "23:30",
    });
    refs.ahead = await book(page, ALICE, {
      service: "daycare",
      start: day(20),
      end: day(20),
      status: "confirmed",
    });
    refs.request = await book(page, ALICE, {
      service: "daycare",
      start: day(21),
      end: day(21),
      status: "request_submitted",
    });
    refs.started = await book(page, ALICE, {
      service: "boarding",
      start: day(-1),
      end: day(2),
      status: "confirmed",
    });
    refs.bobs = await book(page, BOB, {
      service: "daycare",
      start: day(22),
      end: day(22),
      status: "confirmed",
    });
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const refused: string[] = [];
    // The customer's notes: they cannot delete their own, the facility can.
    for (const ref of made) {
      const read = await page.request.get(
        `/api/notes?category=booking&ref=${ref}`,
      );
      if (!read.ok()) continue;
      for (const n of (await read.json()) as Array<{
        id: string;
        content: string;
      }>) {
        if (!n.content.includes(MARKER)) continue;
        const del = await page.request.delete(`/api/notes/${n.id}`);
        if (!del.ok()) refused.push(`note ${n.id}: ${await del.text()}`);
      }
    }
    for (const ref of made) {
      const res = await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
      if (!res.ok()) refused.push(`${ref}: ${await res.text()}`);
    }
    expect(refused, "cleanup left bookings behind").toEqual([]);
  } finally {
    await page.close();
  }
});

test("today's booking is under Upcoming, and a far one is cancelled for real", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customer);
  await page.goto("/customer/bookings");

  const upcoming = page.getByRole("tabpanel");
  const todayCard = upcoming.locator('[data-slot="booking-card"]').filter({
    has: page.locator(`a[href="/customer/bookings/${refs.today}"]`),
  });
  await expect(todayCard.first()).toBeVisible({ timeout: 60_000 });

  const aheadCard = upcoming
    .locator('[data-slot="booking-card"]')
    .filter({ has: page.locator(`a[href="/customer/bookings/${refs.ahead}"]`) })
    .first();
  await aheadCard
    .getByRole("button", { name: /^cancel the booking$/i })
    .click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText(/Cancel Buddy’s Daycare on/);
  await dialog
    .getByLabel(/tell the facility why/i)
    .fill(`${MARKER} plans changed`);
  await dialog.getByRole("button", { name: /^cancel the booking$/i }).click();
  await expect(page.getByText(/is cancelled$/)).toBeVisible({
    timeout: 30_000,
  });

  const read = await page.request.get(`/api/bookings?ref=${refs.ahead}`);
  const [booking] = (await read.json()) as Array<{
    status: string;
    cancellation?: { by?: string; reason?: string; withdrawal?: boolean };
  }>;
  expect(booking?.status).toBe("cancelled");
  expect(booking?.cancellation?.by).toBe("customer");
  expect(booking?.cancellation?.reason).toBe(`${MARKER} plans changed`);
  expect(booking?.cancellation?.withdrawal).toBe(false);
});

test("a request is withdrawn, never late", async ({ page }) => {
  await signIn(page, ACCOUNTS.customer);
  const terms = await page.request.get(
    `/api/customer/bookings/${refs.request}/cancel`,
  );
  expect(terms.status()).toBe(200);
  expect(await terms.json()).toMatchObject({
    cancellable: true,
    withdrawal: true,
    late: false,
  });

  const res = await page.request.post(
    `/api/customer/bookings/${refs.request}/cancel`,
    { data: { reason: "" } },
  );
  expect(res.status(), await res.text()).toBe(200);
  const { cancellation } = (await res.json()) as {
    cancellation: { withdrawal: boolean; late: boolean };
  };
  expect(cancellation).toMatchObject({ withdrawal: true, late: false });
});

test("a stay that has started is refused, and someone else's is not found", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customer);

  const terms = await page.request.get(
    `/api/customer/bookings/${refs.started}/cancel`,
  );
  expect(((await terms.json()) as { cancellable: boolean }).cancellable).toBe(
    false,
  );
  const started = await page.request.post(
    `/api/customer/bookings/${refs.started}/cancel`,
    { data: {} },
  );
  expect(started.status()).toBe(409);

  for (const method of ["get", "post"] as const) {
    const res = await page.request[method](
      `/api/customer/bookings/${refs.bobs}/cancel`,
    );
    expect(res.status(), `${method} on Bob's booking`).toBe(404);
  }
  const nonsense = await page.request.get(
    `/api/customer/bookings/999999999/cancel`,
  );
  expect(nonsense.status()).toBe(404);
});

test("the list reads in French and fits a 599px screen", async ({ page }) => {
  await page.setViewportSize({ width: 599, height: 900 });
  await signIn(page, ACCOUNTS.customer);
  // After signing in, on the host the session landed on — as
  // settings-french.spec.ts does.
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
  await page.goto("/customer/bookings");

  await expect(page.getByRole("tab", { name: /^À venir/ })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page
      .locator('[data-slot="booking-card"]')
      .filter({
        has: page.locator(`a[href="/customer/bookings/${refs.today}"]`),
      })
      .first(),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole("button", { name: /^Annuler la réservation$/ }).first(),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "the page scrolls sideways at 599px").toBeLessThanOrEqual(0);
});

test("asking to change dates and leaving a note are saved, and shared", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customer);
  await page.goto("/customer/bookings");

  const card = page
    .locator('[data-slot="booking-card"]')
    .filter({
      has: page.locator(`a[href="/customer/bookings/${refs.today}"]`),
    })
    .first();
  await expect(card).toBeVisible({ timeout: 60_000 });
  await card.getByRole("button", { name: /^more for/i }).click();
  await page.getByRole("menuitem", { name: /ask to change dates/i }).click();

  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(/which dates would work/i)
    .fill(`${MARKER} a day later please`);
  await dialog.getByRole("button", { name: /^send the request$/i }).click();
  await expect(page.getByText(/request sent/i)).toBeVisible({
    timeout: 30_000,
  });

  const note = await page.request.post(
    `/api/customer/bookings/${refs.today}/notes`,
    { data: { kind: "note", content: `${MARKER} bringing her bed` } },
  );
  expect(note.status(), await note.text()).toBe(201);

  const empty = await page.request.post(
    `/api/customer/bookings/${refs.today}/notes`,
    { data: { kind: "note", content: "   " } },
  );
  expect(empty.status()).toBe(422);

  const theirs = await page.request.post(
    `/api/customer/bookings/${refs.bobs}/notes`,
    { data: { kind: "note", content: "not mine" } },
  );
  expect(theirs.status()).toBe(404);

  // Both are booking notes shared with the customer, marked as theirs.
  const read = await page.request.get(
    `/api/notes?category=booking&ref=${refs.today}`,
  );
  expect(read.ok(), await read.text()).toBe(true);
  const notes = (await read.json()) as Array<{
    content: string;
    visibility: string;
    customerRequest?: string;
  }>;
  const mine = notes.filter((n) => n.content.includes(MARKER));
  expect(mine.map((n) => n.customerRequest).sort()).toEqual([
    "change_dates",
    "note",
  ]);
  expect(mine.every((n) => n.visibility === "shared_with_customer")).toBe(true);
});

test("the booking page shows its price, today's tools, and nobody else's", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.customer);
  await page.goto(`/customer/bookings/${refs.today}`);

  await expect(
    page.getByRole("heading", { name: /price and payment/i }),
  ).toBeVisible({ timeout: 60_000 });
  // $40, nothing paid: the balance and a real pay link.
  const pay = page.getByRole("link", { name: /^pay \$40\.00$/i });
  await expect(pay).toBeVisible();
  await expect(pay).toHaveAttribute("href", `/pay/${refs.today}`);
  // It is today's booking, so the arrival tools are on it.
  await expect(
    page.getByRole("link", { name: /show my check-in code/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /^notes$/i })).toBeVisible();

  await page.goto(`/customer/bookings/${refs.bobs}`);
  await expect(page.getByText(/not one of your bookings/i)).toBeVisible({
    timeout: 60_000,
  });
});
